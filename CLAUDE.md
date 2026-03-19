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
- **Supabase** — primary database (PostgreSQL) and auth; key tables: `pd_screenings`, `risk_factors_test`, `user_record_summary_with_users`
- **Firebase** — supplementary backend (admin SDK in `lib/firebaseAdmin.ts`, client in `lib/firebaseClient.ts`)
- **AWS S3 / Supabase Storage** — file uploads/downloads via `lib/s3.ts` with presigned URLs
- **Tailwind CSS v4** (PostCSS plugin, no `tailwind.config.ts`) + **shadcn/ui** ("new-york" style, neutral base)
- **React Hook Form + Zod** — form state and validation throughout

## Directory Structure

```
app/
  component/pdform/   # 8 medical assessment forms (MOCA, Epworth, HAMD, MDS, Rome4, Sleep, Smell, TMSE)
  component/papers/   # Patient CRUD components
  component/storage/  # File storage UI
  component/pdf/      # PDF export components
  component/users/    # User management components
  pages/              # Route segments (login, papers, storage, users, pdf, export, tracking, event, assessment, check-in, index)
  layout.tsx          # Root layout — loads Sarabun font (Thai support)
  page.tsx            # Redirects to /pages/login
components/ui/        # shadcn/ui primitives
lib/                  # Utilities: supabase.ts, supabase-server.ts, s3.ts, generatePdfBuffer.ts, generateHTML.ts, processRecordData.ts, rateLimit.ts
middleware.ts         # Auth guard: protects /pages/users/*, redirects authenticated users away from login
public/img/           # Static image assets
```

## Auth Flow

Supabase auth is used for sessions. `middleware.ts` protects routes — unauthenticated users accessing `/pages/users/*` are redirected to login; authenticated users on the login page are redirected to `/pages/users`.

## PDF Generation

PDFs are generated server-side using `pdf-lib`, Puppeteer, and Playwright (`lib/generatePdfBuffer.ts`, `lib/generateHTML.ts`). These run in API routes, not in browser context.

## File Storage

Patient mobile app data (voice, tremor, gait, balance tests) is stored in S3/Supabase Storage. There is a data format distinction for files before/after **November 30, 2024** (dual tap, pinch-to-size tests were added).

## Path Aliases

Configured in `tsconfig.json`:
- `@/*` → project root
- `@/components/*`, `@/lib/*`, `@/app/*`, `@/hooks/*`, `@/types/*`

## Environment Variables

Required in `.env.local`:
- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Supabase client
- `PGHOST`, `PGPORT`, `PGDATABASE`, `PGUSER`, `PGPASSWORD` — direct PostgreSQL access
- `FIREBASE_*` (admin credentials) + `NEXT_PUBLIC_FIREBASE_*` (client credentials)
- `SUPABASE_S3_ENDPOINT`, `SUPABASE_S3_KEY_ID`, `SUPABASE_S3_KEY_SECRET`, `STORAGE_BUCKET` — file storage
- `NHSO_API_KEY` — Thai national health service API
