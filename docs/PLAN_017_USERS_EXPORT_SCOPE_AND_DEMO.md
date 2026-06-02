# PLAN-017 — Users Export: Demographic Columns, Scope Selector, Data Cleanup & Bundled References

## Overview

Extend the Users-page CSV export (shipped per [PLAN-016](./PLAN_016_export-feature-plan.md)) in four ways:

1. **Add 14 demographic columns** sourced exclusively from `checkpd.users` — `education_status`, `occupation`, `emolument`, `ethnicity`, `marital_status`, `smoking`, `alcohol`, `coffee`, `milk`, `exercise`, `insecticide`, `narcotic`, `severe_head_injury`, `congenital_disease`.
2. **Add an "Export Scope" selector** (4 mutually exclusive scopes) so doctors can pick the level of detail per export instead of dumping every column every time.
3. **Normalize "unclean" raw values** in 8 yes/no-style risk-factor fields (`smoking`, `alcohol`, `coffee`, `milk`, `exercise`, `insecticide`, `narcotic`, `severe_head_injury`) into a stable `0` / `1` / `""` encoding the doctor can run statistics against.
4. **Bundle the export as a ZIP** containing the data CSV, a `readme.txt` column glossary, and a static `questionnaire_responses.csv` reference dataset — so a single download gives the doctor everything they need to interpret the file.

Also fixes a **production bug**: filtered exports of 1 000+ rows currently fail with `[export/users-csv] { message: 'Bad Request' }` → `POST /api/export/users-csv 500`. Root cause: `.in(col, [1000+ ids])` produces a PostgREST URL longer than the server's URL length limit (~8 KB). Fix: chunk the `IN(...)` queries.

### Reason for change

Quoting the user: "ข้อมูลเราเยอะครับ หมอจะได้ดูง่ายด้วยเวลาเอาไปใช้." The current export is one wide CSV of ~60 columns where (a) demographic risk factors are stored as bracket-wrapped strings like `"[เคย,1,]"` that no statistics tool can parse, (b) the doctor has no key for what `q01…q20` mean without opening another file, (c) doctors who only want demographics still get every column. Combined with the 1 000-row failure, the feature is effectively unusable above small batches.

This plan keeps the data path from PLAN-016, but rewraps the output and cleans the values so doctors can hand the ZIP straight into Excel/SPSS without manual janitorial work.

---

## Related plans

- [[PLAN-016]] — original Select & Export feature. The 3-schema join (`public` + `checkpd` + `core`) and selection-key model are unchanged; this plan only widens columns, gates by scope, normalizes specific fields, repackages as ZIP, and fixes the `IN()` chunking bug.

---

## Scope

### In scope

- Add 14 demographic columns from `checkpd.users` (no `public.users` fallback for these — see edge case 1).
- Add a `scope` parameter to the API request and a scope dropdown in `SearchFilters.tsx`.
- Filter columns and short-circuit unnecessary DB queries based on scope.
- Add a normalization function for 8 yes/no risk-factor fields (returns `"0"` / `"1"` / `""`).
- Repackage the response as a ZIP containing `<data>.csv` + `readme.txt` + `questionnaire_responses.csv`.
- Chunk every `IN(...)` query in the route into batches of ≤ 200 IDs to avoid PostgREST URL length errors.
- Update `Content-Type` to `application/zip` and filename to `.zip`.
- Move `app/component/users/questionnaire_responses.csv` → `public/references/questionnaire_responses.csv` so it is deployable on Vercel and readable from the API route.

### Out of scope

- Adding new demographic fields from `public.users` (e.g. `live_address`, `id_card_address`) — `checkpd.users` only.
- Free-text fields (`education_status`, `occupation`, `emolument`, `ethnicity`, `marital_status`, `congenital_disease`) — emitted as-is, no normalization. They are reference text, not analytic categories.
- Multi-CSV per scope inside the ZIP (one `<data>.csv` per export; the only other CSV is the static `questionnaire_responses.csv` reference).
- Generating a new questionnaire reference from live data — the bundled `questionnaire_responses.csv` is a static reference dataset (1 332 anonymized subjects), not regenerated per export.
- Streaming the ZIP response (full ZIP built in memory; with the 5 000-row cap this is fine).
- Frontend `xlsx` export.

---

## Preflight checks

