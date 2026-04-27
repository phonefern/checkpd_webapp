# PLAN-008: QA PDF — Migrate `/api/qa-pdf` from Playwright+Chromium to `@react-pdf/renderer`

## Overview

Replace the HTML→Chromium pipeline used by [`app/api/qa-pdf/route.ts`](../app/api/qa-pdf/route.ts) with a pure-JS PDF pipeline built on `@react-pdf/renderer`. The layout (A4 data sheet, Thai language, checkboxes, dotted fields, 3 page-break sections, numbered items 1–20) must render **visually identical** to the current output — pixel parity is not required, but section order, labels, values, checkbox states, and overall structure must match.

**Reason for change.** The current route relies on a singleton Playwright browser cached in [`lib/pdfBrowser.ts`](../lib/pdfBrowser.ts) to amortise Chromium launch cost across requests. On **Vercel Hobby**:
- Functions are killed on every deploy → singleton resets.
- Cold start launches Chromium via `@sparticuz/chromium` which pushes bundle size near the 50 MB limit.
- Concurrent requests each hit a fresh container → mutex does not help across instances.
- `Target closed` / `browser has been closed` errors occur in production and are only partially recovered by `resetBrowser()`.

`@react-pdf/renderer` is pure JS, no native binary, no browser process, cold-start time is milliseconds, and it is Vercel-Hobby-friendly.

**Related plans**: none blocking. This is an infra/reliability refactor; no schema or UX changes.

---

## Scope

### In scope
1. New file: `lib/qaPdfDocument.tsx` — JSX component that renders the QA data sheet using `@react-pdf/renderer` primitives (`Document`, `Page`, `View`, `Text`, `StyleSheet`, `Font`).
2. Rewrite of [`app/api/qa-pdf/route.ts`](../app/api/qa-pdf/route.ts) PDF-generation section (lines 149–453). Data fetching, rate-limiting, auth, error handling, filename, and response headers stay as-is.
3. New file: `lib/qaPdfFonts.ts` — one-time font registration (THSarabunNew regular + bold) loaded from `fonts/` directory.
4. Delete [`lib/pdfBrowser.ts`](../lib/pdfBrowser.ts) after confirming no other route imports it (grep `getBrowser`, `resetBrowser` — should only be `app/api/qa-pdf/route.ts`).
5. Remove `playwright`, `playwright-core`, `@sparticuz/chromium`, `puppeteer`, `@types/puppeteer` from `package.json` **only if** no other API route uses them. Verify with grep before removing.

### Out of scope
- Changing wording, field order, or value formatting.
- Changing the data queries (DIAG_SELECT, etc.).
- Changing rate limits, auth, route path, response headers.
- Other PDF endpoints (if any exist).

---

## Preflight checks (run before coding)

```bash
# 1. Confirm Playwright/Chromium usage is isolated to qa-pdf
grep -r "getBrowser\|resetBrowser\|pdfBrowser" app/ lib/
grep -r "from 'playwright\|from \"playwright\|@sparticuz/chromium\|from 'puppeteer" app/ lib/

# 2. Confirm fonts are shipped
ls fonts/Sarabun-Regular.ttf fonts/Sarabun-Bold.ttf fonts/thsarabunnew-webfont.woff
```

If grep shows other API routes using Playwright/Puppeteer (e.g. `app/api/pdf/*`), keep the dependencies and only delete `lib/pdfBrowser.ts` if the singleton is unused elsewhere.

---

## Dependencies

Add:
```
@react-pdf/renderer ^4.x
```

Remove (only after preflight confirms single-consumer):
```
playwright
playwright-core
@sparticuz/chromium
puppeteer
@types/puppeteer
```

`pdf-lib` stays — it is used elsewhere in the project for other PDF flows.

---

## Font registration

File: `lib/qaPdfFonts.ts`

