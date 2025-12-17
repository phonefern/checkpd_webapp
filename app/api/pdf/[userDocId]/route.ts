// app/api/pdf/[userDocId]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebaseAdmin';
import { Timestamp } from 'firebase-admin/firestore';
import path from 'path';
import fs from 'fs';
import playwright from 'playwright-core';
import chromium from '@sparticuz/chromium';

export const runtime = 'nodejs';

// โหลดฟอนต์และรูปภาพ
const fontPath = path.join(process.cwd(), 'fonts', 'thsarabunnew-webfont.woff');
const headerImgPath = path.join(process.cwd(), 'img', 'header', 'pdf_header.jpg');
const footerImgPath = path.join(process.cwd(), 'img', 'footer', 'pdf_footer.jpg');

let fontBase64 = '';
let headerBase64 = '';
let footerBase64 = '';

try {
  fontBase64 = fs.readFileSync(fontPath).toString('base64');
  headerBase64 = fs.readFileSync(headerImgPath).toString('base64');
  footerBase64 = fs.readFileSync(footerImgPath).toString('base64');
} catch (err) {
  console.error('❌ โหลดไฟล์ไม่สำเร็จ:', err);
}

// รายการคำถาม 20 ข้อ
const questionList = [
  '1. ท่านเคยมีอาการสั่นที่มือ หรือขา โดยมีอาการขณะพักหรืออยู่เฉยๆ',
  '2. ท่านเขียนหนังสือช้าลง หรือเขียนหนังสือตัวเล็กลงกว่าเดิม',
  '3. ท่านรู้สึกว่าเคลื่อนไหวช้าลงกว่าเมื่อก่อน เช่น การหวีผม แต่งตัว อาบน้ำ หรือรู้สึกว่าการติดกระดุม หรือเปิดฝาขวดน้ำทำได้ลำบากกว่าเก่า',
  '4. เคยมีคนบอกว่าเสียงของท่านเบาลงกว่าเมื่อก่อน หรือผู้ฟังต้องถามซ้ำบ่อยๆ เพราะไม่ได้ยินเสียงท่านพูด',
  '5. ท่านรู้สึกว่าแขนของท่านแกว่งน้อยลงเวลาเดิน',
  '6. ท่านเดินก้าวสั้นๆ และเดินซอยเท้าถี่',
  '7. ท่านมีอาการก้าวขาไม่ออก หรือก้าวติดขณะเริ่มต้นออกเดิน หรือขณะเดิน หรือหมุนตัว',
  '8. ท่านมีปัญหาพุ่งตัวไปข้างหน้าขณะเดิน ทำให้ก้าวตามไม่ทัน หรือหยุดเดินทันทีได้ยาก',
  '9. ท่านมีอาการข้อใดข้อหนึ่งต่อไปนี้ พลิกตัวได้ลำบากเวลานอน หรือลุกจากที่นอนลำบาก หรือหลังจากนั่งลงแล้ว ท่านรู้สึกว่าลุกยาก หรือลุกลำบาก',
  '10. มีอาการสั่น เคลื่อนไหวช้า หรือแข็งเกร็งเริ่มที่ข้างใดข้างหนึ่งของร่างกายก่อน',
  '11. ท่านทราบว่าตนเองมีอาการพูดออกเสียง หรือตะโกน หรือละเมอ หรือขยับแขนขาที่อาจจะสอดคล้องกับความฝัน หรือตกเตียงขณะนอนหลับ หรือเคยได้รับการบอกจากคู่นอน หรือผู้ดูแล ว่าท่านมีอาการดังกล่าว',
  '12. ท่านมีอาการง่วงนอนระหว่างวันมากผิดปกติ หรือผลอยหลับระหว่างขณะทำกิจกรรมเป็นประจำ',
  '13. ท่านรู้สึกว่าการได้กลิ่นของท่านลดลง',
  '14. ในช่วง 3 เดือนที่ผ่านมา ท่านมีอาการท้องผูกเรื้อรัง โดยถ่ายน้อยกว่า 3 ครั้ง/สัปดาห์',
  '15. ท่านมีอาการซึมเศร้า ร้องไห้ง่ายกว่าปกติ หรือขาดความสนใจต่อสิ่งแวดล้อมรอบข้าง หรือสิ่งที่เคยให้ความสนุกสนานในอดีต',
  '16. ท่านเคยเห็นภาพหลอน หรือได้ยินเสียง โดยที่ไม่มีตัวคน',
  '17. ท่านมีอาการหน้ามืด มึน หรือเวียนศีรษะ เวลาเปลี่ยนท่าจากนั่งหรือนอนเป็นลุกยืน และอาการมักจะดีขึ้น หรือหายไปหลังจากที่นั่งหรือนอนเป็นประจำ',
  '18. ท่านมีปัญหาการควบคุมปัสสาวะ เช่น การกลั้นปัสสาวะไม่ได้ ปัสสาวะคั่งเป็นประจำ',
  '19. ท่านมีปัญหาความคิดวิเคราะห์ ความจำ การคำนวณ ที่แย่ลง นานมากกว่า 1 ปีขึ้นไป',
  '20. ท่านมีปัญหาการทรงตัว หรือหกล้มบ่อย ในระยะแรกที่เกิดอาการ เคลื่อนไหวช้า แข็งเกร็ง หรือสั่น',
];

