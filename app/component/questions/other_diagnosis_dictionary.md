# Other Diagnosis — พจนานุกรมคำอธิบาย (Data Dictionary)

คู่มือประกอบไฟล์ [`other_diagnosis_dropdown.json`](./other_diagnosis_dropdown.json) — อธิบายว่าตัวเลือก "Other Diagnosis"
แต่ละอันหมายถึงอะไร เพื่อให้**เจ้าหน้าที่ที่กรอกข้อมูล**และ**ทีมข้อมูล (Data)** เข้าใจตรงกัน

- ค่าที่เก็บใน DB = ข้อความตามตัวเลือก (คั่นหลายโรคด้วย `;`) เช่น `Cervical dystonia; Constipation`
- รายการนี้ตรวจ/อนุมัติโดยอาจารย์แพทย์ — ถ้าจะเพิ่ม/แก้ ให้แก้ที่ `other_diagnosis_dropdown.json` แล้วอัปเดตไฟล์นี้ตาม
- คำอธิบายเป็นภาษาเข้าใจง่าย ไม่ใช่นิยามทางคลินิกฉบับเต็ม

---

## 1. Tremor & Movement Disorders — อาการสั่น / การเคลื่อนไหวผิดปกติ

| ตัวเลือก | คำอธิบาย |
|---|---|
| Essential tremor | อาการสั่นที่พบบ่อยที่สุด สั่นตอนเคลื่อนไหว/ยกมือค้าง มักเป็นสองข้าง และมีประวัติครอบครัว |
| Postural tremor | สั่นเมื่อยกแขน/มือค้างไว้ต้านแรงโน้มถ่วง |
| Intention or Kinetic tremor | สั่นขณะเคลื่อนไหวเข้าหาเป้าหมาย (เช่น เอามือแตะจมูก) บ่งชี้ความผิดปกติของสมองน้อย |
| Essential tremor plus | ET ที่มีอาการทางระบบประสาทอื่นเล็กน้อยร่วม (เช่น เดินเซเล็กน้อย) |
| Task-specific tremor | สั่นเฉพาะเวลาทำกิจกรรมบางอย่าง เช่น เขียนหนังสือ |
| Enhanced physiologic tremor | อาการสั่นเล็กๆ ปกติของคนทั่วไปที่ถูกกระตุ้นให้ชัดขึ้น (กังวล กาแฟ ไทรอยด์) |
| Isometric tremor | สั่นขณะออกแรงเกร็งกล้ามเนื้อต้านวัตถุที่อยู่นิ่ง (เช่น กำมือแน่น) |
| Dystonic tremor | สั่นร่วมกับกล้ามเนื้อบิดเกร็งผิดท่า (dystonia) |
| Dystonic head tremor / No-no head tremor | สั่นศีรษะแบบส่ายซ้าย-ขวา (no-no) จาก dystonia ที่คอ |
| Head tremor (non ET or non dystonic tremor) | สั่นศีรษะที่ไม่เข้าเกณฑ์ ET และไม่ใช่ dystonia |
| Cervical dystonia | กล้ามเนื้อคอบิดเกร็ง ทำให้ศีรษะเอียง/บิด/ก้ม-เงยผิดท่า |
| Segmental dystonia | dystonia ที่เกิดในบริเวณติดกันตั้งแต่ 2 ส่วนขึ้นไปของร่างกาย |
| Generalized dystonia | dystonia ที่กระจายทั่วร่างกาย |
| Functional tremor / movement disorder | อาการสั่น/เคลื่อนไหวผิดปกติที่ไม่ได้เกิดจากรอยโรคทางกาย (functional / psychogenic) |
| Tremor (unspecified) | อาการสั่นที่ยังระบุชนิดไม่ได้ |

## 2. Parkinsonism & Related — พาร์กินสันและกลุ่มใกล้เคียง

