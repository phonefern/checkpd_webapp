# รายการตัวเลือก "Other Diagnosis" — ขอหมอช่วยตรวจ ✅

> **วัตถุประสงค์:** เดิมช่อง *other* (รายละเอียดวินิจฉัยเพิ่มเติม) เป็นช่องพิมพ์อิสระ ทำให้โรคเดียวกันถูกพิมพ์หลายแบบ
> (เช่น `Cervical dystonia` / `(Cervical dystonia)` / `Mild cervical dystonia`) นำไปวิเคราะห์ต่อไม่ได้
> เราจะเปลี่ยนเป็น **เลือกจากรายการ (เลือกได้หลายข้อ) + มีช่อง "อื่นๆ พิมพ์เอง" เผื่อกรณีไม่มีในรายการ**
>
> **รบกวนหมอช่วยดูว่า:** รายการครบไหม / มีคำไหนซ้ำซ้อนหรือควรตัด / มีโรคที่ควรเพิ่ม / การจัดกลุ่มเหมาะสมไหม

วิธีใช้งานหลังเปลี่ยน: ติ๊กเลือกได้หลายข้อ → ระบบเก็บเป็นข้อความคั่นด้วย `;` เช่น `Cervical dystonia; Constipation`
ใช้รายการชุดเดียวกันทั้งฝั่งเจ้าหน้าที่ (public) และฝั่งหมอ (QA) เพื่อให้ข้อมูลตรงกัน

---

## รายการปัจจุบัน (11 กลุ่ม)

### 1. Tremor & Movement Disorders (อาการสั่น / การเคลื่อนไหวผิดปกติ)
Essential tremor · Postural tremor · Intention tremor · Task-specific tremor · Enhanced physiologic tremor · Essential tremor plus · Dystonic tremor · Dystonic head tremor · Head tremor · No-no head tremor · Cervical dystonia · Segmental dystonia · Generalized dystonia · Tremor (unspecified)

### 2. Parkinsonism & Related (พาร์กินสันและกลุ่มใกล้เคียง)
Parkinsonism · Drug-induced parkinsonism · Mild parkinsonism (possible drug-induced) · Suspected drug-induced parkinsonism · Hypokinesia · Hyposmia · Pseudo-parkinsonism · R/O PSP

### 3. Ataxia & Cerebellar Disorders (อะแท็กเซีย / สมองน้อย)
Spinocerebellar ataxia · Spinocerebellar ataxia type 2 · Spinocerebellar ataxia, DDX x SCA

### 4. Sleep Disorders (การนอน)
Obstructive sleep apnea · R/O OSA · IRBD · RBD vocalization / acting out · Excessive daytime sleepiness (EDS) · Frequent dreamy · Sudden onset of sleep · Insomnia

### 5. Cognitive Impairment & Dementia (พุทธิปัญญา / สมองเสื่อม)
Mild cognitive impairment (MCI) · Impaired cognitive · Dementia · Alzheimer's disease · Cognitive impairment

### 6. Depression, Anxiety & Psychiatric (อารมณ์ / จิตเวช)
Depression · Mild depression · Major depression · Anxiety · Psychiatric history · Underlying alcoholism

### 7. Stroke & Vascular Disorders (หลอดเลือดสมอง)
Ischemic stroke · Old ischemic stroke · Post-hemorrhagic stroke · Lt hemiparesis / hemiparisis · Rv old lacunar infarct · Stroke (unspecified) · Post-stroke with spastic Rt side · Dyslipidemia, old stroke

### 8. Neuropathy & Nerve Disorders (เส้นประสาท)
Diabetic neuropathy · Peripheral neuropathy · Muscle strain · R eyelid twitching / facial spasm · Clonic hemifacial spasm

### 9. Orthopedic & Spine Disorders (กระดูก / กระดูกสันหลัง)
LS spondylosis · Lumbar spondylosis · OA knees · OA hands · Frozen shoulder · กระดูกทับเส้น

### 10. GI, GU & Autonomic (ทางเดินอาหาร / ปัสสาวะ / ระบบประสาทอัตโนมัติ)
Constipation · Frequent dribbling · Nocturia · Dyslipidemia · Poorly controlled diabetes · Hypertension

### 11. Miscellaneous (อื่นๆ)
Migraine · Allergic rhinitis · Breast cancer · R/O Huntington disease · แพทย์ไม่ระบุโรค · Control / Normal

---

## ⚠️ ที่พบในข้อมูลจริงแต่ยัง "ไม่มี" ในรายการ — เสนอให้หมอพิจารณาเพิ่ม

จากข้อมูล other เดิม (~100 ค่า) มีโรคเหล่านี้ที่ยังไม่มีตัวเลือกตรงๆ:

| โรคที่พบในข้อมูลจริง | กลุ่มที่ควรอยู่ | หมายเหตุ |
|---|---|---|
| **Hyperthyroidism / Thyroid** | เพิ่มกลุ่มต่อมไร้ท่อ? หรือ Misc | พบบ่อยมากในข้อมูล แต่ไม่มีในรายการเลย |
| **Vascular parkinsonism** | Parkinsonism | ตอนนี้มีแค่ drug-induced |
| **PSP-P** (เป็นจริง ไม่ใช่ R/O) | Parkinsonism | รายการมีแค่ `R/O PSP` |
| **Huntington disease** (เป็นจริง) | Misc | รายการมีแค่ `R/O Huntington` |
| **Myoclonus** | Tremor & Movement | — |
| **Gait disorder** | Parkinsonism / Movement | — |
| **Radiculopathy** | Orthopedic & Spine | — |
| **Carpal tunnel syndrome (CTS)** | Neuropathy | พบหลายเคส |
| **Normal pressure hydrocephalus (NPH)** | Misc / Parkinsonism | พบเป็น suspect |

> หมอเพิ่ม/ตัด/แก้ชื่อได้ตามสะดวก — ทำเครื่องหมายในรายการนี้ส่งกลับมาได้เลยครับ

---

## ❓ คำถามถึงหมอ

1. รายการ 11 กลุ่มข้างบน **ครบ/เหมาะสม** ไหม? มีโรคไหนต้องตัดออกเพราะไม่จำเป็น?
2. โรคในตาราง "เสนอเพิ่ม" — อันไหนควรเพิ่มจริง?
3. คำที่ดูซ้ำซ้อน เช่น `Impaired cognitive` กับ `Cognitive impairment`, หรือ `Dyslipidemia` ที่อยู่ 2 กลุ่ม — ให้รวมเป็นอันเดียวไหม?
4. โรคร่วม (comorbidity) อย่าง HT/DLP/DM/OSA — หมออยากให้อยู่ในรายการนี้ หรือแยกเป็นช่อง "โรคประจำตัว" ต่างหาก?