```ts
import path from 'path'
import { Font } from '@react-pdf/renderer'

let registered = false

export function registerQaPdfFonts() {
  if (registered) return
  const fontsDir = path.join(process.cwd(), 'fonts')
  Font.register({
    family: 'THSarabun',
    fonts: [
      { src: path.join(fontsDir, 'Sarabun-Regular.ttf') },
      { src: path.join(fontsDir, 'Sarabun-Bold.ttf'), fontWeight: 'bold' },
    ],
  })
  // Disable hyphenation so Thai words aren't split with hyphens mid-word
  Font.registerHyphenationCallback((word) => [word])
  registered = true
}
```

Notes:
- Use the **Sarabun** TTF already in `fonts/` rather than the `.woff` — `@react-pdf/renderer` supports TTF/OTF natively; WOFF is unreliable.
- `registerQaPdfFonts()` must be called **before** `renderToStream`/`renderToBuffer`. Call it once at module load in `qaPdfDocument.tsx`.
- Thai text without the hyphenation-disable callback is split with `-` at line breaks. Mandatory.

---

## Document component

File: `lib/qaPdfDocument.tsx`

### Shape

```tsx
import { Document, Page, View, Text, StyleSheet } from '@react-pdf/renderer'
import { registerQaPdfFonts } from './qaPdfFonts'

registerQaPdfFonts()

type QaPdfData = {
  patient: { /* first_name, last_name, age, province, collection_date, hn_number, thaiid, bmi, weight, height, chest_cm, waist_cm, hip_cm, neck_cm, bp_supine, pr_supine, bp_upright, pr_upright */ }
  diag: { /* full DIAG_SELECT shape; nullable */ } | null
  moca: { total_score: number | null } | null
  hamd: { total_score: number | null; severity_level: string | null } | null
  mds:  { p1_total, p2_total, p3_total, p4_total, total_score } | null
  epw:  { total_score } | null
  smell:{ test_type, total_score } | null
  tmse: { total_score } | null
  rbd:  { total_score } | null
  rome4:{ total_score } | null
  vision: { /* 16 vision fields */ } | null
}

export function QaPdfDocument(props: QaPdfData) { /* ... */ }
```

The route handler computes all derived flags (`isPD`, `isProdromal`, `smellIsThai`, `colorPaperDone`, etc.) and passes them in, OR the component recomputes them from raw data. **Prefer passing raw data and recomputing inside the component** — keeps the route thin and the component self-contained.

### Styles (StyleSheet.create)

Map the current CSS 1:1. Keep the same numeric values so visual output matches.

| CSS (current) | React-PDF style |
|---|---|
| `font-family: THSarabunPSK; font-size: 15px; line-height: 1.4` | `{ fontFamily: 'THSarabun', fontSize: 15, lineHeight: 1.4 }` on `Page` |
| `@page { size: A4; margin: 30px }` | `<Page size="A4" style={{ padding: 30 }}>` |
| `h2` (center, 16px bold) | `<Text style={styles.h2}>` — `{ textAlign: 'center', fontSize: 16, fontWeight: 'bold', marginVertical: 5 }` |
| `.section` | `marginVertical: 4, marginTop: 3` |
| `.indent` | `marginLeft: 40, paddingTop: 6` |
| `.indent2` / `.sub-question` | `marginLeft: 80, paddingTop: 6` |
| `.numbered-item` | `marginVertical: 8` |
| `.numbered-item-2` | `marginVertical: 4, marginBottom: 30` |
| `.field` (dotted underline) | `{ borderBottomWidth: 1, borderBottomStyle: 'dotted', borderBottomColor: '#000', minWidth: 80, paddingHorizontal: 3, marginHorizontal: 2, textAlign: 'center' }` |
| `.checkbox` (12×12 bordered box) | `{ width: 12, height: 12, borderWidth: 1, borderColor: '#000', marginRight: 5, justifyContent: 'center', alignItems: 'center' }` |
| `.checkbox.checked` with `✓` | Checkbox `View` containing `<Text style={{ fontSize: 10 }}>✓</Text>` when checked |
| `.page-break` | Use a new `<Page>` for each page break — **not** `wrap={false}`. Three `<Page>` components: (A) top through item 6, (B) items 7–12, (C) items 13–20. |

