# PLAN-013: Dashboard Query Optimization — SQL view, server-side aggregates, filter cache

## Overview

PLAN-012 ships the dashboard with **client-side dedupe + aggregation** over the entire filtered `checkpd.record_summary` table. At today's scale (~50k+ users, 1-3 recorders each → 50k-150k rows) every filter change ships the full projection over the wire and re-aggregates in JS. Real-world load times reported as "ดึงมานานมาก."

This plan replaces that path with three optimization layers, applied in order:

1. **SQL view `checkpd.v_user_risk_latest`** — one row per `user_id` (latest `prediction_risk` by `last_record_at`), pre-joined with `checkpd.users` demographic columns. Cuts row count by 2-3× immediately and eliminates client dedupe.
2. **Server-side aggregate RPCs** — `dashboard_kpi`, `dashboard_province_breakdown`, `dashboard_amphoe_breakdown`. Each returns ≤ ~80 rows regardless of dataset size. KPI/chart queries no longer transfer raw user rows at all.
3. **In-memory filter cache** — module-level LRU keyed by serialized filter object, 5-minute TTL. Re-applying a recent filter (e.g. user clicks "Reset" then re-selects) returns instantly without re-querying.

After all three layers: a fresh page load runs **3 light RPC calls + 1 paginated table query** (~20 rows). Filter changes that hit the cache run **0 queries**. Filter changes that miss run the same 4 queries.

**Related plans**:
- PLAN-012 — defines the dashboard surface. This plan replaces its `Fetch strategy` (§4.1, §4.2, §4.3) only; the UI structure and filter bar are unchanged.
- PLAN-006 — established the `supabase.schema('checkpd').from(...)` read path. The new view and RPCs live in the same `checkpd` schema and inherit existing RLS.

**Reason for change.** PLAN-012's client-side path has three measurable costs:
1. **Network** — projecting `user_id, prediction_risk, last_record_at` on 150k rows transfers ~5-8 MB JSON (compressed ~1 MB) per filter change.
2. **JS parsing + dedupe** — `JSON.parse` + a `Set` walk + array reduce over 150k rows blocks the main thread for 200-500 ms on a mid-range laptop.
3. **No reuse** — toggling a filter and toggling it back re-runs everything; no memoization survives across the filter-state change.

A SQL view shifts dedupe to the DB (≤50k rows out instead of 150k). RPCs shift aggregation entirely — KPI/chart calls return 3-20 rows. Cache eliminates the third cost for back-and-forth filter exploration.

---

## Scope

### In scope
1. **Migration**: create `checkpd.v_user_risk_latest` view + three RPC functions in a new SQL migration file `app/pages/qa/checkpd_dashboard.sql`.
2. **Client refactor**: PLAN-012's `app/pages/index/page.tsx` switches its data hooks from raw-table reads to RPC calls + the new view.
3. **Cache layer**: add `app/component/dashboard/filterCache.ts` — a typed LRU keyed by filter hash, 5-minute TTL, max 20 entries.
4. **Type definitions** in `app/component/dashboard/types.ts` (PLAN-012 stub) for the new RPC return shapes.
5. **Verification**: timing harness in DevTools console + acceptance metric (full page load <800 ms on 50k user dataset).

### Out of scope
- **Materialized view**. A regular view is enough at <100k users. If `record_summary` grows past ~500k rows or query latency regresses, follow up with `CREATE MATERIALIZED VIEW` + refresh strategy in a separate plan.
- **Redis / external cache**. The in-memory cache is per-tab. Cross-tab cache is a different problem (BroadcastChannel + IndexedDB) and not justified yet.
- **Realtime subscriptions**. Dashboard reads are point-in-time; we don't subscribe to `record_summary` changes. If we ever do, the cache layer needs invalidation hooks.
- **Schema migration to add indexes on `prediction_risk`/`last_record_at`** — indexes already exist (see `app/pages/qa/checkpd_schema.sql` lines 257-261). The query planner should use them automatically.
- **Pagination/cache for the user table query**. v1 caches only the aggregate widgets; the paginated user table still queries fresh because page/filter combinations explode the keyspace. Revisit if profiling shows the table query is the bottleneck.

---

## Preflight checks (run before coding)

