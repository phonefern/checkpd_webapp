# PLAN-023 — In-app webcam QR scanner on the QA page

## Overview

PLAN-021 stamps a QR (`<origin>/pages/qa?focus_uid=<patient_uid>`) + short Patient ID on the printed
report, and the QA page already resolves a scanned/typed identity via
[`openFocusedAssessment({ id, uid })`](../app/pages/qa/page.tsx#L427) — it queries `patient_visits_v2`
by `id` or `patient_uid` and opens that patient's assessment modal **in the same page (no new tab)**.

Today staff scan the paper QR with the **device's native camera app**, which opens a browser tab/redirect
— clunky on a shared clinic tablet. This plan adds a **"สแกน QR" button on the QA page** that opens the
**webcam inside the web app**; on a successful decode it calls the existing `openFocusedAssessment` and
opens the patient — no tab switch, no reload.

### Reason for change

> "อยากเพิ่มปุ่มเปิดกล้องสแกน QR กระดาษจาก web app ได้เลย ไม่ต้องเปิดกล้องเดิมของเครื่อง … เมื่อสแกน
> ระบบจะแค่เปลี่ยนหน้าไปเลย ไม่ต้องเพิ่ม tab สะดวกต่อเจ้าหน้าที่ พยาบาล หมอ"

This is the explicit out-of-scope follow-up named in PLAN-021 ("a camera-based QR scanner widget inside
`/pages/qa` so staff scan with a webcam, not an external gun").

## Related plans

- [[PLAN-021]] — defines the QR payload (`?focus_uid=`), the short `id` fallback, and
  `openFocusedAssessment` (the function this plan reuses verbatim). The "scan fails → type Patient ID"
  fallback is also defined there.
- [[PLAN-005]] — `patient_uid` (QR payload) vs per-visit `id` (short code).
- Client conventions: [[client-side-patterns-to-follow]] (SidebarLayout, useSession, logActivity).

## Scope

### In scope
- A **"สแกน QR" button** in [QaSearchFilters.tsx](../app/component/qa/QaSearchFilters.tsx) next to the search box.
- A **`QaQrScanner` dialog** that opens the webcam in-app (rear camera preferred), decodes a QR live, and
  reports the decoded text.
- A pure **`parseQaFocus(text)`** helper that turns the decoded text into `{ id }` or `{ uid }`.
- Wiring: decoded → `openFocusedAssessment({ id, uid })` (existing) → patient opens, dialog closes.
- Graceful states: permission denied / no camera / insecure context → show the "type Patient ID instead"
  fallback message.

### Out of scope
- Changing the QR payload or the PDF stamp (PLAN-021 owns that).
- A standalone scanner page/route — the scanner is a dialog launched from QA only.
- Continuous/batch scanning — one decode → open → close.
- Barcode formats other than QR.
- Scanning on any page other than `/pages/qa`.

## Preflight checks

```bash
# 1. Confirm the reuse target + its signature
grep -n "openFocusedAssessment" app/pages/qa/page.tsx          # expect ({ id, uid }) useCallback

# 2. Confirm the search box parse patterns to mirror (numeric id / uuid)
grep -n "focus_uid\|patient_uid.eq\|id.eq\|/^\\\\d+\$/" app/pages/qa/page.tsx

# 3. Confirm QaSearchFilters is where the search box lives (button goes here)
grep -n "Search Patient\|placeholder=\|onSearch\|value=" app/component/qa/QaSearchFilters.tsx

# 4. No QR scanner lib yet
grep -n "html5-qrcode\|qr-scanner\|zxing\|jsqr" package.json    # expect no match
```

## Dependency

Add **`html5-qrcode`** (`^2.3.8`) — framework-agnostic, handles camera enumeration, rear-camera
selection, and the scan-region overlay. (Alternative considered: `@yudiel/react-qr-scanner` — React-first
but less battle-tested; pick one, html5-qrcode recommended.) No `@types` needed (ships its own).

## Data flow

```
QaSearchFilters  ──(click "สแกน QR")──►  QaQrScanner (Dialog, camera on)
                                              │ onDecode(text)
                                              ▼
                                    parseQaFocus(text) → { id? , uid? } | null
                                              │ valid
                                              ▼
   page.tsx: openFocusedAssessment({ id, uid })  ──►  opens patient (existing), dialog closes
```

- `QaSearchFilters` gets a new prop `onScanFocus: (focus: { id?: string; uid?: string }) => void`.
- `page.tsx` passes `onScanFocus={(f) => openFocusedAssessment(f)}` (no new logic on the page).
- The scanner never navigates; it only calls the callback. Same tab, no reload.

### `parseQaFocus` (pure helper — `app/component/qa/visitIdentity.ts` or new `lib/qaFocus.ts`)

```ts
// Mirrors the QA search box patterns (PLAN-021). Accepts the QR's full URL,
// a bare patient_uid UUID, or a bare numeric visit id.
export function parseQaFocus(text: string): { id?: string; uid?: string } | null {
  const raw = (text ?? '').trim()
  if (!raw) return null

  // 1) Full deep-link URL: <origin>/pages/qa?focus_uid=... (or focus_id=...)
  try {
    const url = new URL(raw)
    const uid = url.searchParams.get('focus_uid')
    const id  = url.searchParams.get('focus_id')
    if (uid) return { uid }
    if (id)  return { id }
  } catch { /* not a URL — fall through */ }

  // 2) Bare UUID → patient_uid
  if (/^[0-9a-f-]{32,36}$/i.test(raw)) return { uid: raw }
  // 3) Bare digits → visit id
  if (/^\d+$/.test(raw)) return { id: raw }

  return null
}
```

## UI structure

### Button (in QaSearchFilters)
A `Button variant="outline"` with a camera icon (`lucide-react` `ScanLine` / `Camera`) + label `สแกน QR`,
placed next to the Search Patient input. Click → `setScannerOpen(true)`.

### Scanner dialog (`app/component/qa/QaQrScanner.tsx`)
```
┌──────────────────────────────────────────┐
│  สแกน QR ผู้ป่วย                      [ ✕ ] │
│ ──────────────────────────────────────── │
│   ┌──────────────────────────────────┐    │
│   │        live camera preview        │    │  ← rear camera; html5-qrcode scan box
│   │        [ ▢ ] scan region          │    │
│   └──────────────────────────────────┘    │
│   เล็งกรอบไปที่ QR บนใบรายงาน                 │
│ ──────────────────────────────────────── │
│  (error) ไม่สามารถเปิดกล้องได้ —             │
│  พิมพ์ Patient ID ในช่องค้นหาแทนได้ครับ        │
└──────────────────────────────────────────┘
```

Props: `{ open: boolean; onClose: () => void; onDecode: (text: string) => void }`.

Behaviour:
- On `open`: start `Html5Qrcode` with `{ facingMode: 'environment' }`, `fps: 10`, a square `qrbox`.
- On first successful decode: call `onDecode(text)` **once**, then stop the camera and close.
- On `onClose` / unmount: **always** `await scanner.stop()` + `scanner.clear()` and stop every
  `MediaStreamTrack` — never leave the camera LED on (Edge case 2).
- Errors surface inline; the dialog stays open with the fallback message.

## Edge cases & rules

1. **Secure context.** `getUserMedia` requires HTTPS (or `localhost`). Production (`chulapd.org`) is HTTPS.
   If `!window.isSecureContext`, skip camera init and show "ต้องใช้ผ่าน https — พิมพ์ Patient ID แทน".
2. **Camera lifecycle — must release.** Stopping the scanner and the underlying tracks on close/unmount is
   mandatory; a lingering stream blocks other apps and drains the tablet. Use a `useEffect` cleanup.
3. **Permission denied / no camera.** Catch the `getUserMedia` rejection; render the fallback text (do not
   crash). The QA search box (type the printed `Patient ID`) is the documented manual path (PLAN-021).
4. **Decode debounce.** html5-qrcode fires the success callback repeatedly; guard with a `hasDecodedRef`
   so `onDecode` runs once, then stop immediately.
5. **Unparseable QR.** If `parseQaFocus` returns `null` (some other QR), keep scanning and show a brief
   "QR นี้ไม่ใช่รหัสผู้ป่วย" toast/inline note — do not close.
6. **Patient not found.** `openFocusedAssessment` already sets `error` ("QA patient from link was not
   found") when the id/uid resolves to nothing — no extra handling needed; just close the scanner.
7. **Cross-origin QR.** A QR printed from a different env still carries `focus_uid`; `parseQaFocus` extracts
   the param regardless of the URL's origin. Fine.
8. **`logActivity`.** Optional: log `{ action: 'VIEW', page: 'qa', description: 'QR scan open patient' }`
   on a successful scan, consistent with other QA actions.
9. **Mobile/iOS Safari.** html5-qrcode needs a user gesture to start the camera (the button click provides
   it). Verify on the actual clinic devices.

## Files to create / modify

| File | Change |
|---|---|
| [package.json](../package.json) | Add `html5-qrcode` `^2.3.8`. |
| `app/component/qa/QaQrScanner.tsx` *(new)* | Webcam QR dialog (start/stop, rear camera, decode-once, error/fallback states). |
| `app/component/qa/visitIdentity.ts` (or `lib/qaFocus.ts` *new*) | Add pure `parseQaFocus(text)` helper. |
| [app/component/qa/QaSearchFilters.tsx](../app/component/qa/QaSearchFilters.tsx) | Add "สแกน QR" button + local `scannerOpen` state; render `<QaQrScanner>`; on decode call `parseQaFocus` then `onScanFocus`. New prop `onScanFocus`. |
| [app/pages/qa/page.tsx](../app/pages/qa/page.tsx) | Pass `onScanFocus={(f) => openFocusedAssessment(f)}` into `QaSearchFilters`. No new logic. |

## Verification checklist

- [ ] "สแกน QR" button appears next to the QA search box.
- [ ] Clicking it opens a dialog showing the live **rear** camera (on a tablet).
- [ ] Scanning a printed report QR opens that patient's assessment modal **in the same tab** and closes the
      dialog — no navigation/reload, no new tab.
- [ ] `parseQaFocus` handles: full URL with `focus_uid`, full URL with `focus_id`, bare UUID, bare digits;
      returns `null` for anything else.
- [ ] Closing the dialog (✕, Esc, backdrop) stops the camera — LED turns off; reopening works again.
- [ ] Denying camera permission shows the "พิมพ์ Patient ID แทน" fallback, not a crash.
- [ ] On `http://` (insecure) the dialog shows the https/fallback message instead of a broken camera.
- [ ] Scanning a non-patient QR keeps the scanner open with a "ไม่ใช่รหัสผู้ป่วย" note.
- [ ] `npx tsc --noEmit` + `npm run lint` + `npm run build` clean (new dep resolves client-side only).

## Rollback plan

Confined to the files above + the `html5-qrcode` dependency.
- Remove the button + `<QaQrScanner>` from `QaSearchFilters`; drop the `onScanFocus` prop from the page.
- Delete `QaQrScanner.tsx` and `parseQaFocus`.
- Remove `html5-qrcode` from `package.json`.
No DB, no API, no QR-payload changes — the printed QR still works via the device's native camera as before.

## Out-of-scope follow-ups
- Torch/flashlight toggle + manual camera picker (multi-camera tablets).
- Continuous scan mode for batch check-in.
- Reuse the scanner on the print station (`/pages/pdf`) to re-open a just-printed patient.