```bash
# 1. Confirm 14 demo cols exist in checkpd.users
grep -E "education_status|occupation|emolument|ethnicity|marital_status|smoking|alcohol|coffee|milk|exercise|insecticide|narcotic|severe_head_injury|congenital_disease" app/pages/qa/checkpd_schema.sql

# 2. Confirm jszip is installed (used for the ZIP)
grep -n "jszip" package.json

# 3. Confirm the questionnaire_responses.csv exists and is not empty
wc -l app/component/users/questionnaire_responses.csv

# 4. Confirm the existing route uses SELECT * from checkpd.users (so new cols flow in automatically)
grep -n 'schema("checkpd").from("users").select' app/api/export/users-csv/route.ts

# 5. Confirm the unclean value patterns appear in raw data
grep -oE '"smoking": "[^"]+"' app/component/users/users_rows.json | head -20
grep -oE '"alcohol": "[^"]+"' app/component/users/users_rows.json | head -20
```

Expected:
- (1) all 14 column names present
- (2) `jszip` ^3.10.1
- (3) ≥ 1 000 lines
- (4) `schema("checkpd").from("users").select("*").in("id", userIds)` at ~line 150
- (5) values like `"[ไม่เคย,,,]"`, `"[เคย,1,]"`, `"เคย"`, `"ไม่เคย"`

---

## Data model

No DB schema changes. Both feature additions read from existing columns.

### Column groups & scope matrix

| Group | Cols | Source | demo | demo_test | demo_test_screening | full |
|---|---|---|---|---|---|---|
| **Identity** | `user_id`, `record_id`, `area` | derived / `public.users` | ✓ | ✓ | ✓ | ✓ |
| **Demo (existing)** | `first_name`, `last_name`, `gender`, `age`, `phone_number`, `thaiid`, `province` | `checkpd.users` with `public.users` fallback (existing behavior) | ✓ | ✓ | ✓ | ✓ |
| **Demo NEW — text** | `education_status`, `occupation`, `emolument`, `ethnicity`, `marital_status`, `congenital_disease` | `checkpd.users` only | ✓ | ✓ | ✓ | ✓ |
| **Demo NEW — yes/no encoded** | `smoking`, `alcohol`, `coffee`, `milk`, `exercise`, `insecticide`, `narcotic`, `severe_head_injury` | `checkpd.users` only, normalized via `normalizeYesNo()` | ✓ | ✓ | ✓ | ✓ |
| **Public summary** | `condition`, `other` | `public.user_record_summary` | | | | ✓ |
| **Core tests** | `diagnosis_condition`, `hy_stage`, `disease_duration`, `rbd_suspected`, `hyposmia`, `constipation`, `depression`, `eds`, `ans_dysfunction`, `mild_parkinsonian_sign`, `family_history_pd`, `adl_score`, `scopa_aut_score`, `fdopa_pet_score`, `moca_total`, `hamd_total`, `mds_updrs_total`, `epworth_total`, `smell_total`, `tmse_total`, `rbd_total`, `rome4_total` | `core.*_v2` | | ✓ | ✓ | ✓ |
| **CheckPD screening** | `prediction_risk`, `test_result`, `questionnaire_total`, `q01`…`q20` | `checkpd.record_summary` + `checkpd.questionnaire` | | | ✓ | ✓ |

**Scope summary:**

- `demo` — identity + demographics only. ~28 cols.
- `demo_test` — adds in-clinic clinical scores. ~50 cols.
- `demo_test_screening` — adds mobile-app self-screening. ~74 cols.
- `full` — adds `public.user_record_summary` admin metadata. ~76 cols. Equivalent to today's export plus the new demo columns.

---

## Data normalization rules (yes/no fields)

Raw values seen in `users_rows.json` for the 8 risk-factor fields are inconsistent across users:

| Raw value (observed) | Meaning | Encoded output |
|---|---|---|
| `"เคย"` | yes | `"1"` |
| `"[เคย,1,]"` | yes (bracket-wrapped) | `"1"` |
| `"[เคย,]"` | yes | `"1"` |
| `"ไม่เคย"` | no | `"0"` |
| `"[ไม่เคย,,,]"` | no (bracket-wrapped with trailing empties) | `"0"` |
| `"[ไม่เคย,,,,]"` | no | `"0"` |
| `null` / `""` / `"null"` / `"ไม่ระบุ"` | unknown / not answered | `""` |
| anything else | unknown — log warning, emit `""` | `""` |

### Normalization function

