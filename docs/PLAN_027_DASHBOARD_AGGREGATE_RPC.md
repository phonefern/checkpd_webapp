# PLAN-027 — Dashboard aggregate RPC (single-call stats, no PII to browser, nationwide-ready)

## Overview

The stats dashboard at [`app/pages/dashboard/page.tsx`](../app/pages/dashboard/page.tsx) currently
loads in **40+ seconds**. The cause is architectural: the client downloads the **entire raw dataset**
and aggregates it in the browser —

1. `fetchViewRows` pages through `public.user_record_summary_with_users` **1,000 rows at a time in a
   sequential `while` loop** (~80k users → ~80 chained round-trips). Each page re-executes the view
   with `ORDER BY last_update` at an increasing offset, so the database re-materializes and re-sorts
   the view for every page (O(n²) overall).
2. `fetchRiskRows` runs the same sequential pagination loop over `public.checkpd_user_risk`.
3. The browser then dedupes by `id` and computes every widget (risk KPIs, test-result counts,
   condition, gender, age buckets, top-15 provinces) in JavaScript.

The page ultimately displays **a few dozen aggregate numbers**, yet transfers tens of MB of raw rows
to compute them client-side.

**This dashboard is about to become a nationwide, guest-mode surface** for อสม. (village health
volunteers), provincial officials, and the Thai Red Cross to view screening totals across the
country. That raises a second, more serious problem: the current query selects `firstname, lastname`
(never rendered) — so every viewer's browser receives the **names of all ~80k app users** in the
network payload. That is a PDPA exposure and must be eliminated in the same change.

**Reason for change:** "ผมกิน query นานมาก 40+ วินาที … ผมจะทำเป็น dashboard ให้คนทั่วประเทศ
(อสม., เจ้าหน้าที่จังหวัด, สภากาชาด) ดูข้อมูลจำนวนการคัดกรองทั่วประเทศผ่านหน้านี้"

**The fix:** move all aggregation into Postgres. One `SECURITY DEFINER` RPC returns every number the
page needs as a single JSON payload (~2 KB). The client makes **1 request instead of ~160**, and no
row-level data (let alone PII) ever leaves the database. A thin cached API route in front of the RPC
absorbs nationwide traffic so N concurrent viewers cost 1 DB query per cache window.

## Related plans

- [[PLAN-012]] — defined the dashboard surface (KPIs, pies, filters). UI is **unchanged** by this plan.
- [[PLAN-013]] — previous optimization plan written for the *old* dashboard at `app/pages/index/page.tsx`.
  Its RPCs (`dashboard_kpi`, `dashboard_province_breakdown`, …) were never wired into the current
  `/pages/dashboard` page. **This plan supersedes PLAN-013 for the current page.** Its layered
  philosophy (view → RPC → cache) still applies; the split into 3 RPCs does not (one RPC is enough).
- [[PLAN-014]] — guest mode (Supabase Anonymous Sign-In) + the `dashboard_guest_download_count` RPC.
  That RPC is the security precedent to follow: `SECURITY DEFINER`, granted to `authenticated` only
  (guests are anonymous *authenticated* sessions — **never grant to `anon`**). This plan folds its
  download-count into the new unified RPC and deprecates it.

## Scope

### In scope
1. **Migration**: one SQL function `public.dashboard_stats(p_start, p_end, p_province, p_area, p_risk)`
   returning `jsonb` with every aggregate the page renders, plus supporting indexes if missing.
2. **Client refactor** of `app/pages/dashboard/page.tsx`: replace `fetchViewRows` + `fetchRiskRows` +
   `fetchDownloadCount` + all client-side aggregation with a single fetch. UI markup untouched.
3. **Cached API route** `app/api/dashboard/stats/route.ts` *(new)* — server-side cache (5-minute
   revalidate) keyed by the filter combination, so nationwide concurrent viewers share one DB hit.
4. **PII removal**: after this plan, no dashboard network response contains `firstname`, `lastname`,
   or any per-user row.

### Out of scope
- **Materialized view / pg_cron refresh** — not needed at 80k rows; a live `GROUP BY` with indexes is
  tens of ms. Revisit only if the RPC itself exceeds ~1 s at future scale (follow-up plan).
- **Truly public (no-login) access** — viewers still enter via guest mode (PLAN-014 anonymous
  sign-in). Removing the login step entirely is a separate access-control decision.
- **New visualizations** (e.g. Thailand choropleth map for the nationwide audience) — seed for PLAN-028.
- **The `/pages/index` legacy dashboard and PLAN-013's proposed objects** — untouched; do not create
  `checkpd.v_user_risk_latest` or the 3 PLAN-013 RPCs.
