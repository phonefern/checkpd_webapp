# TODO.md
> Last updated: 2026-03-31
> Branch: `main`

---

## ✅ Done (session นี้)

### QA — medical_staff Role
- [x] `lib/access.ts` — เพิ่ม `medical_staff` ใน `AppRole` union, `APP_ROLES`, `APP_ROLE_LABELS`, `ROLE_ACCESS: ["users", "qa"]`
- [x] `app/component/qa/QaPatientSummaryModal.tsx` — สร้าง modal สรุปข้อมูลผู้ป่วย (ข้อมูลทั่วไป, การวินิจฉัย + prodromal flags, คะแนนแบบทดสอบ 8 รายการ)
- [x] `app/component/qa/QaTable.tsx` — เอาคอลัมน์คะแนนแบบทดสอบออก 8 คอลัมน์, เพิ่มคอลัมน์ "Diag Status" (วินิจฉัยแล้ว/รอวินิจฉัย), เพิ่ม Detail dropdown item, ล็อก Tests สำหรับ `medical_staff` เมื่อ patient ถูก diagnose แล้ว
- [x] `app/component/qa/QaCreateModal.tsx` — เพิ่ม `role` prop + `canEditDiag` flag ล็อก condition, H&Y, prodromal flags, clinical scores, FDOPA สำหรับ `medical_staff`
- [x] `app/pages/qa/page.tsx` — ดึง `role` ด้วย `useAccessProfile`, เพิ่ม `summaryRow` state, ส่ง `role` และ `onDetail` ให้ QaTable และ QaCreateModal, render `QaPatientSummaryModal`

---

## ✅ Done (session ก่อนหน้า)

### Layout & Navigation
- [x] สร้าง `AppSidebar` — collapsible sidebar พร้อม localStorage persistence
- [x] สร้าง `SidebarLayout` — auth guard + AppSidebar + framer-motion page transition
- [x] เพิ่ม SidebarLayout ใน: `index`, `admin`, `users`, `qa`, `tracking`, `pdf`
- [x] เปลี่ยน layout จาก `grid-cols-[290px_1fr]` → `flex` ให้ responsive กับ sidebar

### PDF & API
- [x] แก้ `lib/pdfBrowser.ts` — mutex launch, disconnected event, proper close on reset
- [x] แก้ `app/api/pdf/[userDocId]/route.ts` — จับ error patterns ครบ 9 รูปแบบ, `maxDuration = 60`
- [x] แก้ `app/api/qa-pdf/route.ts` — เปลี่ยนจาก `createRouteHandlerClient` → `supabaseServer`

### Firebase + Filter Features
- [x] เพิ่ม `liveAddress` จาก Firebase ใน pdf/page และ tracking/page
- [x] เพิ่ม province filter (dropdown 77 จังหวัด) ใน pdf/page
- [x] เพิ่ม date preset buttons (วันนี้/7 วัน/เดือนนี้/ปีนี้) ใน pdf/page
- [x] เพิ่ม province filter + province breakdown (Top 10 bar chart) ใน tracking/page
- [x] `rawUserDocs` + `useMemo` pattern ใน tracking — filter in-memory ไม่ต้อง re-subscribe

### Dashboard
- [x] ตัด fetch ข้อมูล stats และ Quick Stats section ออกจาก index/page

---

## 🔴 Critical / Blockers

- [ ] **Vercel Hobby timeout** — PDF generation ต้องการ Vercel Pro (`maxDuration = 60` ไม่ work บน Hobby)
  → ทางเลือก: upgrade Pro หรือเปลี่ยนเป็น pdf-lib (ไม่ใช้ browser)

- [ ] **`papers/page.tsx`** — ยังไม่มี SidebarLayout (ใช้ layout เก่า)
- [ ] **`storage/page.tsx`** — ยังไม่มี SidebarLayout
- [ ] **`export/page.tsx`** — ยังไม่มี SidebarLayout
- [ ] **`event/page.tsx`** — ยังไม่มี SidebarLayout

---

## 🟡 In Progress / Pending

### Pages ที่ยังไม่ได้ SidebarLayout
| Page | Status | หมายเหตุ |
|------|--------|----------|
| papers | ❌ ยังไม่ได้ | ต้องเพิ่ม SidebarLayout |
| storage | ❌ ยังไม่ได้ | ต้องเพิ่ม SidebarLayout |
| export | ❌ ยังไม่ได้ | ต้องเพิ่ม SidebarLayout |
| event | ❌ ยังไม่ได้ | ต้องเพิ่ม SidebarLayout |

---

## 🟢 Backlog (ไม่เร่งด่วน)

### UX / UI
- [ ] Mobile sidebar — ปัจจุบัน sidebar ซ่อนบน mobile ยังไม่มี hamburger menu
- [ ] Active route highlight ใน SidebarLayout ควร auto-detect จาก `usePathname()` แทนส่ง `activePath` prop ทุกหน้า
- [ ] Page transition — เพิ่ม exit animation (ต้องใช้ `AnimatePresence` ที่ parent level)

### Performance
- [ ] Tracking page — province breakdown นับจาก `users` only ยังไม่รวม `temps`
- [ ] PDF page — pagination ตอนนี้ client-side (50 items/page จาก Firebase snapshot ทั้งหมด) ถ้าข้อมูลเยอะควรทำ server-side

### Features
- [ ] Admin page — manage user roles (CRUD สำหรับ AppRole)
- [ ] QA page — export ผลการประเมินเป็น Excel/CSV
- [ ] Tracking page — เพิ่ม province breakdown สำหรับ `temps` collection
- [ ] PDF page — batch export by province/date filter

### Code Quality
- [ ] `users/page.tsx` — `handleSave` ใช้ `alert()` ควรเปลี่ยนเป็น toast notification
- [ ] Session management กระจายอยู่ใน `SidebarLayout` + บางหน้าที่ยังไม่ได้ migrate อาจ double-fetch session
- [ ] `qa/page.tsx` — ไม่มี AuthRedirect (ไม่มี session check ก่อน migrate) ตอนนี้ SidebarLayout handle ให้แล้ว

---

## 📋 Notes / Decisions

| เรื่อง | Decision | เหตุผล |
|--------|----------|--------|
| Browser singleton | mutex `launching` promise | ป้องกัน race condition ตอน concurrent PDF requests |
| Province filter | in-memory จาก `extractProvince()` | Firestore ไม่รองรับ substring query |
| Sidebar state | localStorage | จำค่าข้ามหน้าโดยไม่ต้องใช้ context/state management |
| Page transition key | `activePath` prop | แต่ละ page mount SidebarLayout ใหม่ animation จึง trigger ทุกครั้ง |
| `SidebarLayout` vs shared layout | per-page wrapper | ไม่ต้อง restructure app directory, ง่ายต่อการเพิ่มทีละหน้า |