// ฟังก์ชันประมวลผลข้อมูล record
async function processRecordData(recordDoc: any) {
  const recordData = recordDoc.data();
  const allowedJsonFields = [
    'balance',
    'dualtap',
    'dualtapright',
    'gaitwalk',
    'pinchtosize',
    'pinchtosizeright',
    'questionnaire',
    'tremorpostural',
    'tremorresting',
    'prediction',
    'diagnose',
    'voiceAhh',
    'voiceYPL',
  ];

  const groupedData: Record<string, any> = {};

  allowedJsonFields.forEach((field) => {
    const fieldKey = Object.keys(recordData).find(
      (key) => key.toLowerCase() === field.toLowerCase()
    );
    if (fieldKey && recordData[fieldKey] !== undefined) {
      groupedData[field] = {
        ...(typeof recordData[fieldKey] === 'object'
          ? recordData[fieldKey]
          : { value: recordData[fieldKey] }),
        recordId: recordDoc.id,
        timestamp:
          recordData.createdAt instanceof Timestamp
            ? recordData.createdAt.toDate().toISOString()
            : recordData.createdAt || null,
      };
    }
  });

  return groupedData;
}

function calculateAgeFromBod(bod: any): number | null {
  try {
    let birthDate: Date;

    // 1) Firestore Timestamp
    if (bod instanceof Timestamp) {
      birthDate = bod.toDate();
    }
    // 2) String เช่น "15 April 1961 at 00:00:00 UTC+7"
    else if (typeof bod === "string") {
      // ลบคำว่า "at" ออกเพื่อ parse ได้
      const clean = bod.replace("at", "");
      birthDate = new Date(clean);
    }
    // 3) JS Date
    else if (bod instanceof Date) {
      birthDate = bod;
    } else {
      return null;
    }

    const today = new Date();

    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    const dayDiff = today.getDate() - birthDate.getDate();

    // ถ้าเดือนเกิดยังไม่ถึง หรือวันเกิดยังไม่ถึง → อายุ -1
    if (monthDiff < 0 || (monthDiff === 0 && dayDiff < 0)) {
      age--;
    }

    return age;
  } catch (error) {
    console.error("Error calculating age:", error);
    return null;
  }
}


function extractSensorSeries(recordData: any) {
  if (!recordData?.recording?.recordedData) return null;

  const rows = recordData.recording.recordedData;

  return rows
    .map((row: any) => {
      const d = row.data;
      if (!Array.isArray(d) || d.length < 6) return null;

      return {
        ts: row.ts,           // seconds timestamp (NOT ms)
        gx: Number(d[3]),
        gy: Number(d[4]),
        gz: Number(d[5]),
      };
    })
    .filter(Boolean);
}