```ts
// Sketch — final code at Codex's discretion.
// Place this near the existing csvCell()/fBool() helpers in route.ts.
function normalizeYesNo(raw: unknown): string {
  if (raw === null || raw === undefined) return ""
  let s = String(raw).trim()
  if (!s || s === "null" || s === "ไม่ระบุ") return ""

  // Strip surrounding brackets and split on comma; take first non-empty token.
  if (s.startsWith("[") && s.endsWith("]")) {
    s = s.slice(1, -1)
  }
  const first = s.split(",").map((p) => p.trim()).find((p) => p.length > 0) ?? ""

  if (first === "เคย") return "1"
  if (first === "ไม่เคย") return "0"
  return ""  // unknown value — silently emit blank
}
```

Apply to: `smoking`, `alcohol`, `coffee`, `milk`, `exercise`, `insecticide`, `narcotic`, `severe_head_injury` — and **only** these. Free-text fields (e.g. `congenital_disease`, `marital_status`) are emitted as-is via the existing `str()` helper.

### Why `"0"` / `"1"` strings, not booleans?

The existing CSV uses string-formatted values throughout (`csvCell()` operates on `string`). Returning `"0"` / `"1"` lets the doctor use the column directly as a numeric in Excel/SPSS while staying consistent with the existing code path. Existing `fYesNo()` (`"Yes"` / `"No"`) is reserved for the boolean diagnosis flags from `core.patient_diagnosis_v2` — don't conflate them.

---

## ZIP packaging

### Output structure

A single export download:

```
checkpd_<scope>_<YYYYMMDD>.zip
├── checkpd_<scope>_<YYYYMMDD>.csv      ← the data
├── readme.txt                          ← column glossary + encoding key
└── questionnaire_responses.csv         ← static reference (only for demo_test_screening, full)
```

**Bundling rules:**

- `data.csv` — always included.
- `readme.txt` — always included.
- `questionnaire_responses.csv` — only included when `scope ∈ {demo_test_screening, full}` (i.e. when the data CSV contains `q01…q20` cols). Skipping it for `demo` / `demo_test` keeps small exports small.

### Response headers

```
Content-Type: application/zip
Content-Disposition: attachment; filename="checkpd_<scope>_<YYYYMMDD>.zip"
```

### Implementation (using already-installed `jszip ^3.10.1`)

```ts
// Sketch:
import JSZip from "jszip"
import { readFile } from "fs/promises"
import path from "path"

const zip = new JSZip()
zip.file(`checkpd_${scope}_${date}.csv`, "﻿" + dataCsv)   // BOM keeps Thai readable in Excel
zip.file("readme.txt", "﻿" + readmeText)
if (scope === "demo_test_screening" || scope === "full") {
  const refPath = path.join(process.cwd(), "public/references/questionnaire_responses.csv")
  zip.file("questionnaire_responses.csv", await readFile(refPath))
}
const buffer = await zip.generateAsync({ type: "nodebuffer" })
return new NextResponse(buffer, { status: 200, headers: { ... } })
```

### File relocation

Move `app/component/users/questionnaire_responses.csv` → `public/references/questionnaire_responses.csv` so it is bundled into the deployed Next.js app and reliably readable at runtime via `fs.readFile`. The IDE-side copy in `app/component/users/` can be left in place if it's needed for other dev workflows, but the API route reads from `public/references/`.

---

## readme.txt content

UTF-8 with BOM. Thai + English. Keep it short, the doctor will skim.

