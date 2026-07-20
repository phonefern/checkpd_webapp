# PLAN-021 — Register-First Print Flow + Patient ID / QR Bridge

## Overview

The on-site screening workflow today is: a patient finishes the CheckPD mobile screening,
arrives at the print station ([app/pages/pdf](../app/pages/pdf/page.tsx)), staff **prints the full
result PDF from Firebase**, and only **afterwards** registers the patient into the QA system
(`core.patients_v2`) via the QA button on the same page (`handleQaClick`). Because the
`patients_v2` row is created *after* printing, the printed report carries **no stable identifier**
that links the paper in the patient's hand back to their QA record.

This plan does three coupled things:

1. **Reverse the order** — register the patient into QA **first** (so a `patients_v2.id` +
   `patient_uid` exist), **then** print the report.
2. **Stamp the report** — the existing full PDF gains a small **QR code + short human-readable
   ID** block, so the paper can be scanned (or the ID typed) to jump straight back to the patient's
   QA record at a follow-up visit.
3. **Make the ID searchable** — the QA page search box accepts the numeric `patients_v2.id` (the
   short code) and the `patient_uid` (the QR payload), in addition to the current name / HN search.

### Reason for change

> "เมื่อ print แล้วจะต้อง regis qa เพื่อเพิ่มข้อมูลผู้ใช้เข้าระบบ screening … จากเดิมที่ search ด้วย thaiid,
> name เป็นหลัก เราเพิ่มให้สามารถ search ผ่าน id … แล้วถ้าจะทำ paperless ควรปริ้นเป็น slip หรือให้มี id ในปริ้นผล"

Name collides and the 13-digit Thai ID is error-prone to type. A short numeric `id` (exact match on
the PK) plus a scannable QR removes that friction and gives the printed report a durable back-link to
QA. Registering before printing is what makes the `id` exist in time to be printed.

## Related plans

- [[PLAN-005]] — `patient_uid` (per-person UUID) + `patient_visits_v2` view. The QR encodes
  `patient_uid`; the short code is the per-visit `patients_v2.id`.
- [[PLAN-006]] — QA ↔ CheckPD merge via `thaiid`; the print station already resolves identity by
  `thaiid` (`resolveExistingPatientUid` in [QaCreateModal.tsx](../app/component/qa/QaCreateModal.tsx)).
- [[PLAN-009]] — the `/api/pdf-v2` report this plan stamps the QR onto.

## Scope

### In scope
- QA search by numeric `id` (exact) **and** by `patient_uid` (exact, for pasted/scanned UUIDs),
  added to the existing `Search Patient` box. No new input field.
- QA page reads a deep-link query param (`?focus_uid=` / `?focus_id=`) on mount → auto-opens that
  patient's summary modal (the scan/click target).
- `QaCreateModal.onCreated` returns the created/edited `{ id, patient_uid }` so the print station
  can stamp the report immediately after registration.
- Print station (`/pages/pdf`) register-first UX: the Print action resolves the QA identity; if the
  patient is not yet in `patients_v2`, show a non-blocking "Register QA first" hint + CTA. After
  registration, Print stamps the resolved `id`/`uid`.
- Full PDF report (`/api/pdf-v2/[userDocId]`) gains a QR + short-ID block (header or footer).
- Add a server-side QR dependency (`qrcode`).

### Out of scope
- Schema changes — `id` and `patient_uid` already exist on `patients_v2` / `patient_visits_v2`.
- A separate compact "slip" print format (the user chose **full PDF + ID/QR**, not a slip).
- The batch PDF endpoint (`/api/pdf-v2/batch`) — single-report only for now.
- The legacy `/api/qa-pdf` and `/api/pdf` (v1) routes.
- Hard-blocking print until registration — we warn, we do not block.
- Mobile-app side changes (the QR is consumed inside this web app only).

## Preflight checks

```bash
# 1. Confirm id + patient_uid are exposed on the view used by QA search.
grep -n "PATIENT_VISIT_SELECT" app/component/qa/visitIdentity.ts   # expect id, patient_uid present

# 2. Confirm create mode already returns the new id (only the callback needs widening).
grep -n "select('id')\|onCreated" app/component/qa/QaCreateModal.tsx

# 3. Locate the pdf-v2 report document component to add the QR block.
grep -rn "generatePdfReportBuffer" lib/                            # entry point
ls lib | grep -i "pdf\|report"                                     # find the <Document> component

# 4. Confirm no QR lib yet (this plan adds one).
grep -n "qrcode\|qr-code\|bwip\|jsbarcode" package.json            # expect no match

# 5. Confirm @react-pdf <Image> accepts a data-URI (it does) — used to embed the QR PNG.
grep -rn "@react-pdf/renderer" lib/ | head
```

