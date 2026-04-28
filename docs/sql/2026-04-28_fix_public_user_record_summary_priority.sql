-- Make public.user_record_summary the primary source of truth.
-- Mirror into checkpd.record_summary as best-effort only.
-- Safe to run in Supabase SQL Editor.

CREATE OR REPLACE FUNCTION public.fn_mirror_condition_safe()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, checkpd
AS $$
DECLARE
  mirror_updated BOOLEAN := FALSE;
BEGIN
  IF NEW.record_id IS NULL THEN
    RETURN NULL;
  END IF;

  BEGIN
    UPDATE checkpd.record_summary c
       SET condition            = NEW.condition,
           condition_status     = NEW.condition_status,
           condition_changed_at = NEW.condition_changed_at,
           other                = NEW.other,
           test_result          = NEW.test_result,
           updated_at           = now()
     WHERE c.user_id   = NEW.user_id
       AND c.record_id = NEW.record_id;

    mirror_updated := FOUND;
  EXCEPTION
    WHEN undefined_table OR invalid_schema_name THEN
      RAISE WARNING 'Mirror skipped: checkpd.record_summary missing.';
      RETURN NULL;
    WHEN OTHERS THEN
      RAISE WARNING 'Mirror update skipped: % (user_id=%, record_id=%)', SQLERRM, NEW.user_id, NEW.record_id;
      RETURN NULL;
  END;

  IF NOT mirror_updated THEN
    IF NEW.recorder IS NULL THEN
      RAISE WARNING 'Mirror skipped: recorder is NULL (user_id=%, record_id=%)', NEW.user_id, NEW.record_id;
      RETURN NULL;
    END IF;

    BEGIN
      INSERT INTO checkpd.record_summary (
          user_id, recorder, record_id,
          condition, condition_status, condition_changed_at,
          other, test_result, updated_at
      )
      VALUES (
          NEW.user_id, NEW.recorder, NEW.record_id,
          NEW.condition, NEW.condition_status, NEW.condition_changed_at,
          NEW.other, NEW.test_result, now()
      )
      ON CONFLICT (user_id, recorder) DO UPDATE
         SET record_id            = EXCLUDED.record_id,
             condition            = EXCLUDED.condition,
             condition_status     = EXCLUDED.condition_status,
             condition_changed_at = EXCLUDED.condition_changed_at,
             other                = EXCLUDED.other,
             test_result          = EXCLUDED.test_result,
             updated_at           = now();
    EXCEPTION
      WHEN foreign_key_violation THEN
        RAISE WARNING 'Mirror skipped: checkpd.users missing user_id=%', NEW.user_id;
      WHEN undefined_table OR invalid_schema_name THEN
        RAISE WARNING 'Mirror skipped: checkpd.record_summary missing.';
      WHEN OTHERS THEN
        RAISE WARNING 'Mirror insert skipped: % (user_id=%, recorder=%, record_id=%)', SQLERRM, NEW.user_id, NEW.recorder, NEW.record_id;
    END;
  END IF;

  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS tg_mirror_condition_safe ON public.user_record_summary;

CREATE TRIGGER tg_mirror_condition_safe
AFTER UPDATE ON public.user_record_summary
FOR EACH ROW
WHEN (
  OLD.condition            IS DISTINCT FROM NEW.condition OR
  OLD.condition_status     IS DISTINCT FROM NEW.condition_status OR
  OLD.condition_changed_at IS DISTINCT FROM NEW.condition_changed_at OR
  OLD.other                IS DISTINCT FROM NEW.other OR
  OLD.test_result          IS DISTINCT FROM NEW.test_result
)
EXECUTE FUNCTION public.fn_mirror_condition_safe();

-- Verify trigger is attached
SELECT tgname, tgenabled
FROM pg_trigger
WHERE tgrelid = 'public.user_record_summary'::regclass
  AND NOT tgisinternal;