function calculateTremorFrequency(recordData: any): number | null {
  const series = extractSensorSeries(recordData);
  if (!series || series.length < 20) return null; // ต้องมีข้อมูลขั้นต่ำ

  // ====== magnitude + timestamps ======
  const magnitudes: number[] = [];
  const timestamps: number[] = [];

  for (const s of series) {
    const mag = Math.sqrt(s.gx * s.gx + s.gy * s.gy + s.gz * s.gz);
    magnitudes.push(mag);
    timestamps.push(s.ts);
  }

  // ====== sampling rate ======
  const diffs = [];
  for (let i = 1; i < timestamps.length; i++) {
    diffs.push(timestamps[i] - timestamps[i - 1]);  // seconds
  }

  const avgSec = diffs.reduce((a, b) => a + b, 0) / diffs.length;

  // sampling rate = 1 sample / X seconds
  const fs = 1 / avgSec;


  if (!fs || fs < 5 || fs > 200) return null;


  // ====== Windowing (Hamming) ======
  const N = magnitudes.length;
  const windowed = magnitudes.map(
    (v, i) => v * (0.54 - 0.46 * Math.cos((2 * Math.PI * i) / (N - 1)))
  );

  // ====== DFT ======
  const re = new Array(N).fill(0);
  const im = new Array(N).fill(0);

  for (let k = 0; k < N; k++) {
    for (let n = 0; n < N; n++) {
      const angle = (2 * Math.PI * k * n) / N;
      re[k] += windowed[n] * Math.cos(angle);
      im[k] -= windowed[n] * Math.sin(angle);
    }
  }

  const mags = re.map((r, i) => Math.sqrt(r * r + im[i] * im[i]));

  // ====== Find peak frequency (2–12 Hz typical tremor range) ======
  let peakFreq = 0;
  let peakMag = 0;

  for (let i = 1; i < N / 2; i++) {
    const freq = (i * fs) / N;
    if (freq < 2 || freq > 12) continue;

    if (mags[i] > peakMag) {
      peakMag = mags[i];
      peakFreq = freq;
    }
  }

  return peakFreq ? Number(peakFreq.toFixed(2)) : null;
}




