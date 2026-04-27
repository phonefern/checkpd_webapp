# PLAN-009: `/api/pdf` → `/api/pdf-v2` — React-PDF Migration (single + batch)

## Overview

Mirror the PLAN-008 pattern (qa-pdf v2, now shipping) onto the **patient report** PDF endpoint used by the mobile-app results page. Build a new v2 route tree at [`app/api/pdf-v2/`](../app/api/pdf-v2/) that renders with `@react-pdf/renderer` instead of Playwright+Chromium. The existing [`app/api/pdf/`](../app/api/pdf/) stays untouched during this plan — cut-over of the frontend call sites is a **separate, later step**.

**Baseline files** (already in tree, serve as template):
- [`lib/qaPdfFonts.ts`](../lib/qaPdfFonts.ts) — font registration + hyphenation disable
- [`lib/qaPdfDocument.tsx`](../lib/qaPdfDocument.tsx) — the `Document` component with `StyleSheet`, `Cb`, `Field`, `Line` helpers
- [`lib/generateQaPdfBuffer.tsx`](../lib/generateQaPdfBuffer.tsx) — thin `renderToBuffer` wrapper
- [`app/api/qa-pdf/route.tsx`](../app/api/qa-pdf/route.tsx) — route calls the buffer wrapper; rate-limit/auth unchanged

**Target files** (to be created — empty stubs already exist for the routes):
- `lib/pdfReportFonts.ts` *(or reuse `qaPdfFonts.ts` — see §Font strategy)*
- `lib/pdfReportDocument.tsx`
- `lib/generatePdfReportBuffer.tsx`
- `app/api/pdf-v2/[userDocId]/route.tsx` *(stub exists, currently empty)*
- `app/api/pdf-v2/batch/route.tsx` *(stub exists, currently empty)*

**Source to migrate** (read-only during this plan — do **not** delete):
- [`app/api/pdf/[userDocId]/route.ts`](../app/api/pdf/[userDocId]/route.ts) — single-report, Firebase-backed, generates HTML → Chromium PDF
- [`app/api/pdf/batch/route.ts`](../app/api/pdf/batch/route.ts) — CSV → ZIP-of-PDFs, loops `generatePdfBuffer()`
- [`lib/generatePdfBuffer.ts`](../lib/generatePdfBuffer.ts) — Firebase fetch + HTML generation + Playwright render
- [`lib/generateHTML.ts`](../lib/generateHTML.ts) — HTML template + `calculateTremorFrequency` DFT
- [`lib/processRecordData.ts`](../lib/processRecordData.ts) — Firestore field grouping (reusable as-is)
- [`lib/calculateAgeFromBod.ts`](../lib/calculateAgeFromBod.ts) — age calc from birthday (reusable as-is)

**Related plans**: PLAN-008 (qa-pdf v2) established the pattern and font pipeline — this plan reuses both.

---

## Scope

### In scope
1. Create `lib/pdfReportDocument.tsx` — JSX component rendering the patient report (page 1: summary + results + diagnose + advice; page 2: 20-question checklist when answered).
2. Create `lib/generatePdfReportBuffer.tsx` — signature `(userDocId: string, recordId: string) => Promise<Buffer>`; mirrors [`lib/generatePdfBuffer.ts`](../lib/generatePdfBuffer.ts) but renders via `@react-pdf/renderer`.
3. Extract `calculateTremorFrequency` + `extractSensorSeries` from [`lib/generateHTML.ts`](../lib/generateHTML.ts) into a new `lib/tremorFrequency.ts` — shared by document component, no HTML coupling.
4. Fill in `app/api/pdf-v2/[userDocId]/route.tsx` — copy the request-validation/rate-limit/response shell from the current [`app/api/pdf/[userDocId]/route.ts`](../app/api/pdf/[userDocId]/route.ts); replace `runPdf` block with `generatePdfReportBuffer(userDocId, recordId)`.
5. Fill in `app/api/pdf-v2/batch/route.tsx` — copy from [`app/api/pdf/batch/route.ts`](../app/api/pdf/batch/route.ts); swap `generatePdfBuffer` → `generatePdfReportBuffer`.
6. Add an OpenGraph-free static `<Image>` pipeline for the existing header/footer JPEGs in [`img/header/pdf_header.jpg`](../img/header/pdf_header.jpg) and [`img/footer/pdf_footer.jpg`](../img/footer/pdf_footer.jpg).