- **Redis/external cache** — Next.js route-level caching is sufficient; per-tab LRU (PLAN-013 §3) is
  dropped since the server cache makes it redundant.

## Preflight checks (run before coding)

```bash
# 1. Confirm the current fetch loops and PII selection exist as described
grep -n "FETCH_BATCH\|firstname,lastname\|fetchViewRows\|fetchRiskRows" app/pages/dashboard/page.tsx

# 2. Confirm the guest RPC precedent + check for name collisions
# Run in Supabase SQL editor:
#   SELECT proname, prosecdef FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
#   WHERE n.nspname = 'public' AND proname LIKE 'dashboard_%';
# Expected: dashboard_guest_download_count exists (SECURITY DEFINER); dashboard_stats does not.

# 3. Confirm the shape of the two sources the RPC will read
#   \d public.checkpd_user_risk          -- table: (kind, user_id) PK, latest_status, province, parent_timestamp
#   \d+ public.user_record_summary_with_users   -- view: id, last_update, province, area, age, gender, condition, test_result
# Also capture the view's underlying SELECT (pg_views.definition) — if the view itself is a heavy
# join, the RPC may query its base tables directly instead (Codex's discretion; measure first).

# 4. Baseline timing for the acceptance metric
#   EXPLAIN ANALYZE SELECT count(*) FROM public.user_record_summary_with_users;

# 5. Confirm middleware does NOT match /api routes (it matches /pages/:path* only)
grep -n "matcher" middleware.ts
# → the new /api/dashboard/stats route must do its own session check (see Edge cases #6).
```

## Data model / SQL design

One function, one round-trip. Sketch (final SQL at Codex's discretion — the **semantics parity rules**
below are the contract, not this exact SQL):

```sql
-- supabase/migrations/<ts>_dashboard_stats_rpc.sql
CREATE OR REPLACE FUNCTION public.dashboard_stats(
  p_start    date DEFAULT NULL,   -- filters.startDate
  p_end      date DEFAULT NULL,   -- filters.endDate (inclusive)
  p_province text DEFAULT NULL,
  p_area     text DEFAULT NULL,
  p_risk     text DEFAULT 'all'   -- 'all' | 'risk' | 'no_risk' | 'unknown'
) RETURNS jsonb
LANGUAGE sql STABLE
SECURITY DEFINER
SET search_path = public, checkpd
AS $$
WITH base AS (
  -- one row per user id, same "first row wins, ordered by last_update DESC" dedupe
  -- the client does today (Map keyed by id over rows sorted last_update DESC)
  SELECT DISTINCT ON (v.id)
         v.id, v.age, v.gender, v.province, v.area, v.condition, v.test_result
  FROM public.user_record_summary_with_users v
  WHERE (p_start    IS NULL OR v.last_update >= p_start)
    AND (p_end      IS NULL OR v.last_update <  (p_end + 1))
    AND (p_province IS NULL OR v.province = p_province)
    AND (p_area     IS NULL OR v.area = p_area)
  ORDER BY v.id, v.last_update DESC NULLS LAST
),
risk AS (
  -- latest risk status per user, restricted to users in `base`
  SELECT DISTINCT ON (r.user_id)
         r.user_id, lower(coalesce(r.latest_status, '')) AS st
  FROM public.checkpd_user_risk r
  WHERE r.user_id IN (SELECT id FROM base)
    AND (p_start IS NULL OR r.parent_timestamp >= p_start)
    AND (p_end   IS NULL OR r.parent_timestamp <  (p_end + 1))
  ORDER BY r.user_id, r.parent_timestamp DESC NULLS LAST
)
SELECT jsonb_build_object(
  'risk_counts',        (...),  -- risk / normal / pending / no_test buckets (rules #2)
  'test_result_counts', (...),  -- complete / partial / unattempt (rules #3)
  'condition_counts',   (...),  -- pd / pdm / ctrl / other
  'gender_counts',      (...),  -- male / female / other
  'age_buckets',        (...),  -- '0-20','21-40','41-60','61-80','81+','ไม่ระบุ'
  'province_top',       (...),  -- top 15 [{name, count}]
  'province_options',   (...),  -- distinct provinces (see rules #5)
  'area_options',       (...),  -- distinct areas within p_province (see rules #5)
  'download_count',     (...),  -- from checkpd.users (rules #4)
  'total_users',        (SELECT count(*) FROM base)
);
$$;

REVOKE ALL ON FUNCTION public.dashboard_stats FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.dashboard_stats TO authenticated;
```

