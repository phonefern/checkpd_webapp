-- Flat read model for the storage page. The aliases preserve the legacy API
-- response shape while sourcing records from the normalized checkpd schema.
CREATE OR REPLACE VIEW checkpd.user_record_storage_list AS
SELECT
  rs.user_id        AS id,
  rs.record_id      AS record_id,
  u.first_name      AS firstname,
  u.last_name       AS lastname,
  u.thai_id         AS thaiid,
  u.province        AS province,
  u.gender          AS gender,
  u.area            AS area,
  rs.condition      AS condition,
  rs.test_result    AS test_result,
  rs.prediction_risk AS prediction_risk,
  rs.version        AS version,
  u.user_timestamp  AS "timestamp",
  rs.updated_at     AS last_update,
  rs.last_migrate   AS last_migrate,
  rs.last_record_at AS effective_date,
  u.event_id        AS event_id
FROM checkpd.record_summary AS rs
LEFT JOIN checkpd.users AS u ON u.id = rs.user_id
INNER JOIN (
  SELECT DISTINCT
    split_part(name, '/', 1) AS user_id,
    split_part(name, '/', 2) AS record_id
  FROM storage.objects
  WHERE bucket_id = 'checkpd'
    AND split_part(name, '/', 1) <> ''
    AND split_part(name, '/', 2) <> ''
    AND split_part(name, '/', 3) <> ''
) AS stored
  ON stored.user_id = rs.user_id
 AND stored.record_id = rs.record_id
WHERE rs.condition IS NOT NULL;

GRANT SELECT ON checkpd.user_record_storage_list
TO service_role, anon, authenticated;
