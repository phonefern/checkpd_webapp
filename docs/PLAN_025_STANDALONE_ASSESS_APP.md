# แผน: Standalone Health Assessment App
> สร้างจากประสบการณ์ระบบ QA ของ checkpd — แยกออกมาเป็น product ใหม่
> วันที่วางแผน: 2026-06-27

---

## 1. ปัญหาที่แก้

ระบบ QA ใน checkpd ผูกติดกับ platform ผู้ป่วยพาร์กินสันของจุฬา ทำให้:
- ใช้กับโรงพยาบาลอื่นไม่ได้
- ผู้ป่วยทำแบบทดสอบเองไม่ได้ (ต้องผ่านเจ้าหน้าที่)
- ไม่มี report สรุปให้แพทย์ส่งต่อแบบ real-time
- ระบบ multi-center / research ยังไม่มี

---

## 2. Vision

> **"แบบทดสอบสุขภาพมาตรฐาน สำหรับผู้ป่วยพาร์กินสันและผู้มีความเสี่ยง  
> ใช้ได้ทุกที่ — โดยผู้ป่วย หรือเจ้าหน้าที่คลินิก"**

แอพนี้คือ **Assessment Platform** ที่:
- ใช้ได้หลายองค์กร (multi-center)
- ผู้ป่วยทำบางแบบทดสอบเองบน tablet ได้
- เจ้าหน้าที่ทำ/บันทึกแบบทดสอบที่ต้องสังเกตทางคลินิก
- สรุปผลและ export PDF ส่งแพทย์ทันที

---

## 3. Personas

| Persona | คือใคร | ต้องการอะไร |
|---------|--------|-------------|
| **ผู้ป่วย / ผู้ถูกทดสอบ** | มาคลินิกพาร์กินสัน หรือ screening event | ทำแบบทดสอบง่ายๆ บน tablet ไม่ต้องล็อกอิน |
| **เจ้าหน้าที่คลินิก** | นักวิจัย / พยาบาล ศูนย์พาร์กินสัน | บันทึกผลเร็ว เห็น flag ที่ผิดปกติ |
| **แพทย์** | neurologist, GP | เห็นสรุปคะแนนพร้อม interpretation ทันที + PDF |
| **ผู้บริหารโครงการ** | PI, ศูนย์วิจัย | aggregate data, export CSV, multi-center view |

---

## 4. แบบทดสอบที่รองรับ

แบ่งเป็น 2 โหมด:

### Self-Report (ผู้ป่วยทำเอง บน tablet)
| # | แบบทดสอบ | สิ่งที่วัด | คะแนนเต็ม |
|---|----------|-----------|-----------|
| 1 | Epworth Sleepiness Scale | ความง่วงกลางวัน | 24 |
| 2 | RBD Questionnaire | พฤติกรรมผิดปกติระหว่างนอน | 100 |
| 3 | Rome IV Constipation | ท้องผูกเรื้อรัง | 6 |
| 4 | Thai MIND Diet (Food Q.) | พฤติกรรมการกิน | 10 |

### Examiner-Assisted (เจ้าหน้าที่ทำร่วม)
| # | แบบทดสอบ | สิ่งที่วัด | คะแนนเต็ม |
|---|----------|-----------|-----------|
| 5 | MoCA | Cognitive function | 30 |
| 6 | TMSE | Thai cognitive screening | 30 |
| 7 | HAM-D | Depression severity | 52 |
| 8 | MDS-UPDRS | Parkinson's motor signs | 260 |
| 9 | Thai Smell Identification | การรับกลิ่น | 16 |
| 10 | Farnsworth D-15 Color Vision | การมองเห็นสี | - |

---

## 5. โครงสร้างแอพ

```
┌─────────────────────────────────────────────────────────┐
│                   HEALTH ASSESS APP                     │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  [Patient Portal]          [Staff Portal]               │
│  ─────────────             ─────────────                │
│  • QR Code / PIN entry     • Login (Supabase auth)      │
│  • Self-report tests       • Patient list & search      │
│  • Progress tracker        • Full 10-test suite         │
│  • Submit → Thank you      • Score dashboard            │
│                            • Quick diagnosis flags      │
│                            • PDF export                 │
│                            • Admin: org management      │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### หน้าหลัก (Routes)

```
/                          → Landing / เลือกโหมด
/session/[pin]             → Patient self-report session
/session/[pin]/test/[id]   → แบบทดสอบแต่ละตัว (fullscreen)
/session/[pin]/complete    → สรุปผลผู้ป่วย

/staff                     → Staff dashboard
/staff/patients            → รายชื่อผู้ป่วย + ค้นหา
/staff/patients/[id]       → Patient detail + ทุก test
/staff/patients/[id]/test/[testId] → บันทึกผลแบบทดสอบ
/staff/patients/[id]/report        → สรุป + PDF

/admin                     → Organization & user management
/admin/stats               → Aggregate analytics
/admin/export              → Export CSV / research data
```

---

## 6. UX Flow หลัก

### Flow A: ผู้ป่วยทำเองบน Tablet

```
เจ้าหน้าที่สร้าง session
    ↓
ระบบออก PIN 6 หลัก / QR Code
    ↓
ผู้ป่วยเปิดแท็บเล็ต → กรอก PIN
    ↓
เลือก / ถูก assign แบบทดสอบ (เจ้าหน้าที่กำหนดไว้ล่วงหน้า)
    ↓
