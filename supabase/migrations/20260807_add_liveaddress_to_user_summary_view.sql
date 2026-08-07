-- The Users page's district (อำเภอ) column/filter derives the district from
-- Live Address (see app/pages/users/provinceDistricts.ts, sourced from
-- app/pages/users/district.md's regex list), but public.user_record_summary_with_users
-- — the view app/pages/users/page.tsx reads via `.from('user_record_summary_with_users').select('*')`
-- — never exposed public.users.liveaddress. Without this column the derived
-- district always renders "-" and the district ILIKE filter errors (column
-- does not exist). Additive only: appended at the end so existing consumers
-- selecting specific columns are unaffected.

CREATE OR REPLACE VIEW user_record_summary_with_users AS
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
  rs.last_update_gcp,
  u.liveaddress
FROM users u
LEFT JOIN user_record_summary rs
  ON u.id = rs.user_id;
