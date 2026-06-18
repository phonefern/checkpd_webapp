create table public.users (
  id text not null,
  age integer null,
  bod timestamp without time zone null,
  educationstatus text null,
  email text null,
  emorument text null,
  ethnicity text null,
  firstname text null,
  gender text null,
  idcardaddress text null,
  irb boolean null,
  isstaff boolean null,
  lastname text null,
  lastupdate timestamp without time zone null,
  liveaddress text null,
  maritalstatus text null,
  occupation text null,
  pdpa text null,
  perfixname text null,
  phonenumber text null,
  remind timestamp without time zone null,
  thaiid text null,
  timestamp timestamp without time zone null,
  source text null,
  province text null,
  region text null,
  area text null,
  smoking smallint null,
  alcohol smallint null,
  coffee smallint null,
  milk smallint null,
  exercise smallint null,
  insecticide smallint null,
  narcotic smallint null,
  severe_head_injury smallint null,
  congenital_disease text null,
  constraint users_pkey primary key (id)
) TABLESPACE pg_default;

create index IF not exists idx_users_area on public.users using btree (area) TABLESPACE pg_default;

create index IF not exists idx_users_id on public.users using btree (id) TABLESPACE pg_default;

create index IF not exists idx_users_thaiid on public.users using btree (thaiid) TABLESPACE pg_default;

create index IF not exists idx_users_name on public.users using btree (
  lower(
    TRIM(
      both
      from
        firstname
    )
  ),
  lower(
    TRIM(
      both
      from
        lastname
    )
  )
) TABLESPACE pg_default;

create trigger set_province_trigger BEFORE INSERT
or
update OF liveaddress on users for EACH row
execute FUNCTION set_province ();

create trigger trg_set_age BEFORE INSERT
or
update OF bod on users for EACH row
execute FUNCTION set_age_from_bod ();

create trigger trg_set_user_source BEFORE INSERT
or
update on users for EACH row
execute FUNCTION set_user_source ();

create trigger trigger_trim_area BEFORE INSERT
or
update on users for EACH row
execute FUNCTION trim_area ();

create trigger update_region_trigger BEFORE INSERT
or
update on users for EACH row
execute FUNCTION set_region_from_province ();

create table public.user_record_summary (
  user_id text not null,
  recorder text not null,
  record_id text null,
  version text null,
  last_update timestamp without time zone null,
  prediction_risk boolean null,
  record_count integer null,
  balance integer null,
  dualtap integer null,
  dualtapright integer null,
  gaitwalk integer null,
  pinchtosize integer null,
  pinchtosizeright integer null,
  questionnaire integer null,
  tremorpostural integer null,
  tremorresting integer null,
  voiceahh integer null,
  voiceypl integer null,
  updated_at timestamp without time zone null,
  condition text null,
  test_result text null,
  other text null,
  thaiid character varying(20) null,
  condition_status text null default 'none'::text,
  condition_changed_at timestamp with time zone null,
  last_migrate timestamp with time zone null,
  last_update_gcp timestamp with time zone null default now(),
  firebase_path text null,
  storage_base_path text null,
  storage_status text null,
  constraint user_record_summary_pkey primary key (user_id, recorder),
  constraint user_record_summary_user_id_fkey foreign KEY (user_id) references users (id)
) TABLESPACE pg_default;

create index IF not exists idx_summary_last_migrate on public.user_record_summary using btree (last_migrate desc) TABLESPACE pg_default;

create index IF not exists idx_summary_prediction_risk on public.user_record_summary using btree (prediction_risk) TABLESPACE pg_default;

create index IF not exists idx_summary_user_record on public.user_record_summary using btree (user_id, record_id) TABLESPACE pg_default;

create index IF not exists idx_summary_condition on public.user_record_summary using btree (condition) TABLESPACE pg_default;

create index IF not exists idx_summary_test_result on public.user_record_summary using btree (test_result) TABLESPACE pg_default;

create trigger tg_compute_test_result_v2 BEFORE INSERT
or
update on user_record_summary for EACH row
execute FUNCTION fn_compute_test_result_v2 ();

create trigger tg_last_update_gcp BEFORE
update on user_record_summary for EACH row
execute FUNCTION fn_update_last_update_gcp ();

