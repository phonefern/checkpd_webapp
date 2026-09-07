-- Widens public.dashboard_stats' grant to include `anon`, so the new public
-- checkpd-public-stat Vercel project (see docs/PLAN_029_PUBLIC_STAT_EMBED.md)
-- can call it with just the Supabase anon key — no login, no anonymous
-- Supabase auth session (which would be awkward/blocked inside a third-party
-- WordPress iframe due to third-party-cookie restrictions in some browsers).
--
-- Safety justification: dashboard_stats' payload has been PII-free by design
-- since PLAN-027 — risk_counts, test_result_counts, condition_counts,
-- gender_counts, age_buckets, province_top/options, area_options,
-- download_count, generated_at. No firstname/lastname/thaiid/any per-row
-- data ever leaves this function. Widening its grant to `anon` does not
-- change what data is exposed, only who can ask for the (already-aggregate)
-- numbers.
--
-- This is purely additive: authenticated/service_role keep working exactly
-- as before (PLAN-027's guest-mode /pages/dashboard is unaffected).

GRANT EXECUTE ON FUNCTION public.dashboard_stats(date, date, text, text, text) TO anon;