### Out of scope
- Changing the Firebase queries, collection names (`users`/`temps` branching), or record shape.
- Changing wording/labels, question list, advice paragraphs, footer note.
- Changing rate limit (15/min single, 10/min batch), `MAX_BATCH = 100`, ZIP compression level.
- Updating frontend call sites ([`app/pages/pdf/page.tsx:320`](../app/pages/pdf/page.tsx#L320), [`app/pages/pdf/page.tsx:341`](../app/pages/pdf/page.tsx#L341), [`app/component/users/UserActionsMenu.tsx`](../app/component/users/UserActionsMenu.tsx) if present) — done in a follow-up after v2 is verified in staging.
- Removing `pdfBrowser.ts` / Playwright deps — other routes still use it (qa-pdf-v1 + pdf v1).

---

## Font strategy

The existing [`lib/qaPdfFonts.ts`](../lib/qaPdfFonts.ts) registers `family: 'THSarabun'` from the project WOFF files and installs a hyphenation-disable callback. **This is global `@react-pdf/renderer` state** — registering twice under the same family is a no-op, but two modules each maintaining their own `registered` guard is fine.

**Decision: reuse `registerQaPdfFonts()`** from the existing file. Import it at the top of `pdfReportDocument.tsx`:

```ts
import { registerQaPdfFonts } from '@/lib/qaPdfFonts'
registerQaPdfFonts()
```

Rationale: both documents want the exact same font family. A second `pdfReportFonts.ts` would be duplicate code. If a future report ever needs a different font, extract to a shared `lib/pdfFonts.ts` then — not now (YAGNI). **Do not create `lib/pdfReportFonts.ts`.**

---

## Shared module: tremor-frequency DFT

File: `lib/tremorFrequency.ts`

Extract lines 32–145 of [`lib/generateHTML.ts`](../lib/generateHTML.ts) (`extractSensorSeries` + `calculateTremorFrequency`) verbatim. No behavioural change. Export:

```ts
export function calculateTremorFrequency(recordData: any): number | null
```

`extractSensorSeries` stays internal (no export needed). The current `lib/generateHTML.ts` keeps its local copy for the v1 route to avoid breaking it — only the v2 module imports from `tremorFrequency.ts`.

**Verify after extraction**: computation should produce identical output to the v1 code for the same input. Spot-check by running v1 and v2 side-by-side on a record with tremor data and comparing the Hz value in both PDFs.

---

## `lib/pdfReportDocument.tsx`

### Props shape

```tsx
import path from 'path'
import { Document, Page, View, Text, Image, StyleSheet } from '@react-pdf/renderer'
import { registerQaPdfFonts } from '@/lib/qaPdfFonts'

registerQaPdfFonts()

export type PdfReportProps = {
  info: {
    name: string              // "firstName lastName" or 'ไม่ระบุ'
    age: string | null        // stringified age or null
    date: string              // ISO string; will be formatted Thai
  }
  questionnaire: string[]      // 20 entries of '0' / '1' / other, or [] when unanswered
  tapCountLeft: number | null
  tapCountRight: number | null
  restingFrequency: number | null
  posturalFrequency: number | null
  balanceFrequency: number | null
  gaitFrequency: number | null
  hasVoice: boolean            // voiceAhh || voiceYPL present
  hasQuestionnaire: boolean    // recordData.questionnaire present
  prediction: { risk?: boolean } | null
  diagnose: {
    type?: 'ct' | 'pd' | 'prodromalPD' | 'highRiskPD' | 'other' | string
    comment?: string
    note?: string
  } | null
}
```

All derived values (DFT, tap counts, Thai-date formatting, diagnose mapping) are **computed inside `generatePdfReportBuffer` before the `<Document>` is instantiated**. This keeps the component declarative and the route thin — mirrors the qa-pdf baseline where raw data goes to the component and derivations happen in the component.

Actually — rethink. The qa-pdf baseline passes raw Supabase rows and derives in the component. For parity with that pattern, **do the same here**: pass raw `userData` + `recordData`, derive inside. The above props shape is the derived version; choose one.

**Decision: derive inside the component**, props are:

```tsx
export type PdfReportProps = {
  info: { name: string; age: string | null; date: string }
  recordData: Record<string, any>   // output of processRecordData
}
```

The DFT calls and truthy checks live inside the component (top of `QaPdfDocument`-style closure). This keeps the route handler narrow (fetch → processRecordData → render) and matches qa-pdf.

### Image embedding

`@react-pdf/renderer` `<Image>` accepts a `src` that is a local absolute path, a `Buffer`, or `{ data, format }`. Simplest pattern: pass absolute path and let the renderer read it.

```tsx
const headerImg = path.join(process.cwd(), 'img', 'header', 'pdf_header.jpg')
const footerImg = path.join(process.cwd(), 'img', 'footer', 'pdf_footer.jpg')

// inside the Page body:
<Image src={headerImg} style={styles.headerImage} />
// ... content ...
<Image src={footerImg} style={styles.footerImage} />
```

**Vercel note**: `process.cwd()` resolves to the function root on Vercel, where [`img/`](../img/) is bundled because it is imported/referenced at module level. Confirm the JPEGs are included in the Vercel deployment by checking `next build` output (they should be picked up by the Next.js filesystem tracer). If they are not, preload them as `Buffer` at module scope via `fs.readFileSync` (same pattern as fonts).

### StyleSheet map

Port the v1 CSS to `StyleSheet.create`. Values below are starting points — tune against v1 output:

| v1 CSS | react-pdf style |
|---|---|
| `@page { size: A4; margin: 12px 24px }` | `<Page size="A4" style={{ paddingTop: 12, paddingBottom: 12, paddingHorizontal: 24 }}>` |
| `body { font-family: THSarabunPSK; font-size: 12px; line-height: 1.4 }` | On `Page`: `{ fontFamily: 'THSarabun', fontSize: 12, lineHeight: 1.4 }` |
| `.header-img` / `.footer-img` | `Image` with `{ width: '100%', marginBottom: 8 }` / `marginTop: 16` |
| `.section { margin: 8px 0 }` | `{ marginVertical: 8 }` |
| `.indent { margin-left: 20px }` | `{ marginLeft: 20 }` |
| `.bold { font-weight: bold }` | `{ fontWeight: 'bold' }` |
| `.note { font-size: 9px; margin-top: 16px }` | `{ fontSize: 9, marginTop: 16 }` |
| `.test-section { border-left: 3px solid #666; padding-left: 8px }` | `{ borderLeftWidth: 3, borderLeftColor: '#666', paddingLeft: 8, marginBottom: 8, paddingVertical: 4 }` |
| `.test-title { font-weight: bold; font-size: 12px }` | `{ fontWeight: 'bold', fontSize: 12, marginBottom: 2 }` |
| `.test-item { margin-left: 12px; font-size: 12px }` | `{ marginLeft: 12, fontSize: 12 }` |
| `.value { font-weight: bold }` | inline: `<Text style={{ fontWeight: 'bold' }}>` |
| `.value.na` / `.na` | `{ color: '#999', fontStyle: 'italic' }` |
| `.question-item { display: flex; justify-content: space-between }` | `{ flexDirection: 'row', justifyContent: 'space-between', marginVertical: 2 }` |
| `.answer-yes` | `{ color: '#f44336' }` |
| `.answer-no` | `{ color: '#009688' }` |
| `.page-break` | new `<Page>` element, not a `break` prop |

### Page structure

```tsx
<Document>
  <Page size="A4" style={styles.page}>
    <Image src={headerImg} style={styles.headerImage} />

    {/* Identity block */}
    <View style={styles.section}>
      <Text>ชื่อ นามสกุล {info.name}</Text>
      <Text>อายุ {info.age ?? '................'} ปี</Text>
      <Text>วันที่ทดสอบ {formatThaiDate(info.date)}</Text>
    </View>

    {/* "ท่านได้ทำการประเมิน ..." header */}
    <Text style={[styles.section, styles.bold]}>
      ท่านได้ทำการประเมิน แบบคัดกรอง... ประกอบด้วย
    </Text>

    {/* 5 test-section blocks: questionnaire / voice / tremor / tap / gait+balance */}
    <View style={styles.indent}>
      <TestSection title="• แบบประเมินอาการโรคพาร์กินสัน 20 ข้อ">
        {hasQuestionnaire
          ? <Text style={styles.testItem}>- ทำแบบประเมินแล้ว</Text>
          : <NaItem />}
      </TestSection>
      {/* ... repeat for voice, tremor (2 rows), tap (2 rows), gait+balance (2 rows) ... */}
    </View>

    {/* Prediction / Diagnose / Advice blocks */}
    <Text style={[styles.section, styles.bold]}>ผลการประเมินด้วยค่าทางสถิติ ... พบว่า</Text>
    <Text style={styles.indent}>
      {prediction?.risk ? 'แนะนำพบแพทย์ ...' : 'อยู่ในเกณฑ์ปกติ'}
    </Text>
    {/* diagnose mapping (ct/pd/prodromalPD/highRiskPD/other) */}
    {/* "ข้อแนะนำ สำหรับทุกคน" + bullet list */}
    {/* "ข้อแนะนำ สำหรับผู้ที่ต้องไปพบแพทย์" + bullet list */}

    <Image src={footerImg} style={styles.footerImage} />

    <Text style={[styles.note, styles.bold]}>หมายเหตุ</Text>
    <Text style={styles.note}>การประเมินด้วยแบบคัดกรอง...</Text>
  </Page>

  {/* Page 2: only when questionnaire array has entries */}
  {questionnaire.length > 0 && (
    <Page size="A4" style={styles.page}>
      <Image src={headerImg} style={styles.headerImage} />
      <Text style={[styles.section, styles.bold]}>
        แบบประเมินอาการโรคพาร์กินสัน 20 ข้อ
      </Text>
      {QUESTION_LIST.map((q, i) => {
        const isYes = questionnaire[i] !== '0'
        return (
          <View key={i} style={styles.questionItem}>
            <Text style={{ flex: 1 }}>{q}</Text>
            <Text style={isYes ? styles.answerYes : styles.answerNo}>
              {isYes ? 'ใช่' : 'ไม่'}
            </Text>
          </View>
        )
      })}
      <Image src={footerImg} style={styles.footerImage} />
      <Text style={[styles.note, styles.bold]}>หมายเหตุ</Text>
      <Text style={styles.note}>การประเมินด้วยแบบคัดกรอง...</Text>
    </Page>
  )}
</Document>
```

### Move `QUESTION_LIST` constant

The 20-question array currently lives in two places ([`app/api/pdf/[userDocId]/route.ts:34-55`](../app/api/pdf/[userDocId]/route.ts#L34-L55) and [`lib/generateHTML.ts:9-30`](../lib/generateHTML.ts#L9-L30)). For v2, export it from `lib/pdfReportDocument.tsx` (or a standalone `lib/pdfQuestionList.ts` if the array is reused elsewhere — grep first). Do **not** modify the v1 copies during this plan.

---

## `lib/generatePdfReportBuffer.tsx`

Port [`lib/generatePdfBuffer.ts`](../lib/generatePdfBuffer.ts) lines 20–48 verbatim (Firebase fetch, `processRecordData`, `calculateAgeFromBod`, `info` block construction). Replace the HTML + Playwright block (lines 48–68) with:

```tsx
import { renderToBuffer } from '@react-pdf/renderer'
import { PdfReportDocument } from '@/lib/pdfReportDocument'

// ... existing fetch logic unchanged ...

return renderToBuffer(
  <PdfReportDocument info={info} recordData={recordData} />
)
```

Notes:
- File extension is `.tsx` (JSX inside).
- Signature stays `(userDocId: string, recordId: string) => Promise<Buffer>` — batch route reuses untouched.
- Drop the `try/catch` around `runPdf` and the `resetBrowser` retry — not applicable to react-pdf (no browser). If `renderToBuffer` throws, let the caller handle it (the route already has an outer `try/catch`).
- Do **not** `console.log` input args in production — the v1 file has a debug `console.log` at line 13; omit in v2.

---

## Route: `app/api/pdf-v2/[userDocId]/route.tsx`

Stub file exists empty. Populate by copying **only the HTTP shell** from [`app/api/pdf/[userDocId]/route.ts`](../app/api/pdf/[userDocId]/route.ts):

### Keep (copy verbatim)
- `runtime = 'nodejs'` + `maxDuration = 60` (can lower to 30; react-pdf is fast — defer decision)
- `PDF_RATE_LIMIT = 15`, `PDF_RATE_WINDOW_MS = 60_000`
- Rate-limit block
- `params` resolution + `recordId` validation
- Final `new Response(new Uint8Array(pdfBuffer), { headers: {...}})` block with `Content-Disposition: inline; filename*=UTF-8''report_${userDocId}_${recordId}.pdf`
- Outer `try/catch` + error response

### Remove
- All font/image `fs.readFileSync` blocks (lines 17–31 of v1) — handled in document module.
- `QUESTION_LIST` constant — imported from the document module.
- `processRecordData` + `calculateAgeFromBod` + `calculateTremorFrequency` + `extractSensorSeries` inline copies — imported.
- `generateHTML` call + HTML template.
- `getBrowser` / `resetBrowser` + `runPdf` retry wrapper.
- Firebase fetch — moves into `generatePdfReportBuffer`.

### Resulting body

Roughly:

```tsx
import { NextRequest, NextResponse } from 'next/server'
import { checkRateLimit, getClientIdentifier } from '@/lib/rateLimit'
import { generatePdfReportBuffer } from '@/lib/generatePdfReportBuffer'

export const runtime = 'nodejs'
export const maxDuration = 30   // react-pdf is fast; 60 no longer needed

const PDF_RATE_LIMIT = 15
const PDF_RATE_WINDOW_MS = 60 * 1000

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ userDocId: string }> },
) {
  try {
    const id = getClientIdentifier(req)
    const { ok, resetAt } = checkRateLimit(id, PDF_RATE_LIMIT, PDF_RATE_WINDOW_MS)
    if (!ok) {
      return NextResponse.json(
        { error: 'เกินจำนวนการขอ PDF ต่อนาที กรุณาลองใหม่ในภายหลัง' },
        { status: 429, headers: { 'X-RateLimit-Reset': String(resetAt), 'Retry-After': '60' } },
      )
    }

    const { userDocId } = await context.params
    const recordId = new URL(req.url).searchParams.get('record_id')
    if (!recordId) {
      return NextResponse.json({ error: 'กรุณาระบุ record_id' }, { status: 400 })
    }

    const pdfBuffer = await generatePdfReportBuffer(userDocId, recordId)

    return new Response(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename*=UTF-8''${encodeURIComponent(
          `report_${userDocId}_${recordId}.pdf`,
        )}`,
      },
    })
  } catch (err: any) {
    console.error('pdf-v2 generation error:', err)
    return NextResponse.json(
      { error: 'เกิดข้อผิดพลาดขณะสร้าง PDF', details: err.message || String(err) },
      { status: 500 },
    )
  }
}
```

---

## Route: `app/api/pdf-v2/batch/route.tsx`

Stub file exists empty. Populate by copying [`app/api/pdf/batch/route.ts`](../app/api/pdf/batch/route.ts) verbatim, then:

1. Change import: `generatePdfBuffer` → `generatePdfReportBuffer`.
2. Change the call inside the loop: `generatePdfBuffer(userDocId, record_id)` → `generatePdfReportBuffer(userDocId, record_id)`.
3. Keep everything else: `MAX_BATCH = 100`, rate limit (`10/min`), CSV parsing, ZIP building, error-file-in-zip fallback, `Content-Disposition: attachment; filename="pdf_reports.zip"`.
4. Rename the file extension `.ts` → `.tsx` (already `.tsx` in the stub — leave as is).

---

## Edge cases to preserve (from v1)

Port these exactly — same logic in v2:

- `isNumericId = /^[0-9]+$/.test(userDocId)` → `collectionName = isNumericId ? 'temps' : 'users'`.
- `info.name` fallback chain: `firstName + lastName`, trimmed; fallback `'ไม่ระบุ'`.
- `info.age` — returns `null` when `bod` is null/invalid; render `'................'` fallback in the doc.
- `info.date` — when `rawRecordData.createdAt` is a Firestore `Timestamp`, use `.toDate().toISOString()`; otherwise `new Date().toISOString()`.
- `formatThaiDate` — Thai month abbreviations + Buddhist year (`+543`). Port the function verbatim into the document module.
- `tapCountLeft` / `tapCountRight` — `recordData.dualtap?.data?.score ?? null` and same for `dualtapright`. Note the `.data?.score` depth; preserve.
- `restingFrequency` / `posturalFrequency` / `balanceFrequency` / `gaitFrequency` — call `calculateTremorFrequency(recordData.XXX.data)` only when the outer field exists; else `null`.
- `prediction?.risk` truthiness controls the "อยู่ในเกณฑ์ปกติ" vs "แนะนำพบแพทย์" branch.
- `diagnose?.type` mapping:
  - `'ct'` → `'ปกติ/Healthy control'`
  - `'pd'` → `"Likely Parkinson's disease (PD)"`
  - `'prodromalPD'` → `'Likely prodromal PD'`
  - `'highRiskPD'` → `'Likely high risk for PD'`
  - `'other'` → `'Other'`
  - anything else (including undefined) → long dotted line (90 dots in v1)
- `diagnose?.comment` / `diagnose?.note` — empty → 90-dot line fallback (match v1 length).
- Page 2 renders **only** when `questionnaire.length > 0` (split-by-comma on `recordData.questionnaire?.data`). An empty/missing questionnaire string produces no second page.
- Question answer colouring: value `'0'` → 'ไม่' green (`#009688`); anything else → 'ใช่' red (`#f44336`).
- Footer note (`หมายเหตุ ... ยังไม่สามารถทดแทน ...`) renders on **both** pages in v1. Preserve.

