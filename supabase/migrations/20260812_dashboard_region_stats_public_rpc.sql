-- Public, unauthenticated region-breakdown stat for the WordPress embed
-- (checkpd.org) — see docs/PLAN_029_PUBLIC_STAT_EMBED.md. Deliberately
-- SEPARATE from public.dashboard_stats (granted only to authenticated/
-- service_role): this one is granted to `anon` too, since it will be called
-- with the anon key from a second, low-trust Vercel project with no login.
--
-- Safety: returns ONLY region names + integer counts — zero PII, zero
-- per-row data, same aggregate-only principle as dashboard_stats.
--
-- Region mapping: Thailand's official 6-region classification (ราชบัณฑิตยสภา /
-- คณะกรรมการภูมิศาสตร์แห่งชาติ, 2520), with กรุงเทพมหานคร split out of
-- ภาคกลาง into its own bucket — matching the existing WordPress stat block's
-- layout (checkpd.org shows กรุงเทพมหานคร as a distinct tile next to ภาคกลาง,
-- not folded into it). Sources cross-checked 2026-08-12:
--   https://th.wikipedia.org/wiki/ภูมิภาคของประเทศไทย
--   https://www.thairath.co.th/lifestyle/travel/2701496
-- Province spellings match app/types/user.ts's provinceOptions exactly.
--
-- Counting rule: RAW ROW COUNT over user_record_summary_with_users (same
-- convention as public.dashboard_stats — matches Looker Studio, matches the
-- "big cumulative number" framing of the existing WordPress block).

