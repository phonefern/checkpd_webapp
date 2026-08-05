-- Latest Thai ID card snapshot for the entrance-reader flow.
-- One Thai ID maps to one current card record; rescans update that record.

CREATE TABLE IF NOT EXISTS checkpd.thai_id_cards (
  thai_id TEXT PRIMARY KEY CHECK (thai_id ~ '^[0-9]{13}$'),
  user_id TEXT UNIQUE NULL REFERENCES checkpd.users(id) ON DELETE SET NULL,

  title_th TEXT NULL,
  title_en TEXT NULL,
  full_name_th TEXT NULL,
  full_name_en TEXT NULL,
  first_name_th TEXT NULL,
  first_name_en TEXT NULL,
  last_name_th TEXT NULL,
  last_name_en TEXT NULL,
  date_of_birth TEXT NULL,
  gender TEXT NULL CHECK (gender IS NULL OR gender IN ('M', 'F')),
  card_issuer TEXT NULL,
  issue_date TEXT NULL,
  expire_date TEXT NULL,
  address TEXT NULL,
  photo_base64_uri TEXT NULL CHECK (
    photo_base64_uri IS NULL
    OR photo_base64_uri ~* '^data:image/(jpeg|jpg|png);base64,'
  ),

  first_scanned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_scanned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  linked_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT thai_id_cards_link_timestamp_check
    CHECK ((user_id IS NULL) = (linked_at IS NULL))
);

CREATE INDEX IF NOT EXISTS idx_thai_id_cards_last_scanned_at
  ON checkpd.thai_id_cards (last_scanned_at DESC);

ALTER TABLE checkpd.thai_id_cards ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE checkpd.thai_id_cards FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE checkpd.thai_id_cards TO service_role;

CREATE OR REPLACE FUNCTION checkpd.set_thai_id_card_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = checkpd
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_thai_id_cards_updated_at ON checkpd.thai_id_cards;
CREATE TRIGGER trg_thai_id_cards_updated_at
BEFORE UPDATE ON checkpd.thai_id_cards
FOR EACH ROW
EXECUTE FUNCTION checkpd.set_thai_id_card_updated_at();