// สร้าง HTML สำหรับ PDF
function generateHTML(
  userData: any,
  recordData: any,
  info: {
    name: string;
    age: string | null;
    date: string;
  }
): string {
  const questionnaire = recordData.questionnaire?.data?.split(',') || [];


  const tapCountLeft =
    recordData.dualtap?.data?.score ??

    null;

  const tapCountRight =
    recordData.dualtapright?.data?.score ??
    null;

  const restingFrequency =
    recordData.tremorresting?.data
      ? calculateTremorFrequency(recordData.tremorresting.data)
      : null;

  const posturalFrequency =
    recordData.tremorpostural?.data
      ? calculateTremorFrequency(recordData.tremorpostural.data)
      : null;

  const balanceFrequency =
    recordData.balance?.data
      ? calculateTremorFrequency(recordData.balance.data)
      : null;

  const gaitFrequency =
    recordData.gaitwalk?.data
      ? calculateTremorFrequency(recordData.gaitwalk.data)
      : null;





  const prediction = recordData.prediction;
  const diagnose = recordData.diagnose;

  // แปลงวันที่เป็นรูปแบบภาษาไทย (พุทธศักราช)
  const formatThaiDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      const thaiYear = date.getFullYear() + 543;
      const months = [
        'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
        'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'
      ];
      return `${date.getDate()} ${months[date.getMonth()]} ${thaiYear}`;
    } catch {
      return dateStr;
    }
  };

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <style>
    @font-face {
      font-family: 'THSarabunPSK';
      src: url('data:font/woff;base64,${fontBase64}') format('woff');
      font-weight: normal;
      font-style: normal;
    }
    @font-face {
      font-family: 'THSarabunPSK';
      src: url('data:font/woff;base64,${fontBase64}') format('woff');
      font-weight: bold;
      font-style: normal;
    }
    @page {
      size: A4;
      margin: 12px 24px;
    }
    body {
      font-family: 'THSarabunPSK', Arial, sans-serif;
      font-size: 12px;
      line-height: 1.4;
      margin: 0;
      padding: 0;
    }
    .header-img {
      width: 100%;
      text-align: center;
      margin-bottom: 8px;
    }
    .header-img img {
      max-width: 100%;
      height: auto;
    }
    .footer-img {
      margin-top: 16px;
      text-align: center;
    }
    .footer-img img {
      max-width: 100%;
      height: auto;
    }
    .section {
      margin: 8px 0;
    }
    .indent {
      margin-left: 20px;
    }
    .bold {
      font-weight: bold;
    }
    .note {
      font-size: 9px;
      margin-top: 16px;
    }
    .question-item {
      display: flex;
      justify-content: space-between;
      margin: 2px 0;
    }
    .answer-yes {
      color: #f44336;
    }
    .answer-no {
      color: #009688;
    }
    .page-break {
      page-break-before: always;
    }

    .test-section {
        margin-bottom: 8px;
        padding: 4px 0;
        border-left: 3px solid #666;
        padding-left: 8px;
      }

      .test-title {
        font-weight: bold;
        margin-bottom: 2px;
        font-size: 12px;
      }

      .test-item {
        margin-left: 12px;
        font-size: 12px;
      }

      .value {
        font-weight: bold;
      }

      .value.na {
        color: #999;
        font-style: italic;
      }

      .value.na {
        color: #888;
        font-style: italic;
      }
      .na {
        color: #999;
        font-size: 12px;
        margin-left: 4px;
        font-style: italic;
      }

  </style>
</head>
<body>
  <!-- หน้าแรก -->
  <div class="header-img">
    <img src="data:image/jpeg;base64,${headerBase64}" alt="Header" />
  </div>

  <div class="section">
    <div>ชื่อ นามสกุล ${info.name}</div>
    <div>อายุ ${info.age || '................'} ปี</div>
    <div>วันที่ทดสอบ ${formatThaiDate(info.date)}</div>
  </div>

  <div class="section"></div>

  <div class="section bold">
    ท่านได้ทำการประเมิน แบบคัดกรองความเสี่ยงของการเกิดโรคพาร์กินสัน ประกอบด้วย
  </div>

<div class="indent">

  <!-- แบบประเมิน 20 ข้อ -->
<div class="test-section">
  <div class="test-title">• แบบประเมินอาการโรคพาร์กินสัน 20 ข้อ</div>
  ${recordData.questionnaire
      ? `<div class="test-item">- ทำแบบประเมินแล้ว</div>`
      : `<div class="test-item"><span class="value na">ไม่มีข้อมูลจากการทดสอบ</span></div>`
    }
</div>


  <!-- ทดสอบการออกเสียง -->
<div class="test-section">
  <div class="test-title">• การทดสอบการออกเสียง</div>
  ${(recordData.voiceAhh || recordData.voiceYPL)
      ? `<div class="test-item">- ทำการทดสอบเสียงแล้ว</div>`
      : `<div class="test-item"><span class="value na">ไม่มีข้อมูลจากการทดสอบ</span></div>`
    }
</div>


  <!-- การทดสอบอาการสั่น -->