### Helper components

```tsx
const Cb = ({ checked }: { checked: boolean }) => (
  <View style={styles.checkboxRow}>
    <View style={styles.checkbox}>
      {checked ? <Text style={styles.checkMark}>✓</Text> : null}
    </View>
  </View>
)

const Field = ({ value, minWidth = 80 }: { value: string | number | null | undefined; minWidth?: number }) => (
  <Text style={[styles.field, { minWidth }]}>{value ?? ''}</Text>
)

// Inline row helper — checkbox, then text, on the same line
const Line = ({ children, style }: { children: React.ReactNode; style?: any }) => (
  <View style={[{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' }, style]}>
    {children}
  </View>
)
```

### Inline layout note

`@react-pdf/renderer` uses Yoga (flexbox) layout, not CSS inline flow. Every "sentence with a checkbox + field inside" must be wrapped in a `<View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>`. Plain `<Text>` children inside a `<View>` do NOT behave like inline spans — they stack as blocks.

For paragraph-like rows (e.g. `${cb(x)} <strong>Constipation</strong>: History ...`), the simplest approach is:

```tsx
<Line style={styles.indent}>
  <Cb checked={!!diag?.constipation} />
  <Text><Text style={{ fontWeight: 'bold' }}>Constipation</Text>: History ถ่ายอุจจาระ …</Text>
</Line>
```

A bold `<Text>` nested inside a plain `<Text>` renders inline — this is the only way to get mixed-weight text on one line.

### Page structure

- **Page 1**: title + "Data sheet for..." heading, PD/Prodromal/Hyposmia/Other/Healthy diagnosis section, items 1–6 (demographics + vitals).
- **Page 2**: items 7–12 (Check PD app checklist, MDS-UPDRS, Cognitive, Smell, Color, Contrast). This maps to the current first `.page-break` div.
- **Page 3**: items 13–20 (VA, Sleep, HAM-D, ROME IV, ADL, SCOPA, Blood, FDOPA). This maps to the current second `.page-break` div.

Implement as three separate `<Page size="A4" style={styles.page}>` elements inside one `<Document>`. Do **not** try to use `break` prop inside a single Page — the HTML used explicit `<div class="page-break">` which started a new page, so the cleanest port is 3 Pages.

---

## Route handler changes

File: [`app/api/qa-pdf/route.ts`](../app/api/qa-pdf/route.ts)

### Keep unchanged
- Imports for Supabase, cookies, rate limit.
- `export const runtime = 'nodejs'` (react-pdf needs Node, not Edge).
- `PDF_RATE_LIMIT`, `PDF_RATE_WINDOW_MS`, `DIAG_SELECT`.
- The rate-limit block (lines 44–51).
- The `patient_id` validation block (lines 53–61).
- The `Promise.all` data-fetch block (lines 63–97) and error aggregation (lines 99–112).
- The `fileName` / `Content-Disposition` response headers (lines 455–462).
- The outer try/catch error response (lines 463–469).

### Remove
- `import path from 'path'` and `import fs from 'fs'` (no longer used in the route itself).
- `import { getBrowser, resetBrowser } from '@/lib/pdfBrowser'`.
- The `fontPath` / `fontBase64` block (lines 17–23) — moved into `lib/qaPdfFonts.ts`.
- All the HTML-helper consts (`cb`, `field`, `yesNo`, `normalize`) — move into the JSX component or redefine there.
- The entire `const html = \`...\`` template (lines 149–430).
- The `runPdf` closure and its retry-on-disconnected wrapper (lines 432–453).

### Add

