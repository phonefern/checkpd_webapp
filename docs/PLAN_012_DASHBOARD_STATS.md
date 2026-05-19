# PLAN-012: Dashboard Stats Page — CheckPD Visualization at `/pages/index`

## Overview

Replace the current "menu-tiles" dashboard at [`app/pages/index/page.tsx`](../app/pages/index/page.tsx) with a **data visualization dashboard** that summarizes the CheckPD mobile-app dataset. The new page is the post-login landing surface for admins and exposes the same data shape the QA page already reads from (`checkpd.users` + `checkpd.record_summary`).

The dashboard answers four questions at a glance:
1. **How many people have been screened?** (total user count)
2. **Of those screened, how many are at risk vs. not at risk?** (prediction_risk breakdown + percentage)
3. **Where are they geographically?** (province + amphoe/area bar charts)
4. **Who are they?** (filterable user list table, drill-down ready)

Existing menu-tile navigation (Diagnosis Management, Screening Assessments, Usage Analytics, etc.) is **moved into `AppSidebar`** only — it is already in the sidebar today, so removing the tile grid from `/pages/index` is non-destructive.

**Related plans**:
- PLAN-006 — CheckPD ↔ core merge via `thaiid`. This plan reuses the same `supabase.schema('checkpd').from('record_summary')` access pattern.
- PLAN-010 — Auth request reduction. New page MUST consume `useSession()` + `useAccessProfile()`, NOT call `supabase.auth.getSession()` directly.

**Data sources** — both already used by `/pages/qa`:
- `checkpd.users` — demographic fields (`province`, `area`, `region`, `gender`, `age`, `thai_id`, `firebase_created_at`)
- `checkpd.record_summary` — one row per (user_id, recorder); fields: `user_id`, `prediction_risk`, `condition`, `test_result`, `last_record_at`, `thaiid`

---

## Scope

