import { MocaItem } from "./MocaCard";

export const mocaItems: MocaItem[] = [
  {
    id: 0,
    section: "VISUOSPATIAL / EXECUTIVE",
    title: "Trail Making",
    instruction: "ให้ผู้ทดสอบลากเส้นตามลำดับ 1 → ก → 2 → ข → ...",
    image: "/img/asset/number_assessment.png",
    max: 1,
    options: [
      { label: "ทำถูกต้อง", score: 1 },
      { label: "ทำไม่ถูกต้อง", score: 0 },
    ],
  },
  {
    id: 1,
    section: "VISUOSPATIAL / EXECUTIVE",
    title: "Copy Cube",
    instruction: "ให้ผู้ทดสอบวาดรูปกล่องตามตัวอย่าง",
    image: "/img/asset/Cube.png",
    max: 1,
    options: [
      { label: "วาดถูกต้อง", score: 1 },
      { label: "ไม่ถูกต้อง", score: 0 },
    ],
  },
  {
    id: 2,
    section: "VISUOSPATIAL / EXECUTIVE",
    title: "Clock Drawing",
    instruction: "ให้ผู้ทดสอบวาดนาฬิกา เวลา 11:10 นาที",
    image: "/img/asset/clock.png",
    max: 3,
    options: [
      { label: "วาดรายละเอียดทั้งหมดได้อย่างถูกต้อง (เช่น รูป ตัวเลข เข็ม)", score: 3 },
      { label: "ถูก 2 ส่วน", score: 2 },
      { label: "ถูก 1 ส่วน", score: 1 },
      { label: "ไม่ถูกต้อง", score: 0 },
    ],
  },
  {
    id: 3,
    section: "NAMING",
    title: "Naming Animals",
    instruction: "ให้ผู้ทดสอบบอกชื่อสัตว์",
    image: "/img/asset/animals2.png",
    max: 3,
    options: [
      { label: "ถูก 3 ตัว", score: 3 },
      { label: "ถูก 2 ตัว", score: 2 },
      { label: "ถูก 1 ตัว", score: 1 },
      { label: "ไม่ถูกต้อง", score: 0 },
    ],
  },

  {
    id: 5,
    section: "MEMORY",
    title: "Immediate Recall (Encoding)",
    instruction:
      "อ่านคำต่อไปนี้: หน้า, ผ้าไหม, วัด, มะลิ, สีแดง แล้วให้ผู้ป่วยทวน 2 ครั้ง",
    max: 0,
    type: "practice",
    options: [
      { label: "ทำแบบทดสอบทั้งสองเสร็จสมบูรณ์อย่างถูกต้อง", score: 0 },
      { label: "ไม่สามารถทำแบบทดสอบทั้งสองให้เสร็จสมบูรณ์ได้อย่างถูกต้อง", score: 0 },
    ],
  },
  {
    id: 6,
    section: "ATTENTION",
    title: "Digit Forward",
    instruction: "อ่าน 2 1 8 5 4 ให้ผู้ทดสอบทวน",
    max: 1,
    options: [
      { label: "ถูกต้อง", score: 1 },
      { label: "ไม่ถูกต้อง", score: 0 },
    ],
  },
  {
    id: 7,
    section: "ATTENTION",
    title: "Digit Backward",
    instruction: "อ่าน 7 4 2 ให้ผู้ทดสอบทวนย้อนกลับ",
    max: 1,
    options: [
      { label: "ถูกต้อง", score: 1 },
      { label: "ไม่ถูกต้อง", score: 0 },
    ],
  },
  {
    id: 8,
    section: "ATTENTION",
    title: "Vigilance",
    instruction:
      "อ่านตัวเลขและให้ผู้ทดสอบเคาะโต๊ะเมื่อได้ยินเลข 1 (ไม่มีคะแนนถ้าผิดเกิน 2): 5 2 1 3 9 4 1 1 8 0 6 2 1 5 1 9 4 5 1 1 1 4 1 9 0 5 1 1 2",
    max: 1,
    options: [
      { label: "ผิด <= 2 ครั้ง", score: 1 },
      { label: "ผิด > 2 ครั้ง", score: 0 },
    ],
  },
  {
  id: 9,
  section: "ATTENTION",
  title: "Serial 7 Subtraction",
  instruction: "ให้ลบ 100 - 7 ต่อเนื่อง (93, 86, 79, 72, 65)",
  max: 3,
  options: [
    { label: "4–5 ถูก", score: 3 },
    { label: "2–3 ถูก", score: 2 },
    { label: "1 ถูก", score: 1 },
    { label: "ไม่ถูก", score: 0 },
  ],
},
{
  id: 10,
  section: "LANGUAGE",
  title: "Sentence Repetition",
  instruction:
    `ให้พูดตาม:
    1) "ฉันรู้ว่าจอมเป็นคนเดียวที่มาช่วยงานวันนี้"
    // 2) "แมวมักซ่อนตัวอยู่หลังเก้าอี้เมื่อมีหมาอยู่ในห้อง"`,
  max: 2,
  options: [
    { label: "ถูกทั้ง 2 ประโยค", score: 2 },
    { label: "ถูก 1 ประโยค", score: 1 },
    { label: "ไม่ถูก", score: 0 },
  ],
},
{
  id: 11,
  section: "LANGUAGE",
  title: "Fluency",
  instruction: "บอกคำที่ขึ้นต้นด้วย 'ก' ≥ 11 คำใน 1 นาที",
  max: 1,
  options: [
    { label: "≥ 11 คำ", score: 1 },
    { label: "< 11 คำ", score: 0 },
  ],
},
{
  id: 12,
  section: "ABSTRACTION",
  title: "Abstraction",
  instruction:
    "อธิบายความเหมือน: รถไฟ-จักรยาน, นาฬิกา-ไม้บรรทัด",
  max: 2,
  options: [
    { label: "ถูกทั้ง 2", score: 2 },
    { label: "ถูก 1", score: 1 },
    { label: "ไม่ถูก", score: 0 },
  ],
},
{
  id: 13,
  section: "DELAYED RECALL",
  title: "Delayed Recall",
  instruction:
    "ให้ทวนคำ: หน้า ผ้าไหม วัด มะลิ สีแดง (ไม่มีตัวช่วย)",
  max: 5,
  options: [
    { label: "5 คำ", score: 5 },
    { label: "4 คำ", score: 4 },
    { label: "3 คำ", score: 3 },
    { label: "2 คำ", score: 2 },
    { label: "1 คำ", score: 1 },
    { label: "ไม่ได้เลย", score: 0 },
  ],
},
{
  id: 14,
  section: "ORIENTATION",
  title: "Orientation",
  instruction: "ถาม วัน เดือน ปี วัน สถานที่ จังหวัด",
  max: 6,
  options: [
    { label: "ถูก 6 ", score: 6 },
    { label: "ถูก 5 ", score: 5 },
    { label: "ถูก 4 ", score: 4 },
    { label: "ถูก 3 ", score: 3 },
    { label: "ถูก 2 ", score: 2 },
    { label: "ถูก 1 ", score: 1 },
    { label: "0", score: 0 },
  ],
},

];