<div class="test-section">
  <div class="test-title">• การทดสอบอาการสั่น</div>

  ${posturalFrequency !== null
      ? `<div class="test-item">- อาการสั่นขณะยืดถือแขนตรง: <span class="value">${posturalFrequency.toFixed(1)} Hz</span></div>`
      : `<div class="test-item">- อาการสั่นขณะยืดถือแขนตรง: <span class="value na">ไม่มีข้อมูลจากการทดสอบ</span></div>`
    }

  ${restingFrequency !== null
      ? `<div class="test-item">- อาการสั่นขณะพัก: <span class="value">${restingFrequency.toFixed(1)} Hz</span></div>`
      : `<div class="test-item">- อาการสั่นขณะพัก: <span class="value na">ไม่มีข้อมูลจากการทดสอบ</span></div>`
    }
</div>


  <!-- การทดสอบการตอบสนองของมือ -->
<div class="test-section">
  <div class="test-title">• การทดสอบการตอบสนองของมือ</div>

  ${tapCountLeft !== null
      ? `<div class="test-item">- มือซ้าย: <span class="value">${tapCountLeft} ครั้ง</span></div>`
      : `<div class="test-item">- มือซ้าย: <span class="value na">ไม่มีข้อมูล</span></div>`
    }

  ${tapCountRight !== null
      ? `<div class="test-item">- มือขวา: <span class="value">${tapCountRight} ครั้ง</span></div>`
      : `<div class="test-item">- มือขวา: <span class="value na">ไม่มีข้อมูล</span></div>`
    }
</div>


  <!-- การเดินและการทรงตัว -->
<div class="test-section">
  <div class="test-title">• การทดสอบการเดินและการทรงตัว</div>

  ${balanceFrequency !== null
      ? `<div class="test-item">- ความถี่การทรงตัวขณะยืน: <span class="value">${balanceFrequency.toFixed(1)} Hz</span></div>`
      : `<div class="test-item">- การทรงตัว: <span class="value na">ไม่มีข้อมูลจากการทดสอบ</span></div>`
    }

  ${gaitFrequency !== null
      ? `<div class="test-item">- ความถี่ลักษณะการเดิน: <span class="value">${gaitFrequency.toFixed(1)} Hz</span></div>`
      : `<div class="test-item">- การเดิน: <span class="value na">ไม่มีข้อมูลจากการทดสอบ</span></div>`
    }
</div>





