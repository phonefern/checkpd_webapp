// app/api/generate-pdf/route.ts
import { NextRequest, NextResponse } from "next/server";
import puppeteer from "puppeteer";
import fs from "fs";
import path from "path";
import { supabaseServer as supabase } from "@/lib/supabase-server";

// โหลดฟอนต์ THSarabun จากไฟล์ในโปรเจกต์ (เก็บใน /public หรือ /fonts ก็ได้)
const fontPath = path.join(process.cwd(), "fonts", "thsarabunnew-webfont.woff");
const fontBase64 = fs.readFileSync(fontPath).toString("base64");

export async function GET(req: NextRequest) {
  const thaiid = req.nextUrl.searchParams.get("thaiid");
  if (!thaiid) {
    return NextResponse.json({ error: "กรุณาระบุ thaiid" }, { status: 400 });
  }

  // ดึงข้อมูลจาก Supabase
  const { data, error } = await supabase
    .from("pd_screenings")
    .select("*")
    .eq("thaiid", thaiid);

  if (error || !data || data.length === 0) {
    return NextResponse.json({ error: "ไม่พบข้อมูลสำหรับ thaiid: " + thaiid }, { status: 404 });
  }

  const person = data[0];

  // HTML Template
  const html = `
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
        @page {
          size: A4;
          margin: 30px;
        }
        body {
          font-family: 'THSarabunPSK', Arial, sans-serif;
          font-size: 15px;
          line-height: 1.4;
          margin: 0;
          padding: 0;
        }
        h2 {
          text-align: center;
          margin: 10px 0 5px 0;
          font-size: 16px;
          font-weight: bold;
        }
        .center {
          text-align: center;
          margin: 5px 0 15px 0;
        }
        .section {
          margin: 4px 0;
          margin-top: 1px;
        }
        .checkbox {
          display: inline-block;
          width: 10px;
          height: 10px;
          border: 1px solid #000;
          margin-right: 5px;
          vertical-align: top;
          margin-top: 1px;
        }
        .field {
          border-bottom: 1px dotted #000;
          display: inline-block;
          min-width: 80px;
          padding: 0 3px;
          margin: 0 2px;
        }
        .indent {
        margin-left: 40px;
        padding-top: 6px;
        }
        .indent2 {
          margin-left: 80px;
          padding-top: 6px;

        }
        .page-break {
          page-break-before: always;
        }
        .small-text {
          font-size: 11px;
        }
        .underline {
          text-decoration: underline;
        }
        .italic {
          font-style: italic;
        }
        .question-group {
          margin: 10px 0;
        }
        .sub-question {
          margin-left: 80px;
          padding-top: 6px;
          
        }
        .numbered-item {
          margin: 8px 0;
        }
      </style>
    </head>
    <body>
      <!-- Page 1 -->
      <h2>Data sheet for high risk or suspected Prodromal PD and PD</h2>
      <h2>(Check PD: National Screening Project)</h2>

      <div class="section">
        <div><span class="checkbox"></span>PD</div>
        <div class="indent"><span class="checkbox"></span> Newly diagnosis</div>
        <div class="indent"><span class="checkbox"></span> PD</div>
        <div class="indent2"><span class="checkbox"></span> Disease duration <span class="field"></span> years</div>
        <div class="indent2"><span class="checkbox"></span> H&Y <span class="field"></span></div>
      </div>

      <div class="section">
        <div><span class="checkbox"></span> Prodromal / High risk กรณีที่ได้ผลจึงจึ่งคัดกรอง</div>
        <div class="indent">
          <span class="checkbox"></span> <span>Suspected RBD</span>: History of acting out of dream or vocalization or RBDQ >/= 17 or PSG confirmed
        </div>
        <div class="sub-question">
          <span class="checkbox"></span> อายุที่เริ่มมีอาการของนอนละเมอ <span class="field"></span> ปี
        </div>
        <div class="indent">
          <span class="checkbox"></span> <span>Hyposmia</span>: History ได้กลิ่นลืนลดลง และ Sniffin' stick </= 9 ปี
        </div>
        <div class="indent">
          <span class="checkbox"></span>อายุที่เริ่มมีอาการของได้กลิ่นลืนลดลง <span class="field"></span> 
        </div>
      </div>

      <div class="indent">
        <div class="section">หรือ มีอาการนำ อย่างน้อย 2 ข้อจากอาการดังต่อไปนี้</div>
        
        <div class="indent">
          <span class="checkbox"></span>Constipation: History ถ่ายอุจจาระ ความถี่น้อยกว่าวันเว้นวัน หรือต้องเกี่ยมีผ้าใยอีกเก่า หรือ ลักษณะอุจจาระแข็งเม่าแปง เรื่อยใสง่วง 3 เดือนที่ผ่านมา เมื่อแต่งอุปกรณ์ก่อนหมา or ROME IV >/= 2
        </div>
        <div class="sub-question">
          <span class="checkbox"></span> อายุที่เริ่มมีอาการท้องผูก <span class="field"></span> ปี มีอาการท้องผูกมานานเท่าไหร่ <span class="field"></span> ปี
        </div>

        <div class="indent">
          <span class="checkbox"></span>Depression: ประวัติการได้รับการวิเคราะ์อ่อยละธีมา หรือ HAM-D คะแนน 13 คะแนนขึ้นไป
        </div>
        <div class="sub-question">
          <span class="checkbox"></span> อายุที่เริ่มมีอาการซึมเศร้า <span class="field"></span> ปี มีอาการซึมเศร้ามานานเท่าไหร่ <span class="field"></span> ปี
        </div>

        <div class="indent">
          <span class="checkbox"></span>Excessive daytime sleepiness: ง่วงนอนมากผิดปกติในวางกลางวัน หรือ ESS คะแนน 10 คะแนน ขึ้นไป กรณีที่ถ้าบ่ได้นอนหลับเพียงพอในขณะกลางดือ
        </div>
        <div class="sub-question">
          <span class="checkbox"></span> อายุที่เริ่มมีอาการ EDS <span class="field"></span> ปี หรือ มีอาการ EDS มานานเท่าไหร่ <span class="field"></span> ปี
        </div>

        <div class="indent">
          <span class="checkbox"></span>Autonomic dysfunction: มีอาการระบบประสาทตัดแบไม่มีส่วนควบคุมได้องการฟ้อง หน้าบ่ามีดทลอลเป็นอีกมอนาเคลเชียลน่ามออนท่าพื้น กล่อยีสามารถไม่ดี อ่อยๆแพงโน่นไว้ม่าดำ
        </div>
        <div class="sub-question">
          <span class="checkbox"></span> อายุที่เริ่มมีอาการ ANS dysfunction <span class="field"></span>ปี หรือมีอาการ ANS dysfunction มานานเท่าไหร่ <span class="field"></span>ปี
        </div>

        <div class="indent">
          <span class="checkbox"></span>Mild parkinsonian sign: (UPDRS part III > 3 โดยไม่รวม postural and kinetic tremor หรือ total UPDRS > 6 โดยยังไม่เข้า criteria การวินิจฉัยมีการกันล และไม่มีนำคำแบบบางจาก potential confounder เช่นไปรดั้อง เป็นต้น)
        </div>

        <div class="indent">
          <span class="checkbox"></span>Family history of PD (First degree): ประวัตินุญลบิศปยกรรมเป็นมาก่พินติ้น
        </div>
      </div>

      <div class="section">
        <div><span class="checkbox"></span> Other diagnosis <span class="field" style="min-width: 300px;"></span></div>
      </div>

      <div class="section">
        <div><span class="checkbox"></span> Healthy</div>
      </div>

      <div class="numbered-item">
        <strong>1.</strong> ชื่อ <span class="field">${person.first_name || ""}</span> นามสกุล <span class="field">${person.last_name || ""}</span>
      </div>

      <div class="numbered-item">
        <strong>2.</strong> อายุ <span class="field">${person.age || ""}</span> ปี
      </div>

      <div class="numbered-item">
        <strong>3.</strong> จังหวัด <span class="field">${person.province || ""}</span>
      </div>

      <div class="numbered-item">
        <strong>4.</strong> วันที่เก็บข้อมูล <span class="field">${person.collection_date || ""}</span>
      </div>

      <div class="numbered-item">
        <strong>5.</strong> HN (for KCMH patients) <span class="field">${person.hn_number || ""}</span>
      </div>

      <div class="numbered-item">
        <strong>6.</strong> น้ำหนัก <span class="field">${person.weight || ""}</span> กิโลกรัม, ส่วนสูง <span class="field">${person.height || ""}</span> เซนติเมตร, BMI <span class="field">${person.bmi || ""}</span> Kg/m²
      </div>

      <div class="section">
        รอบอก <span class="field">${person.chest || ""}</span> ซม. รอบเอว <span class="field">${person.waist || ""}</span> ซม. รอบคอ <span class="field">${person.neck || ""}</span> ซม. รอบสะโพก <span class="field">${person.hip || ""}</span> ซม.
      </div>

      <div class="section">
        ความดันโลหิต หลังนอน 3 นาที BP Supine <span class="field">${person.bp_supine || ""}</span> mmHg PR <span class="field">${person.pr_supine || ""}</span>/min
      </div>

      <div class="section">
        ความดันโลหิต หลังยืน 3 นาที BP Upright 3 min <span class="field">${person.bp_upright || ""}</span> mmHg PR <span class="field">${person.pr_upright || ""}</span>/min
      </div>

      <!-- Page 2 -->
      <div class="page-break">
        <div class="numbered-item">
          <strong>7. Check PD application</strong>
          <div class="indent"><span class="checkbox"></span> Demographic</div>
          <div class="indent"><span class="checkbox"></span> 20- questions questionnaire</div>
          <div class="indent"><span class="checkbox"></span> Voice analysis</div>
          <div class="indent"><span class="checkbox"></span> Tremor test</div>
          <div class="indent"><span class="checkbox"></span> Finger tapping test</div>
          <div class="indent"><span class="checkbox"></span> Pinch to size test</div>
          <div class="indent"><span class="checkbox"></span> Gait and balance testing</div>
        </div>

        <div class="numbered-item">
          <strong>8. MDS UPDRS</strong>
          <div class="indent"><span class="checkbox"></span> Part I <span class="field"></span> คะแนน</div>
          <div class="indent"><span class="checkbox"></span> Part II <span class="field"></span> คะแนน</div>
          <div class="indent"><span class="checkbox"></span> Part III <span class="field"></span> คะแนน</div>
          <div class="indent"><span class="checkbox"></span> Part IV <span class="field"></span> คะแนน</div>
          <div style="margin-top: 10px;">Total MDS-UPDRS <span class="field"></span> คะแนน</div>
        </div>

        <div class="numbered-item">
          <strong>9. Cognitive test</strong>
          <div class="indent"><span class="checkbox"></span> MoCA <span class="field"></span> คะแนน or</div>
          <div class="indent"><span class="checkbox"></span> TMSE <span class="field"></span> คะแนน</div>
        </div>

        <div class="numbered-item">
          <strong>10. Smell test</strong>
          <div class="indent"><span class="checkbox"></span> Thai smell test <span class="field"></span> คะแนน or</div>
          <div class="indent"><span class="checkbox"></span> Sniffin stick test <span class="field"></span> คะแนน</div>
        </div>

        <div class="numbered-item">
          <strong>11. Color discrimination testing</strong>
          <div class="indent">
            <span class="checkbox"></span> Yes (Paper)
            <div style="margin-left: 40px;">
              Right eye 1 <span class="field"></span> คะแนน &nbsp;&nbsp;&nbsp; Right eye 2 <span class="field"></span> คะแนน<br>
              Left eye 1 <span class="field"></span> คะแนน &nbsp;&nbsp;&nbsp;&nbsp; Left eye 2 <span class="field"></span> คะแนน
            </div>
          </div>
          <div class="indent">
            <span class="checkbox"></span> Yes (Application)
            <div style="margin-left: 40px;">
              Right eye 1 <span class="field"></span> คะแนน &nbsp;&nbsp;&nbsp; Right eye 2 <span class="field"></span> คะแนน<br>
              Left eye 1 <span class="field"></span> คะแนน &nbsp;&nbsp;&nbsp;&nbsp; Left eye 2 <span class="field"></span> คะแนน
            </div>
          </div>
          <div class="indent"><span class="checkbox"></span> No</div>
        </div>

        <div class="numbered-item">
          <strong>12. Contrast discrimination testing</strong>
          <div class="indent">
            <span class="checkbox"></span> Yes (Manual)
            <div style="margin-left: 40px;">
              Right eye <span class="field"></span> คะแนน &nbsp;&nbsp;&nbsp; Left eye <span class="field"></span> คะแนน
            </div>
          </div>
          <div class="indent">
            <span class="checkbox"></span> Yes (Application)
            <div style="margin-left: 40px;">
              Right eye <span class="field"></span> คะแนน &nbsp;&nbsp;&nbsp; Left eye <span class="field"></span> คะแนน
            </div>
          </div>
          <div class="indent"><span class="checkbox"></span> No</div>
        </div>
      </div>

      <!-- Page 3 -->
      <div class="page-break">
        <div class="numbered-item">
          <strong>13. VA</strong>
          <div style="margin-left: 20px;">
            a. Right eye <span class="field"></span>
            <div style="margin-left: 20px;">i. Right eye with pin hole <span class="field"></span></div>
            b. Left eye <span class="field"></span>
            <div style="margin-left: 20px;">i. Left eye with pin hole <span class="field"></span></div>
          </div>
        </div>

        <div class="numbered-item">
          <strong>14. Sleep domain</strong>
          <div class="indent"><span class="checkbox"></span> RBD Questionnaire <span class="field"></span> คะแนน</div>
          <div class="indent"><span class="checkbox"></span> Epworth Sleepiness Scale <span class="field"></span> คะแนน</div>
          <div class="indent">
            <span class="checkbox"></span> Further PSG (RBD montage) request
            <div style="margin-left: 40px;">
              <span class="checkbox"></span> Yes at <span class="field"></span> <span class="checkbox"></span> No
            </div>
          </div>
        </div>

        <div class="numbered-item">
          <strong>15. Behavioral/ psychiatric domain</strong>
          <div class="indent"><span class="checkbox"></span> HAM-D <span class="field"></span> คะแนน</div>
        </div>

        <div class="numbered-item">
          <strong>16. Constipation</strong>
          <div class="indent"><span class="checkbox"></span> ROME IV <span class="field"></span> คะแนน</div>
        </div>

        <div class="numbered-item">
          <strong>17. ADLs Questionnaire</strong> <span class="field"></span> คะแนน
        </div>

        <div class="numbered-item">
          <strong>18. SCOPA AUT</strong> <span class="field"></span> คะแนน
        </div>

        <div class="numbered-item">
          <strong>19. Blood test</strong>
          <div class="indent"><span class="checkbox"></span> Genetic test: GP2</div>
          <div class="indent"><span class="checkbox"></span> +/- เก็บเลือดไว้ก่อน further blood test เช่น Serum RT-QuIC</div>
        </div>

        <div class="numbered-item">
          <strong>20. Further FDOPA PET scan request</strong>
          <div class="indent">
            <span class="checkbox"></span> Yes at <span class="field"></span> <span class="checkbox"></span> No
          </div>
        </div>
      </div>
    </body>
  </html>
  `;

  // แปลง HTML → PDF
  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });
  const page = await browser.newPage();
  await page.setContent(html, { waitUntil: "networkidle0" });
  const pdfBuffer = await page.pdf({ 
    format: "A4", 
    printBackground: true,
    margin: {
      top: '30px',
      right: '30px',
      bottom: '30px',
      left: '30px'
    }
  });
  await browser.close();

  return new Response(Buffer.from(pdfBuffer), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${thaiid}.pdf"`,
    },
  });
}