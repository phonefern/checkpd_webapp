# Plan: PDF Page Mobile UX (iOS / Android)

> เป้าหมาย: ให้เจ้าหน้าที่ใช้หน้า `/pages/pdf` บนมือถือได้สะดวก — ดูรายชื่อแบบ card,
> ลงทะเบียน QA, และเปิด/พิมพ์รายงาน PDF ได้ง่ายในมือเดียว ลดการพึ่งเดสก์ท็อป/iPad เวลาลงพื้นที่
> วันที่วางแผน: 2026-06-29

---

## 1. Overview

`/pages/pdf` is the "print station" surface: staff find a CheckPD patient (from Firebase
`users`/`temps`), optionally register them into QA (`core.patients_v2`), then open the
stamped pdf-v2 report (with QR + short id) in a new tab. The whole screen is **desktop-first**
and breaks badly on phones.

**Reason for change.** The layout is `grid-cols-1 xl:grid-cols-12`, so on anything below
**1280px** (every phone and most tablets) the three regions stack into one column with three
distinct problems:

1. `UserList` renders a **10-column table** inside `overflow-x-auto`. On a phone this is a tiny
   horizontally-scrolling strip — the same "ตารางล้น" complaint that drove the Users-page and
   [[PLAN-024]] QA-table card-list rewrites.
2. After tapping a user, `RecordsPanel` appears **below** the full user list (it is
   `xl:col-span-4`, so it only sits beside the list at ≥ xl). On a phone the staff must scroll
   past 50 rows to reach the record picker / "ลงทะเบียน QA" / "เปิดรายงาน PDF" actions.
3. `ExportSection` (manual `userDocId` + `recordId` paste, CSV batch) is a desktop power-user
   helper that is pure noise on a phone and pushes the real actions even further down.

This plan adds a **phone/tablet-portrait presentation layer** over the existing data flow.
**No data, query, API, or QA-registration logic changes** — `handleQaClick`,
`qaIdentityByUser`, the `focus`/auto-resolve effects, and `handleExportSingle` stay exactly as
they are. We only swap *how* the same state is presented below the `lg` breakpoint.

## 2. Related plans

- [[PLAN-024]] — QA Phone Assessment UX. Sibling effort on `/pages/qa`. **Mirror its conventions**
  (responsive visibility split, full-screen Dialog on mobile, `text-base` anti-zoom, `min-h-[48px]`
  touch targets, sticky bottom action bar). This plan is the `/pages/pdf` counterpart.
- [[PLAN-021]] — Register-first print flow + QR stamp. Established `handleQaClick`,
  `qaIdentityByUser`, `openFocusedAssessment`, and the `qa_id`/`qa_uid` print params this page
  already consumes. **Do not alter that contract.**
- [[PLAN-009]] — pdf-v2 report generator behind `/api/pdf-v2/[userDocId]`. Unchanged.

## 3. Scope

**In scope**
- `UserList`: responsive split — keep the existing table at `lg+`, add a **card list** (new
  `PdfUserCardList`) for `< lg`. Phone-first search bar + collapsible filters.
- New mobile **records flow**: tapping a card opens a **full-screen Dialog** (reusing the
  existing `RecordsPanel` body content) containing record picker + "ลงทะเบียน QA" CTA + "เปิด
  รายงาน PDF" sticky action — so select → register → print happens without leaving the card.