```
CheckPD Export — README
=======================

ไฟล์ในชุดนี้ / Files in this archive
-----------------------------------
1. checkpd_<scope>_<date>.csv   — ข้อมูลผู้ป่วยตาม scope ที่เลือก
2. readme.txt                    — ไฟล์นี้
3. questionnaire_responses.csv   — ข้อมูลอ้างอิงแบบสอบถาม (เฉพาะ scope ที่มี q01–q20)


Scope ที่ดาวน์โหลดมา / Selected scope
-------------------------------------
<scope name> — <one-line description>

(Demo only) ข้อมูลประชากร / ปัจจัยเสี่ยงเท่านั้น
(Demo + Test) เพิ่มผลการตรวจในคลินิก
(Demo + Test + Screening) เพิ่มข้อมูล mobile app screening (q01–q20, prediction)
(Full) ทุกคอลัมน์รวม condition/other ที่บันทึกโดย admin


การเข้ารหัสค่า / Value encoding
-------------------------------
คอลัมน์ต่อไปนี้ถูกแปลงเป็นเลข 0/1 เพื่อให้ใช้ในสถิติได้ทันที:
  smoking, alcohol, coffee, milk, exercise,
  insecticide, narcotic, severe_head_injury

  1 = เคย  (Yes)
  0 = ไม่เคย (No)
  ""  = ไม่ระบุ / ไม่ทราบ / ค่าผิดรูป (Unknown — blank)

คอลัมน์ Yes/No อื่น ๆ ที่อ่านจาก core.patient_diagnosis_v2 ยังคงใช้รูปแบบเดิม:
  rbd_suspected, hyposmia, constipation, depression, eds,
  ans_dysfunction, mild_parkinsonian_sign, family_history_pd
  → "Yes" / "No" / ""


แหล่งข้อมูล / Data sources
--------------------------
- ข้อมูลประชากร (demographics) : `checkpd.users`
- ผลตรวจในคลินิก (clinical)     : `core.patients_v2` + 9 ตาราง score (moca, hamd, mds_updrs, …)
- ข้อมูล screening จาก mobile app : `checkpd.record_summary` + `checkpd.questionnaire`
- การจับคู่ข้ามสคีมา             : `thaiid` (เลขบัตรประชาชน 13 หลัก)


คำถาม q01–q20
-------------
ดูข้อความแบบสอบถามฉบับเต็มในไฟล์ questionnaire_responses.csv
(แต่ละแถวคือคำตอบของผู้ใช้ 1 คน — 0=ไม่ใช่, 1=ใช่)


ติดต่อ / Contact
----------------
ฝ่ายข้อมูล CheckPD — checkpd@chulapd.org
สร้างจาก checkpd export tool เมื่อ <ISO timestamp>
```

The `<scope name>`, `<one-line description>`, and `<ISO timestamp>` should be templated in by the route at request time. Keep the rest static (or hard-coded as a const in `route.ts`).

---

## Bug fix: `IN(...)` chunking

### Symptom

Filtered export of ≥ ~1 000 rows fails:
```
[export/users-csv] { message: 'Bad Request' }
POST /api/export/users-csv 500 in 900ms
```

### Root cause

Supabase JS client builds PostgREST URLs like `?id=in.(uid1,uid2,...,uid1000)`. With ~28-char Firebase UIDs, 1 000 IDs = ~28 KB URL, well beyond the default ~8 KB PostgREST limit. Server returns HTTP 400 with body `{"message":"Bad Request"}`; the route's `try/catch` re-raises as 500.

This affects every `.in()` call in [route.ts](../app/api/export/users-csv/route.ts):

- `supabaseAdmin.from("users").select("*").in("id", userIds)` (line ~124)
- `supabaseAdmin.from("user_record_summary").select(...).in("user_id", userIds)` (line ~126)
- `supabaseAdmin.schema("checkpd").from("users").select("*").in("id", userIds)` (line ~150)
- `supabaseAdmin.schema("checkpd").from("record_summary").select(...).in("user_id", userIds)` (line ~151)
- `supabaseAdmin.schema("checkpd").from("records").select(...).in("user_id", userIds)` (line ~158)
- `supabaseAdmin.schema("checkpd").from("questionnaire").select(...).in("record_pk", recordPks)` (line ~194)
- `supabaseAdmin.schema("core").from("patients_v2").select(...).in("thaiid", thaiids)` (line ~244)
- 9 × `supabaseAdmin.schema("core").from(...).in("patient_id", patientIds)` (lines ~273–292)

### Fix

Add a generic chunk helper:

```ts
const IN_CHUNK_SIZE = 200  // safely under 8 KB URL even for 36-char UUIDs

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = []
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size))
  return out
}

async function fetchInChunks<T>(
  ids: (string | number)[],
  fn: (chunk: (string | number)[]) => Promise<{ data: T[] | null; error: unknown }>
): Promise<T[]> {
  if (ids.length === 0) return []
  const chunks = chunk(ids, IN_CHUNK_SIZE)
  const results = await Promise.all(chunks.map(fn))
  const out: T[] = []
  for (const r of results) {
    if (r.error) throw r.error
    if (r.data) out.push(...r.data)
  }
  return out
}
```

Then refactor each `.in()` callsite. Example:

```ts
// Before:
const cpUsersRes = await supabaseAdmin.schema("checkpd").from("users").select("*").in("id", userIds)
if (cpUsersRes.error) throw cpUsersRes.error
const cpUsersData = cpUsersRes.data ?? []

// After:
const cpUsersData = await fetchInChunks<Record<string, unknown>>(userIds, (c) =>
  supabaseAdmin.schema("checkpd").from("users").select("*").in("id", c as string[])
)
```

For the 9 parallel `core.*` queries, chunk each one and `Promise.all` over `chunks × tables` (or per table; both work).

### Cap revisited

The existing `MAX_ROWS = 5000` cap stays. With chunking, 5 000 rows = 25 chunks per query × 9 core tables = 225 round-trips. Supabase rate limits should still tolerate this; if not, add a small concurrency limit (e.g. `p-limit` with concurrency 8) — but defer that optimization until measured.

---

## UI structure

### SearchFilters footer — proposed

```
┌────────────────────────────────────────────────────────────────────────────────────────────┐
│ Showing 1–50 of 1,234   Scope: [Full ▼]  [↻ Refresh] | [⬇ Export Selected] [⬇ All]        │
└────────────────────────────────────────────────────────────────────────────────────────────┘

Scope dropdown options (Thai-first labels):
  Demo only                — ข้อมูลประชากร
  Demo + Test              — + ผลตรวจในคลินิก
  Demo + Test + Screening  — + ข้อมูล mobile app (q01–q20)
  Full (everything)        — ทุกคอลัมน์รวม admin metadata
```

- Plain `<select>` (matches other filter dropdowns).
- Default: `full`.
- Session-scoped state; do NOT persist across reloads.
- Tooltip/title on the dropdown: `"เลือก scope ก่อนกด Export — ไฟล์ที่ได้จะเป็น .zip"` to set expectation that the download is now a ZIP.

---

## Files to create / modify

| File | Action |
|---|---|
| [docs/PLAN_017_USERS_EXPORT_SCOPE_AND_DEMO.md](./PLAN_017_USERS_EXPORT_SCOPE_AND_DEMO.md) | *(updated)* this document |
| [app/api/export/users-csv/route.ts](../app/api/export/users-csv/route.ts) | Add `scope` parsing; scope-gated batches; new demo cols (14); `normalizeYesNo()` for 8 fields; `fetchInChunks()` for every `.in()` callsite; build ZIP with `jszip`; new `Content-Type: application/zip` headers; filename per scope |
| [app/pages/users/page.tsx](../app/pages/users/page.tsx) | Add `exportScope` state (`"demo" \| "demo_test" \| "demo_test_screening" \| "full"`, default `"full"`); pass in `handleExport` payload; switch download filename suffix to `.zip` |
| [app/component/users/SearchFilters.tsx](../app/component/users/SearchFilters.tsx) | Add `exportScope` + `setExportScope` props; render scope `<select>` left of Refresh |
| `public/references/questionnaire_responses.csv` | *(new — relocated)* moved from `app/component/users/questionnaire_responses.csv` so Next.js bundles it for production. Keep original copy in place if other code references it; if nothing else does, delete the old one |

No new dependencies (`jszip` already installed).

---

## Edge cases & rules

1. **Demo cols are `checkpd.users` only — no `public.users` fallback.** If the `checkpd.users` row is missing, the 14 new columns emit `""`. Do not invent values.

2. **`normalizeYesNo()` runs only on the 8 specified fields.** Free-text fields keep their raw value (Excel will display whatever Thai the user typed). If the doctor later wants free-text fields cleaned, that's a separate PLAN.

3. **Empty data → still return a ZIP.** A filtered export that matches zero rows should return a ZIP with an empty-but-headered CSV + readme. Do NOT return 400 — an empty result is a valid answer to the filter.

4. **`questionnaire_responses.csv` is included only when the data CSV has `q01…q20`.** For `demo` and `demo_test` scopes, omit it; the readme should also drop the "questionnaire_responses.csv" line from the file list for those scopes.

5. **Filename per scope.** Use exactly:
   - `demo` → `checkpd_demo_<YYYYMMDD>.zip`
   - `demo_test` → `checkpd_demo_test_<YYYYMMDD>.zip`
   - `demo_test_screening` → `checkpd_demo_test_screening_<YYYYMMDD>.zip`
   - `full` → `checkpd_full_<YYYYMMDD>.zip`

6. **Backwards-compat default.** POST without `scope` → defaults to `"full"`. The route still returns a ZIP (the old `text/csv` response is gone). Any external scripts must be updated to handle ZIP — none expected.