CREATE OR REPLACE FUNCTION public.fn_normalize_condition(p text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE
    WHEN p IS NULL THEN NULL
    WHEN lower(btrim(p)) IN ('', '-', 'null', 'ไม่ระบุ') THEN NULL
    WHEN lower(btrim(p)) = 'pd'
      OR lower(p) LIKE '%parkinson%'
      OR lower(p) LIKE '%newly diagnosis%' THEN 'pd'
    WHEN lower(btrim(p)) = 'pdm'
      OR lower(p) LIKE '%prodromal%'
      OR lower(p) LIKE '%high risk%'
      OR lower(p) LIKE '%high-risk%' THEN 'pdm'
    WHEN lower(btrim(p)) = 'ctrl'
      OR lower(p) LIKE '%control%'
      OR lower(p) LIKE '%healthy%'
      OR lower(btrim(p)) = 'normal' THEN 'ctrl'
    WHEN lower(btrim(p)) = 'other'
      OR lower(p) LIKE '%other diagnosis%' THEN 'other'
    ELSE 'other'
  END;
$$;

CREATE OR REPLACE FUNCTION public.fn_sync_diagnosis(
  p_thaiid text,
  p_condition text,
  p_other text,
  p_source text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, checkpd, core
AS $$
DECLARE
  v_cond text;
  v_prev_guard text;
  v_latest_patient_id integer;
BEGIN
  IF p_thaiid IS NULL OR btrim(p_thaiid) = '' THEN
    RETURN;
  END IF;

  IF current_setting('app.diag_sync', true) = 'on' THEN
    RETURN;
  END IF;

  v_prev_guard := current_setting('app.diag_sync', true);
  PERFORM set_config('app.diag_sync', 'on', true);

  BEGIN
    v_cond := public.fn_normalize_condition(p_condition);

    UPDATE public.user_record_summary
       SET condition = v_cond,
           other = p_other,
           updated_at = now()
     WHERE thaiid = p_thaiid
       AND (condition IS DISTINCT FROM v_cond OR other IS DISTINCT FROM p_other);

    BEGIN
      UPDATE checkpd.record_summary
         SET condition = v_cond,
             other = p_other,
             updated_at = now()
       WHERE thaiid = p_thaiid
         AND (condition IS DISTINCT FROM v_cond OR other IS DISTINCT FROM p_other);
    EXCEPTION
      WHEN undefined_table OR invalid_schema_name THEN
        RAISE WARNING 'Diagnosis sync skipped: checkpd.record_summary missing.';
    END;

    UPDATE core.patient_diagnosis_v2 d
       SET condition = v_cond,
           other_diagnosis_text = p_other,
           updated_at = now()
      FROM core.patients_v2 pt
     WHERE d.patient_id = pt.id
       AND pt.thaiid = p_thaiid
       AND (d.condition IS DISTINCT FROM v_cond OR d.other_diagnosis_text IS DISTINCT FROM p_other);

    IF NOT EXISTS (
      SELECT 1
        FROM core.patient_diagnosis_v2 d
        JOIN core.patients_v2 pt ON pt.id = d.patient_id
       WHERE pt.thaiid = p_thaiid
    ) THEN
      SELECT pt.id
        INTO v_latest_patient_id
        FROM core.patients_v2 pt
       WHERE pt.thaiid = p_thaiid
       ORDER BY pt.collection_date DESC NULLS LAST, pt.id DESC
       LIMIT 1;

      IF v_latest_patient_id IS NOT NULL THEN
        INSERT INTO core.patient_diagnosis_v2 (
          patient_id,
          condition,
          other_diagnosis_text,
          updated_at
        )
        VALUES (
          v_latest_patient_id,
          v_cond,
          p_other,
          now()
        )
        ON CONFLICT (patient_id) DO NOTHING;
      END IF;
    END IF;

    PERFORM set_config('app.diag_sync', COALESCE(v_prev_guard, 'off'), true);
  EXCEPTION
    WHEN OTHERS THEN
      PERFORM set_config('app.diag_sync', COALESCE(v_prev_guard, 'off'), true);
      RAISE;
  END;
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_mirror_condition_safe()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, checkpd, core
AS $$
BEGIN
  PERFORM public.fn_sync_diagnosis(NEW.thaiid, NEW.condition, NEW.other, 'public');
  RETURN NULL;
END;
$$;

create trigger tg_mirror_condition_safe
after
update on user_record_summary for EACH row when (
  (
    old.condition is distinct from new.condition
    or old.other is distinct from new.other
    or old.thaiid is distinct from new.thaiid
  )
  and (
    old.condition is not null
    or old.other is not null
    or new.condition is not null
    or new.other is not null
  )
)
execute FUNCTION fn_mirror_condition_safe ();

create trigger tg_mirror_condition_safe_insert
after
insert on user_record_summary for EACH row when (
  new.condition is not null
  or new.other is not null
)
execute FUNCTION fn_mirror_condition_safe ();

create trigger tg_set_storage_path BEFORE INSERT on user_record_summary for EACH row
execute FUNCTION fn_set_storage_path ();


CREATE VIEW user_record_summary_with_users AS
SELECT 
  u.id,
  rs.recorder,
  rs.record_id,
  u.thaiid,
  u.firstname,
  u.lastname,
  u.age,
  u.source,
  u.gender,
  u.region,
  u.province,
  u.timestamp,
  rs.last_update,
  rs.prediction_risk,
  rs.condition,
  rs.test_result,
  rs.other,
  u.area,
  rs.condition_status,
  rs.condition_changed_at,
  rs.last_migrate,
  last_update_gcp
FROM users u
LEFT JOIN user_record_summary rs
  ON u.id = rs.user_id;