| ตัวเลือก | คำอธิบาย |
|---|---|
| Parkinsonism | กลุ่มอาการเคลื่อนไหวช้า เกร็ง สั่น คล้ายพาร์กินสัน (เป็น "อาการ" ไม่ใช่โรคเฉพาะ) |
| Mild parkinsonism / parkinsonian | มีอาการ parkinsonism เล็กน้อย ยังไม่ชัดเจน |
| Drug-induced parkinsonism / possible or suspected | parkinsonism ที่เกิด/สงสัยว่าเกิดจากยา (เช่น ยาแก้อาเจียน ยาจิตเวช) |
| Hypokinesia | การเคลื่อนไหวลดลง/น้อยกว่าปกติ |
| Progressive supranuclear palsy (PSP) | พาร์กินสันเทียมชนิดหนึ่ง เด่นเรื่องล้มบ่อย กลอกตาขึ้น-ลงลำบาก |
| Corticobasal degeneration / syndrome (CBD / CBS) | โรคเสื่อมที่ทำให้แขนขาข้างหนึ่งเกร็ง/ใช้งานไม่ได้ตามสั่ง |
| Multiple system atrophy - Parkinsonian type (MSA-P) | พาร์กินสันเทียม เด่นอาการพาร์กินสัน + ระบบประสาทอัตโนมัติเสีย (ความดันตก เป็นลม) |
| Multiple system atrophy - Cerebellar type (MSA-C) | MSA ชนิดเด่นอาการสมองน้อย (เดินเซ) |
| Dementia with Lewy bodies (DLB) | สมองเสื่อม + อาการพาร์กินสัน + เห็นภาพหลอน + อาการขึ้นๆ ลงๆ |
| Wilson's disease (WD) | โรคทองแดงคั่งในร่างกาย พบในคนอายุน้อย มีอาการตับ + ระบบประสาท |
| Huntington's disease (HD) | โรคพันธุกรรม มีการเคลื่อนไหวยุกยิก (chorea) + ความจำ/อารมณ์เปลี่ยน |

## 3. Ataxia & Cerebellar Disorders — อะแท็กเซีย / สมองน้อย

| ตัวเลือก | คำอธิบาย |
|---|---|
| Spinocerebellar ataxia (SCA) | กลุ่มโรคพันธุกรรมของสมองน้อย ทำให้เดินเซ พูดไม่ชัด — เลือกระบุ type ได้ (1–50) |

## 4. Other Movement Disorders — การเคลื่อนไหวผิดปกติอื่นๆ

| ตัวเลือก | คำอธิบาย |
|---|---|
| Myoclonus | กล้ามเนื้อกระตุกเร็วคล้ายสะดุ้ง |
| Eyelid twitching / Benign eyelid twitching | เปลือกตากระตุก (มักไม่อันตราย) |
| Hemifacial spasm / Clonic hemifacial spasm | กล้ามเนื้อใบหน้าครึ่งซีกกระตุก |
| Tics | การเคลื่อนไหว/เปล่งเสียงซ้ำๆ ที่กลั้นได้ชั่วคราว |
| Tourette's syndrome | กลุ่มอาการ tics ทั้งการเคลื่อนไหวและเสียง เรื้อรังตั้งแต่เด็ก |
| Spastic paraparesis | ขาทั้งสองข้างอ่อนแรง + เกร็ง |

## 5. Sleep Disorders — การนอน

| ตัวเลือก | คำอธิบาย |
|---|---|
| Obstructive sleep apnea (OSA) | หยุดหายใจขณะหลับจากทางเดินหายใจอุดกั้น (กรน หยุดหายใจ ง่วงกลางวัน) |
| REM sleep behavior disorder (RBD / iRBD) นอนละเมอ | ละเมอแสดงท่าทางตามฝันช่วงหลับ REM — เป็นสัญญาณเสี่ยงพาร์กินสัน |
| Suspected vocalization / acting out of dream นอนละเมอ | สงสัยละเมอ/ส่งเสียงตามฝัน (ยังไม่ยืนยันว่าเป็น RBD) |
| Excessive daytime sleepiness (EDS) | ง่วงนอนมากผิดปกติในเวลากลางวัน |
| Frequent dreaming / dream ฝันบ่อย | ฝันบ่อย/ฝันชัดเจนกว่าปกติ |
| Sudden onset of sleep | หลับวูบทันทีโดยไม่รู้ตัว |
| Insomnia | นอนไม่หลับ |
| Periodic limb movement during sleep (PLMS / PLM / PLMD) | ขากระตุกเป็นช่วงๆ ขณะหลับ |
| Restless Legs Syndrome (RLS) โรคขาอยู่ไม่สุข | รู้สึกอยากขยับขา โดยเฉพาะตอนพัก/กลางคืน |

## 6. Cognitive Impairment & Dementia — พุทธิปัญญา / สมองเสื่อม

| ตัวเลือก | คำอธิบาย |
|---|---|
| Mild cognitive impairment (MCI) / Impaired cognitive | ความจำ/ความคิดถดถอยเล็กน้อย แต่ยังใช้ชีวิตประจำวันได้ |
| Alzheimer's disease (AD) | สมองเสื่อมชนิดพบบ่อยที่สุด เด่นเรื่องความจำระยะสั้น |
| Fronto-temporal dementia (FTD) | สมองเสื่อมสมองส่วนหน้า เด่นเรื่องพฤติกรรม/ภาษาเปลี่ยน |
| Cognitive impairment or Dementia (non-specific) | ภาวะสมองถดถอย/สมองเสื่อมที่ยังไม่ระบุชนิด |

## 7. Depression, Anxiety & Psychiatric — อารมณ์ / จิตเวช

