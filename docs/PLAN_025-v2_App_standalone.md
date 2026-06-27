# Clinical Assessment Platform

## Development Plan v1.0

**Project Name (Working Title):** Clinical Assessment Platform
**Date:** 2026-06-27

---

# 1. Vision

สร้างแพลตฟอร์มกลางสำหรับการประเมินสุขภาพ (Clinical Assessment Platform) ที่สามารถใช้งานได้ทั้งในงานบริการทางการแพทย์ งานวิจัย และการคัดกรองโรค โดยไม่ผูกติดกับโรคใดโรคหนึ่ง

CheckPD จะกลายเป็นเพียงหนึ่งใน Modules ของแพลตฟอร์มนี้

---

# 2. Product Positioning

จากเดิม

```
CheckPD
 └── QA System
```

เปลี่ยนเป็น

```
Clinical Assessment Platform

├── Parkinson Assessment (CheckPD)
├── Dementia Assessment
├── Stroke Assessment
├── Sleep Assessment
├── Mental Health Assessment
└── Future Modules
```

ทำให้ระบบสามารถขยายไปยังโรคอื่นได้โดยไม่ต้องออกแบบใหม่ทั้งหมด

---

# 3. Technology Decision

## Frontend

**Next.js 15 (App Router)**

เหตุผล

* ทีมมีประสบการณ์อยู่แล้ว
* Reuse code จาก CheckPD ได้จำนวนมาก
* รองรับ SSR และ Dashboard
* พัฒนาได้รวดเร็ว
* สามารถทำเป็น PWA ได้ทันที

---

## Language

```
TypeScript
```

---

## Styling

```
Tailwind CSS v4
shadcn/ui
```

---

## Backend

```
Supabase
```

ใช้ Database เดิม

แต่สร้าง

```
Schema: assess
```

แยกจาก

```
checkpd
```

อย่างชัดเจน

---

# 4. Database Strategy

ใช้ Supabase Project เดิม

แต่แยก Schema

```
Supabase

public

checkpd

assess

shared (optional)
```

ตัวอย่าง

```
checkpd.*

assess.*

shared.organizations

shared.staff_users
```

ข้อดี

* แยก Domain ชัดเจน
* Backup ง่าย
* Permission ง่าย
* ไม่กระทบ CheckPD

---

# 5. Repository Strategy

ใช้ **Monorepo**

```
apps/

    web/

packages/

    assessment-engine/

    question-engine/

    validation/

    api/

    types/

    ui/

    utils/
```

ปัจจุบัน

สร้างเพียง

```
apps/web
```

ในอนาคต

สามารถเพิ่ม

```
apps/mobile
```

โดยไม่ต้องแก้ Business Logic

---

# 6. Future Mobile Strategy

ปัจจุบัน

```
Next.js
```

อนาคต

```
Expo React Native
```

โครงสร้างสุดท้าย

```
apps/

    web

    mobile

packages/

    assessment-engine

    question-engine

    validation

    api

    types

    ui
```

Business Logic ใช้ร่วมกันทั้งหมด

---

# 7. Core Architecture

ระบบแบ่งออกเป็น 4 Layers

```
Presentation

↓

Question Engine

↓

Assessment Engine

↓

Database
```

---

## Presentation Layer

Responsible

* Dashboard
* Tablet UI
* Staff Portal
* Patient Portal

---

## Question Engine

Responsible

Render แบบทดสอบจาก Template

แทนที่จะเขียน

```
Epworth.tsx

Food.tsx

Rome.tsx
```

จะเหลือ

```
<QuestionRenderer />
```

ที่สามารถ Render ได้ทุกแบบสอบถาม

---

## Assessment Engine

Responsible

* Calculate Score
* Interpretation
* Severity
* Validation
* Report Data

ตัวอย่าง

```
calculateMoca()

calculateEpworth()

calculateHamd()

calculateRomeIV()
```

Engine นี้สามารถใช้ได้ทั้ง

* Web
* Mobile

---

## Database Layer

Responsible

* Save Results
* Session
* Patient
* Visit
* Organization

---

# 8. Assessment Template System

ระบบใหม่จะไม่ Hardcode แบบทดสอบ

จากเดิม

```
test_type = moca
```

เปลี่ยนเป็น

```
assessment_templates
```

ตัวอย่าง

```
assessment_templates

id

name

category

version

renderer

questions (jsonb)

scoring_rules (jsonb)

interpretation_rules (jsonb)

is_active
```

เมื่อเพิ่มแบบทดสอบใหม่

ไม่จำเป็นต้อง Deploy ระบบ