---

## Testing

No automated tests configured (`CLAUDE.md` §Commands). Manual verification:

1. `npm run dev`.
2. **Single v1 vs v2 parity**: pick a known `userDocId` + `record_id` from Firestore, open both:
   - `http://localhost:3000/api/pdf/<userDocId>?record_id=<recordId>` (v1)
   - `http://localhost:3000/api/pdf-v2/<userDocId>?record_id=<recordId>` (v2)
   Compare page 1: identity line, 5 test sections, 2 advice blocks, footer note. Compare page 2 when questionnaire exists.
3. **Record with no questionnaire** → single page, no page 2.
4. **Record with partial tremor data** (only resting, no postural) → only resting row shows Hz, others show "ไม่มีข้อมูลจากการทดสอบ" (italic grey).
5. **User in `temps` collection** (numeric `userDocId`) → resolves correctly.
6. **Batch**: upload a CSV with 3 rows to `/api/pdf-v2/batch`, verify ZIP contains 3 `report_<id>_<record>.pdf`. Try a CSV where one row's `userDocId` does not exist → verify `ERROR_<id>_<record>.txt` appears in the ZIP with the error message; other rows succeed.
7. **Rate limits**: hammer 16 single-requests in <1min from the same IP → 16th returns 429. 11 batch uploads → 11th returns 429.
8. **Vercel preview** (Hobby): deploy branch, confirm cold-start on `/api/pdf-v2/...` is <1s (v1 is 3–8s cold due to Chromium launch).
9. **DFT parity**: for a record with rich tremor data, confirm the `Hz` value printed on both v1 and v2 PDFs match to 1 decimal (the `.toFixed(1)`).