ทำทีละแบบทดสอบ (fullscreen, ฟอนต์ใหญ่, ไทย 100%)
    ↓
ส่งผล → เจ้าหน้าที่เห็นทันทีบน dashboard
    ↓
เจ้าหน้าที่ทำ examiner tests ต่อ (MoCA, Smell, etc.)
    ↓
PDF สรุปพร้อมส่งแพทย์
```

### Flow B: เจ้าหน้าที่บันทึกเอง (คล้าย QA เดิม)

```
ค้นหาผู้ป่วย (ชื่อ / HN / เลขบัตร)
    ↓
เปิด session assessment
    ↓
เลือกแบบทดสอบที่ต้องการ (ไม่จำเป็นต้องทำครบ 10)
    ↓
กรอกคะแนน → auto-flag ถ้าผิดปกติ
    ↓
สรุปผล + ตั้ง diagnosis flags
    ↓
Export PDF / share link
```

---

## 7. Data Model (ใหม่ — schema: `assess`)

```sql
-- Organizations (multi-center)
organizations
  id, name, slug, logo_url, created_at

-- Staff accounts (linked to org)
staff_users
  id, org_id, email, role, display_name

-- Patient sessions
assess_sessions
  id, org_id, patient_name, patient_dob, patient_hn
  pin_code, status (active|completed|expired)
  created_by, created_at, completed_at

-- Test results (one row per test per session)
assess_results
  id, session_id, test_type (moca|tmse|hamd|...)
  total_score, subscores (jsonb), severity_level
  completed_by (patient|staff), submitted_at

-- Diagnosis summary
assess_diagnosis
  session_id, condition (PD|PDM|CTRL|other)
  hy_stage, prodromal_flags (jsonb)
  noted_by, noted_at
```

---

## 8. Tech Stack

| Layer | เลือก | เหตุผล |
|-------|-------|--------|
| Framework | **Next.js 15 App Router** | reuse โค้ดจาก checkpd |
| Database | **Supabase** (new `assess` schema) | ไม่ต้อง migrate, RLS พร้อมใช้ |
| Auth | **Supabase Auth** (staff) + **PIN session** (patient) | staff login เดิม, patient ไม่ต้อง account |
| UI | **Tailwind CSS v4 + shadcn/ui** | consistent กับ checkpd |
| Forms | **React Hook Form + Zod** | reuse form logic จาก QA |
| PDF | **pdf-lib + Playwright** | reuse `generatePdfBuffer.ts` |
| Mobile/Tablet | **Responsive Web** (PWA-ready) | ไม่ต้อง native app ใหม่ |

---

## 9. สิ่งที่ Reuse จาก checkpd ได้ทันที

| Component | ใช้ที่ไหนใหม่ |
|-----------|--------------|
| `QaMocaForm`, `QaHamdForm`, ฯลฯ (10 forms) | core ของ self-report + examiner |
| Score threshold maps (`SCORE_THRESHOLDS`) | severity badges |
| `generatePdfBuffer.ts` + `generateHTML.ts` | PDF report |
| Supabase client/server helpers | data layer |
| shadcn/ui components | UI primitives |
| Role-based auth logic | staff portal |

**ประมาณ 60-70% logic สามารถ reuse ได้**

---

## 10. สิ่งใหม่ที่ต้องสร้าง

| Feature | Effort |
|---------|--------|
| PIN-based patient session system | Medium |
| Patient-facing fullscreen test UI (tablet-optimized) | Medium |
| Multi-organization (org_id everywhere) | Medium |
| Session management dashboard (staff monitors patient progress) | Medium |
| Aggregate stats / admin dashboard | High |
| PWA manifest + offline resilience | Low |

---

## 11. Phase Plan

### Phase 1 — Core (4–6 สัปดาห์)
- [ ] Setup repo, Supabase `assess` schema, RLS
- [ ] Staff login + org onboarding
- [ ] Patient session (PIN create/join)
- [ ] Self-report tests: Epworth, Rome IV, RBD, Food Q.
- [ ] Examiner tests: MoCA, TMSE, HAM-D
- [ ] Score summary page + PDF export

### Phase 2 — Polish (2–3 สัปดาห์)
- [ ] Examiner tests: MDS-UPDRS, Smell, Color Vision
- [ ] Diagnosis flags + prodromal assessment
- [ ] Real-time status: staff เห็น patient กำลังทำอยู่ที่ไหน
- [ ] Multi-visit history per patient

### Phase 3 — Scale (3–4 สัปดาห์)
- [ ] Multi-center admin panel
- [ ] Aggregate analytics (ด้วย chart)
- [ ] Research data export (CSV, de-identified)
- [ ] Integration point กลับ checkpd (optional sync)

---

## 12. คำถามที่ต้องตัดสินใจก่อน build

1. **Repo ใหม่หรือ monorepo?**  
   → แยก repo (cleaner) หรือ `packages/assess` ใน checkpd?

2. **ผู้ป่วยต้องการ account ไหม?**  
   → PIN-only (simpler) vs. optional LINE Login (ติดตามระยะยาว)

3. **Multi-tenant แค่ไหน?**  
   → เพียงแค่ "จุฬา + อีก 1–2 ศูนย์" หรือ SaaS จริงๆ?

4. **ข้อมูลรวมกับ checkpd ไหม?**  
   → แชร์ Supabase project เดิม (ต่าง schema) หรือแยก project ใหม่?

5. **ชื่อแอพ?**  
   → ยังไม่มี — ต้องการ brand แยก หรือ under checkpd?
