# ARCHITECTURE.md
> Last updated: 2026-03-27

## Stack Overview

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 15 (App Router) |
| Primary DB | Supabase (PostgreSQL) |
| Realtime DB | Firebase Firestore |
| File Storage | Supabase Storage / AWS S3 |
| Auth | Supabase Auth |
| UI | Tailwind CSS v4 + shadcn/ui (new-york, neutral) |
| Forms | React Hook Form + Zod |
| Animations | Framer Motion v12 |
| PDF Engine | Playwright (Chromium) + pdf-lib |

---

## Directory Structure

```
app/
  pages/
    login/          ← Public; redirects to /pages/index if already authed
    index/          ← Dashboard (menu cards) — uses SidebarLayout
    admin/          ← User/role management — uses SidebarLayout
    users/          ← Patient data (Supabase) — uses SidebarLayout
    qa/             ← Questionnaire V2 (Supabase) — uses SidebarLayout
    tracking/       ← Realtime Firebase download tracking — uses SidebarLayout
    pdf/            ← Firebase user list + PDF export — uses SidebarLayout
    papers/         ← Data sheets / screening forms
    storage/        ← Raw data download (S3/Supabase Storage)
    export/         ← Export module
    event/          ← Event module

  component/
    layout/
      AppSidebar.tsx      ← Collapsible sidebar; collapsed state persisted in localStorage
      SidebarLayout.tsx   ← Auth guard + AppSidebar + framer-motion page transition wrapper
    pdf/            ← UserList, RecordsPanel, ExportSection, PaginationControls
    users/          ← UserTable, SearchFilters, Pagination, PatientHistoryModal
    qa/             ← QaTable, QaSearchFilters, QaCreateModal, QaAssessmentModal, types
    pdform/         ← 8 medical assessment forms (MOCA, Epworth, HAMD, MDS, Rome4, Sleep, Smell, TMSE)
    papers/         ← Patient CRUD components
    storage/        ← File storage UI
    questions/      ← Question components

  hooks/
    useAccessProfile.ts   ← Resolves AppRole + feature access from session

  api/
    pdf/[userDocId]/      ← Single PDF generation (Playwright)
    pdf/batch/            ← Batch PDF
    qa-pdf/               ← QA PDF
    generate-pdf/         ← Generic PDF
    storage/download-zip-multi/  ← Multi-file zip download
    export/               ← Export endpoint

lib/
  supabase.ts             ← Client-side Supabase
  supabase-server.ts      ← Server-side Supabase (createClient)
  firebaseClient.ts       ← Firebase client (Firestore)
  firebaseAdmin.ts        ← Firebase Admin SDK
  access.ts               ← RBAC: AppRole, AppFeature, ROLE_ACCESS, canAccessFeature
  pdfBrowser.ts           ← Playwright browser singleton (mutex launch, disconnected cleanup)
  generatePdfBuffer.ts    ← PDF buffer generation logic
  generateHTML.ts         ← HTML template for PDF
  processRecordData.ts    ← Firebase record data normalization
  s3.ts                   ← S3/Supabase Storage presigned URL helpers
  rateLimit.ts            ← API rate limiting
  calculateAgeFromBod.ts  ← Age calculation helper

components/ui/            ← shadcn/ui primitives
middleware.ts             ← Route protection (unauthenticated → login)
```

---

## Auth & Access Control

### Auth Flow
1. `middleware.ts` — unauthenticated requests to `/pages/*` (except login) are blocked
2. `SidebarLayout.tsx` — additional client-side guard with `AuthRedirect`
3. `useAccessProfile` hook — fetches role from Supabase, returns `AccessProfile`

### Roles & Feature Access

| Feature | super_admin | admin | doctor |
|---------|:-----------:|:-----:|:------:|
| dashboard | ✓ | ✓ | ✓ |
| admin | ✓ | — | — |
| users | ✓ | ✓ | ✓ |
| qa | ✓ | ✓ | ✓ |
| pdf | ✓ | — | ✓ |
| tracking | ✓ | ✓ | — |
| papers | ✓ | ✓ | — |
| storage | ✓ | ✓ | ✓ |
| export | ✓ | ✓ | — |
| event | ✓ | ✓ | — |

---

## Layout System

```
SidebarLayout (auth guard + motion wrapper)
  └── AppSidebar (collapsible, localStorage-persisted)
  └── motion.main (page transition: fade + slide-x + blur)
```

### Pages using SidebarLayout
- `/pages/index` — Dashboard
- `/pages/admin` — Admin management
- `/pages/users` — Patient data
- `/pages/qa` — Questionnaire V2
- `/pages/tracking` — Download tracking
- `/pages/pdf` — PDF export

### Page Transition
- Library: Framer Motion
- Enter: `opacity 0→1`, `x +18→0`, `blur 2px→0` over 220ms (`ease [0.22, 1, 0.36, 1]`)
- Exit: `opacity 1→0`, `x 0→-12`, `blur 0→1px` over 160ms

---

## Data Sources

### Supabase (PostgreSQL)
| Table | Purpose |
|-------|---------|
| `pd_screenings` | Patient screening records |
| `risk_factors_test` | MDS-UPDRS and risk factor scores |
| `user_record_summary_with_users` | Joined view: users + records |
| `user_record_summary` | Per-user record summary |
| `users` | Admin system users (province, area) |
| `patients_v2` | QA patients |
| `patient_diagnosis_v2` | QA diagnoses |
| `moca_v2`, `hamd_v2`, `mds_updrs_v2`, `epworth_v2`, `smell_test_v2`, `tmse_v2`, `rbd_questionnaire_v2`, `rome4_v2` | QA assessment tables |

### Firebase Firestore
| Collection | Purpose |
|------------|---------|
| `users` | App users (firstName, lastName, thaiId, liveAddress, gender, age, timestamp, bod) |
| `temps` | Staff/screeners (same shape as users) |
| `users/{id}/records` | Assessment records (prediction.risk, lastUpdate) |
| `temps/{id}/records` | Staff records |

---

## PDF Generation

- **Runtime**: Playwright (Chromium) via `@sparticuz/chromium`
- **Singleton pattern**: `lib/pdfBrowser.ts`
  - `launching` mutex prevents concurrent browser spawns
  - `disconnected` event auto-clears stale browser ref
  - `resetBrowser()` calls `browser.close()` before nulling
- **Vercel**: requires Pro plan for `maxDuration = 60` (Chromium cold start ~5-10s)
- **Error recovery**: catches 9+ Playwright crash string patterns, resets browser on failure

---

## Key Patterns

### Province Filter
- `extractProvince(address)` in `app/pages/pdf/types.ts`
- Scans `liveAddress` string against `provinceOptions` (77 provinces)
- Used in: pdf/page, tracking/page

### Firestore Date Filtering
- Converts JS Date → Firestore `Timestamp` for queries
- In-memory province filter applied after snapshot (avoid re-subscribing)
- `rawUserDocs` + `useMemo` pattern in tracking page

### AppSidebar Collapse
- `collapsed` state initialized from `localStorage.getItem("sidebar_collapsed")`
- Toggle writes back to localStorage
- Width: `w-[280px]` expanded / `w-[68px]` collapsed
- Text fades with `opacity` + `w-0/w-auto` transition

---

## Environment Variables

```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
PGHOST, PGPORT, PGDATABASE, PGUSER, PGPASSWORD
FIREBASE_* (admin)
NEXT_PUBLIC_FIREBASE_* (client)
SUPABASE_S3_ENDPOINT, SUPABASE_S3_KEY_ID, SUPABASE_S3_KEY_SECRET, STORAGE_BUCKET
NHSO_API_KEY
```