- `SidebarLayout` mobile nav: only if [[PLAN-024]] has not already landed it (shared component —
  do **not** duplicate; depend on PLAN-024's version if present).
- Hide `ExportSection` on `< lg` (manual paste / CSV batch is desktop-only).
- iOS/Android polish: `text-base` on the search input (anti auto-zoom), `min-h-[48px]` touch
  targets, `active:` feedback, sticky bottom export button inside the mobile records Dialog.

**Out of scope**
- Any change to `RecordsPanel`'s desktop sticky-sidebar behaviour at `lg+`.
- Any change to `QaCreateModal` internals (it already opens as its own Dialog over everything).
- pdf-v2 generation, QR payload, batch CSV format, `/api/pdf-v2/*`.
- Firebase fetch / merge / pagination logic in `page.tsx` (50/page client-paginated stays).
- QA-page work (that is [[PLAN-024]]).
- Server-side sort / new filters (the Firebase list is client-filtered; leave as-is).

## 4. Target breakpoints

```
Phone portrait  (< 640px)         = primary target
Tablet portrait (640–1023px)      = card list + filters stacked (secondary)
Desktop         (≥ 1024px, lg)    = current table + sidebar + ExportSection (NO change)
```

> Breakpoint note: house default for the Users/QA card split is `md` (768px), but this table is
> **10 columns wide** and still overflows at md. Use **`lg` (1024px)** as the table↔card boundary
> here: `hidden lg:block` table / `lg:hidden` cards. Call this out so Codex doesn't "fix" it back
> to md for consistency.

## 5. Preflight checks

Run before touching code (verify assumptions — files move):

```bash
# Confirm the page still composes these three regions + QA modal
grep -nE "UserList|RecordsPanel|ExportSection|QaCreateModal" app/pages/pdf/page.tsx

# Confirm the grid breakpoint that causes the stacking
grep -n "xl:grid-cols-12\|xl:col-span" app/pages/pdf/page.tsx app/component/pdf/UserList.tsx

# Confirm no Sheet/Drawer primitive exists (we must reuse Dialog)
ls components/ui/ | grep -iE "sheet|drawer|dialog"

# Did PLAN-024 already add a mobile SidebarLayout top bar? (avoid duplicate work)
grep -n "md:hidden\|hamburger\|☰\|Menu" app/component/layout/SidebarLayout.tsx

# Confirm the QA + export handlers we must reuse untouched
grep -n "handleQaClick\|qaIdentityByUser\|handleExportSingle\|onQaRegister" app/pages/pdf/page.tsx
```

## 6. Data / state — reuse, do not change

All state already lives in `page.tsx` and is passed down as props. The mobile components consume
the **same** props; nothing new is fetched.

| Existing state / handler | Mobile reuse |
|--------------------------|--------------|
| `currentUsers` (paginated slice) | feed `PdfUserCardList` instead of the table body |
| `searchQuery` + `onSearchChange` | mobile search input |
| `provinceFilter` / `dateFrom` / `dateTo` + setters | collapsible filter panel |
| `handleUserSelect(user)` | tap card body → also open mobile records Dialog |
| `handleQaClick(user)` | "ลงทะเบียน QA / แก้ไข QA" button on card + in Dialog |
| `qaIdentityByUser[userDocId]` | show QA-registered badge + drive export label |
| `records`, `recordId`, `setRecordId` | record picker inside mobile Dialog |
| `handleExportSingle` + `loadingSingle` | sticky "เปิดรายงาน PDF" button in Dialog |

> The single mobile-only piece of UI state is a boolean like `mobileRecordsOpen` (controls the
> full-screen records Dialog). It can live in `page.tsx` next to the existing `qaOpen`.

## 7. UI structure (mobile, < lg)

### 7.1 Search + filters (phone-first)
```
┌──────────────────────────────────────────┐
│ 🔍 ค้นหาชื่อ / นามสกุล / เลขบัตร   (h-12) │  text-base (no iOS zoom)
├──────────────────────────────────────────┤
│ [▼ ตัวกรอง  (N)]            [↻ ล้าง]      │  collapsible toggle (useState)
│ ─── expanded ──────────────────────────── │
│  จังหวัด ▾                                 │
│  [ จากวันที่ ] [ ถึงวันที่ ]               │
│  [วันนี้][7 วัน][เดือนนี้][ปีนี้]          │
└──────────────────────────────────────────┘
```

### 7.2 User card list (replaces the 10-col table)
```
┌─────────────────────────────────────┐
│ สมชาย ใจดี                 [Staff]  │  name + source badge
│ 👤 ชาย · 67 ปี · เชียงใหม่           │
│ 🆔 1234567890123                     │  thaiId (mono)
│ 🗓 15 ม.ค. 2569                      │
│ ┌─────────────┐ ┌─────────────────┐ │
│ │ ✅ QA #247  │ │  📄 ดู / พิมพ์   │ │  ← QA state chip + open-records
│ └─────────────┘ └─────────────────┘ │
└─────────────────────────────────────┘
```
- QA chip: if `qaIdentityByUser[id]?.id` → green "✅ QA #<id>"; else amber "ลงทะเบียน QA"
  (tapping the amber chip calls `handleQaClick`). Disabled state when `!user.thaiId` (mirror the
  table's `disabled` + title "ต้องมีเลขบัตรประชาชนก่อน").
- Tapping the card body or "📄 ดู / พิมพ์" → `handleUserSelect(user)` **and** open the mobile
  records Dialog (`setMobileRecordsOpen(true)`).
- Each card `min-h-[48px]` targets, `active:bg-muted` feedback, `rounded-xl border`.

### 7.3 Mobile records Dialog (full-screen)
Reuse the **existing `RecordsPanel` body** (record radio list + amber "ยังไม่ได้ลงทะเบียน QA"
panel + export button) inside a full-screen Dialog. Do not rewrite the record-card markup.
```
┌─────────────────────────────────────┐
│ [← ปิด]   สมชาย ใจดี                │  sticky header
│ thaiid: 1234567890123               │
├─────────────────────────────────────┤
│ เลือกรายการตรวจ                      │
│ ◉ record … 15 ม.ค. 2569   [เสี่ยง] │  (scrollable)
│ ○ record … 02 ม.ค. 2569   [ปกติ]  │
│ …scroll…                            │
│ ── (if not registered) ──────────── │
│ ⚠ ยังไม่ได้ลงทะเบียน QA  [ลงทะเบียน] │
├─────────────────────────────────────┤
│ [   📄 เปิดรายงาน PDF (ID 247)   ]  │  sticky bottom, h-12, w-full
└─────────────────────────────────────┘
```
- Dialog content: `max-sm:max-w-none max-sm:h-screen max-sm:rounded-none max-sm:m-0
  overflow-y-auto` (same pattern as [[PLAN-024]] §4.4). The record list area scrolls; the export
  button is `sticky bottom-0 bg-white border-t p-4`.
- Closing the Dialog does **not** clear `selectedUser` (so the desktop sidebar still works if the
  viewport is rotated/resized) — only flips `mobileRecordsOpen`.

## 8. Files to create / modify

| File | Action | Change |
|------|--------|--------|
| [app/component/pdf/PdfUserCardList.tsx](../app/component/pdf/PdfUserCardList.tsx) | **create** | Mobile card list. Props mirror the `currentUsers` + `onUserSelect` + `onQaClick` + `qaIdentityByUser` the page already passes. Renders the §7.2 cards. |
| [app/component/pdf/UserList.tsx](../app/component/pdf/UserList.tsx) | modify | Wrap the existing `<Table>` in `hidden lg:block`. Below it render `<div className="lg:hidden">` with `PdfUserCardList`. Make the **search input** `text-base h-12` and wrap the province/date filters in a `lg:hidden` collapsible (`useState`) block; keep the existing filter row visible at `lg+`. No logic change to filtering. |
| [app/component/pdf/RecordsPanel.tsx](../app/component/pdf/RecordsPanel.tsx) | modify | Extract the inner body (records picker + amber QA panel + export button) so it can render **both** inside the desktop sticky `Card` (`hidden lg:block`) **and** inside the mobile Dialog. Simplest: add an optional `variant?: "sidebar" \| "dialog"` prop (default `"sidebar"` = today's markup) and, in `"dialog"`, drop the outer `Card`/sticky wrapper + make the export button `sticky bottom-0`. Behaviour identical. |
| [app/pages/pdf/page.tsx](../app/pages/pdf/page.tsx) | modify | Add `mobileRecordsOpen` state. In `handleUserSelect`, also `setMobileRecordsOpen(true)` (desktop unaffected — the sidebar already reacts to `selectedUser`). Render a `lg:hidden` full-screen `<Dialog open={mobileRecordsOpen}>` whose content is `<RecordsPanel variant="dialog" … />` with the same props as the sidebar instance. Wrap `<ExportSection … />` in `hidden lg:block`. |
| [app/component/layout/SidebarLayout.tsx](../app/component/layout/SidebarLayout.tsx) | modify *(only if not already done by PLAN-024)* | Mobile top bar + hidden sidebar. **Check first** — if PLAN-024 shipped this, reuse as-is, change nothing. |

> Final component API at Codex's discretion — the `variant` prop on `RecordsPanel` is a
> recommendation to avoid duplicating the record-card markup; a small extracted
> `RecordsPanelBody` sub-component is an acceptable equivalent.

## 9. Edge cases & rules

1. **No thaiId** → QA chip disabled with title "ต้องมีเลขบัตรประชาชนก่อน" (mirror current table
   button at `UserList.tsx` `disabled={!user.thaiId}`). Card is still selectable for viewing.
2. **Not yet registered in QA** → amber "ลงทะเบียน QA" chip on the card AND the amber panel inside
   the Dialog (reuse the existing `!qaIdentity?.id` block — do not invent a new one).
3. **Registered in QA** → green "✅ QA #<id>" chip; export label becomes
   "เปิดรายงาน PDF (ID <id>)" (the existing `exportButtonLabel` logic already does this).
4. **No records for a user** → Dialog shows the existing empty state ("ไม่พบบันทึกการตรวจ"); export
   button stays disabled (existing `!selectedRecordId`).
5. **Opening QA modal from inside the records Dialog** → `QaCreateModal` is its own Dialog and
   stacks above; on close, `qaIdentityByUser` updates and the amber panel flips to the green chip
   without closing the records Dialog.
6. **Desktop unchanged** → every mobile addition is `lg:hidden`; every existing block that must stay
   desktop-only gets `hidden lg:block`. Never edit an existing class that has no responsive prefix.
7. **iOS Safari** → search/inputs `text-base` (≥16px) to block auto-zoom; Dialog content owns the
   scroll (`overflow-y-auto`), not the body; sticky export button inside the scrollable Dialog.
8. **Export opens a new tab** → `window.open(url, "_blank")` works on mobile Safari/Chrome; keep the
   helper text "รายงานจะเปิดในแท็บใหม่". Do not switch to a download.

## 10. Reuse (already exists — do not rebuild)

| Feature | Location |
|---------|----------|
| QA register / edit flow + prefill | `page.tsx` `handleQaClick` + `QaCreateModal` |
| QA-identity resolution by thaiid | `page.tsx` auto-resolve `useEffect` |
| Print params `qa_id` / `qa_uid` + QR | `page.tsx` `handleExportSingle` (from [[PLAN-021]]) |
| Records picker + risk badges + export button + amber QA panel | `RecordsPanel.tsx` (just re-host it) |
| Province extraction / options | `app/pages/pdf/types.ts` `extractProvince`, `provinceOptions` |
| Full-screen-Dialog-on-mobile pattern | [[PLAN-024]] §4.4 / §7 |

## 11. Verification checklist

- [ ] Phone (< 640): user list shows cards, **no horizontal scroll** anywhere.
- [ ] Tablet portrait (768): still cards (not the overflowing table) — confirms `lg` boundary.
- [ ] Desktop (≥ 1024): table + right sticky `RecordsPanel` + bottom `ExportSection` **identical to before**.
- [ ] Search input does not trigger iOS zoom on focus (`text-base`).
- [ ] Filters collapse/expand on mobile; active-filter count + ล้างตัวกรอง work.
- [ ] Tap card → full-screen records Dialog opens with the right user's records.
- [ ] Unregistered patient: amber "ลงทะเบียน QA" → opens `QaCreateModal` → after save, chip turns green + export label gains "(ID <id>)" without closing the Dialog.
- [ ] "เปิดรายงาน PDF" opens the stamped pdf-v2 report in a new tab with `qa_id`/`qa_uid` params.
- [ ] `ExportSection` hidden on mobile, visible on desktop.
- [ ] `npm run build` + `npx tsc --noEmit` clean.

## 12. Out-of-scope follow-ups (seed for next PLAN)

- PLAN-026?: in-app QR scan on `/pages/pdf` to jump straight to a patient (port `QaQrScanner` from
  [[PLAN-023]]).
- PLAN-026?: replace the 50/page client pagination with infinite scroll on the mobile card list.
- PLAN-026?: print-slip format shared between `/pages/qa` and `/pages/pdf` (deferred from PLAN-021/022).

## 13. Rollback plan

Confined to these files — revert to restore desktop-only behaviour:
- `app/component/pdf/PdfUserCardList.tsx` *(delete — new file)*
- `app/component/pdf/UserList.tsx` *(remove the `lg:hidden` card branch + collapsible wrapper)*
- `app/component/pdf/RecordsPanel.tsx` *(remove the `variant` branch; revert to sidebar-only)*
- `app/pages/pdf/page.tsx` *(remove `mobileRecordsOpen` state + mobile Dialog + the `hidden lg:block` wrapper on `ExportSection`)*
- `app/component/layout/SidebarLayout.tsx` *(only if this plan touched it and PLAN-024 did not)*

No DB / API / env changes to roll back.