### In scope
1. Rewrite [`app/pages/index/page.tsx`](../app/pages/index/page.tsx) into a stats dashboard.
2. Add 4 KPI stat cards at the top: **Total Screened**, **At Risk**, **Not at Risk**, **Pending/Unknown** (each with percentage of total).
3. Add a **Pie chart** showing `prediction_risk` distribution (Risk / No risk / Unknown).
4. Add a **Bar chart — Province** (top 15 provinces by user count, horizontal bars).
5. Add a **Bar chart — Amphoe** (top 15 amphoes by user count; respects province filter when set).
6. Add a **filterable user table** (paginated, 20 rows/page) joining `checkpd.users` ⨝ `checkpd.record_summary` on `user_id`.
7. Add a **global filter bar** (date range, province, amphoe, risk status, search) that drives ALL widgets on the page.
8. Install `recharts` (peer of shadcn's chart primitives) and add `components/ui/chart.tsx` (shadcn chart wrapper).

### Out of scope
- New API routes or RPC functions. All reads go through the existing Supabase client.
- Edits/writes to `checkpd.*`. Read-only dashboard.
- Drill-down modals on chart segments (a future plan can add "click province bar → filter table"). Filter bar covers this manually for v1.
- Date-bucketed timeseries (trend over time). v1 is **point-in-time** + date-range filter; timeseries can land as PLAN-013.
- Map visualization (choropleth). Province/amphoe bar charts are sufficient for v1.
- Migration of the existing tile grid to a separate `/pages/menu` route — sidebar already lists every module, the tiles are redundant. If feedback demands them back, restore in a follow-up.

---

## Preflight checks (run before coding)

```bash
# 1. Confirm checkpd schema is reachable from the client (PLAN-006 already proved this)
grep -rn "supabase.schema('checkpd')" app/

# 2. Verify there is no existing chart component (avoid name collisions)
ls components/ui/chart.tsx 2>/dev/null && echo "EXISTS — review before overwriting" || echo "OK to create"

# 3. Verify recharts is not already a dep
grep -n '"recharts"' package.json || echo "not installed — add as dep"

# 4. Confirm fields used below exist on the live tables
# Run in Supabase SQL editor:
#   SELECT column_name FROM information_schema.columns
#     WHERE table_schema='checkpd' AND table_name='users';
#   SELECT column_name FROM information_schema.columns
#     WHERE table_schema='checkpd' AND table_name='record_summary';
```

Expected: checkpd schema present (PLAN-006 verified); no `components/ui/chart.tsx`; `recharts` absent; `province`, `area`, `region`, `firebase_created_at` present on `checkpd.users`; `prediction_risk`, `user_id`, `last_record_at` present on `checkpd.record_summary`.

---

## Data model — query plan

### 4.1 KPI counts — `record_summary` grouped by `prediction_risk`

The "Total Screened" KPI counts **distinct `user_id`s in `checkpd.record_summary`** (i.e. users who have completed at least one assessment), NOT `checkpd.users` row count (which includes registrations without any assessment).

```ts
// Total screened (distinct users with at least one record_summary row)
const { count: totalScreened } = await supabase
  .schema('checkpd')
  .from('record_summary')
  .select('user_id', { count: 'exact', head: true })
// Note: count is non-distinct. To get distinct users, either:
//   a) use a SQL view (preferred long-term), or
//   b) fetch user_ids and de-dup client-side for the current page-load (acceptable when <50k).
// For v1, use option (b) with pagination-less fetch of just (user_id, prediction_risk) — see below.
```

**Recommended single query for KPIs + pie chart**:

```ts
const { data: riskRows, error } = await supabase
  .schema('checkpd')
  .from('record_summary')
  .select('user_id,prediction_risk')
  // + filters from global filter bar (date range on last_record_at, etc.)
```

Then aggregate client-side:
```ts
const seen = new Set<string>()
let risk = 0, noRisk = 0, unknown = 0
for (const r of riskRows ?? []) {
  if (seen.has(r.user_id)) continue   // dedupe by user_id (one user may have multiple recorders)
  seen.add(r.user_id)
  if (r.prediction_risk === true) risk++
  else if (r.prediction_risk === false) noRisk++
  else unknown++
}
const total = seen.size
const pctRisk = total ? (risk / total) * 100 : 0
```

**Why client-side dedupe vs. a SQL view**: keeps changes confined to one file, matches PLAN-006's "no migration" stance. If `record_summary` grows past ~100k rows, revisit and add a SQL view `checkpd.v_user_risk_latest` (see §Out-of-scope follow-ups).

### 4.2 Province / amphoe bars — `users` grouped by `province` / `area`

```ts
// Pull province + area for the same filtered cohort
// IMPORTANT: bar chart cohort must match the KPI cohort. Join through user_id:
const userIds = Array.from(seen)   // from §4.1
const { data: userRows } = await supabase
  .schema('checkpd')
  .from('users')
  .select('id,province,area,region,gender,age,thai_id,firebase_created_at')
  .in('id', userIds)
```

Aggregate client-side into `{ name: province, count: n }[]`, sort desc, take top 15. Same pattern for `area`.

**Edge cases**:
- Missing `province` → bucket as `"ไม่ระบุ"` (do not drop the row; the count must reconcile with the KPI).
- Top-15 cutoff for province (~78 in Thailand) and top-15 for amphoe (>900). Add a "+ N more" row showing the count of users in the long tail.
- When the user selects a province filter, the amphoe chart re-scopes to amphoes **within that province**.

### 4.3 User table — paginated join

```ts
// Page size 20. Same range/pagination pattern as QA page.
const from = (page - 1) * 20
const to   = from + 19

// Step 1: page of user_ids matching filters, ordered by latest activity
let summaryQ = supabase
  .schema('checkpd')
  .from('record_summary')
  .select('user_id,prediction_risk,last_record_at,condition,test_result,thaiid', { count: 'exact' })
  .order('last_record_at', { ascending: false, nullsFirst: false })
  .range(from, to)

if (riskFilter === 'risk')    summaryQ = summaryQ.eq('prediction_risk', true)
if (riskFilter === 'no_risk') summaryQ = summaryQ.eq('prediction_risk', false)
if (riskFilter === 'unknown') summaryQ = summaryQ.is('prediction_risk', null)
if (startDate) summaryQ = summaryQ.gte('last_record_at', startDate)
if (endDate)   summaryQ = summaryQ.lte('last_record_at', endDate)
if (thaiIdSearch) summaryQ = summaryQ.ilike('thaiid', `%${thaiIdSearch}%`)

const { data: pageSummaries, count } = await summaryQ

// Step 2: enrich with user demographics (single .in() lookup)
const ids = Array.from(new Set((pageSummaries ?? []).map(r => r.user_id)))
let usersQ = supabase
  .schema('checkpd')
  .from('users')
  .select('id,prefix_name,first_name,last_name,gender,age,province,area,region,thai_id,phone_number,firebase_created_at')
  .in('id', ids)
if (provinceFilter) usersQ = usersQ.eq('province', provinceFilter)
if (areaFilter)     usersQ = usersQ.eq('area', areaFilter)
if (nameSearch)     usersQ = usersQ.or(`first_name.ilike.%${nameSearch}%,last_name.ilike.%${nameSearch}%`)
const { data: pageUsers } = await usersQ
```

**Note**: applying `province`/`area`/`nameSearch` on Step 2 means the page may return fewer than 20 rows if some users were dropped by the demographic filter. This is acceptable for v1; if it hurts UX, switch the order (filter users first, then page record_summary in step 2). See §Edge cases.

### 4.4 Filter bar — single source of truth

All four widgets (KPIs, pie, province bar, amphoe bar, table) read from one filter state object:

```ts
type DashboardFilters = {
  startDate: string | null   // ISO date
  endDate: string | null
  province: string | null
  area: string | null
  risk: 'all' | 'risk' | 'no_risk' | 'unknown'
  search: string             // free-text — first_name/last_name/thai_id
}
```

A single `useEffect([filters])` re-runs the aggregation + table queries. Debounce the `search` field by 300ms to avoid burst queries while typing.

---

## UI structure

```
┌──────────────────────────────────────────────────────────────┐
│  Dashboard — CheckPD Overview                                │
│  Filter bar:  [Date range] [Province ▼] [Amphoe ▼] [Risk ▼] [Search...]│
├──────────────────────────────────────────────────────────────┤
│  ┌───────────┐ ┌───────────┐ ┌───────────┐ ┌───────────┐    │
│  │ Total      │ │ At Risk    │ │ No Risk    │ │ Unknown    │    │
│  │ 12,345     │ │ 1,234 (10%)│ │ 9,876 (80%)│ │ 1,235 (10%)│    │
│  └───────────┘ └───────────┘ └───────────┘ └───────────┘    │
├──────────────────────────────────────────────────────────────┤
│  ┌──────────────────────┐  ┌─────────────────────────────┐  │
│  │ Pie: Risk distribution│  │ Bar: Top 15 provinces       │  │
│  │  (3 segments)         │  │  (horizontal bars)          │  │
│  └──────────────────────┘  └─────────────────────────────┘  │
│  ┌─────────────────────────────────────────────────────────┐│
│  │ Bar: Top 15 amphoes (within selected province if any)   ││
│  └─────────────────────────────────────────────────────────┘│
├──────────────────────────────────────────────────────────────┤
│  Users (12,345 total)                                        │
│  ┌─────────────────────────────────────────────────────────┐│
│  │ Name | Gender | Age | Province | Amphoe | Risk | Last…  ││
│  │ ...  | ...    | ... | ...      | ...    | ...  | ...    ││
│  └─────────────────────────────────────────────────────────┘│
│  Pagination: « 1 2 3 ... 624 »                               │
└──────────────────────────────────────────────────────────────┘
```

Wrap the page in `<SidebarLayout activePath="/pages/index">` (replace the existing `<AppSidebar>` direct mount — `SidebarLayout` is the newer pattern used by `/pages/qa` and handles the chrome consistently).

---

## Files to create / modify

| File | Change |
|------|--------|
| [`app/pages/index/page.tsx`](../app/pages/index/page.tsx) | Rewrite. New stats layout, filter bar, four widget regions, table. |
| `app/component/dashboard/DashboardFilters.tsx` *(new)* | Filter bar (date range, province/area selects, risk select, search). |
| `app/component/dashboard/KpiCards.tsx` *(new)* | Four `<StatCard>` wrappers with risk-tinted colours. |
| `app/component/dashboard/RiskPieChart.tsx` *(new)* | `recharts` PieChart, 3 segments. |
| `app/component/dashboard/ProvinceBarChart.tsx` *(new)* | Horizontal bar chart, top 15. |
| `app/component/dashboard/AmphoeBarChart.tsx` *(new)* | Horizontal bar chart, top 15 (province-scoped). |
| `app/component/dashboard/DashboardUserTable.tsx` *(new)* | Paginated table, reuses `TablePagination` from `app/component/users/Pagination.tsx`. |
| `app/component/dashboard/types.ts` *(new)* | `DashboardFilters`, `CheckpdUserRow`, `CheckpdRiskRow`, aggregation helpers. |
| `components/ui/chart.tsx` *(new)* | shadcn/ui chart wrapper (copy from shadcn docs verbatim). |
| `package.json` | Add `"recharts": "^2.13.0"` (latest stable that pairs with shadcn chart). |
| `lib/access.ts` | Add `"dashboard"` to `AppFeature` if role-gating is desired (optional — see §Access). |

No DB migration. No API route. No middleware change.

---

## Access / role gating

The current `/pages/index` is reachable by every authenticated user. Two options:

- **Option A (recommended)**: keep `/pages/index` open to every authenticated user. The dashboard is read-only summary data with no PII beyond what QA already exposes. Match QA's behaviour: no extra feature flag.
- **Option B**: add `feature: 'dashboard'` to `AppFeature` and gate behind `canAccessFeature(role, 'dashboard')`. Requires updates to `lib/access.ts` `ROLE_ACCESS` and `AppSidebar`.

Pick A unless legal/PDPA review says otherwise. The user table exposes `first_name`, `last_name`, `thai_id`, `phone_number` — all already visible in QA and Users pages.

---

## Charting library decision

**Use `recharts`** + shadcn's `components/ui/chart.tsx` wrapper.

Reasoning:
- shadcn ecosystem already standardises on recharts; chart wrapper is a drop-in from their docs.
- React 19 compatible (verify on install — if recharts breaks on React 19, fall back to `@nivo/core` + `@nivo/pie`/`@nivo/bar`; both support React 19).
- No SSR concerns — page is `'use client'` already.

**Avoid**:
- Chart.js (canvas — harder to style with Tailwind tokens).
- Visx (lower-level, requires more boilerplate).
- D3 directly (overkill for 3 chart types).

---

## Filter behaviour rules

1. **Date range applies to `record_summary.last_record_at`**, not `users.firebase_created_at`. The dashboard answers "who was screened in this window," not "who registered."
2. **Province filter narrows the table AND the amphoe chart**, but NOT the province chart (the province chart is the "where are they from" view — filtering it by itself is meaningless).
3. **Risk filter applies to all four widgets except the pie chart** (the pie chart loses its meaning if you filter by risk). When `risk !== 'all'`, render the pie chart with a muted overlay + label "Showing X only" — do not hide it; the user still benefits from seeing the slice they filtered to.
4. **Search field** matches `first_name` OR `last_name` OR `thai_id` (case-insensitive). Debounced 300ms.
5. **Reset button** clears all filters at once. Highlights with a dot when any filter is non-default.

---

## Performance & query budget

Per page mount (no filter change):
- 1 query — `record_summary` projection (user_id, prediction_risk, last_record_at)
- 1 query — `users` lookup by user_id `.in()` for the visible page only
- 1 query — `record_summary` paginated for the table (.range)

Per filter change: same 3 queries re-run. Aim for <600ms on a 50k-row dataset; if the projection query slows down, add a server-side aggregation view in PLAN-013.

**Caching**: simple `useMemo` over the filter object is enough; do NOT add SWR/React Query for v1.

---

## Edge cases & rules

1. **`record_summary` with NULL `prediction_risk`** → bucket as **Unknown** (yellow / muted tone). Do not drop.
2. **`record_summary` with NULL `last_record_at`** → exclude from date-range filter only when both `startDate` and `endDate` are set (otherwise include with `nullsFirst: false`).
3. **`users.province` is free-text** in Thai with format inconsistencies (e.g. "กรุงเทพมหานคร" vs "กรุงเทพ"). v1: render as-is, do **not** normalize. Note in the UI: "ข้อมูลจังหวัดอ้างอิงจากที่อยู่ผู้ใช้ — อาจมีคำเรียกต่างกัน". Long-term normalization belongs in a data-quality cleanup, not the dashboard.
4. **A user with multiple `record_summary` rows (different recorders)** counts as 1 in KPIs and the pie chart. For the table, show the most recent `last_record_at` row only.
5. **Risk conflict** — if one user has `prediction_risk=true` from one recorder and `false` from another, the dedupe takes the **most recent `last_record_at` row** as the canonical risk for that user. Make this rule explicit in a code comment so future readers don't change it accidentally.
6. **Filter combinations that produce 0 rows** → render explicit empty states per widget ("ไม่พบข้อมูลตามเงื่อนไขที่เลือก"), not just empty charts.
7. **Initial load with no filters** → show **all-time** data. Add a small subtitle: "Showing all-time data — narrow with the filter bar above."

---

## Verification checklist

- [ ] `/pages/index` no longer renders the menu-tile grid; renders the stats dashboard.
- [ ] Total Screened KPI equals `COUNT(DISTINCT user_id) FROM checkpd.record_summary` (manually verify via Supabase SQL editor on first load).
- [ ] Risk + No risk + Unknown percentages sum to 100%.
- [ ] Pie chart segments visually match the KPI counts.
- [ ] Province bar chart sorted descending, top 15, "+ N more" tail row visible when there are more provinces.
- [ ] Selecting a province in the filter bar:
  - re-scopes amphoe chart to that province only
  - re-scopes the user table
  - does NOT change the province bar chart
- [ ] Risk filter applied + pie chart shows muted overlay with "Showing X only" label.
- [ ] User table pagination shows correct total count and works across pages.
- [ ] Search field is debounced and does not fire per keystroke.
- [ ] Reset filters returns the page to initial all-time state.
- [ ] No `supabase.auth.getSession()` call in the new page — uses `useSession()` per PLAN-010.
- [ ] Page renders the same on roles `admin`, `doctor`, `staff` (or whichever Option A/B above we go with).

---

## Out-of-scope follow-ups (candidates for future plans)

- **PLAN-013 (suggested)**: Server-side aggregation view `checkpd.v_user_risk_latest` (one row per user, latest `prediction_risk`) to remove client-side dedupe and unlock 100k+ scale. Useful when `record_summary` grows past ~50k unique users.
- **PLAN-014 (suggested)**: Timeseries — screenings per day/week/month. Bar/line chart on `record_summary.last_record_at` bucketed by date.
- **PLAN-015 (suggested)**: Choropleth map of Thailand by province (recharts has no map; switch to `react-simple-maps` or `nivo/geo`).
- **PLAN-016 (suggested)**: Drill-down — click a pie segment or bar to apply the corresponding filter. Skipped in v1 to keep the filter bar as single source of truth.
- **PLAN-017 (suggested)**: Export current view to CSV/Excel. Mirrors the export feature on `/pages/users`.

---

## Rollback plan

All changes are isolated to:
- `app/pages/index/page.tsx` (full rewrite)
- new files under `app/component/dashboard/`
- new file `components/ui/chart.tsx`
- `package.json` (one new dep: `recharts`)

Rollback = revert the commit; `recharts` can stay in `package.json` harmlessly. No DB or env-var changes.