CREATE OR REPLACE FUNCTION public.dashboard_region_stats(
  p_start date DEFAULT NULL,
  p_end   date DEFAULT NULL
) RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
WITH params AS (
  SELECT p_start AS start_date, p_end AS end_date
),
region_map(province, region) AS (
  VALUES
    -- ภาคเหนือ (9)
    ('เชียงราย','ภาคเหนือ'), ('น่าน','ภาคเหนือ'), ('พะเยา','ภาคเหนือ'), ('เชียงใหม่','ภาคเหนือ'),
    ('แม่ฮ่องสอน','ภาคเหนือ'), ('แพร่','ภาคเหนือ'), ('ลำปาง','ภาคเหนือ'), ('ลำพูน','ภาคเหนือ'),
    ('อุตรดิตถ์','ภาคเหนือ'),
    -- ภาคกลาง (21, กรุงเทพมหานคร แยกออกไปเป็นก้อนของตัวเอง)
    ('พิษณุโลก','ภาคกลาง'), ('สุโขทัย','ภาคกลาง'), ('เพชรบูรณ์','ภาคกลาง'), ('พิจิตร','ภาคกลาง'),
    ('กำแพงเพชร','ภาคกลาง'), ('นครสวรรค์','ภาคกลาง'), ('ลพบุรี','ภาคกลาง'), ('ชัยนาท','ภาคกลาง'),
    ('อุทัยธานี','ภาคกลาง'), ('สิงห์บุรี','ภาคกลาง'), ('อ่างทอง','ภาคกลาง'), ('สระบุรี','ภาคกลาง'),
    ('พระนครศรีอยุธยา','ภาคกลาง'), ('สุพรรณบุรี','ภาคกลาง'), ('นครนายก','ภาคกลาง'), ('ปทุมธานี','ภาคกลาง'),
    ('นนทบุรี','ภาคกลาง'), ('นครปฐม','ภาคกลาง'), ('สมุทรปราการ','ภาคกลาง'), ('สมุทรสาคร','ภาคกลาง'),
    ('สมุทรสงคราม','ภาคกลาง'),
    -- กรุงเทพมหานคร (1, own bucket)
    ('กรุงเทพมหานคร','กรุงเทพมหานคร'),
    -- ภาคตะวันออกเฉียงเหนือ (20)
    ('หนองคาย','ภาคตะวันออกเฉียงเหนือ'), ('นครพนม','ภาคตะวันออกเฉียงเหนือ'), ('สกลนคร','ภาคตะวันออกเฉียงเหนือ'),
    ('อุดรธานี','ภาคตะวันออกเฉียงเหนือ'), ('หนองบัวลำภู','ภาคตะวันออกเฉียงเหนือ'), ('เลย','ภาคตะวันออกเฉียงเหนือ'),
    ('มุกดาหาร','ภาคตะวันออกเฉียงเหนือ'), ('กาฬสินธุ์','ภาคตะวันออกเฉียงเหนือ'), ('ขอนแก่น','ภาคตะวันออกเฉียงเหนือ'),
    ('อำนาจเจริญ','ภาคตะวันออกเฉียงเหนือ'), ('ยโสธร','ภาคตะวันออกเฉียงเหนือ'), ('ร้อยเอ็ด','ภาคตะวันออกเฉียงเหนือ'),
    ('มหาสารคาม','ภาคตะวันออกเฉียงเหนือ'), ('ชัยภูมิ','ภาคตะวันออกเฉียงเหนือ'), ('นครราชสีมา','ภาคตะวันออกเฉียงเหนือ'),
    ('บุรีรัมย์','ภาคตะวันออกเฉียงเหนือ'), ('สุรินทร์','ภาคตะวันออกเฉียงเหนือ'), ('ศรีสะเกษ','ภาคตะวันออกเฉียงเหนือ'),
    ('อุบลราชธานี','ภาคตะวันออกเฉียงเหนือ'), ('บึงกาฬ','ภาคตะวันออกเฉียงเหนือ'),
    -- ภาคตะวันออก (7)
    ('สระแก้ว','ภาคตะวันออก'), ('ปราจีนบุรี','ภาคตะวันออก'), ('ฉะเชิงเทรา','ภาคตะวันออก'), ('ชลบุรี','ภาคตะวันออก'),
    ('ระยอง','ภาคตะวันออก'), ('จันทบุรี','ภาคตะวันออก'), ('ตราด','ภาคตะวันออก'),
    -- ภาคตะวันตก (5)
    ('ตาก','ภาคตะวันตก'), ('กาญจนบุรี','ภาคตะวันตก'), ('ราชบุรี','ภาคตะวันตก'), ('เพชรบุรี','ภาคตะวันตก'),
    ('ประจวบคีรีขันธ์','ภาคตะวันตก'),
    -- ภาคใต้ (14)
    ('ชุมพร','ภาคใต้'), ('ระนอง','ภาคใต้'), ('สุราษฎร์ธานี','ภาคใต้'), ('นครศรีธรรมราช','ภาคใต้'),
    ('กระบี่','ภาคใต้'), ('พังงา','ภาคใต้'), ('ภูเก็ต','ภาคใต้'), ('พัทลุง','ภาคใต้'), ('ตรัง','ภาคใต้'),
    ('ปัตตานี','ภาคใต้'), ('สงขลา','ภาคใต้'), ('สตูล','ภาคใต้'), ('นราธิวาส','ภาคใต้'), ('ยะลา','ภาคใต้')
),
base AS MATERIALIZED (
  -- RAW rows (no dedupe) — matches public.dashboard_stats' counting rule.
  SELECT v.province
  FROM public.user_record_summary_with_users v
  CROSS JOIN params p
  WHERE (p.start_date IS NULL OR v.last_update >= p.start_date)
    AND (p.end_date IS NULL OR v.last_update < (p.end_date + 1))
),
bucketed AS (
  SELECT COALESCE(rm.region, 'ไม่ระบุภาค') AS region
  FROM base b
  LEFT JOIN region_map rm ON rm.province = BTRIM(b.province)
),
region_counts AS (
  SELECT region, COUNT(*)::int AS count
  FROM bucketed
  GROUP BY region
)
SELECT jsonb_build_object(
  'total', (SELECT COUNT(*)::int FROM base),
  'regions', COALESCE(
    (
      SELECT jsonb_agg(jsonb_build_object('name', labels.label, 'count', COALESCE(region_counts.count, 0)) ORDER BY labels.sort)
      FROM (
        VALUES
          (1, 'กรุงเทพมหานคร'), (2, 'ภาคกลาง'), (3, 'ภาคเหนือ'),
          (4, 'ภาคตะวันออกเฉียงเหนือ'), (5, 'ภาคใต้'), (6, 'ภาคตะวันออก'),
          (7, 'ภาคตะวันตก'), (8, 'ไม่ระบุภาค')
      ) AS labels(sort, label)
      LEFT JOIN region_counts ON region_counts.region = labels.label
    ),
    '[]'::jsonb
  ),
  'generated_at', TO_CHAR(NOW() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')
);
$$;

-- Public read: this function is meant to be called with the ANON key from a
-- separate, low-trust Vercel project (no login) — unlike dashboard_stats,
-- anon IS granted here, deliberately. It returns aggregate counts only.
REVOKE ALL ON FUNCTION public.dashboard_region_stats(date, date) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.dashboard_region_stats(date, date) TO anon, authenticated, service_role;
