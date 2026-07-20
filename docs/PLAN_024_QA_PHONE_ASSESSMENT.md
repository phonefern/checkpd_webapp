# Plan: QA Phone Assessment UX
> เป้าหมาย: ให้เจ้าหน้าที่ทำแบบทดสอบผ่านโทรศัพท์มือถือได้ ลดการพึ่ง iPad เวลาลงพื้นที่ต่างจังหวัด
> วันที่วางแผน: 2026-06-27

---

## 1. Context & Pain Point

ระบบ QA ปัจจุบัน (desktop-first) มีปัญหาบนมือถือ:

| ส่วน | ปัญหาบน Phone |
|------|---------------|
| `QaTable` | ตารางกว้าง scroll แนวนอน ไม่สะดวก |
| `QaSearchFilters` | filter หลายช่อง แน่น เล็ก |
| `QaAssessmentModal` | grid card ไม่พอดีหน้าจอเล็ก |
| `SidebarLayout` | sidebar บัง content บนจอแคบ |
| Forms (MoCA, HAM-D ฯลฯ) | ปุ่ม submit ไม่ sticky, radio/checkbox เล็กเกิน |

**Use case หลักบน Phone:**
เจ้าหน้าที่ถือมือถือ → ค้นหาผู้ป่วยด้วย ID (visit_no) → เปิดแบบทดสอบ → กรอกผล → บันทึก

---

## 2. หน้าจอเป้าหมาย

```
Phone Portrait (< 640px) = primary target
Phone Landscape (640–767px) = secondary
Tablet (768px+) = current behavior (no change)
```

---

## 3. Flow บนมือถือ

```
เจ้าหน้าที่เปิดแอพบนมือถือ
        │
        ▼
┌────────────────────────────┐
│  🔍 ค้นหาด้วย ID / ชื่อ   │  ← big input, full width
│  [📷 สแกน QR]             │  ← ปุ่ม QR scanner (มีอยู่แล้ว)
└────────────────────────────┘
        │
        ▼ (พิมพ์ visit_no เช่น "247")
        │
┌────────────────────────────┐
│  Patient Card List         │
│  ┌──────────────────────┐  │
│  │ สมชาย ใจดี          │  │
│  │ Visit 3 · PD · 5/10 │  │
│  │ 15 ม.ค. 2569        │  │
│  └──────────────────────┘  │
└────────────────────────────┘
        │ tap card
        ▼
┌────────────────────────────┐
│  Assessment (full screen)  │
│  ─────────────────────────  │
│  🧠 MoCA         ✓ 24/30  │
│  🧠 TMSE         ✓ 27/30  │
│  💊 HAM-D        — ยังไม่ได้ │
│  🦾 MDS-UPDRS    — ยังไม่ได้ │
│  😴 Epworth      ✓ 8/21   │
│  ...                       │
│  [← กลับ]                  │
└────────────────────────────┘
        │ tap test
        ▼
┌────────────────────────────┐
│  Test Form (full screen)   │
│  ─────────────────────────  │
│  HAM-D                     │
│  ─────────────────────────  │
│  [คำถาม + ตัวเลือก]        │
│  ...scroll...              │
│                            │
│  [  บันทึก  ] ← sticky    │
└────────────────────────────┘
```

---

## 4. Component Changes

### 4.1 `SidebarLayout` — Mobile Nav
**ไม่แก้ layout เดิม** — ใช้ responsive class แทน

```
Desktop (md+): sidebar แสดงปกติ
Mobile (< md):
  - sidebar ซ่อน
  - เพิ่ม hamburger icon บน header
  - หรือ bottom tab bar (หน้า QA ใช้ icon เดียว ไม่จำเป็นมาก)
```

**What to change in `SidebarLayout.tsx`:**
- เพิ่ม `md:flex hidden` ให้ sidebar
- เพิ่ม top bar บน mobile มีปุ่ม ☰ + ชื่อหน้า

---

### 4.2 `QaSearchFilters` — Phone-First Search Bar
**เปลี่ยน UI บน mobile โดยไม่ทำลาย desktop:**

```
Mobile layout (< md):
┌──────────────────────────────────────────┐
│ [🔍 ค้นหาชื่อ / HN / Visit No.]  [📷]  │  row 1
│ [▼ กรองเพิ่มเติม]  [↻ รีเฟรช]           │  row 2
│ ─── (expand) ─────────────────────────── │
│   Condition · H&Y · จังหวัด · วันที่     │  collapsible
└──────────────────────────────────────────┘

Desktop layout (≥ md):
ไม่เปลี่ยน (filter bar เต็มแถว เหมือนเดิม)
```

