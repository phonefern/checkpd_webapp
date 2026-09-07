# PLAN-029 — Public, filterable CheckPD dashboard for the checkpd.org WordPress embed

## Overview

checkpd.org (WordPress) currently shows a static, hand-updated stat block —
"จำนวนผู้เข้าร่วมโครงการตรวจคัดกรองโรคพาร์กินสัน" — a nationwide total plus a
region breakdown. The professor (อาจารย์หมอ) wants this replaced with something
**live and fully filterable**: the same experience as the internal
`/pages/dashboard` (risk breakdown, test completion, PD/CTRL/PDM/Other
condition counts, gender, age, province/area, download total — all filterable
by date range, province, area, and risk), but public — usable by เจ้าหน้าที่,
อสม., and the general public nationwide with **no login at all**, embedded
into the WordPress page.

**Revision note (2026-08-12):** the first draft of this plan proposed a
minimal 3×3 "total + region" grid matching the WordPress screenshot's current
static look. The user explicitly rejected that as too narrow — the real ask
is full feature parity with the internal dashboard, filters included. This
version replaces that draft entirely.

**Reason for change:** "จริงๆ ไม่ต้องเหมือนใน checkpd.org ที่ขึ้นแค่จำนวนดาวโหลด
แต่ละภูมิภาค แต่ผมอยากให้ขึ้นเหมือน dashboard pages อะครับ มันต้องเป็นหน้าที่คน
เจ้าหน้าที่ อสม ทั่วไทย สามารถกด filter ต่างๆ เพื่อดูยอดได้ครับ ทั้งเสี่ยงเท่าไหร่
ไม่เสี่ยงเท่าไหร่ ทำครบไม่ครบ มี pd, ctrl other, pdm เท่าไหร่อยากให้ขึ้นและสามารถ
filter ได้หมดครับ"

## Related plans

- [[PLAN-027]] — built `public.dashboard_stats` and the internal
  `/pages/dashboard` this plan clones the UI and RPC from. **This plan reuses
  that exact function** rather than building a parallel one (see Key design
  decision #2) — any future fix to `dashboard_stats` (counting rule, risk
  filter propagation, province total-matching — all things that got fixed
  mid-flight during PLAN-027's own rollout) automatically benefits this public
  site too, with zero duplicated logic to keep in sync.
- [[PLAN-014]] — guest mode (anonymous Supabase sign-in) already made
  `/pages/dashboard` usable by the public without a real account. This plan
  goes one step further: **no Supabase auth session at all**, not even
  anonymous — necessary because the page will run inside a third-party
  WordPress `<iframe>`, where creating/persisting a Supabase anonymous session
  is unreliable (third-party cookie restrictions in Safari/Firefox/Chrome
  Incognito would silently break guest mode for a meaningful share of visitors).
- **Superseded from this plan's own first draft**: `public.dashboard_region_stats()`
  (`supabase/migrations/20260812_dashboard_region_stats_public_rpc.sql`,
  `app/pages/dashboard/region_stats.sql`). Not required for this revised
  approach — see "Out-of-scope follow-ups" for why it's kept (harmless,
  possibly useful later) rather than deleted.

## Key design decisions

### 1. Separate Vercel project (unchanged from the first draft)

Still the right call, for the same reason: this page is embedded into a
third-party WordPress site the team doesn't control the security posture of.
A fully separate Next.js app means the embed shares **nothing** with the
clinical admin app — no session cookies, no CSP, no auth code paths — and, per
decision #2 below, needs no Supabase auth of any kind, which is exactly what
makes it safe to iframe.

### 2. Reuse `public.dashboard_stats` directly — grant `anon`, don't duplicate

`dashboard_stats`'s payload has been **PII-free by design since PLAN-027**:
`risk_counts`, `test_result_counts`, `condition_counts`, `gender_counts`,
`age_buckets`, `province_top`/`province_options`, `area_options`,
`download_count`, `generated_at` — never a name, thaiid, or any per-row value.
Since the data is already safe for public consumption, the only actual change
needed is **who can call the function**, not what it returns. Building a
second, parallel RPC (as the first draft of this plan did) would mean every
future fix to the counting logic has to be applied twice and can drift —
exactly the kind of duplication this project's own conventions warn against.