7. **Invalid `scope`.** Reject with `400` and body `{ "error": "Invalid scope. Must be one of: demo, demo_test, demo_test_screening, full." }`.

8. **5 000-row cap stays.** Chunking removes the URL-length wall but the in-memory ZIP build is the new bottleneck. 5 000 rows × ~76 cols ≈ 1 MB CSV, well within memory limits. Revisit if doctors need more.

9. **UTF-8 BOM on every text file inside the ZIP.** Excel respects BOM at the start of each file inside a ZIP independently. Apply BOM to both `data.csv` and `readme.txt`. The bundled `questionnaire_responses.csv` is included as-is — verify it already has a BOM or add one when relocating.

10. **`prefix_name` in `checkpd.users` is currently NOT exported.** This plan does not add it. If the doctor later asks for full names with prefix, add `prefix_name` then. (Documenting non-decision to avoid scope creep.)

---

## Verification checklist

- [ ] Preflight checks all pass
- [ ] `public/references/questionnaire_responses.csv` exists and is committed; readable from `process.cwd()` in the route
- [ ] `route.ts` accepts `scope` in POST body; rejects unknown with 400
- [ ] `route.ts` builds and returns a ZIP (`Content-Type: application/zip`)
- [ ] ZIP for `demo` scope contains exactly 2 files: `data.csv` + `readme.txt`
- [ ] ZIP for `demo_test_screening` and `full` scopes contains 3 files including `questionnaire_responses.csv`
- [ ] 14 new demo cols appear in every scope's data CSV
- [ ] yes/no encoded cols (`smoking`, `alcohol`, …, `severe_head_injury`) contain only `"0"`, `"1"`, or `""` — verified by greping the output for unexpected values
- [ ] Bracket-wrapped raw values (e.g. `"[เคย,1,]"`) normalize correctly to `"1"`
- [ ] `demo` CSV omits `q01…q20`, `*_total`, `condition`, `other`
- [ ] `demo_test` CSV omits `q01…q20`, `prediction_risk`, `test_result`, `questionnaire_total`, `condition`, `other`
- [ ] `demo_test_screening` CSV omits `condition`, `other` only
- [ ] `full` CSV column count = current export column count + 14
- [ ] Filtered export of **≥ 1 000 rows** completes successfully (regression test for the chunking fix)
- [ ] Filtered export of **5 000 rows** completes within a reasonable time (target < 30 s; document if slower)
- [ ] Open the ZIP on Windows and macOS — both extract correctly
- [ ] Open `data.csv` in Excel — Thai renders correctly in all columns including the new demo cols
- [ ] Open `readme.txt` in Notepad — Thai renders correctly
- [ ] Selecting "Demo only" then "Export Selected" downloads `checkpd_demo_<YYYYMMDD>.zip`
- [ ] Existing PLAN-016 selection / filter / row-cap behavior unchanged
- [ ] `npm run lint` passes
- [ ] `npm run build` passes

---

## Out-of-scope follow-ups

- **PLAN-018 (potential)** — Per-column toggle UI for power users.
- **PLAN-019 (potential)** — Stream the ZIP response so the 5 000-row cap can be lifted.
- **PLAN-020 (potential)** — Auto-generate question text mapping (`q01_text`, `q02_text`, …) from the source-of-truth questionnaire schema, so `readme.txt` can list each question's full Thai text instead of pointing at `questionnaire_responses.csv`.
- **PLAN-021 (potential)** — Normalize remaining free-text demo fields (`marital_status` variants like `"โสด"` vs `"-"` vs `""`).

---

## Rollback plan

Confined to 3 files + 1 file move:

1. `app/api/export/users-csv/route.ts` — revert to PLAN-016 baseline (single CSV response, no scope, no normalization, no chunking).
2. `app/pages/users/page.tsx` — remove `exportScope` state and `.zip` filename suffix.
3. `app/component/users/SearchFilters.tsx` — remove scope dropdown and related props.
4. `public/references/questionnaire_responses.csv` — restore to `app/component/users/questionnaire_responses.csv` if it was deleted from there.

No DB migration to undo. No new dependencies. `git revert <commit>` is safe.

**Note:** Once PLAN-017 ships, the 1 000+ row bug fix lives in the same commit. A future rollback that drops only the scope/ZIP work but keeps the chunking fix requires manual cherry-pick — preferable approach is to ship the chunking fix as a separate small commit ahead of the feature work, so it can be retained independently. Codex's call.