## Data model / Fetch strategy

No DB migration. Identifiers already exist:

| Field | Type | Meaning | Role in this plan |
|-------|------|---------|-------------------|
| `patients_v2.id` | `int` PK | one per **visit** | **short human code** printed next to the QR; typed into QA search |
| `patients_v2.patient_uid` | `uuid` | one per **person** ([[PLAN-005]]) | **QR payload** (durable across follow-up visits) |

### QA search — extend the existing `.or()` (app/pages/qa/page.tsx ~L131)

```ts
// current: first_name / last_name / hn_number ilike
if (search.trim()) {
  const raw = search.trim()
  const q = `%${raw}%`
  const orParts = [
    `first_name.ilike.${q}`,
    `last_name.ilike.${q}`,
    `hn_number.ilike.${q}`,
  ]
  // numeric → exact visit id (the printed short code)
  if (/^\d+$/.test(raw)) orParts.push(`id.eq.${raw}`)
  // looks like a UUID → exact patient_uid (scanned / pasted QR payload)
  if (/^[0-9a-f-]{32,36}$/i.test(raw)) orParts.push(`patient_uid.eq.${raw}`)
  patientQuery = patientQuery.or(orParts.join(','))
}
// final code at Codex's discretion
```

### Print identity resolution (pdf station)

After registration the modal hands back `{ id, patient_uid }`. The Print call appends them:

```
/api/pdf-v2/<userDocId>?record_id=<recordId>&qa_id=<id>&qa_uid=<uid>
```