```ts
import { renderToBuffer } from '@react-pdf/renderer'
import { QaPdfDocument } from '@/lib/qaPdfDocument'

// ... (after all the data-fetch / validation blocks, replacing current lines 114–453) ...

const pdfBuffer = await renderToBuffer(
  <QaPdfDocument
    patient={patientRes.data}
    diag={diagRes.data}
    moca={mocaRes.data}
    hamd={hamdRes.data}
    mds={mdsRes.data}
    epw={epwRes.data}
    smell={smellRes.data}
    tmse={tmseRes.data}
    rbd={rbdRes.data}
    rome4={rome4Res.data}
    vision={visionRes.data}
  />
)
```

Note: the route file must be renamed to `route.tsx` (not `.ts`) because it will contain JSX. Update the import path if referenced elsewhere (should not be — API routes are referenced by URL, not import).

### Final response block

No change. `new Response(new Uint8Array(pdfBuffer), { headers: { 'Content-Type': 'application/pdf', 'Content-Disposition': ... } })` is kept verbatim.

---

## Mapping table — every section of the current HTML

Implementer should use this as a checklist. Each row = one block of the current HTML that must exist in the new component.

| # | Current HTML anchor | React-PDF target | Notes |
|---|---|---|---|
| 1 | `<h2>Data sheet for high risk...` | `<Text style={styles.h2}>` | Two stacked h2s on page 1 |
| 2 | PD section (`isPD`, newly diagnosis, disease_duration, H&Y) | `<View style={styles.section}>` with `<Line>` rows | Bold `PD` label stays bold |
| 3 | Prodromal / High risk (RBD, Hyposmia sub-questions) | `<View>` with 2× indent levels | `onset_age` + `duration` fields on `sub-question` row |
| 4 | "หรือ มีอาการนำ อย่างน้อย 2 ข้อ..." with 5 sub-items (Constipation, Depression, EDS, ANS, Mild PS) + Family history | nested `<View style={styles.indent}>` → each item is `<Line>` | Sub-question row per symptom |
| 5 | Other diagnosis + Healthy | two single-line sections | `otherText` field width 300 |
| 6 | Numbered items 1–6 (name, age, province, collection_date, HN, weight/height/BMI) | 6× `<Line style={styles.numberedItem}>` | Bold number prefix |
| 7 | Chest/waist/neck/hip, BP supine, BP upright | 3× `<View style={styles.section}>` | |
| 8 | `<div class="page-break">` #1 — item 7 Check PD app (7 unchecked items) | **New `<Page>`** | All 7 checkboxes render unchecked per current code |
| 9 | Items 8 MDS-UPDRS (Part I–IV + total) | `<View style={styles.numberedItem2}>` with 4 indent lines + total | |
| 10 | Items 9 Cognitive (MoCA or TMSE) | 2 indent lines | |
| 11 | Items 10 Smell (Thai / Sniffin) | 2 indent lines | `smellIsThai` / `smellIsSniffin` logic |
| 12 | Items 11 Color discrimination (Paper, App, No) | 3 indent blocks with nested 2-column layout for RE/LE | Use `<View style={{ marginLeft: 40 }}>` for eye scores |
| 13 | Items 12 Contrast (Manual, App, No) | same as item 11 pattern | |
| 14 | `<div class="page-break">` #2 — item 13 VA | **New `<Page>`** | a./b. lettered lines + pinhole sub-lines indented further |
| 15 | Item 14 Sleep (RBD, Epworth, PSG request) | 3 indent lines + nested yes/no | |
| 16 | Item 15 HAM-D | 1 line with severity suffix | |
| 17 | Item 16 ROME IV | 1 line | |
| 18 | Item 17 ADL | 1 line | |
| 19 | Item 18 SCOPA AUT | 1 line | |
| 20 | Item 19 Blood test (Genetic GP2 + RT-QuIC note) | 2 indent lines + optional note | |
| 21 | Item 20 FDOPA PET | 1 line with Yes/No | Score appended after "Yes" if present |

