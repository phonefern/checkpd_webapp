# CheckPD — Parkinson's Disease Patient Management System

ระบบจัดการข้อมูลผู้ป่วยโรคพาร์กินสัน (Thai Healthcare Platform)

## Tech Stack

- **Next.js 15** — App Router, Server Components, API Routes
- **Supabase** — PostgreSQL database + Auth (schema: `core` for clinical data)
- **Firebase** — supplementary backend (Admin SDK + Client SDK)
- **AWS S3 / Supabase Storage** — file uploads (voice, tremor, gait, balance test data)
- **Tailwind CSS v4** + **shadcn/ui** (new-york style, neutral base)
- **React Hook Form + Zod** — form state and validation
- **Puppeteer / Playwright + pdf-lib** — server-side PDF generation

## Features

| Page | Path | Description |
|------|------|-------------|
| Login | `/pages/login` | Supabase auth |
| Papers | `/pages/papers` | Patient CRUD + 8 medical assessment forms |
| QA | `/pages/qa` | Data quality review; edit patient demographics, diagnosis, and run all 9 assessment tests |
| Users | `/pages/users` | User management (auth-protected) |
| Storage | `/pages/storage` | Mobile app file uploads (S3/Supabase Storage) |
| PDF | `/pages/pdf` | Patient PDF report export |
| Export | `/pages/export` | Data export |
| Tracking | `/pages/tracking` | Patient tracking |
| Assessment | `/pages/assessment` | Assessment management |
| Check-in | `/pages/check-in` | Patient check-in |

### QA Assessment Tests (9 forms)

| Test | Table | Max Score |
|------|-------|-----------|
| MoCA (Montreal Cognitive Assessment) | `core.moca_v2` | 30 |
| TMSE (Thai Mental State Examination) | `core.tmse_v2` | 30 |
| HAM-D (Hamilton Depression Rating Scale) | `core.hamd_v2` | 52 |
| MDS-UPDRS (Unified Parkinson's Rating Scale) | `core.mds_updrs_v2` | 260 |
| Epworth Sleepiness Scale | `core.epworth_v2` | 21 |
| Smell Test (Thai Smell Identification) | `core.smell_test_v2` | 16 |
| RBD Questionnaire (REM Sleep Behavior Disorder) | `core.rbd_questionnaire_v2` | 52 |
| ROME IV Constipation Criteria | `core.rome4_v2` | 6 |
| Food / Thai MIND Diet Assessment | `core.food_questionnaire_v2` | 10 |

## Getting Started

```bash
npm install
npm run dev       # Dev server with Turbopack → http://localhost:3000
npm run build     # Production build
npm run start     # Start production server
npm run lint      # ESLint
```

## Environment Variables

Create `.env.local`:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=

# PostgreSQL (direct connection)
PGHOST=
PGPORT=
PGDATABASE=
PGUSER=
PGPASSWORD=

# Firebase Admin
FIREBASE_PROJECT_ID=
FIREBASE_CLIENT_EMAIL=
FIREBASE_PRIVATE_KEY=

# Firebase Client
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=

# File Storage (Supabase S3-compatible)
SUPABASE_S3_ENDPOINT=
SUPABASE_S3_KEY_ID=
SUPABASE_S3_KEY_SECRET=
STORAGE_BUCKET=

# Thai National Health Service API
NHSO_API_KEY=
```

## Directory Structure

```
app/
  component/
    pdform/       # 8 medical assessment forms (Papers page)
    qa/           # QA page components + 9 assessment forms (core schema)
      forms/      # QaEpworthForm, QaHamdForm, QaMocaForm, QaTmseForm,
                  # QaSmellForm, QaMdsForm, QaRome4Form, QaRbdForm, QaFoodForm
    papers/       # Patient CRUD components
    storage/      # File storage UI
    pdf/          # PDF export components
    users/        # User management components
  pages/          # Route segments
  layout.tsx      # Root layout — Sarabun font (Thai support)
  page.tsx        # Redirects to /pages/login
components/ui/    # shadcn/ui primitives
lib/              # supabase.ts, supabase-server.ts, s3.ts, generatePdfBuffer.ts,
                  # generateHTML.ts, processRecordData.ts, rateLimit.ts
middleware.ts     # Auth guard: protects /pages/users/*, redirects from login if authed
```

## Notes

- **File data date cutoff**: Mobile app S3 files before **November 30, 2024** have a different format (dual tap and pinch-to-size tests were added after this date)
- **Core schema**: All QA clinical test data lives in the `core` Postgres schema — queries must use `.schema('core')` with the Supabase JS client
- **Thai font**: Sarabun loaded via `next/font/google` in root layout for full Thai language support
