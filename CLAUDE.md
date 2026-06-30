# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev       # Start dev server with Turbopack
npm run build     # Production build
npm run start     # Start production server
npm run lint      # Run ESLint
```

No test runner is configured in this project.

## Architecture Overview

This is a **Parkinson's Disease patient management and assessment platform** (Thai language healthcare app) built with:

- **Next.js 15 App Router** — pages live under `app/pages/`, shared components under `app/component/` and `components/`
- **Supabase** — primary database (PostgreSQL) and auth. Three schemas: `public` (app data + `user_record_summary_with_users` view), `core` (clinical/QA data: `patients_v2`, `patient_diagnosis_v2`, score tables), `checkpd` (mobile-app screening: `users`, `record_summary`, `events`). `core.patients_v2` and `checkpd.users` are matched to other data by `thaiid`.
- **Firebase** — Firestore is the source of truth for mobile-app patient data (`users`/`temps` collections + `records` subcollection) and the `events` collection. Admin SDK in `lib/firebaseAdmin.ts`, client in `lib/firebaseClient.ts`.
- **AWS S3 / Supabase Storage** — file uploads/downloads via `lib/s3.ts` with presigned URLs
- **Tailwind CSS v4** (PostCSS plugin, no `tailwind.config.ts`) + **shadcn/ui** ("new-york" style, neutral base)
- **React Hook Form + Zod** — form state and validation throughout

## Directory Structure

```
app/
  api/                # Route handlers (pdf-v2, qa-pdf, export/users-csv, events/sync, storage, tracking, …)
  component/pdform/   # 8 medical assessment forms (MOCA, Epworth, HAMD, MDS, Rome4, Sleep, Smell, TMSE)
  component/qa/       # QA screening: table, modal, create modal, 10 clinical forms, QR scanner
  component/pdf/      # PDF print-station components (UserList, RecordsPanel, ExportSection)
  component/dashboard/# Stats dashboard widgets (recharts) + TqdmSpinner
  component/layout/   # AppSidebar + SidebarLayout (page chrome; handles mobile drawer)
  component/papers/   # Patient CRUD components
  component/storage/  # File storage UI
  component/users/    # User management components
  pages/              # Route segments (login, papers, storage, users, pdf, export, tracking, event, qa, dashboard, assessment, check-in, index)
  layout.tsx          # Root layout — loads Sarabun font (Thai support)
  page.tsx            # Redirects to /pages/login
components/ui/        # shadcn/ui primitives
lib/                  # Utilities: supabase.ts, supabase-server.ts, access.ts, auth.ts, s3.ts, tremorFrequency.ts, generatePdfReportBuffer.tsx, processRecordData.ts, rateLimit.ts
middleware.ts         # Auth guard over /pages/:path* (cookie check + guest restriction)
public/img/           # Static image assets
```

Page convention: wrap page content in `<SidebarLayout activePath="/pages/X">` for sidebar + mobile chrome (don't mount `AppSidebar` manually).

## Auth Flow

Supabase auth is used for sessions. `middleware.ts` matches **all** `/pages/:path*` routes: unauthenticated users are redirected to `/pages/login`, authenticated users on the login page are bounced to their default landing page, and guests (anonymous sign-in, `chulapd-guest=1` cookie) are restricted to `/pages/dashboard`. Middleware only checks cookie presence — **feature-level access** is defined in `lib/access.ts` (`ROLE_ACCESS` per role) and surfaced in the sidebar (`AppSidebar` hides items via `canAccessFeature`). Read session via `useSession()` / `useAccessProfile()`, never `supabase.auth.getSession()` in components. Log out with `signOutEverywhere()` from `lib/auth.ts`.

## PDF Generation

Two generations exist. **v2 (current)** renders with `@react-pdf/renderer`: QA report via `lib/qaPdfDocument.tsx` + `lib/generateQaPdfBuffer.tsx` (`/api/qa-pdf`), and the patient report via `lib/pdfReportDocument.tsx` + `lib/generatePdfReportBuffer.tsx` (`/api/pdf-v2/[userDocId]` + `/batch`). **v1 (legacy)** uses `pdf-lib` / Puppeteer / Playwright (`lib/generatePdfBuffer.ts`, `lib/generateHTML.ts`, `/api/pdf`, `/api/qa-pdf-v1`). All run server-side in API routes. The `/pages/pdf` print station can register a patient into QA first, then stamp the report with a QR + short id.

## File Storage & Sensor Data

Patient mobile app data (voice, tremor, gait, balance tests) is stored in S3/Supabase Storage. Format distinctions to handle when parsing:
- Files before/after **November 30, 2024** (dual tap, pinch-to-size tests were added).
- Sensor recordings (`recording.recordedData`) come in **two shapes** keyed by `recording.recordingFormat`: 6-axis `["ax","ay","az","gx","gy","gz"]` and 3-axis `["ax","ay","az"]`. Code reading sensor rows (e.g. `lib/tremorFrequency.ts`) must handle both lengths or it silently drops the 3-axis records.

## Events (Firebase ↔ Supabase mirror)

The Firebase `events` collection is mirrored into `checkpd.events` (id = Firebase doc id = `checkpd.users.event_id`) so user rows can resolve an event name without a cron change. `app/pages/event/page.tsx` writes Firebase then calls `POST /api/events/sync` (`upsert` / `delete` / `resync`) which writes the `checkpd` schema with the **service role** key. Firebase stays source of truth; "Resync" re-mirrors everything.

## Path Aliases

Configured in `tsconfig.json`:
- `@/*` → project root
- `@/components/*`, `@/lib/*`, `@/app/*`, `@/hooks/*`, `@/types/*`

## Environment Variables

Required in `.env.local`:
- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Supabase client
- `SUPABASE_SERVICE_ROLE_KEY` — server-side writes/reads that bypass RLS (export route, `/api/events/sync`); never expose to the browser
- `PGHOST`, `PGPORT`, `PGDATABASE`, `PGUSER`, `PGPASSWORD` — direct PostgreSQL access
- `FIREBASE_*` (admin credentials) + `NEXT_PUBLIC_FIREBASE_*` (client credentials)
- `SUPABASE_S3_ENDPOINT`, `SUPABASE_S3_KEY_ID`, `SUPABASE_S3_KEY_SECRET`, `STORAGE_BUCKET` — file storage
- `NHSO_API_KEY` — Thai national health service API

## Supabase Schema Gotchas

- New tables in `core` / `checkpd` **do not inherit role grants** — PostgREST writes via `service_role` fail with `42501 permission denied` until you `grant select,insert,update,delete on <schema>.<table> to service_role` (+ `grant select … to anon, authenticated`). Direct PG (`PGUSER`) works regardless, so a PG-applied migration can look fine while the API route 500s.
- The project has `db-max-rows` set, so PostgREST forces an explicit `.order()` on supabase-js `.delete()` / `.update()` mutations, else `"A 'limit' was applied without an explicit 'order'"`.