เพียงเพิ่ม Template

---

# 9. Question Engine

Question Engine เป็นหัวใจของระบบ

รองรับ

* Epworth
* Rome IV
* Food Questionnaire
* RBD Questionnaire
* PHQ-9
* GDS
* และแบบสอบถามอื่นในอนาคต

Template ตัวอย่าง

```json
{
  "title": "Epworth",
  "questions": [
    {
      "id": 1,
      "type": "radio",
      "text": "...",
      "options": [
        { "label": "Never", "score": 0 },
        { "label": "Slight", "score": 1 },
        { "label": "Moderate", "score": 2 },
        { "label": "High", "score": 3 }
      ]
    }
  ]
}
```

Renderer จะอ่าน JSON แล้วสร้าง UI อัตโนมัติ

---

# 10. Assessment Engine

Assessment Engine ทำหน้าที่

* Score Calculation
* Severity
* Interpretation
* Validation

ตัวอย่าง

```
Assessment

↓

Raw Score

↓

Interpretation

↓

Severity

↓

Recommendation
```

เช่น

```
MoCA

24

↓

Possible Mild Cognitive Impairment
```

---

# 11. Database Model

```
Organization

↓

Patient

↓

Visit

↓

Assessment Session

↓

Assessment Results
```

เหตุผล

ผู้ป่วยหนึ่งคน

สามารถมีหลาย Visit

แต่ละ Visit

สามารถทำหลาย Assessment

เช่น

```
Patient

↓

Visit 1

MoCA

HAM-D

ESS

↓

Visit 2

MoCA

UPDRS

↓

Visit 3
```

รองรับการติดตามผลระยะยาว (Longitudinal Follow-up)

---

# 12. Core Modules

### Patient Module

* Patient Information
* Medical Record Number
* Demographics

---

### Visit Module

* Visit Date
* Organization
* Examiner
* Diagnosis

---

### Assessment Module

* Assessment Template
* Questions
* Scores
* Interpretation

---

### Report Module

* Clinical PDF
* Research Export
* Summary Dashboard

---

### Organization Module

* Hospital
* Research Center
* Multi-center Management

---

# 13. Reusable Components from CheckPD

สามารถ Reuse ได้ทันที

* QA Forms
* Score Thresholds
* PDF Generator
* HTML Report
* Supabase Helpers
* Auth Logic
* shadcn/ui
* Tailwind Components
* Zod Validation
* React Hook Form

ประเมินว่า

**Reuse ได้ประมาณ 70–80%**

---

# 14. Development Roadmap

## Phase 1

Core Platform

* Project Setup
* assess Schema
* Staff Login
* Patient Session
* Question Engine
* Assessment Engine
* PDF Export

---

## Phase 2

Clinical Workflow

* Dashboard
* Patient Queue
* Auto Interpretation
* Visit History
* Organization Management

---

## Phase 3

Research Platform

* Analytics Dashboard
* CSV Export
* De-identification
* Multi-center
* API

---

## Phase 4

Mobile

เพิ่ม

```
apps/mobile
```

ใช้

```
Expo React Native
```

โดยใช้

* Assessment Engine
* Question Engine
* Validation
* Types

ร่วมกับ Web

---

# 15. Long-term Vision

```
Clinical Assessment Platform

├── Web Dashboard
├── Tablet Assessment
├── Mobile Application
├── Research Portal
├── PDF Reporting
├── Analytics
└── API Integration
```

CheckPD จะกลายเป็นหนึ่งใน Modules ของระบบนี้

ทำให้แพลตฟอร์มสามารถรองรับแบบประเมินทางคลินิกทุกประเภทในอนาคต โดยไม่จำกัดเฉพาะโรคพาร์กินสัน และสามารถขยายไปสู่การใช้งานระดับโรงพยาบาล งานวิจัยหลายศูนย์ และการเชื่อมต่อกับระบบ HIS/EMR ได้ในระยะยาว

---

# 16. Final Technology Stack

| Layer          | Technology                   |
| -------------- | ---------------------------- |
| Frontend       | Next.js 15 (App Router)      |
| Language       | TypeScript                   |
| Styling        | Tailwind CSS v4              |
| UI             | shadcn/ui                    |
| Backend        | Supabase                     |
| Database       | PostgreSQL (`assess` schema) |
| Authentication | Supabase Auth                |
| Validation     | Zod                          |
| Forms          | React Hook Form              |
| PDF            | pdf-lib + Playwright         |
| Future Mobile  | Expo React Native            |
| Architecture   | Monorepo + Shared Packages   |