**Thai-text rendering** (specific to react-pdf): visually confirm no mid-word hyphens in Thai text. The `Font.registerHyphenationCallback` in `qaPdfFonts.ts` handles this, but regressions here are easy to miss.

---

## Rollback

`git revert` the PLAN-009 commit. v1 routes are untouched, so frontend continues to hit `/api/pdf/...` as before — no downtime, no data loss.

---

## File inventory

**Created**:
- `lib/pdfReportDocument.tsx`
- `lib/generatePdfReportBuffer.tsx`
- `lib/tremorFrequency.ts`
- `docs/PLAN_009_PDF_V2_REACT_PDF_MIGRATION.md` (this file)

**Modified**:
- `app/api/pdf-v2/[userDocId]/route.tsx` (stub → full implementation)
- `app/api/pdf-v2/batch/route.tsx` (stub → full implementation)

**Untouched** (intentional):
- `app/api/pdf/[userDocId]/route.ts`, `app/api/pdf/batch/route.ts`, `lib/generatePdfBuffer.ts`, `lib/generateHTML.ts`, `lib/pdfBrowser.ts` — v1 stays live until a later frontend cut-over plan.
- `lib/qaPdfFonts.ts` — reused; do not duplicate.
- `lib/processRecordData.ts`, `lib/calculateAgeFromBod.ts` — reused; already extracted.