Supporting indexes — create only if the preflight `EXPLAIN ANALYZE` shows seq-scan pain:

```sql
CREATE INDEX IF NOT EXISTS idx_checkpd_user_risk_user_ts
  ON public.checkpd_user_risk (user_id, parent_timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_checkpd_user_risk_province
  ON public.checkpd_user_risk (province);
```

### Semantics parity rules (the contract)

The RPC must reproduce the client-side aggregation in
[`page.tsx:209-301`](../app/pages/dashboard/page.tsx) exactly, so the numbers do not shift when the
page switches over:

1. **Dedupe**: one row per `id`, keeping the most-recent `last_update` (the current client keeps the
   first row of a `last_update DESC` sort).
2. **Risk buckets** (from latest status per user, matched to deduped users):
   `'risk'` → risk; `'normal' | 'no_risk'` → normal; `'pending' | 'incomplete'` → pending;
   anything else / no risk row → no_test.
3. **Test-result mapping**: SQL `CASE` mirroring `mapTestResultToThai` — check *incomplete/partial/
   บางส่วน* first → partial; then *unattempt/ไม่ได้ทำ* → unattempt; then *complete/ทำแบบทดสอบ* →
   complete; default → unattempt. Case-insensitive, substring matches (`ILIKE '%...%'`), same
   precedence order.
4. **Download count**: same logic as `fetchDownloadCount` — count `checkpd.users`; apply
   `firebase_created_at` range + province + area filters **only when a date range is set**, else the
   grand total. Fold in the current "adjusted" behaviour: when a date range is set AND
   `p_risk <> 'all'`, cap the count at the number of base users whose risk bucket matches `p_risk`
   (`risk`→risk, `no_risk`→normal, `unknown`→pending).
5. **Filter options**: `province_options` = distinct non-blank provinces from the **date-filtered but
   NOT province-filtered** set (this fixes the latent bug where selecting a province collapses the
   dropdown to one entry); `area_options` = distinct non-blank areas within the selected province
   (or all areas when no province selected). Both sorted.
6. **Age buckets**: NULL → 'ไม่ระบุ'; else ≤20, ≤40, ≤60, ≤80, 81+. Blank/whitespace province →
   'ไม่ระบุจังหวัด' in `province_top`.

## Fetch strategy (client + cache route)

### `app/api/dashboard/stats/route.ts` *(new)*

```ts
// GET /api/dashboard/stats?start=&end=&province=&area=&risk=
// 1. Session gate: verify a Supabase auth cookie is present (guest sessions pass —
//    same posture as middleware; the response contains aggregates only, no PII).
// 2. Call the RPC with the service-role client (server-side only).
// 3. Cache: wrap the RPC call in unstable_cache (or equivalent) keyed by the
//    normalized 5-param filter tuple, revalidate: 300 (5 min).
// 4. Return the jsonb payload with Cache-Control: private, max-age=60 as a
//    browser-side bonus.
```

Why a route instead of calling `supabase.rpc()` directly from the page: with a nationwide audience,
N viewers × direct RPC = N identical DB queries. The route collapses that to **1 query per filter
combination per 5 minutes** regardless of viewer count, and gives one place to add rate limiting
later (see [`lib/rateLimit.ts`](../lib/rateLimit.ts) if abuse appears).

### `app/pages/dashboard/page.tsx` refactor

- Delete: `ViewRow`, `RiskRow`, `FETCH_BATCH`, `fetchViewRows`, `fetchRiskRows`,
  `fetchDownloadCount`, `matchRiskStatus`, `mapTestResultToThai`, and the entire aggregation block in
  the `useEffect` (lines ~203-301).
- Replace with one `fetch('/api/dashboard/stats?...')` and direct `setState` from the JSON payload.
- Keep: all state shapes, all JSX, `DashboardFilters`, `TqdmSpinner`, guest banner — the UI must be
  pixel-identical. `dashboard_guest_download_count` usage disappears (the unified RPC covers both
  guest and staff; the old RPC stays in the DB, deprecated, dropped in a later cleanup).

## Files to create / modify