```bash
# 1. Confirm PLAN-012 lives at the expected entry point
grep -n "supabase.schema('checkpd')" app/pages/index/page.tsx || echo "PLAN-012 not implemented yet — implement that first"

# 2. Confirm checkpd indexes exist (already in checkpd_schema.sql lines 257-261)
grep -nE "idx_checkpd_summary_(risk|last_mig|condition)" app/pages/qa/checkpd_schema.sql

# 3. Confirm no existing v_user_risk_latest view / RPC
# Run in Supabase SQL editor:
#   SELECT viewname  FROM pg_views     WHERE schemaname='checkpd' AND viewname  LIKE 'v_user_risk%';
#   SELECT proname   FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
#     WHERE n.nspname='checkpd' AND p.proname LIKE 'dashboard_%';
# Expected: both empty.

# 4. Confirm RLS posture on checkpd schema (we must not bypass it)
#   SELECT relname, relrowsecurity FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
#     WHERE n.nspname='checkpd' AND c.relkind='r';
```

Expected: PLAN-012 page exists and queries checkpd directly; indexes present; no name collisions; existing RLS on `record_summary` and `users` is what we'll preserve via `SECURITY INVOKER`.

---

## Phase 1 — `checkpd.v_user_risk_latest` view

File: `app/pages/qa/checkpd_dashboard.sql` *(new)*

```sql
-- =============================================================
-- checkpd.v_user_risk_latest — one row per user, latest record
-- + demographics joined from checkpd.users
-- =============================================================
-- Dedupes record_summary by user_id. The "latest" row is the one
-- with the greatest last_record_at (NULLs last), tiebreak updated_at.
-- Renders the canonical (prediction_risk, condition, test_result)
-- for each user without client-side post-processing.
--
-- Security: SECURITY INVOKER (PG default for views). RLS on
-- checkpd.record_summary and checkpd.users still applies — the
-- view returns only rows the calling user can already read.

CREATE OR REPLACE VIEW checkpd.v_user_risk_latest AS
WITH ranked AS (
  SELECT
    rs.user_id,
    rs.recorder,
    rs.record_id,
    rs.source_collection,
    rs.prediction_risk,
    rs.condition,
    rs.test_result,
    rs.last_record_at,
    rs.updated_at,
    rs.thaiid,
    ROW_NUMBER() OVER (
      PARTITION BY rs.user_id
      ORDER BY rs.last_record_at DESC NULLS LAST,
               rs.updated_at     DESC NULLS LAST
    ) AS rn
  FROM checkpd.record_summary rs
)
SELECT
  r.user_id,
  r.recorder,
  r.record_id,
  r.source_collection,
  r.prediction_risk,
  r.condition,
  r.test_result,
  r.last_record_at,
  r.updated_at,
  r.thaiid,
  u.prefix_name,
  u.first_name,
  u.last_name,
  u.gender,
  u.age,
  u.phone_number,
  u.province,
  u.area,
  u.region,
  u.firebase_created_at
FROM ranked r
LEFT JOIN checkpd.users u ON u.id = r.user_id
WHERE r.rn = 1;

COMMENT ON VIEW checkpd.v_user_risk_latest IS
  'PLAN-013: one row per checkpd.users id with latest record_summary fields. Used by /pages/index dashboard.';
```

**Cardinality**: `record_summary` (~150k rows) → view (~50k rows, = distinct user_ids).

**Why a view (not materialized)**: row count is small enough that the window function + join completes in <100 ms with the existing indexes. Materializing introduces a refresh problem (cron? trigger? on-demand?) that's not worth it yet. Revisit at 500k+.