`qa_id` / `qa_uid` are **optional** query params. If absent, the PDF builder falls back to resolving
the latest `patients_v2` row by `thaiid` (reuse the existing thaiid → id/uid lookup pattern already in
[QaCreateModal.tsx](../app/component/qa/QaCreateModal.tsx#L277)). The QR is only rendered when an
identity is resolved; otherwise the report prints exactly as today (graceful no-op).

### QR payload

Encode an absolute deep link so any scanner opens the right patient in this app:

```
<origin>/pages/qa?focus_uid=<patient_uid>
```

`origin` = `req.nextUrl.origin` (already passed into `generatePdfReportBuffer`). The QA page reads
`focus_uid` (or `focus_id`) on mount and auto-opens that patient's summary modal.

## UI structure

### PDF report — ID/QR block (footer of page 1, or top-right of header)

```
┌──────────────────────────────────────────────┐
│  CheckPD — Patient Screening Report           │
│  ...existing report content...                │
│                                                │
│                              ┌────────┐        │
│   Patient ID: 10428          │ ▣▣ ▣▣ │  ← QR  │
│   (สแกนเพื่อเปิดข้อมูลใน QA)       │ ▣  ▣▣ │        │
│                              └────────┘        │
└──────────────────────────────────────────────┘
```

- `Patient ID: <id>` = the short, typeable fallback.
- Thai caption under it: `"สแกนเพื่อเปิดข้อมูลผู้ป่วยในระบบ QA"`.

### Print station — register-first guard (RecordsPanel print button)

```
[ Selected record ]
  risk: High
  ┌──────────────────────────────────────────┐
  │ ⚠ ยังไม่ได้ลงทะเบียน QA — กดลงทะเบียนก่อนพิมพ์ │
  │                         [ ลงทะเบียน QA ]   │   ← when no qa_id resolved
  └──────────────────────────────────────────┘
  [ Print report ]   ← after registration: "Print report (ID 10428)"
```

- Warning is **non-blocking** (staff may still print without ID if they insist).
- After `handleQaClick` registration succeeds, cache `{ id, patient_uid }` for the selected user and
  relabel the Print button.

## Files to create / modify

| File | Change |
|------|--------|
| [app/pages/qa/page.tsx](../app/pages/qa/page.tsx) | Extend search `.or()` for numeric `id` + `patient_uid`; read `focus_uid`/`focus_id` query param on mount and open the matching patient's summary modal (fetch the single row if not on the current page). |
| [app/component/qa/QaSearchFilters.tsx](../app/component/qa/QaSearchFilters.tsx) | Update placeholder: `"Name, HN, or ID"`. |
| [app/component/qa/QaCreateModal.tsx](../app/component/qa/QaCreateModal.tsx) | Widen `onCreated` to `(created: { id: number; patient_uid: string \| null }) => void`; pass `patientData.id` (create) and `editPatient.id` (edit) back. |
| [app/pages/pdf/page.tsx](../app/pages/pdf/page.tsx) | Store `{ id, patient_uid }` returned from `onCreated`, keyed by selected user; pass `qa_id`/`qa_uid` into `handleExportSingle`'s URL; surface register-first state to `RecordsPanel`. |
| [app/component/pdf/RecordsPanel.tsx](../app/component/pdf/RecordsPanel.tsx) | Show register-first warning + "ลงทะเบียน QA" CTA when no QA id; relabel Print button with the ID once resolved. |
| [app/api/pdf-v2/[userDocId]/route.tsx](../app/api/pdf-v2/[userDocId]/route.tsx) | Parse optional `qa_id` / `qa_uid` query params; forward to `generatePdfReportBuffer`. |
| `lib/generatePdfReportBuffer.ts` | Accept `qaId?`, `qaUid?`; if missing, fall back to thaiid lookup; generate the QR PNG (data-URI) for `<origin>/pages/qa?focus_uid=<uid>`; pass `{ qaId, qrDataUri }` into the report `<Document>`. |
| `lib/<pdf-v2 report document>.tsx` *(locate via preflight)* | Render the ID/QR block (`<Image src={qrDataUri} />` + `Patient ID` text). No-op when absent. |
| [package.json](../package.json) | Add `qrcode` + `@types/qrcode` (dev). |

## Edge cases & rules

1. **No QA record at print time** → no `qa_id`/`qa_uid`, thaiid lookup also misses → render the PDF
   with **no** QR block (identical to today). Never error out the print over a missing ID.
2. **Patient already exists (returning visit)** → `handleQaClick` already opens edit mode; `onCreated`
   must still return that existing `{ id, patient_uid }` so Print can stamp it.
3. **Multiple visits / same person** → QR encodes `patient_uid` (person-level, durable). The short
   code is the specific visit `id`. Searching the int `id` opens that visit; scanning the QR focuses
   the person.
4. **Numeric-only name search** → unlikely for Thai names, but the `id.eq` branch is additive inside
   `.or()`, so a numeric HN still also matches via `hn_number.ilike`. No regression.
5. **`focus_uid` for a patient not on the current page** → fetch that single row directly
   (`patient_visits_v2` filtered by `patient_uid`, latest visit) to open the modal; don't depend on
   pagination.
6. **QR scan fails / no scanner** → staff reads `Patient ID: <id>` off the paper and types it into the
   QA search box (deliverable A). This is the explicit fallback the user asked for.
7. **Rate limit** → `/api/pdf-v2` keeps its existing 15/min limit; QR generation is in-process, no
   extra network call.

## Verification checklist

- [ ] In `/pages/qa`, typing a known `patients_v2.id` (digits only) returns exactly that visit.
- [ ] Pasting a `patient_uid` UUID into the search box returns that patient.
- [ ] Placeholder reads `Name, HN, or ID`; name/HN search still works unchanged.
- [ ] Registering a patient at `/pages/pdf` then printing produces a PDF with a scannable QR + the
      correct `Patient ID`.
- [ ] Scanning the QR opens `/pages/qa?focus_uid=…` and auto-opens that patient's summary modal.
- [ ] Printing **without** registering produces the report with **no** QR block and no error.
- [ ] Returning-patient (edit mode) print stamps the existing id, not a new one.
- [ ] `npx tsc --noEmit` clean; `npm run build` succeeds (new `qrcode` import resolves server-side).

## Out-of-scope follow-ups

- **PLAN-022 (candidate):** compact thermal-printer **slip** format (name + risk + QR only) as an
  alternative to the full PDF, for true paperless hand-off.
- Batch PDF (`/api/pdf-v2/batch`) QR stamping.
- A camera-based QR scanner widget inside `/pages/qa` (so staff scan with a webcam, not an external
  gun) — only if hardware scanners aren't available on-site.

## Rollback plan

Confined to the files in the table above + the `qrcode` dependency.
- Revert `onCreated` signature and the `qa_id`/`qa_uid` URL params → print reverts to today's
  unstamped PDF.
- Remove the `.or()` `id`/`patient_uid` branches → search reverts to name/HN.
- Remove the QR block + `qrcode` dep from `package.json`.
No DB migration to undo (no schema change).
