// app/api/generate-pdf/route.ts
import { NextRequest, NextResponse } from "next/server";
import path from "path";
import fs from "fs";
import playwright from "playwright-core";
import chromium from "@sparticuz/chromium";
import { supabaseServer as supabase } from "@/lib/supabase-server";

export const runtime = "nodejs"; // ต้องใช้ Node.js runtime (ไม่ใช่ Edge)


// โหลดฟอนต์ THSarabun จากไฟล์ในโปรเจกต์ (เก็บใน /public หรือ /fonts ก็ได้)
const fontPath = path.join(process.cwd(), "fonts", "thsarabunnew-webfont.woff");
let fontBase64 = "";
try {
  fontBase64 = fs.readFileSync(fontPath).toString("base64");
} catch (err) {
  console.error("❌ โหลดฟอนต์ไม่สำเร็จ:", err);
}

export async function GET(req: NextRequest) {
  try {
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

    // ขั้นตอนใหม่: ดึงข้อมูลจากตาราง risk_factors_test โดยใช้ thaiid ที่ได้จากข้อมูล person
    const { data: riskFactorsData, error: riskFactorsError } = await supabase
        .from("risk_factors_test")
        .select("*")
        .eq("thaiid", person.thaiid); // ใช้ค่า thaiid ที่ดึงมาแล้วจาก person

    if (riskFactorsError || !riskFactorsData || riskFactorsData.length === 0) {
        return NextResponse.json({ error: "ไม่พบข้อมูล risk_factors_test สำหรับ thaiid: " + person.thaiid }, { status: 404 });
    }

    const riskFactors = riskFactorsData[0]

    const isPD = person.condition === 'PD';
    const isProdromal = person.condition === 'Prodromal';
    const isHealthy = person.condition === 'Control';
    const isOther = person.condition === 'Other diagnosis';

    const pdCheckbox = isPD ? '&#10003;' : '';
    const pdCheckedClass = isPD ? ' checked' : '';

    const prodromalCheckbox = isProdromal ? '&#10003;' : '';
    const prodromalCheckedClass = isProdromal ? ' checked' : '';

    const healthyCheckbox = isHealthy ? '&#10003;' : '';
    const healthyCheckedClass = isHealthy ? ' checked' : '';

    const otherCheckbox = isOther ? '&#10003;' : '';
    const otherCheckedClass = isOther ? ' checked' : '';

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
          
          margin-top: 0.3rem;
        }
        .checkbox {
            display: inline-block;
            width: 10px;
            height: 10px;
            border: 1px solid #000;
            margin-right: 5px;
            vertical-align: top;
            margin-top: 1px;
            line-height: 10px;
        }
        .checkbox.checked {
            background-color: #fff;
            color: #000;
            font-size: 20px; 
            line-height: 10px;
        }
        .field {
          border-bottom: 1px dotted #000;
          display: inline-block;
          min-width: 80px;
          padding: 0 3px;
          margin: 0 2px;
          text-align: center;
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

        .numbered-item-2 {
          margin: 4px 0;
          margin-bottom: 2.5rem;
          
        }

      </style>
    </head>
    <body>
      <!-- Page 1 -->
      <h2>Data sheet for high risk or suspected Prodromal PD and PD </h2>
      <h2>(Check PD: National Screening Project)</h2>

      <div class="section">
        <div><span class="checkbox${pdCheckedClass}">${pdCheckbox}</span><strong>PD</strong></div>
        <div class="indent"><span class="checkbox"></span> Newly diagnosis</div>
        <div class="indent"><span class="checkbox"></span> PD </div>
        <div class="indent2"><span class="checkbox"></span> Disease duration <span class="field"></span> years</div>
        <div class="indent2"><span class="checkbox"></span> H&Y <span class="field"></span></div>
      </div>

      <div class="section">
        <div><span class="checkbox${prodromalCheckedClass}">${prodromalCheckbox}</span><strong> Prodromal / High risk </strong> กรณีมีข้อใดข้อหนึ่งดังต่อไปนี้ </div>
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
          <span class="checkbox"></span>อายุที่เริ่มมีอาการจมูกได้กลิ่นลดลง<span class="field"></span> ปี
        </div>
      </div>

      <div class="indent">
        <div class="section"> หรือ มีอาการนำ อย่างน้อย 2 ข้อจากอาการดังต่อไปนี้</div>
        
        <div class="indent">
          <span class="checkbox"></span>Constipation: History ถ่ายอุจจาระ ความถี่นานกว่าวันเว้นวัน หรือต้องใช้ยาระบาย หรือ ลักษณะอุจจาระแข็งขึ้น เรื้อรังในช่วง 3 เดือนที่ผ่านมา เมื่อเทียบกับก่อนหน้า  or ROME IV >/= 2
        </div>
        <div class="sub-question">
          <span class="checkbox"></span> อายุที่เริ่มมีอาการท้องผูก <span class="field"></span> ปี มีอาการท้องผูกมานานเท่าไหร่ <span class="field"></span> ปี
        </div>

        <div class="indent">
          <span class="checkbox"></span>Depression: ประวัติการได้รับการวินิจฉัยและรักษา หรือ HAM-D ตั้งแต่ 13 คะแนนขึ้นไป
        </div>
        <div class="sub-question">
          <span class="checkbox"></span> อายุที่เริ่มมีอาการซึมเศร้า <span class="field"></span> ปี มีอาการซึมเศร้ามานานเท่าไหร่ <span class="field"></span> ปี
        </div>

        <div class="indent">
          <span class="checkbox"></span>Excessive daytime sleepiness: ง่วงนอนมากผิดปกติในช่วงกลางวัน หรือ ESS ตั้งแต่ 10 คะแนน โดยที่กลางคืนนอนหลับได้ปกติ หรือไม่มีอาการกรนหยุดหายใจ
        </div>
        <div class="sub-question">
          <span class="checkbox"></span> อายุที่เริ่มมีอาการ EDS <span class="field"></span> ปี หรือ มีอาการ EDS มานานเท่าไหร่ <span class="field"></span> ปี
        </div>

        <div class="indent">
          <span class="checkbox"></span>Autonomic dysfunction: มีอาการระบบประสาทอัตโนมัติผิดปกติข้อใดข้อหนึ่ง หน้ามืดหรือเป็นลมหมดสติเวลาเปลี่ยนท่าจากนอนหรือนั่งเป็นยืน, กลั้นปัสสาวะไม่อยู่, อวัยวะเพศไม่แข็งตัว
        </div>
        <div class="sub-question">
          <span class="checkbox"></span> อายุที่เริ่มมีอาการ ANS dysfunction <span class="field"></span>ปี
        </div>

        <div class="indent">
          <span class="checkbox"></span>Mild parkinsonian sign: (UPDRS part III > 3 โดยไม่รวม postural and kinetic tremor หรือ total UPDRS > 6 โดยยังไม่เข้า criteria การวินิจฉัยพาร์กินสัน และไม่นับคะแนนจาก potential confounder เช่นโรคข้อ เป็นต้น) 
        </div>

        <div class="indent">
          <span class="checkbox"></span>Family history of PD (First degree): ประวัติญาติสายตรงเป็นพาร์กินสัน
        </div>
      </div>

      <div class="section">
        <div><span class="checkbox${otherCheckedClass}">${otherCheckbox}</span><strong> Other diagnosis </strong><span class="field" style="min-width: 300px;"> ${person.other || ""} </span></div>
      </div>

      <div class="section">
        <div><span class="checkbox${healthyCheckedClass}">${healthyCheckbox}</span> <strong>Healthy</strong></div>
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
        <div class="numbered-item-2">
          <strong>7. Check PD application</strong>
          <div class="indent"><span class="checkbox"></span> Demographic</div>
          <div class="indent"><span class="checkbox"></span> 20- questions questionnaire</div>
          <div class="indent"><span class="checkbox"></span> Voice analysis</div>
          <div class="indent"><span class="checkbox"></span> Tremor test</div>
          <div class="indent"><span class="checkbox"></span> Finger tapping test</div>
          <div class="indent"><span class="checkbox"></span> Pinch to size test</div>
          <div class="indent"><span class="checkbox"></span> Gait and balance testing</div>
        </div>

        <div class="numbered-item-2">
          <strong>8. MDS UPDRS</strong>
          <div class="indent"><span class="checkbox"></span> Part I <span class="field"></span> คะแนน</div>
          <div class="indent"><span class="checkbox"></span> Part II <span class="field"></span> คะแนน</div>
          <div class="indent"><span class="checkbox"></span> Part III <span class="field"></span> คะแนน</div>
          <div class="indent"><span class="checkbox"></span> Part IV <span class="field"></span> คะแนน</div>
          <div style="margin-top: 10px;">Total MDS-UPDRS <span class="field"></span> คะแนน</div>
        </div>

        <div class="numbered-item-2">
          <strong>9. Cognitive test</strong>
          <div class="indent"><span class="checkbox"></span> MoCA <span class="field">${riskFactors.moca_score || ""}</span> คะแนน or</div>
          <div class="indent"><span class="checkbox"></span> TMSE <span class="field">${riskFactors.tmse_score || ""}</span> คะแนน</div>
        </div>

        <div class="numbered-item-2">
          <strong>10. Smell test</strong>
          <div class="indent"><span class="checkbox"></span> Thai smell test <span class="field"></span> คะแนน or</div>
          <div class="indent"><span class="checkbox"></span> Sniffin stick test <span class="field">${riskFactors.smell_score || ""}</span> คะแนน</div>
        </div>

        <div class="numbered-item-2">
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

        <div class="numbered-item-2">
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
        <div class="numbered-item-2">
          <strong>13. VA</strong>
          <div style="margin-left: 20px;">
            a. Right eye <span class="field"></span>
            <div style="margin-left: 20px; margin-top: 0.5rem; margin-bottom: 0.5rem;">i. Right eye with pin hole <span class="field"></span></div>
            b. Left eye <span class="field"></span>
            <div style="margin-left: 20px; margin-top: 0.5rem; margin-bottom: 0.5rem;">i. Left eye with pin hole <span class="field"></span></div>
          </div>
        </div>

        <div class="numbered-item-2">
          <strong>14. Sleep domain</strong>
          <div class="indent"><span class="checkbox"></span> RBD Questionnaire <span class="field">${riskFactors.sleep_score || ""}</span> คะแนน</div>
          <div class="indent"><span class="checkbox"></span> Epworth Sleepiness Scale <span class="field">${riskFactors.epworth_score || ""}</span> คะแนน</div>
          <div class="indent">
            <span class="checkbox"></span> Further PSG (RBD montage) request
            <div style="margin-left: 40px; margin-top: 0.5rem;">
              <span class="checkbox"></span> Yes at <span class="field"></span> <span class="checkbox"></span> No
            </div>
          </div>
        </div>

        <div class="numbered-item-2">
          <strong>15. Behavioral/ psychiatric domain</strong>
          <div class="indent"><span class="checkbox"></span> HAM-D <span class="field">${riskFactors.hamd_score || ""}</span> คะแนน</div>
        </div>

        <div class="numbered-item-2">
          <strong>16. Constipation</strong>
          <div class="indent"><span class="checkbox"></span> ROME IV <span class="field">${riskFactors.rome4_score || ""}</span> คะแนน</div>
        </div>

        <div class="numbered-item-2">
          <strong>17. ADLs Questionnaire</strong> <span class="field"></span> คะแนน
        </div>

        <div class="numbered-item-2">
          <strong>18. SCOPA AUT</strong> <span class="field"></span> คะแนน
        </div>

        <div class="numbered-item-2">
          <strong>19. Blood test</strong>
          <div class="indent"><span class="checkbox"></span> Genetic test: GP2</div>
          <div class="indent"><span class="checkbox"></span> +/- เก็บเลือดไว้ก่อน further blood test เช่น Serum RT-QuIC</div>
        </div>

        <div class="numbered-item-2">
          <strong>20. Further FDOPA PET scan request</strong>
          <div class="indent">
            <span class="checkbox"></span> Yes at <span class="field"></span> <span class="checkbox"></span> No
          </div>
        </div>
      </div>
    </body>
  </html>
  `;

    // ใช้ playwright-core + @sparticuz/chromium สำหรับ Vercel
    const browser = await playwright.chromium.launch({
      args: chromium.args,
      executablePath: process.env.VERCEL
        ? await chromium.executablePath() // ใช้ sparticuz บน Vercel
        : undefined, // local ให้ใช้ chromium ที่ติดมากับ Playwright
      headless: true,
});


    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle" });
    const pdfBuffer = await page.pdf({ format: "A4" });
    await browser.close();

    return new Response(Buffer.from(pdfBuffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename*=UTF-8''${encodeURIComponent(
          `${thaiid}_${person.first_name}_${person.last_name}.pdf`
        )}`,
      },
    });
  } catch (err: any) {
    console.error("❌ PDF generation error:", err);
    return NextResponse.json(
      { error: "เกิดข้อผิดพลาดขณะสร้าง PDF", details: err.message || err.toString() },
      { status: 500 }
    );
  }
}