---

## Implementation order (for Codex)

1. Create `lib/tremorFrequency.ts` — copy `extractSensorSeries` + `calculateTremorFrequency` from `lib/generateHTML.ts`; export only `calculateTremorFrequency`.
2. Create `lib/pdfReportDocument.tsx` — `<Document>` + `<Page>` × 1–2, StyleSheet, helpers (`TestSection`, `NaItem`, `formatThaiDate`, `QUESTION_LIST`, diagnose-type mapper). Call `registerQaPdfFonts()` at top.
3. Create `lib/generatePdfReportBuffer.tsx` — port Firebase fetch from `lib/generatePdfBuffer.ts`, build `info` + `recordData`, `return renderToBuffer(<PdfReportDocument ... />)`.
4. Fill `app/api/pdf-v2/[userDocId]/route.tsx` — HTTP shell + `generatePdfReportBuffer()` call.
5. Fill `app/api/pdf-v2/batch/route.tsx` — copy from v1 batch, swap generator function.
6. `npm run build` — fix TS errors (most likely: `PdfReportProps` mismatch, image path type).
7. Manual verify per Testing section, focus on v1/v2 parity (screenshot both, overlay).
8. Commit.
9. **Separate plan (PLAN-010 or similar, later)**: frontend cut-over — change the two `/api/pdf/...` fetch URLs in [`app/pages/pdf/page.tsx`](../app/pages/pdf/page.tsx) and `UserActionsMenu` to `/api/pdf-v2/...`, soak in production, then delete v1 route tree + `generatePdfBuffer.ts` + `generateHTML.ts` + (if no other consumers) `lib/pdfBrowser.ts` + Playwright/Puppeteer deps.