**Performance note**: the window function uses `idx_checkpd_summary_last_mig` partially (it's on `last_migrate`, not `last_record_at`). If profiling shows the view is slow, add:

```sql
CREATE INDEX IF NOT EXISTS idx_checkpd_summary_user_last_record
  ON checkpd.record_summary (user_id, last_record_at DESC NULLS LAST);
```

Add this conditionally — only if profiling indicates the view is the bottleneck. Don't ship speculative indexes.

---

## Phase 2 — Aggregate RPC functions

Same file. Three functions, all `STABLE` (read-only), `SECURITY INVOKER`. All take the same filter argument shape so the client can build one filter object and pass it to all three.

### 2.1 `checkpd.dashboard_kpi`

Returns one row per `prediction_risk` value (true / false / null) with the count.

```sql
CREATE OR REPLACE FUNCTION checkpd.dashboard_kpi(
  p_start_date  TIMESTAMPTZ DEFAULT NULL,
  p_end_date    TIMESTAMPTZ DEFAULT NULL,
  p_province    TEXT        DEFAULT NULL,
  p_area        TEXT        DEFAULT NULL,
  p_search      TEXT        DEFAULT NULL    -- matches first_name | last_name | thaiid (ilike)
)
RETURNS TABLE (
  risk_state TEXT,         -- 'risk' | 'no_risk' | 'unknown'
  user_count BIGINT
)
LANGUAGE sql STABLE SECURITY INVOKER AS $$
  SELECT
    CASE
      WHEN v.prediction_risk IS TRUE  THEN 'risk'
      WHEN v.prediction_risk IS FALSE THEN 'no_risk'
      ELSE 'unknown'
    END AS risk_state,
    COUNT(*) AS user_count
  FROM checkpd.v_user_risk_latest v
  WHERE (p_start_date IS NULL OR v.last_record_at >= p_start_date)
    AND (p_end_date   IS NULL OR v.last_record_at <= p_end_date)
    AND (p_province   IS NULL OR v.province = p_province)
    AND (p_area       IS NULL OR v.area     = p_area)
    AND (
      p_search IS NULL
      OR v.first_name ILIKE '%' || p_search || '%'
      OR v.last_name  ILIKE '%' || p_search || '%'
      OR v.thaiid     ILIKE '%' || p_search || '%'
    )
  GROUP BY 1;
$$;
```

Always returns 0-3 rows. The client computes percentages from these three numbers.

### 2.2 `checkpd.dashboard_province_breakdown`

```sql
CREATE OR REPLACE FUNCTION checkpd.dashboard_province_breakdown(
  p_start_date  TIMESTAMPTZ DEFAULT NULL,
  p_end_date    TIMESTAMPTZ DEFAULT NULL,
  p_risk        TEXT        DEFAULT NULL,   -- 'risk' | 'no_risk' | 'unknown' | NULL
  p_search      TEXT        DEFAULT NULL,
  p_limit       INTEGER     DEFAULT 15
)
RETURNS TABLE (
  province   TEXT,
  user_count BIGINT,
  is_tail    BOOLEAN          -- true for the synthetic "+ N more" row
)
LANGUAGE sql STABLE SECURITY INVOKER AS $$
  WITH filtered AS (
    SELECT
      COALESCE(NULLIF(TRIM(v.province), ''), 'ไม่ระบุ') AS province
    FROM checkpd.v_user_risk_latest v
    WHERE (p_start_date IS NULL OR v.last_record_at >= p_start_date)
      AND (p_end_date   IS NULL OR v.last_record_at <= p_end_date)
      AND (
        p_risk IS NULL
        OR (p_risk = 'risk'    AND v.prediction_risk IS TRUE)
        OR (p_risk = 'no_risk' AND v.prediction_risk IS FALSE)
        OR (p_risk = 'unknown' AND v.prediction_risk IS NULL)
      )
      AND (
        p_search IS NULL
        OR v.first_name ILIKE '%' || p_search || '%'
        OR v.last_name  ILIKE '%' || p_search || '%'
        OR v.thaiid     ILIKE '%' || p_search || '%'
      )
  ),
  ranked AS (
    SELECT province, COUNT(*) AS user_count,
           ROW_NUMBER() OVER (ORDER BY COUNT(*) DESC) AS rn
    FROM filtered
    GROUP BY province
  )
  SELECT province, user_count, FALSE AS is_tail
  FROM ranked WHERE rn <= p_limit
  UNION ALL
  SELECT 'อื่นๆ' AS province, COALESCE(SUM(user_count), 0) AS user_count, TRUE AS is_tail
  FROM ranked WHERE rn > p_limit
  HAVING SUM(user_count) > 0;
$$;
```

Returns ≤ `p_limit + 1` rows. **Province filter is intentionally omitted from the argument list** — PLAN-012 §Filter behaviour rule 2 says the province chart does not self-filter.

### 2.3 `checkpd.dashboard_amphoe_breakdown`

Same shape as 2.2, but groups by `area` and **does** accept `p_province` (rule 2: amphoe chart re-scopes to selected province).

```sql
CREATE OR REPLACE FUNCTION checkpd.dashboard_amphoe_breakdown(
  p_start_date  TIMESTAMPTZ DEFAULT NULL,
  p_end_date    TIMESTAMPTZ DEFAULT NULL,
  p_province    TEXT        DEFAULT NULL,
  p_risk        TEXT        DEFAULT NULL,
  p_search      TEXT        DEFAULT NULL,
  p_limit       INTEGER     DEFAULT 15
)
RETURNS TABLE (
  area       TEXT,
  user_count BIGINT,
  is_tail    BOOLEAN
)
LANGUAGE sql STABLE SECURITY INVOKER AS $$
  -- (body mirrors 2.2 with area in place of province, + p_province filter)
$$;
```

### Grants

```sql
GRANT SELECT ON checkpd.v_user_risk_latest TO authenticated;
GRANT EXECUTE ON FUNCTION checkpd.dashboard_kpi(TIMESTAMPTZ, TIMESTAMPTZ, TEXT, TEXT, TEXT)              TO authenticated;
GRANT EXECUTE ON FUNCTION checkpd.dashboard_province_breakdown(TIMESTAMPTZ, TIMESTAMPTZ, TEXT, TEXT, INT) TO authenticated;
GRANT EXECUTE ON FUNCTION checkpd.dashboard_amphoe_breakdown(TIMESTAMPTZ, TIMESTAMPTZ, TEXT, TEXT, TEXT, INT) TO authenticated;
```

`anon` is intentionally excluded — dashboard is behind login.

---

## Phase 3 — Client refactor

PLAN-012 stub `app/pages/index/page.tsx` and its child components are updated to call the RPCs.

### 3.1 KPI + pie chart — replaces PLAN-012 §4.1

```ts
const { data: kpi, error } = await supabase
  .schema('checkpd')
  .rpc('dashboard_kpi', {
    p_start_date: filters.startDate,
    p_end_date:   filters.endDate,
    p_province:   filters.province,
    p_area:       filters.area,
    p_search:     filters.search || null,
  })

// kpi: [{ risk_state: 'risk', user_count: 1234 }, ...]
const risk    = kpi?.find(r => r.risk_state === 'risk')?.user_count    ?? 0
const noRisk  = kpi?.find(r => r.risk_state === 'no_risk')?.user_count ?? 0
const unknown = kpi?.find(r => r.risk_state === 'unknown')?.user_count ?? 0
const total   = risk + noRisk + unknown
```

Drop the entire `for (const r of riskRows) { seen.add(...) }` dedupe block. The view does it.

### 3.2 Province / amphoe bars — replaces PLAN-012 §4.2

```ts
const [{ data: provinceRows }, { data: amphoeRows }] = await Promise.all([
  supabase.schema('checkpd').rpc('dashboard_province_breakdown', {
    p_start_date: filters.startDate, p_end_date: filters.endDate,
    p_risk: filters.risk === 'all' ? null : filters.risk,
    p_search: filters.search || null, p_limit: 15,
  }),
  supabase.schema('checkpd').rpc('dashboard_amphoe_breakdown', {
    p_start_date: filters.startDate, p_end_date: filters.endDate,
    p_province: filters.province, p_risk: filters.risk === 'all' ? null : filters.risk,
    p_search: filters.search || null, p_limit: 15,
  }),
])
```

Both responses are already sorted and capped. Render directly into recharts.

### 3.3 User table — keep the existing pattern, **but read from the view**

PLAN-012 §4.3 uses two queries (record_summary then users). Collapse to one against the view:

```ts
let q = supabase
  .schema('checkpd')
  .from('v_user_risk_latest')
  .select(
    'user_id,first_name,last_name,gender,age,province,area,thaiid,phone_number,' +
    'prediction_risk,condition,test_result,last_record_at',
    { count: 'exact' }
  )
  .order('last_record_at', { ascending: false, nullsFirst: false })
  .range(from, to)

if (filters.startDate) q = q.gte('last_record_at', filters.startDate)
if (filters.endDate)   q = q.lte('last_record_at', filters.endDate)
if (filters.province)  q = q.eq('province', filters.province)
if (filters.area)      q = q.eq('area',     filters.area)
if (filters.risk === 'risk')    q = q.eq('prediction_risk', true)
if (filters.risk === 'no_risk') q = q.eq('prediction_risk', false)
if (filters.risk === 'unknown') q = q.is('prediction_risk', null)
if (filters.search.trim()) {
  const s = `%${filters.search.trim()}%`
  q = q.or(`first_name.ilike.${s},last_name.ilike.${s},thaiid.ilike.${s}`)
}

const { data: pageRows, count } = await q
```

One query, no Step 2 enrichment. The fewer-than-20-rows-after-filter edge case in PLAN-012 §4.3 disappears.

---

## Phase 4 — In-memory filter cache

File: `app/component/dashboard/filterCache.ts` *(new)*

A typed LRU map keyed by filter hash. Module-level singleton so it survives component remounts within the same tab.

```ts
type CacheKey = string
type CacheEntry<T> = { value: T; expiresAt: number }

const TTL_MS  = 5 * 60 * 1000   // 5 minutes
const MAX_ENTRIES = 20

class FilterLRU<T> {
  private store = new Map<CacheKey, CacheEntry<T>>()

  get(key: CacheKey): T | undefined {
    const e = this.store.get(key)
    if (!e) return undefined
    if (e.expiresAt < Date.now()) { this.store.delete(key); return undefined }
    // touch — move to MRU end
    this.store.delete(key); this.store.set(key, e)
    return e.value
  }

  set(key: CacheKey, value: T) {
    if (this.store.has(key)) this.store.delete(key)
    this.store.set(key, { value, expiresAt: Date.now() + TTL_MS })
    while (this.store.size > MAX_ENTRIES) {
      const oldest = this.store.keys().next().value
      if (oldest !== undefined) this.store.delete(oldest)
    }
  }

  clear() { this.store.clear() }
}

export const kpiCache         = new FilterLRU<KpiResult>()
export const provinceBarCache = new FilterLRU<BarData[]>()
export const amphoeBarCache   = new FilterLRU<BarData[]>()

export function hashFilters(f: DashboardFilters, scope: 'kpi' | 'province' | 'amphoe'): string {
  // Province bar deliberately excludes f.province (rule 2)
  const relevant = scope === 'province'
    ? { startDate: f.startDate, endDate: f.endDate, risk: f.risk, search: f.search }
    : f
  return scope + ':' + JSON.stringify(relevant)
}
```

### Usage in the page

```ts
async function loadKpi(filters: DashboardFilters) {
  const key = hashFilters(filters, 'kpi')
  const cached = kpiCache.get(key)
  if (cached) return cached

  const { data } = await supabase.schema('checkpd').rpc('dashboard_kpi', {...})
  const result = toKpiResult(data)
  kpiCache.set(key, result)
  return result
}
```

### Cache invalidation rules

- **TTL only** — no manual invalidation in v1. Data updates infrequently (mobile-app ingestion runs every 5 min per `checkpd.migration_state`); a 5-minute stale window is acceptable.
- **Explicit refresh button** on the dashboard calls `kpiCache.clear()` + the other two caches and re-fetches.
- **Filter changes**: cache lookups by hash auto-handle this — different filter = different key.
- **Tab navigation away and back**: the module-level singleton persists; cached results return immediately if within TTL.

### Skip the user-table query from caching

The paginated user table query is **not cached**. Reason: page number multiplied by filter combinations explodes the keyspace, and the table is usually viewed once per filter change. Profile first; revisit if it's a measurable cost.

---

## Files to create / modify

| File | Change |
|------|--------|
| `app/pages/qa/checkpd_dashboard.sql` *(new)* | View + 3 RPC functions + grants. |
| `app/pages/index/page.tsx` | Replace raw-table reads with RPC calls + view (PLAN-012's `fetchData` paths). |
| `app/component/dashboard/types.ts` | Add `KpiResult`, `BarData`, RPC param types. |
| `app/component/dashboard/filterCache.ts` *(new)* | LRU cache + `hashFilters` helper. |
| `app/component/dashboard/KpiCards.tsx` | Consume `KpiResult` shape (no change to UI). |
| `app/component/dashboard/RiskPieChart.tsx` | Consume `KpiResult` shape. |
| `app/component/dashboard/ProvinceBarChart.tsx` | Consume `BarData[]`, render `is_tail` row distinctly (muted). |
| `app/component/dashboard/AmphoeBarChart.tsx` | Same. |
| `app/component/dashboard/DashboardUserTable.tsx` | Switch from `.from('record_summary')` + `.from('users')` to `.from('v_user_risk_latest')` single query. |

No new dependencies. No middleware change. No env vars.

---

## Edge cases & rules

1. **View rebuild during migration window** — `checkpd.migration_state` shows when ingestion is running. The view reads live data so it sees in-flight rows. This is fine; counts may shift by ≤1% between two refreshes during a migration window. No mitigation needed.
2. **Empty filter (all-time, no province)** — RPC returns the full breakdown. This is the most expensive call; rely on cache to amortize.
3. **NULL `province` / `area` in `checkpd.users`** — `COALESCE(NULLIF(TRIM(v.province), ''), 'ไม่ระบุ')` buckets them under "ไม่ระบุ". The province chart shows "ไม่ระบุ" as a normal bar — do not hide.
4. **Date range with NULL `last_record_at`** — the RPC's `v.last_record_at >= p_start_date` excludes NULLs when a date filter is set (intended — those users have no activity in any window). When date filter is absent, NULLs are included.
5. **User in `checkpd.users` with NO `record_summary` row** — does NOT appear in the view (INNER source via `WITH ranked`). KPI total = "users who have completed at least one assessment," matching PLAN-012's intent.
6. **Concurrent filter changes** — if the user changes filter twice rapidly, the first request may resolve after the second. Wrap fetch calls with an abort controller / `cancelled` flag (existing pattern in PLAN-006). Cache writes must check the latest filter hash before storing.
7. **Cache returning stale data after a `migration_run` completes** — accepted (5 min TTL). If users complain, add a `refreshed_at` indicator in the UI footer and a refresh button (already in scope).
8. **Search with very short terms** (1-2 chars) — RPC executes ILIKE `%a%` which is slow on `first_name`/`last_name`/`thaiid`. The PLAN-012 debounce (300 ms) plus a `if (search.length < 2) skip` guard on the client mitigates this. Add the guard.

---

## Verification checklist

- [ ] `checkpd.v_user_risk_latest` exists in Supabase. `SELECT COUNT(*)` returns ≤ `(SELECT COUNT(DISTINCT user_id) FROM checkpd.record_summary)`.
- [ ] `EXPLAIN ANALYZE SELECT * FROM checkpd.v_user_risk_latest LIMIT 100` completes <100 ms.
- [ ] `EXPLAIN ANALYZE SELECT * FROM checkpd.dashboard_kpi()` completes <50 ms.
- [ ] `EXPLAIN ANALYZE SELECT * FROM checkpd.dashboard_province_breakdown()` completes <100 ms.
- [ ] Dashboard cold load (cache empty): 4 network requests visible in DevTools, total <800 ms wall time on a 50k-user dataset.
- [ ] Filter change: 3 network requests (KPI + 2 bar charts) + 1 table query = 4 requests, same <800 ms target.
- [ ] Toggle a filter on then off (same as initial): **0 network requests** (cache hit). Page renders instantly.
- [ ] Refresh button clears cache → next interaction re-fetches.
- [ ] No regression in KPI numbers vs the PLAN-012 client-side path (run both with the same filter; counts must match).
- [ ] No regression in the user table — same rows, same order, same pagination.
- [ ] RLS still applies — a user without checkpd read permission gets the same empty/error result they would from the raw table.

---

## Rollback plan

Two-step rollback:

1. **Client only** — revert `app/pages/index/page.tsx` and the dashboard components to PLAN-012's raw-table reads. The view and RPCs remain in the DB unused (harmless).
2. **DB rollback** — `DROP VIEW checkpd.v_user_risk_latest CASCADE; DROP FUNCTION checkpd.dashboard_kpi; ...` only after confirming no other code depends on them. The view/RPCs are scoped to this dashboard, so this is safe.

No data migration. No schema changes to existing tables. Rollback is fully reversible.

---

## Out-of-scope follow-ups

- **PLAN-014 (suggested)**: Materialized view + scheduled refresh — when `record_summary` exceeds ~500k rows or the regular view's window-function pass measures >200 ms. Refresh trigger options: `pg_cron` every 5 min, or `AFTER INSERT/UPDATE` trigger on `record_summary` (latter risks ingest slowdown).
- **PLAN-015 (suggested)**: Realtime invalidation — subscribe to `checkpd.record_summary` changes via Supabase Realtime and call `caches.clear()` when a relevant insert happens. Only useful if stale-by-5-min is a real complaint.
- **PLAN-016 (suggested)**: Timeseries dashboard (registrations per day/week/month) — needs a separate RPC `dashboard_timeseries(p_bucket TEXT)`. Pairs with PLAN-014 (suggested) from PLAN-012's follow-ups list.
- **PLAN-017 (suggested)**: Add the conditional index `idx_checkpd_summary_user_last_record (user_id, last_record_at DESC NULLS LAST)` if Phase 1 profiling shows the view's window function is the bottleneck.
