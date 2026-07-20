-- PLAN-027: Aggregate dashboard stats in Postgres. Source of truth for public.dashboard_stats.
-- Counting policy (revised 2026-07-13): RAW ROW COUNT over user_record_summary_with_users
-- (matches Looker Studio COUNT(id)); download_count = same filtered row count as the charts.

CREATE INDEX IF NOT EXISTS idx_checkpd_user_risk_user_parent_timestamp
  ON public.checkpd_user_risk (user_id, parent_timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_checkpd_user_risk_province_parent_timestamp
  ON public.checkpd_user_risk (province, parent_timestamp DESC);

-- Legacy (20260710): supported the old checkpd.users download count; kept for other readers.
CREATE INDEX IF NOT EXISTS idx_checkpd_users_created_province_area
  ON checkpd.users (firebase_created_at, province, area);
CREATE OR REPLACE FUNCTION public.dashboard_stats(
  p_start    date DEFAULT NULL,
  p_end      date DEFAULT NULL,
  p_province text DEFAULT NULL,
  p_area     text DEFAULT NULL,
  p_risk     text DEFAULT 'all'
) RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, checkpd
AS $$
WITH params AS (
  SELECT
    p_start AS start_date,
    p_end AS end_date,
    NULLIF(BTRIM(p_province), '') AS province,
    NULLIF(BTRIM(p_area), '') AS area,
    CASE
      WHEN LOWER(COALESCE(NULLIF(BTRIM(p_risk), ''), 'all')) IN ('all', 'risk', 'no_risk', 'unknown')
        THEN LOWER(COALESCE(NULLIF(BTRIM(p_risk), ''), 'all'))
      ELSE 'all'
    END AS risk_filter
),
base AS MATERIALIZED (
  -- RAW rows, no dedupe: counting rule = Looker Studio's COUNT(id).
  SELECT
         v.id::text AS id,
         v.age,
         v.gender,
         v.province,
         v.area,
         v.condition,
         v.test_result
  FROM public.user_record_summary_with_users v
  CROSS JOIN params p
  WHERE (p.start_date IS NULL OR v.last_update >= p.start_date)
    AND (p.end_date IS NULL OR v.last_update < (p.end_date + 1))
    AND (p.province IS NULL OR v.province = p.province)
    AND (p.area IS NULL OR v.area = p.area)
),
risk_latest AS MATERIALIZED (
  SELECT DISTINCT ON (r.user_id)
         r.user_id::text AS user_id,
         LOWER(COALESCE(r.latest_status, '')) AS status
  FROM public.checkpd_user_risk r
  CROSS JOIN params p
  WHERE EXISTS (SELECT 1 FROM base b WHERE b.id = r.user_id::text)
    AND (p.start_date IS NULL OR r.parent_timestamp >= p.start_date)
    AND (p.end_date IS NULL OR r.parent_timestamp < (p.end_date + 1))
    AND (p.province IS NULL OR r.province = p.province)
  ORDER BY r.user_id, r.parent_timestamp DESC NULLS LAST
),
risk_bucket_by_row AS MATERIALIZED (
  -- one entry per base ROW; rows of the same user share that user's latest status
  SELECT
    b.id,
    CASE
      WHEN r.status = 'risk' THEN 'risk'
      WHEN r.status IN ('normal', 'no_risk') THEN 'normal'
      WHEN r.status IN ('pending', 'incomplete') THEN 'pending'
      ELSE 'no_test'
    END AS bucket
  FROM base b
  LEFT JOIN risk_latest r ON r.user_id = b.id
),
risk_counts AS (
  SELECT
    COUNT(*) FILTER (WHERE bucket = 'risk')::int AS risk,
    COUNT(*) FILTER (WHERE bucket = 'normal')::int AS normal,
    COUNT(*) FILTER (WHERE bucket = 'pending')::int AS pending,
    COUNT(*) FILTER (WHERE bucket = 'no_test')::int AS no_test
  FROM risk_bucket_by_row
),
test_result_counts AS (
  SELECT
    COUNT(*) FILTER (WHERE bucket = 'complete')::int AS complete,
    COUNT(*) FILTER (WHERE bucket = 'partial')::int AS partial,
    COUNT(*) FILTER (WHERE bucket = 'unattempt')::int AS unattempt
  FROM (
    SELECT CASE
      WHEN LOWER(COALESCE(test_result, '')) LIKE '%incomplete%'
        OR LOWER(COALESCE(test_result, '')) LIKE '%partial%'
        OR LOWER(COALESCE(test_result, '')) LIKE '%บางส่วน%'
        THEN 'partial'
      WHEN LOWER(COALESCE(test_result, '')) LIKE '%unattempt%'
        OR LOWER(COALESCE(test_result, '')) LIKE '%ไม่ได้ทำ%'
        THEN 'unattempt'
      WHEN LOWER(COALESCE(test_result, '')) LIKE '%complete%'
        OR LOWER(COALESCE(test_result, '')) LIKE '%ทำแบบทดสอบครับ%'
        OR LOWER(COALESCE(test_result, '')) LIKE '%ทำแบบทดสอบ%'
        THEN 'complete'
      ELSE 'unattempt'
    END AS bucket
    FROM base
  ) mapped
),
condition_counts AS (
  SELECT
    COUNT(*) FILTER (WHERE condition_norm = 'pd')::int AS pd,
    COUNT(*) FILTER (WHERE condition_norm = 'pdm' OR condition_norm LIKE '%prodromal%')::int AS pdm,
    COUNT(*) FILTER (WHERE condition_norm IN ('ctrl', 'control'))::int AS ctrl,
    COUNT(*) FILTER (WHERE condition_norm = 'other')::int AS other
  FROM (
    SELECT LOWER(BTRIM(COALESCE(condition, ''))) AS condition_norm
    FROM base
  ) normalized
),
gender_counts AS (
  SELECT
    COUNT(*) FILTER (WHERE gender_norm = 'male')::int AS male,
    COUNT(*) FILTER (WHERE gender_norm = 'female')::int AS female,
    COUNT(*) FILTER (WHERE gender_norm NOT IN ('male', 'female'))::int AS other
  FROM (
    SELECT LOWER(BTRIM(COALESCE(gender, ''))) AS gender_norm
    FROM base
  ) normalized
),
age_bucket_counts AS (
  SELECT bucket, COUNT(*)::int AS count
  FROM (
    SELECT CASE
      WHEN age IS NULL THEN 'ไม่ระบุ'
      WHEN age <= 20 THEN '0-20'
      WHEN age <= 40 THEN '21-40'
      WHEN age <= 60 THEN '41-60'
      WHEN age <= 80 THEN '61-80'
      ELSE '81+'
    END AS bucket
    FROM base
  ) buckets
  GROUP BY bucket
),
age_buckets AS (
  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object('label', labels.label, 'count', COALESCE(age_bucket_counts.count, 0))
      ORDER BY labels.sort
    ),
    '[]'::jsonb
  ) AS value
  FROM (
    VALUES
      (1, '0-20'),
      (2, '21-40'),
      (3, '41-60'),
      (4, '61-80'),
      (5, '81+'),
      (6, 'ไม่ระบุ')
  ) AS labels(sort, label)
  LEFT JOIN age_bucket_counts ON age_bucket_counts.bucket = labels.label
),
province_top AS (
  SELECT COALESCE(
    jsonb_agg(jsonb_build_object('name', name, 'count', count) ORDER BY count DESC, name ASC),
    '[]'::jsonb
  ) AS value
  FROM (
    SELECT COALESCE(NULLIF(BTRIM(province), ''), 'ไม่ระบุจังหวัด') AS name, COUNT(*)::int AS count
    FROM base
    GROUP BY COALESCE(NULLIF(BTRIM(province), ''), 'ไม่ระบุจังหวัด')
    ORDER BY count DESC, name ASC
    LIMIT 15
  ) ranked
),
province_options AS (
  SELECT COALESCE(jsonb_agg(province ORDER BY province), '[]'::jsonb) AS value
  FROM (
    SELECT DISTINCT BTRIM(v.province) AS province
    FROM public.user_record_summary_with_users v
    CROSS JOIN params p
    WHERE (p.start_date IS NULL OR v.last_update >= p.start_date)
      AND (p.end_date IS NULL OR v.last_update < (p.end_date + 1))
      AND BTRIM(COALESCE(v.province, '')) <> ''
  ) provinces
),
area_options AS (
  SELECT COALESCE(jsonb_agg(area ORDER BY area), '[]'::jsonb) AS value
  FROM (
    SELECT DISTINCT BTRIM(v.area) AS area
    FROM public.user_record_summary_with_users v
    CROSS JOIN params p
    WHERE (p.start_date IS NULL OR v.last_update >= p.start_date)
      AND (p.end_date IS NULL OR v.last_update < (p.end_date + 1))
      AND (p.province IS NULL OR v.province = p.province)
      AND BTRIM(COALESCE(v.area, '')) <> ''
  ) areas
),
download_count AS (
  -- Unified with the chart totals: same filtered row count, so the download
  -- card always equals the pie "ทั้งหมด". Risk filter narrows to matching rows.
  SELECT CASE
    WHEN p.risk_filter = 'risk'    THEN (SELECT COUNT(*) FROM risk_bucket_by_row WHERE bucket = 'risk')
    WHEN p.risk_filter = 'no_risk' THEN (SELECT COUNT(*) FROM risk_bucket_by_row WHERE bucket = 'normal')
    WHEN p.risk_filter = 'unknown' THEN (SELECT COUNT(*) FROM risk_bucket_by_row WHERE bucket = 'pending')
    ELSE (SELECT COUNT(*) FROM base)
  END::int AS count
  FROM params p
)
SELECT jsonb_build_object(
  'risk_counts', jsonb_build_object(
    'risk', risk_counts.risk,
    'normal', risk_counts.normal,
    'pending', risk_counts.pending,
    'noTest', risk_counts.no_test
  ),
  'test_result_counts', jsonb_build_object(
    'complete', test_result_counts.complete,
    'partial', test_result_counts.partial,
    'unattempt', test_result_counts.unattempt
  ),
  'condition_counts', jsonb_build_object(
    'pd', condition_counts.pd,
    'pdm', condition_counts.pdm,
    'ctrl', condition_counts.ctrl,
    'other', condition_counts.other
  ),
  'gender_counts', jsonb_build_object(
    'male', gender_counts.male,
    'female', gender_counts.female,
    'other', gender_counts.other
  ),
  'age_buckets', age_buckets.value,
  'province_top', province_top.value,
  'province_options', province_options.value,
  'area_options', area_options.value,
  'download_count', download_count.count,
  'total_users', (SELECT COUNT(*)::int FROM base),
  'generated_at', TO_CHAR(NOW() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')
)
FROM risk_counts
CROSS JOIN test_result_counts
CROSS JOIN condition_counts
CROSS JOIN gender_counts
CROSS JOIN age_buckets
CROSS JOIN province_top
CROSS JOIN province_options
CROSS JOIN area_options
CROSS JOIN download_count;
$$;

REVOKE ALL ON FUNCTION public.dashboard_stats(date, date, text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.dashboard_stats(date, date, text, text, text) TO authenticated, service_role;
