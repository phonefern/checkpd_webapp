-- Repairs the original Thai ID upsert function after its initial deployment.
-- Qualifying the user-table column avoids collision with the RETURNS TABLE thai_id output variable.

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