</div>




  <div class="section bold">
    ผลการประเมินด้วยค่าทางสถิติ และการวิเคราะห์ด้วยปัญญาประดิษฐ์ พบว่า
  </div>

  <div class="indent">
    ${prediction?.risk ? 'แนะนำพบแพทย์ เพื่อทำการตรวจวินิจฉัยเพิ่มเติม' : 'อยู่ในเกณฑ์ปกติ'}
  </div>

  <div class="section bold">
    ผลการประเมินด้วยแพทย์/ผู้เชี่ยวชาญ
  </div>

  <div class="indent">
    <div>ผลวินิจฉัย: ${diagnose?.type === 'ct'
      ? 'ปกติ/Healthy control'
      : diagnose?.type === 'pd'
        ? "Likely Parkinson's disease (PD)"
        : diagnose?.type === 'prodromalPD'
          ? 'Likely prodromal PD'
          : diagnose?.type === 'highRiskPD'
            ? 'Likely high risk for PD'
            : diagnose?.type === 'other'
              ? 'Other'
              : '..........................................................................................................'
    }</div>
    <div>รายละเอียด: ${diagnose?.comment || '..........................................................................................................'}</div>
    <div>หมายเหตุ: ${diagnose?.note || '..........................................................................................................'}</div>
  </div>

  <div class="section bold">ข้อแนะนำ สำหรับทุกคน</div>
  <div class="indent">
    <div>- ทำการตรวจประเมิน ด้วยแบบคัดกรองความเสี่ยงของการเกิดโรคพาร์กินสัน ซ้ำทุก 1 ปี</div>
    <div>- ศึกษาความรู้ ความเข้าใจ เกี่ยวกับการป้องกันโรคพาร์กินสัน และการปรับเปลี่ยนพฤติกรรมสุขภาพ ด้วย "กิน ขยับ หลับดี (Eat Move Sleep Repeat)"</div>
  </div>

  <div class="section bold">ข้อแนะนำ สำหรับผู้ที่ต้องไปพบแพทย์ เพื่อทำการตรวจวินิจฉัยเพิ่มเติม</div>
  <div class="indent">
    <div>- นำผลการตรวจประเมินด้วยแบบคัดกรองความเสี่ยงของการเกิดโรคพาร์กินสัน ไปพบแพทย์ ตามสิทธิการรักษาของท่าน เพื่อทำการตรวจวินิจฉัย โดยการถามประวัติ ตรวจร่างกาย หรือส่งตรวจทางห้องปฏิบัติการที่จำเป็นต่อไป</div>
    <div>- ทำการตรวจประเมิน ด้วยแบบคัดกรองความเสี่ยงของการเกิดโรคพาร์กินสัน ซ้ำทุก 1 ปี</div>
    <div>- ศึกษาความรู้ ความเข้าใจ เกี่ยวกับการป้องกันโรคพาร์กินสัน และการปรับเปลี่ยนพฤติกรรมสุขภาพ ด้วย "กิน ขยับ หลับดี (Eat Move Sleep Repeat)"</div>
  </div>

  <div class="footer-img">
    <img src="data:image/jpeg;base64,${footerBase64}" alt="Footer" />
  </div>

  <div class="note bold">หมายเหตุ</div>
  <div class="note">
    การประเมินด้วยแบบคัดกรองความเสี่ยงของการเกิดโรคพาร์กินสันนี้ เป็นการประเมินด้วยค่าทางสถิติและการวิเคราะห์ด้วยปัญญาประดิษฐ์ โดยทางทีมผู้วิจัยได้ทำการทดสอบความเที่ยงตรงและแม่นยำของแบบคัดกรองพบมีความแม่นยำในระดับสูงในการคัดแยกผู้ป่วยพาร์กินสัน แต่อย่างไรก็ตามการวินิจฉัยโรคพาร์กินสันในปัจจุบันยังอ้างอิงตามเกณฑ์การตรวจวินิจฉัยโดยแพทย์ ดังนั้น แบบคัดกรองความเสี่ยงของการเกิดโรคพาร์กินสันนี้ ยังไม่สามารถทดแทนการตรวจวินิจฉัยโดยแพทย์ได้ ดังนั้น หากท่านมีความเสี่ยงหรือมีข้อสงสัยหรือได้รับคำแนะนำให้พบแพทย์เพื่อรับการตรวจวินิจฉัยเพิ่มเติม ควรพบแพทย์เพื่อรับการปรึกษาเพิ่มเติมต่อไป
  </div>

  ${questionnaire.length > 0
      ? `
  <!-- หน้าที่ 2: แบบประเมิน 20 ข้อ -->
  <div class="page-break">
    <div class="header-img">
      <img src="data:image/jpeg;base64,${headerBase64}" alt="Header" />
    </div>

    <div class="section bold">แบบประเมินอาการโรคพาร์กินสัน 20 ข้อ</div>

    ${questionList
        .map((q, i) => {
          const answer = questionnaire[i] === '0' ? 'ไม่' : 'ใช่';
          const answerClass = questionnaire[i] === '0' ? 'answer-no' : 'answer-yes';
          return `
      <div class="question-item">
        <div style="flex: 1;">${q}</div>
        <div class="${answerClass}" style="min-width: 40px; text-align: right;">${answer}</div>
      </div>
    `;
        })
        .join('')}

    <div class="footer-img">
      <img src="data:image/jpeg;base64,${footerBase64}" alt="Footer" />
    </div>

    <div class="note bold">หมายเหตุ</div>
    <div class="note">
      การประเมินด้วยแบบคัดกรองความเสี่ยงของการเกิดโรคพาร์กินสันนี้ เป็นการประเมินด้วยค่าทางสถิติและการวิเคราะห์ด้วยปัญญาประดิษฐ์ โดยทางทีมผู้วิจัยได้ทำการทดสอบความเที่ยงตรงและแม่นยำของแบบคัดกรองพบมีความแม่นยำในระดับสูงในการคัดแยกผู้ป่วยพาร์กินสัน แต่อย่างไรก็ตามการวินิจฉัยโรคพาร์กินสันในปัจจุบันยังอ้างอิงตามเกณฑ์การตรวจวินิจฉัยโดยแพทย์ ดังนั้น แบบคัดกรองความเสี่ยงของการเกิดโรคพาร์กินสันนี้ ยังไม่สามารถทดแทนการตรวจวินิจฉัยโดยแพทย์ได้ ดังนั้น หากท่านมีความเสี่ยงหรือมีข้อสงสัยหรือได้รับคำแนะนำให้พบแพทย์เพื่อรับการตรวจวินิจฉัยเพิ่มเติม ควรพบแพทย์เพื่อรับการปรึกษาเพิ่มเติมต่อไป
    </div>
  </div>
  `
      : ''
    }