CREATE OR REPLACE FUNCTION checkpd.upsert_thai_id_card(p_payload jsonb)
RETURNS TABLE (
  thai_id TEXT,
  user_id TEXT,
  match_status TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = checkpd, public
AS $$
#variable_conflict use_column
DECLARE
  v_thai_id TEXT := btrim(COALESCE(p_payload ->> 'citizenID', ''));
  v_match_count INTEGER := 0;
  v_candidate_user_id TEXT := NULL;
  v_sum INTEGER := 0;
  v_expected_check_digit INTEGER;
  v_result_user_id TEXT;
  v_index INTEGER;
BEGIN
  IF v_thai_id !~ '^[0-9]{13}$' THEN
    RAISE EXCEPTION 'Thai ID must contain exactly 13 digits'
      USING ERRCODE = '22023';
  END IF;

  FOR v_index IN 1..12 LOOP
    v_sum := v_sum
      + substring(v_thai_id FROM v_index FOR 1)::INTEGER * (14 - v_index);
  END LOOP;
  v_expected_check_digit := (11 - (v_sum % 11)) % 10;

  IF substring(v_thai_id FROM 13 FOR 1)::INTEGER <> v_expected_check_digit THEN
    RAISE EXCEPTION 'Thai ID checksum is invalid'
      USING ERRCODE = '22023';
  END IF;

  SELECT COUNT(*), MIN(id)
    INTO v_match_count, v_candidate_user_id
  FROM checkpd.users AS user_row
  WHERE user_row.thai_id = v_thai_id;

  IF v_match_count <> 1 THEN
    v_candidate_user_id := NULL;
  END IF;

  INSERT INTO checkpd.thai_id_cards AS card (
    thai_id, user_id, title_th, title_en, full_name_th, full_name_en,
    first_name_th, first_name_en, last_name_th, last_name_en,
    date_of_birth, gender, card_issuer, issue_date, expire_date, address,
    photo_base64_uri, linked_at
  )
  VALUES (
    v_thai_id,
    v_candidate_user_id,
    NULLIF(btrim(p_payload ->> 'titleTH'), ''),
    NULLIF(btrim(p_payload ->> 'titleEN'), ''),
    NULLIF(btrim(p_payload ->> 'fullNameTH'), ''),
    NULLIF(btrim(p_payload ->> 'fullNameEN'), ''),
    NULLIF(btrim(p_payload ->> 'firstNameTH'), ''),
    NULLIF(btrim(p_payload ->> 'firstNameEN'), ''),
    NULLIF(btrim(p_payload ->> 'lastNameTH'), ''),
    NULLIF(btrim(p_payload ->> 'lastNameEN'), ''),
    NULLIF(btrim(p_payload ->> 'dateOfBirth'), ''),
    NULLIF(btrim(p_payload ->> 'gender'), ''),
    NULLIF(btrim(p_payload ->> 'cardIssuer'), ''),
    NULLIF(btrim(p_payload ->> 'issueDate'), ''),
    NULLIF(btrim(p_payload ->> 'expireDate'), ''),
    NULLIF(btrim(p_payload ->> 'address'), ''),
    NULLIF(btrim(p_payload ->> 'photoAsBase64Uri'), ''),
    CASE WHEN v_candidate_user_id IS NULL THEN NULL ELSE now() END
  )
  ON CONFLICT (thai_id) DO UPDATE SET
    title_th = EXCLUDED.title_th,
    title_en = EXCLUDED.title_en,
    full_name_th = EXCLUDED.full_name_th,
    full_name_en = EXCLUDED.full_name_en,
    first_name_th = EXCLUDED.first_name_th,
    first_name_en = EXCLUDED.first_name_en,
    last_name_th = EXCLUDED.last_name_th,
    last_name_en = EXCLUDED.last_name_en,
    date_of_birth = EXCLUDED.date_of_birth,
    gender = EXCLUDED.gender,
    card_issuer = EXCLUDED.card_issuer,
    issue_date = EXCLUDED.issue_date,
    expire_date = EXCLUDED.expire_date,
    address = EXCLUDED.address,
    photo_base64_uri = EXCLUDED.photo_base64_uri,
    last_scanned_at = now(),
    user_id = COALESCE(card.user_id, EXCLUDED.user_id),
    linked_at = COALESCE(card.linked_at, EXCLUDED.linked_at)
  RETURNING card.user_id INTO v_result_user_id;

  RETURN QUERY
  SELECT
    v_thai_id,
    v_result_user_id,
    CASE
      WHEN v_result_user_id IS NOT NULL THEN 'linked'
      WHEN v_match_count > 1 THEN 'multiple_matches'
      ELSE 'unlinked'
    END;
END;
$$;

CREATE OR REPLACE FUNCTION checkpd.list_thai_id_cards(
  p_search TEXT DEFAULT NULL,
  p_filter TEXT DEFAULT 'all',
  p_limit INTEGER DEFAULT 50,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
  thai_id TEXT,
  user_id TEXT,
  full_name_th TEXT,
  full_name_en TEXT,
  date_of_birth TEXT,
  gender TEXT,
  last_scanned_at TIMESTAMPTZ,
  linked_at TIMESTAMPTZ,
  match_count BIGINT,
  total_count BIGINT
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = checkpd, public
AS $$
  WITH ranked AS (
    SELECT
      card.*,
      (
        SELECT COUNT(*)
        FROM checkpd.users user_row
        WHERE user_row.thai_id = card.thai_id
      )::BIGINT AS match_count
    FROM checkpd.thai_id_cards card
  ),
  filtered AS (
    SELECT
      ranked.*,
      COUNT(*) OVER () AS total_count
    FROM ranked
    WHERE
      (
        COALESCE(NULLIF(btrim(p_search), ''), '') = ''
        OR ranked.thai_id ILIKE '%' || btrim(p_search) || '%'
        OR COALESCE(ranked.full_name_th, '') ILIKE '%' || btrim(p_search) || '%'
        OR COALESCE(ranked.full_name_en, '') ILIKE '%' || btrim(p_search) || '%'
      )
      AND (
        p_filter = 'all'
        OR (p_filter = 'linked' AND ranked.user_id IS NOT NULL)
        OR (p_filter = 'unlinked' AND ranked.user_id IS NULL AND ranked.match_count <= 1)
        OR (p_filter = 'needs_review' AND ranked.user_id IS NULL AND ranked.match_count > 1)
      )
  )
  SELECT
    thai_id, user_id, full_name_th, full_name_en, date_of_birth, gender,
    last_scanned_at, linked_at, match_count, total_count
  FROM filtered
  ORDER BY last_scanned_at DESC, thai_id
  LIMIT GREATEST(1, LEAST(p_limit, 100))
  OFFSET GREATEST(0, p_offset);
$$;

REVOKE ALL ON FUNCTION checkpd.upsert_thai_id_card(jsonb) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION checkpd.list_thai_id_cards(TEXT, TEXT, INTEGER, INTEGER) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION checkpd.upsert_thai_id_card(jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION checkpd.list_thai_id_cards(TEXT, TEXT, INTEGER, INTEGER) TO service_role;