Migration (**already written**, additive, only adds a grant):
[`supabase/migrations/20260812b_dashboard_stats_grant_anon.sql`](../supabase/migrations/20260812b_dashboard_stats_grant_anon.sql)

```sql
GRANT EXECUTE ON FUNCTION public.dashboard_stats(date, date, text, text, text) TO anon;
```

This does not change `dashboard_stats`'s behavior for `authenticated`/
`service_role` callers at all — the internal dashboard and PLAN-014 guest mode
are unaffected. It only adds a new class of caller (the anon key, used
server-side by the new project's own API route — see below).

### 3. Full UI parity — port the dashboard's components, not a redesign

The new project's page is a straight port of
[`app/pages/dashboard/page.tsx`](../app/pages/dashboard/page.tsx), with the
auth/session/guest-banner/SidebarLayout pieces removed (there's no login to
have a session for). Everything the professor asked for is already exactly
what that page renders — risk KPI cards, test-result pie, condition bar chart
(PD/PDM/CTRL/Other), gender pie, age-bucket bars, province bar chart, download
total, and the full filter bar (date range, province, area, risk).

## Scope

### In scope
1. `public.dashboard_stats` grant widened to `anon` (done — see above; needs
   you to run it).
2. A new, minimal Next.js 15 App Router project (`checkpd-public-stat`
   suggested name) — one page, one API route, **no auth, no sidebar, no
   guest-mode UI** (there's nothing to be a guest *of* — everyone is already
   at the same, lowest access level).
3. Port these files from this repo essentially as-is (they have no auth
   dependency already):
   - `app/component/dashboard/DashboardFilters.tsx`
   - `app/component/dashboard/ProvinceBarChart.tsx`
   - `app/component/dashboard/TestResultPieChart.tsx`
   - `app/component/dashboard/TqdmSpinner.tsx`
   - `app/component/dashboard/types.ts` — **trim to just** `RiskFilter`,
     `DashboardFilters`, `DashboardStatsPayload`, `DEFAULT_FILTERS`, `ChartDatum`
     (the rest of that file — `CheckpdRiskRow`, `aggregateBy`, `topWithTail`,
     etc. — belongs to an older dashboard iteration and isn't used by the
     current `dashboard_stats`-based page; don't port the unused half).
4. `app/pages/dashboard/page.tsx`'s JSX/logic, minus:
   - `useSession()` / `useAccessProfile()` / `isGuest` / the guest banner —
     delete entirely, there is no session.
   - `SidebarLayout` wrapper — replace with a plain `<main>`/page shell.
   - `signOutEverywhere` / `handleGuestLoginRedirect` — delete.
5. Server-side caching in the new route, mirroring
   [`app/api/dashboard/stats/route.ts`](../app/api/dashboard/stats/route.ts)'s
   `unstable_cache` pattern (5 min) — critical here since traffic is now
   genuinely public/nationwide instead of internal-staff-only.
6. `<iframe>` embed snippet for the WordPress page.
7. Deployment instructions (Vercel project creation, env vars, custom domain).

### Out of scope
- Any write/mutation capability on the public site — read-only, always.
- Reusing `dashboard_region_stats` (superseded — see Related plans). If a
  future request specifically wants the simple region-grid look again
  *instead of* the full filterable dashboard, that migration is still there
  and still valid; it's just not part of this build.
- A custom subdomain (`stat.checkpd.org`) — recommended, but DNS is a manual
  step outside this repo (mirrors PLAN-011's process for the main app).
- Rate limiting beyond the 5-minute server cache — revisit only if abuse is
  observed; the cache already bounds DB load to ~1 query per filter
  combination per 5 minutes regardless of visitor count.

## Preflight checks

```sql
-- 1. Confirm dashboard_stats exists and anon is NOT yet granted (this plan adds it)
SELECT grantee, privilege_type
FROM information_schema.role_routine_grants
WHERE routine_schema = 'public' AND routine_name = 'dashboard_stats';
-- Expected before this migration: authenticated, service_role only.

-- 2. After running 20260812b: confirm anon can call it with zero PII in the result
SET ROLE anon;
SELECT public.dashboard_stats();
RESET ROLE;
-- Expected: succeeds, payload has no name/thaiid/per-row fields (visually confirm).

-- 3. Confirm the *internal* dashboard's own access didn't change
--    (spot check: /pages/dashboard still works normally for a real staff login).
```

## Architecture

```
┌──────────────────────────┐        ┌───────────────────────────────┐
│  checkpd.org (WordPress) │        │  Supabase (same project as     │
│  ┌─────────────────────┐ │        │  the main CheckPD app)         │
│  │ <iframe src=         │ │  HTTPS │  ┌───────────────────────────┐│
│  │  stat.checkpd.org   │─┼────────┼─▶│ public.dashboard_stats()  ││
│  │  or *.vercel.app>    │ │        │  │ (now anon-executable too) ││
│  └─────────────────────┘ │        │  └───────────────────────────┘│
└──────────────────────────┘        └───────────────────────────────┘
              ▲
              │ serves the iframe's page
┌─────────────┴──────────────────┐
│ NEW Vercel project               │
│ checkpd-public-stat (Next.js)    │
│ - GET /api/dashboard/stats       │  <- calls the RPC w/ anon key,
│   (?start&end&province&area&risk)│     unstable_cache revalidate:300
│ - / (page.tsx)                   │  <- ported dashboard UI, no auth
│ Env: NEXT_PUBLIC_SUPABASE_*      │  <- ONLY the anon key, nothing sensitive
└───────────────────────────────────┘
```

## New project file layout (to scaffold in its own repo)

```
checkpd-public-stat/
  package.json            # next, react, react-dom, recharts, lucide-react
  next.config.js
  tsconfig.json
  app/
    layout.tsx            # minimal HTML shell, Sarabun font for Thai text
    page.tsx              # ported from app/pages/dashboard/page.tsx (see Scope §4)
    globals.css           # Tailwind base (this project's dashboard uses Tailwind utility classes throughout)
    api/
      dashboard/
        stats/
          route.ts        # ported from app/api/dashboard/stats/route.ts (see below)
  component/
    dashboard/
      DashboardFilters.tsx
      ProvinceBarChart.tsx
      TestResultPieChart.tsx
      TqdmSpinner.tsx
      types.ts            # trimmed — see Scope §3
  lib/
    supabasePublic.ts     # createClient(url, anonKey) — anon key ONLY, never service role
  .env.example
    NEXT_PUBLIC_SUPABASE_URL=
    NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

### `app/api/dashboard/stats/route.ts` (ported, auth check removed, anon client)

```ts
import { unstable_cache } from "next/cache"
import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import type { DashboardStatsPayload, RiskFilter } from "@/component/dashboard/types"

const supabasePublic = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

const FILTER_TEXT_MAX_LENGTH = 100
const RISK_FILTERS = new Set<RiskFilter>(["all", "risk", "no_risk", "unknown"])

type DashboardStatsRpcArgs = {
  p_start: string | null
  p_end: string | null
  p_province: string | null
  p_area: string | null
  p_risk: RiskFilter
}

function normalizeTextParam(value: string | null): string | null {
  const trimmed = (value ?? "").trim()
  if (!trimmed) return null
  return trimmed.slice(0, FILTER_TEXT_MAX_LENGTH)
}
function normalizeDateParam(value: string | null): string | null {
  const trimmed = (value ?? "").trim()
  return /^\d{4}-\d{2}-\d{2}$/.test(trimmed) ? trimmed : null
}
function normalizeRiskParam(value: string | null): RiskFilter {
  const trimmed = (value ?? "all").trim().toLowerCase()
  return RISK_FILTERS.has(trimmed as RiskFilter) ? (trimmed as RiskFilter) : "all"
}

// Same 5-minute cache PLAN-027 uses internally — here it's the ONLY thing
// standing between a nationwide public audience and the database, so keep it.
const getCachedDashboardStats = unstable_cache(
  async (args: DashboardStatsRpcArgs): Promise<DashboardStatsPayload> => {
    const { data, error } = await supabasePublic.rpc("dashboard_stats", args)
    if (error) throw error
    return data as DashboardStatsPayload
  },
  ["public-dashboard-stats-rpc-v1"],
  { revalidate: 300 }
)

export async function GET(request: NextRequest) {
  // No auth check here — this whole app is public by design (see PLAN-029).
  const { searchParams } = request.nextUrl
  const args: DashboardStatsRpcArgs = {
    p_start: normalizeDateParam(searchParams.get("start")),
    p_end: normalizeDateParam(searchParams.get("end")),
    p_province: normalizeTextParam(searchParams.get("province")),
    p_area: normalizeTextParam(searchParams.get("area")),
    p_risk: normalizeRiskParam(searchParams.get("risk")),
  }
  try {
    const payload = await getCachedDashboardStats(args)
    return NextResponse.json(payload, { headers: { "Cache-Control": "public, max-age=60" } })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Dashboard stats query failed"
    console.error("[public/dashboard/stats] RPC failed", { message, args })
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
```

### `app/page.tsx` (ported from `app/pages/dashboard/page.tsx`)

Same component tree and `fetchDashboardStats`/state/`useEffect` logic as the
internal page, with these deletions:
- Remove `useSession`, `useAccessProfile`, `isGuest`, the guest banner block,
  `handleGuestLoginRedirect`, `signOutEverywhere` import.
- Replace `<SidebarLayout activePath="/pages/dashboard" ...>` with a plain
  `<main className="min-h-screen bg-[#eef2ff] text-slate-900">` wrapper —
  same background color, no sidebar chrome.
- Update the header copy since this is now the public-facing page, e.g.
  "แดชบอร์ดภาพรวมการคัดกรอง (สาธารณะ)" — wording at Codex's discretion, but
  make clear this is a live, public view (matches the professor's ask).
- Everything else — the KPI cards, both pies, condition/gender charts, age
  bars, `ProvinceBarChart`, download total, and `DashboardFilters` — ports
  unchanged; it already has zero dependency on auth state.

## WordPress integration

**Recommended: `<iframe>` embed**, so the block visually lives inside the
existing WordPress page and updates automatically without anyone touching
WordPress again:

```html
<iframe
  src="https://stat.checkpd.org/"
  title="แดชบอร์ดภาพรวมการคัดกรองโรคพาร์กินสัน (CheckPD)"
  style="width:100%; border:0; min-height:1400px;"
  loading="lazy"
></iframe>
```

- `min-height` needs to be tall since this now renders the *full* dashboard
  (KPI cards + 2 pies + 3 charts + province bar chart), not a short stat
  grid — measure the actual rendered height on the deployed page and adjust,
  or add `postMessage`-based auto-resize if the fixed height looks wrong at
  different WordPress column widths (see Out-of-scope follow-ups).
- Use a WordPress "Custom HTML" block (or the theme's raw-HTML widget) to
  paste this where the current static stat block lives.

**Fallback: plain link/button**, if the WordPress host/plugin blocks iframes:

```html
<a href="https://stat.checkpd.org/" target="_blank" rel="noopener">
  ดูแดชบอร์ดยอดคัดกรองล่าสุด (แบบ real-time, กรองข้อมูลได้)
</a>
```

## Deployment steps (manual — outside what I can execute)

1. Scaffold the new Next.js project locally from the file layout above (or
   ask Codex to do it from this plan) — port the 5 component/type files and
   the page/route logic as described in Scope §3–5.
2. `git init` a new repo for it (separate from `my-supabase-app-deploy`).
3. `vercel link` / `vercel deploy` — creates the new, separate Vercel project.
4. Set env vars in the new Vercel project's dashboard: `NEXT_PUBLIC_SUPABASE_URL`,
   `NEXT_PUBLIC_SUPABASE_ANON_KEY` (the *same* Supabase project's anon key —
   this app reads from the same database, just through the now-public RPC).
5. Run [`supabase/migrations/20260812b_dashboard_stats_grant_anon.sql`](../supabase/migrations/20260812b_dashboard_stats_grant_anon.sql)
   in the Supabase SQL Editor (I could not run it myself — DB port blocked
   from this sandbox all session, same as every other migration this
   conversation produced).
6. (Optional, recommended) Point a subdomain like `stat.checkpd.org` at the
   new Vercel project, so the iframe `src` isn't a bare `*.vercel.app` URL.
7. Edit the WordPress page, replace the static stat block with the `<iframe>`
   snippet above.

## Edge cases & rules

1. **`anon` grant on `dashboard_stats` is the single security-relevant change
   in this plan.** Before running it, re-verify (Preflight #2) that the
   payload truly contains zero PII — if a future change to `dashboard_stats`
   ever adds a per-row or name-bearing field, this grant must be revisited.
2. **The public site is read-only and has no concept of a logged-in user** —
   don't add anything (export, edit, per-patient drill-down) that assumes a
   session exists.
3. **Cache staleness (5 min) is a feature, not a bug** — it's what keeps a
   nationwide audience from generating nationwide DB load. Don't add a manual
   "refresh now" button that bypasses it for a public page.
4. **Filter values are still user-controlled input** (province/area free
   text from query params) — the ported route already trims + length-caps
   them (same as the internal route); don't remove that when porting.
5. **This is a separate git repo/Vercel project on purpose** — resist the
   urge to fold it back into `my-supabase-app-deploy` later "for convenience";
   see Key design decision #1 for why the isolation matters.

## Verification checklist

- [ ] Migration applies; `SET ROLE anon; SELECT public.dashboard_stats();`
      succeeds and returns the same shape the internal dashboard already
      renders correctly.
- [ ] Internal `/pages/dashboard` (authenticated + PLAN-014 guest mode) still
      works unchanged — this plan must not regress it.
- [ ] New Vercel project deploys with only the two `NEXT_PUBLIC_SUPABASE_*`
      env vars set; page renders KPIs/pies/charts with live numbers and no
      login prompt of any kind.
- [ ] All filters (date range, province, area, risk) work on the public page
      exactly as they do internally — same numbers for the same filter combo.
- [ ] Hitting `/api/dashboard/stats` directly (no cookies, no auth header)
      returns 200 with data.
- [ ] iframe embed renders correctly inside an actual WordPress test page,
      including on a narrow mobile width.
- [ ] Confirm via browser devtools that the public page's network responses
      never contain a name, thaiid, or phone number — this is the whole
      safety argument for the `anon` grant; verify it, don't just assume it.

## Rollback plan

Confined to:
- `REVOKE EXECUTE ON FUNCTION public.dashboard_stats(date, date, text, text, text) FROM anon;`
  — one-line, instantly closes public access without touching anything else.
- Delete the new Vercel project / repo entirely — it shares no code or
  deployment pipeline with `my-supabase-app-deploy`.
- Revert the WordPress page's HTML block back to the static numbers (keep a
  copy of the current static HTML before replacing it, just in case).

## Out-of-scope follow-ups

- **`dashboard_region_stats()`** (this plan's first draft) stays in the repo
  unused for now — a simpler, lighter-weight "just the region grid" embed
  option if a future request wants that look back instead of the full
  dashboard (e.g. for an even more constrained WordPress placement).
- **postMessage-based iframe auto-resize**, if the fixed `min-height` proves
  wrong on some WordPress screen widths.
- **Custom subdomain + SSL** (`stat.checkpd.org`) — mirrors PLAN-011's DNS
  process for the main app; not required for a first working version (a
  `*.vercel.app` URL works fine in an iframe).
- **A `DashboardUserTable`-style per-record list** — deliberately excluded;
  the internal dashboard doesn't show one either, and a public per-record
  view would need a fresh privacy review before ever being considered.