| File | Change |
|------|--------|
| `supabase/migrations/<ts>_dashboard_stats_rpc.sql` *(new)* | `public.dashboard_stats` function + `REVOKE`/`GRANT` + conditional indexes. |
| `app/pages/dashboard/dashboard_stats.sql` *(new)* | Copy of the function as schema source-of-truth, beside the page it serves (same convention as `app/pages/index/checkpd_user_risk.sql`). |
| `app/api/dashboard/stats/route.ts` *(new)* | Cached GET route: session gate → RPC via service role → 5-min server cache. |
| `app/pages/dashboard/page.tsx` | Remove batching/aggregation code (~150 lines); single fetch to the new route; UI unchanged. |
| `app/component/dashboard/types.ts` | Add the `DashboardStatsPayload` response type shared by route + page. |

## Edge cases & rules

1. **Numbers must not change.** Before merging, run old and new implementations side by side on
   production data with no filters and with each filter type; every widget must match. Any
   discrepancy is a parity-rule bug, not an acceptable "improvement."
2. **Empty result set** (e.g. filter combination with no users) → all counts zero, empty arrays —
   never `null` fields; the page renders zeros without crashing.
3. **`p_end` is inclusive** — the current client appends `T23:59:59`; the RPC uses `< p_end + 1 day`
   (strictly correct through microseconds). Document this in the SQL comment.
4. **SECURITY DEFINER hygiene**: `SET search_path` is mandatory; `REVOKE ... FROM PUBLIC, anon`
   before `GRANT ... TO authenticated` (PLAN-014 rule: guests are `authenticated`+`is_anonymous`,
   never `anon`).
5. **New-function grants gotcha** (CLAUDE.md): the route calls the RPC with the service role — verify
   `service_role` can execute it too (functions default-grant to PUBLIC on creation, but we revoke
   PUBLIC, so grant `service_role` explicitly alongside `authenticated`).
6. **The API route must gate on session presence.** Middleware only guards `/pages/:path*`; without a
   check, `/api/dashboard/stats` is world-readable. Cookie-presence check (same as middleware's
   `hasSupabaseAuthCookie` approach) is sufficient — the payload is aggregate-only.
7. **Cache staleness is acceptable and intentional** (5 min). Show the payload's own generated-at
   timestamp as "อัปเดตล่าสุด" instead of `new Date()` so the label is honest about cache age.
8. **Risk filter (`p_risk`) affects only `download_count`** in the current implementation — preserve
   that (do not filter the other widgets by risk), even though it feels inconsistent; changing the
   semantics is a product decision outside this plan.
9. **Long param values** — province/area arrive from user-controlled query strings; the RPC treats
   them as data (parameterized), never interpolated SQL. The route should trim + length-cap (e.g.
   100 chars) before passing through.

## Verification checklist

- [ ] Migration applies; `dashboard_stats` exists, `SECURITY DEFINER`, executable by `authenticated`
      and `service_role`, **not** by `anon`/`PUBLIC` (test with `SET ROLE anon; SELECT dashboard_stats();` → permission denied).
- [ ] `SELECT public.dashboard_stats();` completes in **< 1 s** on production-scale data (target: tens of ms).
- [ ] Dashboard full load (login → widgets rendered) **< 2 s**; Network tab shows **1** stats request
      (was ~160).
- [ ] Response payload contains **no** `firstname`/`lastname`/per-user rows — grep the response body.
- [ ] All widget numbers match the pre-refactor page (no filters + date-range + province + area + risk).
- [ ] Guest (anonymous) session loads the dashboard successfully; non-session `curl` to
      `/api/dashboard/stats` gets 401.
- [ ] Second page load within 5 minutes serves from cache (verify via server logs / response timing).
- [ ] Filter changes re-fetch and re-render correctly; Reset returns to defaults.
- [ ] Province dropdown still lists all provinces after selecting one (parity rule #5 fix).
- [ ] `npm run build` passes; no unused-import warnings from the deleted helpers.

## Out-of-scope follow-ups (seed for next PLAN numbers)

- **PLAN-028** — Nationwide public dashboard v2: Thailand province choropleth map, per-province
  drill-down, and possibly a fully login-less public URL with rate limiting.
- **Later** — drop the deprecated `dashboard_guest_download_count` RPC once no client references it;
  materialized-view + pg_cron refresh if data grows past the point where the live RPC exceeds ~1 s.

## Rollback plan

Confined to:
- `DROP FUNCTION public.dashboard_stats;` (additive object — nothing else references it).
- Delete `app/api/dashboard/stats/route.ts` + `app/pages/dashboard/dashboard_stats.sql`.
- Revert `app/pages/dashboard/page.tsx` and `types.ts` to the previous commit.

The old client-side path is fully restored by the revert; `dashboard_guest_download_count` was never
removed, so guest mode keeps working during rollback.