| ตัวเลือก | คำอธิบาย |
|---|---|
| Depression | ภาวะซึมเศร้า |
| Mild depression | ซึมเศร้าระดับเล็กน้อย |
| Major depression | ซึมเศร้ารุนแรง (major depressive disorder) |
| Anxiety | ภาวะวิตกกังวล |
| Schizophrenia (โรคจิตเภท) | โรคจิตเภท มีอาการหลงผิด/ประสาทหลอน |
| Psychiatric history | มีประวัติโรค/การรักษาทางจิตเวช |
| Underlying alcoholism | มีภาวะติดสุราเป็นโรคประจำตัว |

## 8. Stroke & Vascular Disorders — หลอดเลือดสมอง

| ตัวเลือก | คำอธิบาย |
|---|---|
| Ischemic stroke / Old ischemic stroke / old lacunar infarct | หลอดเลือดสมองตีบ/ตัน (เฉียบพลันหรือเก่า รวมรอยตันเล็ก lacunar) |
| Hemorrhagic stroke / Post-hemorrhagic stroke | หลอดเลือดสมองแตก / ภาวะหลังเลือดออกในสมอง |
| Hemiparesis | แขนขาอ่อนแรงครึ่งซีก |
| Stroke (unspecified) | โรคหลอดเลือดสมองที่ยังไม่ระบุชนิด |
| Post-stroke with spasticity | หลังเป็น stroke มีกล้ามเนื้อเกร็ง |

## 9. Neuropathy & Nerve Disorders — เส้นประสาท

| ตัวเลือก | คำอธิบาย |
|---|---|
| Diabetic neuropathy | ปลายประสาทเสื่อมจากเบาหวาน (ชา/ปวดปลายมือเท้า) |
| Peripheral neuropathy | โรคเส้นประสาทส่วนปลาย (ชา อ่อนแรง) |
| Muscle strain | กล้ามเนื้ออักเสบ/บาดเจ็บจากการใช้งาน |
| Muscle pain | ปวดกล้ามเนื้อ |

## 10. Orthopedic & Spine Disorders — กระดูก / กระดูกสันหลัง

| ตัวเลือก | คำอธิบาย |
|---|---|
| Lumbar spondylosis / LS spondylosis (กระดูกทับเส้น) | กระดูกสันหลังส่วนเอวเสื่อม/ทับเส้นประสาท |
| Cervical spondylosis / C-spondylosis (กระดูกคอเสื่อม) | กระดูกสันหลังส่วนคอเสื่อม |
| OA knees (ปวดเข่า เข่าเสื่อม) | ข้อเข่าเสื่อม |
| OA hands | ข้อมือ/ข้อนิ้วเสื่อม |
| Frozen shoulder (ไหล่ติด) | ข้อไหล่ติด ขยับได้จำกัด |
| Gout (เกาต์ ปวดข้อ) | โรคเกาต์ (กรดยูริกสูง ปวดข้อ) |
| Rheumatoid (รูมาตอยด์) | ข้ออักเสบรูมาตอยด์ (โรคภูมิคุ้มกัน) |

## 11. GI, GU & Autonomic — ทางเดินอาหาร / ปัสสาวะ / ระบบประสาทอัตโนมัติ

| ตัวเลือก | คำอธิบาย |
|---|---|
| Constipation | ท้องผูก (อาจเป็นสัญญาณเสี่ยงพาร์กินสัน) |
| Gastroparesis (ท้องอืด อาหารไม่ย่อย) | กระเพาะบีบตัวช้า อาหารค้าง ท้องอืด |
| GERD (กรดไหลย้อน) | กรดไหลย้อน |
| Nocturia | ปัสสาวะบ่อยตอนกลางคืน |
| Urinary incontinence | กลั้นปัสสาวะไม่อยู่ |
| Urinary frequency | ปัสสาวะบ่อย |
| Urinary retention | ปัสสาวะไม่ออก / ค้าง |

## 12. Other Medical Problems — โรคประจำตัวอื่นๆ

| ตัวเลือก | คำอธิบาย |
|---|---|
| Dyslipidemia (DLP) | ไขมันในเลือดผิดปกติ |
| Diabetes (T2DM) | เบาหวานชนิดที่ 2 |
| Hypertension (HT) | ความดันโลหิตสูง |
| Peri / post menopausal syndrome | กลุ่มอาการช่วงใกล้/หลังหมดประจำเดือน |

## 13. General / สถานะทั่วไป

| ตัวเลือก | คำอธิบาย |
|---|---|
| Normal / No significant findings (ไม่มีอาการผิดปกติ) | ตรวจแล้วไม่พบความผิดปกติที่มีนัยสำคัญ (ใช้แยกจากกรณี "ยังไม่ได้กรอก") |

---

**สรุป:** 13 กลุ่ม รวม 80 ตัวเลือก · ช่อง "Others (พิมพ์เอง)" ในระบบไว้รองรับโรคที่ไม่มีในรายการนี้