---

## Edge cases to preserve

These behaviours are in the current code — port them exactly.

- `field(value)` renders `''` (empty) when value is null/undefined, **not** "null". Keep `value ?? ''` fallback.
- `cb(!!diag?.disease_duration)` is truthy when disease_duration is any non-zero number. Keep `!!` coercion.
- `hamd?.severity_level` is appended as `` (${hamd.severity_level}) `` only when truthy.
- `blood_test_note` — note is rendered only if non-empty; use conditional render.
- `fdopa_pet_score` — appended inline after "Yes" as ` — Score: ${score}`, else ` at` then empty field.
- `smellIsSniffin = smell?.test_type === 'sniffin_stick' || (!!smell?.total_score && !smellIsThai)` — keep the OR fallback.
- `!vaDone` → render an empty wide field (180px minWidth). Port this conditional.
- BMI formatting: `Number(p.bmi).toFixed(1)` when non-null.
- `conditionRaw` normalisation + all 6 derived booleans (`isNewlyDiagnosis`, `isPD`, `isProdromal`, `isHealthy`, `isNormal`, `isOther`) — identical logic.
- `otherText` fallback chain: `isOther ? (other_diagnosis_text ?? condition ?? '') : (other_diagnosis_text ?? '')`.

---

## Testing

No test runner in this project (per `CLAUDE.md`). Manual verification:

1. `npm run dev`
2. Log in, open `/pages/qa`, open a patient with full data, click Print/PDF action.
3. Open a patient with **minimal** data (only name + age) — verify PDF still renders, empty fields show as blank dotted lines.
4. Open a patient where `condition = 'Prodromal'` vs `condition = 'PD'` vs `condition = 'Healthy'` vs `condition = 'Other: xxx'` — verify correct top-of-page checkboxes.
5. Side-by-side compare against current production output:
   - Thai text renders without hyphens mid-word.
   - Bold labels (PD, Constipation, Depression, etc.) are visibly bolder.
   - Checkbox sizes and positions match.
   - Page breaks land in the same places (after item 6, after item 12).
   - Dotted-underline fields align roughly with current layout.
6. Rapid-fire 5 PDF requests in a row — verify no errors, no memory leaks, no lingering processes (`ps | grep chrom` should be empty — Chromium gone entirely).
7. Deploy to Vercel Hobby preview — verify first-request latency is <1s (down from 3–8s cold start).

---

## Rollback

Git revert the commit. No database or config state changes. `lib/pdfBrowser.ts` is re-added by the revert if it was deleted.

---

## File inventory

**Created**:
- `lib/qaPdfDocument.tsx`
- `lib/qaPdfFonts.ts`
- `docs/PLAN_008_QA_PDF_REACT_PDF_MIGRATION.md` (this file)

**Modified**:
- `app/api/qa-pdf/route.ts` → renamed to `app/api/qa-pdf/route.tsx`
- `package.json` (add `@react-pdf/renderer`; optionally remove Playwright/Puppeteer after grep confirms no other consumers)

**Deleted** (conditional on grep result):
- `lib/pdfBrowser.ts`

---

## Implementation order (for Codex)

1. `npm install @react-pdf/renderer`
2. Create `lib/qaPdfFonts.ts`.
3. Create `lib/qaPdfDocument.tsx` with the Document + Page + all 21 blocks from the mapping table. Type-check passes.
4. Rename `app/api/qa-pdf/route.ts` → `route.tsx`, swap HTML-generation block for `renderToBuffer(<QaPdfDocument ... />)`.
5. `npm run build` — fix any TS errors.
6. Manual verify per Testing section.
7. Run preflight greps; if clean, delete `lib/pdfBrowser.ts` and remove Playwright/Puppeteer deps; `npm install`; rebuild.
8. Commit.