**Key behaviors:**
- Search input: `text-base` (ป้องกัน iOS auto-zoom), `h-12`, `rounded-xl`
- QR scan button: icon ใหญ่ `h-12 w-12` ชิดขวา
- "กรองเพิ่มเติม" expand/collapse ด้วย `useState`
- พิมพ์ตัวเลขล้วน (เช่น "247") → trigger `id.eq.247` query (รองรับอยู่แล้วใน page.tsx)

---

### 4.3 `QaTable` → ซ่อนบน Mobile / แสดง Card List แทน

**Strategy: responsive visibility**
```tsx
{/* Desktop */}
<div className="hidden md:block">
  <QaTable ... />
</div>

{/* Mobile */}
<div className="md:hidden">
  <QaPhoneCardList rows={rows} onAssess={...} onDetail={...} />
</div>
```

**QaPhoneCardList (component ใหม่):**
```
┌─────────────────────────────────────┐
│  สมชาย ใจดี          Visit 3       │
│  [PD] [H&Y 2]        ● ● ● ○ ○ ... │
│  15 ม.ค. 2569 · เชียงใหม่          │
│  [แบบทดสอบ]  [รายละเอียด]          │
└─────────────────────────────────────┘
```

- condition badge: สี PD=red, PDM=orange, CTRL=green (เหมือน plan UX polish เดิม)
- test dots: ● = done (green/amber/red ตาม severity), ○ = ยังไม่ได้ทำ
- ปุ่ม [แบบทดสอบ] → `onAssess(patient)` เหมือน desktop
- tap card body → `onDetail(row)` หรือ `onAssess`

---

### 4.4 `QaAssessmentModal` — Full Screen บน Mobile

**เปลี่ยน Dialog ให้ full screen บน mobile:**
```tsx
<Dialog>
  <DialogContent className="
    max-w-2xl          /* desktop */
    max-sm:max-w-none  /* phone: full width */
    max-sm:h-screen    /* phone: full height */
    max-sm:rounded-none
    max-sm:m-0
    overflow-y-auto
  ">
```

**Test card list บน phone → vertical stack :**
```
Mobile (< md):
┌─────────────────────────────────────┐
│ [← กลับ]  สมชาย ใจดี              │  sticky header
│ ─────────────────────────────────── │
│ 🧠 MoCA          ✓ เสร็จ  24/30    │  tap → form
│ 🧠 TMSE          ✓ เสร็จ  27/30    │
│ 💊 HAM-D         ─ ยังไม่ได้       │
│ 🦾 MDS-UPDRS     ─ ยังไม่ได้       │
│ 😴 Epworth       ⚠ สูง    12/21    │
│ 👃 Smell         ✓ เสร็จ  13/16    │
│ 🌙 RBD           ─ ยังไม่ได้       │
│ 🏥 Rome IV       ✓ เสร็จ   2/6     │
│ 🥗 Food          ─ ยังไม่ได้       │
│ 👁️ Color Vision  ─ ยังไม่ได้       │
└─────────────────────────────────────┘

Desktop (≥ md):
grid 2 คอลัมน์ (เหมือนเดิม)
```

- แต่ละ row: `min-h-[56px]`, `flex items-center`, `active:bg-gray-100` (touch feedback)
- status icon: `✓` (green) / `⚠` (amber) / `✗` (red) / `─` (gray)
- score chip: `bg-gray-100 rounded-full px-2 text-xs`

---

### 4.5 Test Forms — Mobile Polish

**ทุก form ต้องการ:**

1. **Sticky submit button:**
```tsx
{/* ปุ่มบันทึก sticky bottom */}
<div className="sticky bottom-0 bg-white border-t p-4 mt-auto">
  <Button type="submit" className="w-full h-12 text-base">
    บันทึก
  </Button>
</div>
```

2. **Radio/Checkbox ใหญ่ขึ้น:**
```tsx
<label className="flex items-start gap-3 p-3 rounded-lg cursor-pointer
                  hover:bg-gray-50 active:bg-gray-100 min-h-[48px]">
  <input type="radio" className="mt-0.5 h-5 w-5 accent-blue-600" />
  <span className="text-sm leading-snug">{label}</span>
</label>
```

3. **ป้องกัน iOS zoom (font-size ≥ 16px บน input):**
```tsx
<Input className="text-base" />   // text-base = 16px ป้องกัน auto-zoom
```

4. **Back button บน form:**
```tsx
<button onClick={onBack} className="flex items-center gap-1 text-sm text-gray-500 mb-4">
  ← กลับไปรายการแบบทดสอบ
</button>
```

---

## 5. Files ที่ต้องแก้ / สร้างใหม่