</body>
</html>
  `;
}

// ✅ API Route Handler
export async function GET(
  req: NextRequest,
  context: { params: Promise<{ userDocId: string }> }
) {
  try {
    const params = await context.params;
    const { userDocId } = params;
    const { searchParams } = new URL(req.url);
    const recordId = searchParams.get('record_id');

    if (!recordId) {
      return NextResponse.json({ error: 'กรุณาระบุ record_id' }, { status: 400 });
    }

    const isNumericId = /^[0-9]+$/.test(userDocId);
    const collectionName = isNumericId ? 'temps' : 'users';

    // ดึงข้อมูล user
    const userDoc = await adminDb.collection(collectionName).doc(userDocId).get();
    if (!userDoc.exists) {
      return NextResponse.json(
        { error: `User not found in ${collectionName}: ${userDocId}` },
        { status: 404 }
      );
    }

    const userData = userDoc.data();

    // ดึงข้อมูล record
    const recordDoc = await adminDb
      .collection(collectionName)
      .doc(userDocId)
      .collection('records')
      .doc(recordId)
      .get();

    if (!recordDoc.exists) {
      return NextResponse.json({ error: `Record not found: ${recordId}` }, { status: 404 });
    }

    const recordData = await processRecordData(recordDoc);
    const rawRecordData = recordDoc.data();

    // console.log("tremorpostural DATA:", recordData.tremorpostural?.data);
    // console.log("balance DATA:", recordData.balance?.data);
    // console.log("gaitwalk DATA:", recordData.gaitwalk?.data);

    // ข้อมูลสำหรับ PDF
    const info = {
      name: `${userData?.firstName || ''} ${userData?.lastName || ''}`.trim() || 'ไม่ระบุ',
      age: calculateAgeFromBod(userData?.bod)?.toString() || null,
      date:
        rawRecordData?.createdAt instanceof Timestamp
          ? rawRecordData.createdAt.toDate().toISOString()
          : new Date().toISOString(),
    };

    // สร้าง HTML
    const html = generateHTML(userData, recordData, info);

    // สร้าง PDF ด้วย Playwright
    const browser = await playwright.chromium.launch({
      args: chromium.args,
      executablePath: process.env.VERCEL ? await chromium.executablePath() : undefined,
      headless: true,
    });

    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle' });
    const pdfBuffer = await page.pdf({ format: 'A4' });
    await browser.close();

    // console.log("balanceFrequency:", balanceFrequency);
    // console.log("gaitFrequency:", gaitFrequency);

    return new Response(Buffer.from(pdfBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename*=UTF-8''${encodeURIComponent(
          `report_${userDocId}_${recordId}.pdf`
        )}`,
      },
    });
  } catch (err: any) {
    console.error('❌ PDF generation error:', err);
    return NextResponse.json(
      { error: 'เกิดข้อผิดพลาดขณะสร้าง PDF', details: err.message || err.toString() },
      { status: 500 }
    );

  }
}
