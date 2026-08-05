-- checkpd.thai_id_cards matching (upsert_thai_id_card, list_thai_id_cards, and
-- the /api/thai-id-reader/records/[thaiId] detail route) compared the clean
-- 13-digit ID off the card chip against checkpd.users.thai_id with a plain `=`.
-- checkpd.users.thai_id is unconstrained TEXT mirrored from a free-text field
-- end users type into the mobile app — it can contain dashes, spaces, etc.
-- (the exact class of problem app/api/export/users-csv/route.ts already works
-- around with normalizeThaiId() for core.patients_v2). Exact match silently
-- missed those rows, so genuinely-matching people never got auto-linked.
--
-- Fix: normalize checkpd.users.thai_id (strip non-digits) before comparing,
-- everywhere a match against it happens. A functional index keeps this fast
-- at scale instead of forcing a sequential scan per lookup.

CREATE OR REPLACE FUNCTION checkpd.normalize_thai_id(p_thai_id text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = checkpd, public
AS $$
  SELECT regexp_replace(COALESCE(p_thai_id, ''), '\D', '', 'g');
$$;

CREATE INDEX IF NOT EXISTS idx_checkpd_users_thai_id_normalized
  ON checkpd.users (checkpd.normalize_thai_id(thai_id));

-- ── upsert_thai_id_card: normalize the auto-link match ──────────────────────
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
    RAISE EXCEPTION 'Thai ID must contain exactly 13 digits' USING ERRCODE = '22023';
  END IF;

  FOR v_index IN 1..12 LOOP
    v_sum := v_sum + substring(v_thai_id FROM v_index FOR 1)::INTEGER * (14 - v_index);
  END LOOP;
  v_expected_check_digit := (11 - (v_sum % 11)) % 10;

  IF substring(v_thai_id FROM 13 FOR 1)::INTEGER <> v_expected_check_digit THEN
    RAISE EXCEPTION 'Thai ID checksum is invalid' USING ERRCODE = '22023';
  END IF;

  SELECT COUNT(*), MIN(user_row.id)
    INTO v_match_count, v_candidate_user_id
  FROM checkpd.users AS user_row
  WHERE checkpd.normalize_thai_id(user_row.thai_id) = v_thai_id;

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

-- ── list_thai_id_cards: normalize the match_count subquery ──────────────────
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
        WHERE checkpd.normalize_thai_id(user_row.thai_id) = card.thai_id
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

-- ── new: normalized candidate lookup for the detail/link routes ─────────────
-- Used by GET /api/thai-id-reader/records/[thaiId] (candidate list) and the
-- PATCH link validation, so both stop relying on an exact `.eq('thai_id', ...)`
-- that misses dirty-formatted rows.
CREATE OR REPLACE FUNCTION checkpd.find_users_by_normalized_thai_id(p_thai_id TEXT)
RETURNS TABLE (
  id TEXT,
  thai_id TEXT,
  first_name TEXT,
  last_name TEXT,
  phone_number TEXT
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = checkpd, public
AS $$
  SELECT user_row.id, user_row.thai_id, user_row.first_name, user_row.last_name, user_row.phone_number
  FROM checkpd.users AS user_row
  WHERE checkpd.normalize_thai_id(user_row.thai_id) = checkpd.normalize_thai_id(p_thai_id)
  ORDER BY user_row.id;
$$;

REVOKE ALL ON FUNCTION checkpd.normalize_thai_id(TEXT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION checkpd.upsert_thai_id_card(jsonb) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION checkpd.list_thai_id_cards(TEXT, TEXT, INTEGER, INTEGER) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION checkpd.find_users_by_normalized_thai_id(TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION checkpd.normalize_thai_id(TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION checkpd.upsert_thai_id_card(jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION checkpd.list_thai_id_cards(TEXT, TEXT, INTEGER, INTEGER) TO service_role;
GRANT EXECUTE ON FUNCTION checkpd.find_users_by_normalized_thai_id(TEXT) TO service_role;

-- ── one-time backfill: retroactively auto-link cards left "unlinked" only ──
-- because of formatting drift, now that the match is normalized. Never
-- touches a card that already has a user_id, and still skips >1 matches
-- (needs_review stays needs_review — this does not guess between duplicates).
WITH candidates AS (
  SELECT
    card.thai_id,
    (
      SELECT user_row.id
      FROM checkpd.users user_row
      WHERE checkpd.normalize_thai_id(user_row.thai_id) = card.thai_id
    ) AS matched_user_id,
    (
      SELECT COUNT(*)
      FROM checkpd.users user_row
      WHERE checkpd.normalize_thai_id(user_row.thai_id) = card.thai_id
    ) AS match_count
  FROM checkpd.thai_id_cards card
  WHERE card.user_id IS NULL
)
UPDATE checkpd.thai_id_cards card
SET user_id = candidates.matched_user_id,
    linked_at = now()
FROM candidates
WHERE card.thai_id = candidates.thai_id
  AND candidates.match_count = 1
  AND candidates.matched_user_id IS NOT NULL;