| File | Action | งาน |
|------|--------|-----|
| `app/component/layout/SidebarLayout.tsx` | Edit | mobile: ซ่อน sidebar, เพิ่ม top bar |
| `app/component/qa/QaSearchFilters.tsx` | Edit | mobile: single search bar + collapsible filters |
| `app/component/qa/QaPhoneCardList.tsx` | **New** | card list สำหรับ mobile |
| `app/pages/qa/page.tsx` | Edit | แสดง QaTable desktop / QaPhoneCardList mobile |
| `app/component/qa/QaAssessmentModal.tsx` | Edit | full-screen dialog บน mobile, vertical test list |
| `app/component/qa/forms/Qa*Form.tsx` (all 10) | Edit | sticky submit, ปุ่มใหญ่ขึ้น, back button |

---

## 6. Visit_no / ID Search Flow (สำคัญมาก)

**Flow ที่ staff ใช้งานจริงบนพื้นที่:**

```
1. ก่อนออกพื้นที่: เจ้าหน้าที่ลงทะเบียนผู้ป่วยใน QA system (ได้ id เช่น 247)
2. พิมพ์ slip หรือจด id ให้ผู้ป่วย / staff ที่ไปพื้นที่
3. วันนัด: staff เปิดมือถือ พิมพ์ "247" ในช่องค้นหา
4. ระบบ query: id.eq.247 → พบผู้ป่วย → แสดง card
5. กด [แบบทดสอบ] → ทำแบบทดสอบได้เลย
```

**หรือใช้ QR Code (มี QaQrScanner อยู่แล้ว):**
```
1. พิมพ์ QR code บน slip (encode: {"id":"247"} หรือ ?focus_id=247)
2. กด [📷] → สแกน → auto-focus patient 247 → เปิด modal ทันที
```

รองรับอยู่แล้วใน `openFocusedAssessment` + `onScanFocus` prop ใน `QaSearchFilters`

---

## 7. Tailwind ที่ใช้ (Static Classes เท่านั้น)

| สิ่งที่ต้องการ | Class |
|----------------|-------|
| ซ่อนบน mobile | `md:block hidden` |
| แสดงบน mobile เท่านั้น | `md:hidden` |
| Full screen modal | `max-sm:max-w-none max-sm:h-screen max-sm:rounded-none max-sm:m-0` |
| Touch target ≥ 48px | `min-h-[48px]` |
| ป้องกัน iOS zoom | `text-base` บน input |
| Sticky submit | `sticky bottom-0 bg-white border-t p-4` |
| Touch feedback | `active:bg-gray-100` |

---

## 8. Phase ของงาน

### Phase 1 — Navigation & Search (เร็วที่สุด, impact สูงสุด)
- [ ] `SidebarLayout`: mobile top bar + ซ่อน sidebar
- [ ] `QaSearchFilters`: big search input + collapsible filters บน mobile

### Phase 2 — Patient List
- [ ] `QaPhoneCardList` (component ใหม่)
- [ ] `page.tsx`: แสดง card list บน mobile แทน table

### Phase 3 — Assessment Modal
- [ ] `QaAssessmentModal`: full-screen + vertical test list บน mobile

### Phase 4 — Forms Polish
- [ ] ทุก form: sticky submit + ปุ่มใหญ่ + back button + text-base inputs

---

## 9. สิ่งที่ Reuse ได้ทันที (ไม่ต้องสร้างใหม่)

| Feature | ที่อยู่ |
|---------|---------|
| QR Scanner | `QaQrScanner.tsx` ✓ มีแล้ว |
| ID-based search | `page.tsx` ← `openFocusedAssessment` ✓ |
| `focus_id` URL param | `page.tsx` useEffect ✓ |
| Score severity colors | `types.ts` SEVERITY_CARD_CLASS ✓ |
| Test forms (all 10) | `forms/Qa*Form.tsx` ✓ แค่ polish |

---

## 10. ข้อควรระวัง

1. **iOS Safari:** `position: sticky` ใน modal ต้องใช้ `-webkit-overflow-scrolling: touch` หรือ overflow-y-auto บน container ที่ถูก
2. **Dialog scroll:** `QaAssessmentModal` บน full-screen ต้องให้ `DialogContent` เป็น `overflow-y-auto` ไม่ใช่ body scroll
3. **Form context:** ทุก `Qa*Form` รับ `onClose`/`onSaved` — back button ต้องใช้ `onClose` ที่มีอยู่ ไม่ต้องสร้าง prop ใหม่
4. **ไม่แตะ desktop:** ใช้ responsive prefix เสมอ (`md:`, `max-sm:`) ไม่เปลี่ยน class เดิมที่ไม่มี prefix
