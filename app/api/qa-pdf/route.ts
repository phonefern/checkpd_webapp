import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import path from 'path'
import fs from 'fs'
import { getBrowser, resetBrowser } from '@/lib/pdfBrowser'
import { checkRateLimit, getClientIdentifier } from '@/lib/rateLimit'

export const runtime = 'nodejs'

const PDF_RATE_LIMIT = 15
const PDF_RATE_WINDOW_MS = 60 * 1000

const DIAG_SELECT =
  'patient_id,condition,hy_stage,disease_duration,other_diagnosis_text,constipation,constipation_onset_age,constipation_duration,rbd_suspected,rbd_onset_age,rbd_duration,hyposmia,hyposmia_onset_age,hyposmia_duration,depression,depression_onset_age,depression_duration,eds,eds_onset_age,eds_duration,ans_dysfunction,ans_onset_age,ans_duration,adl_score,scopa_aut_score,blood_test_note,fdopa_pet_requested,fdopa_pet_score'

const fontPath = path.join(process.cwd(), 'fonts', 'thsarabunnew-webfont.woff')
let fontBase64 = ''
try {
  fontBase64 = fs.readFileSync(fontPath).toString('base64')
} catch (err) {
  console.error('Failed to load TH Sarabun font:', err)
}

const cb = (checked: boolean) =>
  checked
    ? '<span class="checkbox checked">✓</span>'
    : '<span class="checkbox"></span>'

const field = (value: string | number | null | undefined, minWidth = 80) =>
  `<span class="field" style="min-width:${minWidth}px">${value ?? ''}</span>`

const yesNo = (value: boolean | null | undefined) => ({
  yes: Boolean(value),
  no: value === false,
})

const normalize = (value: string | null | undefined) => (value ?? '').toLowerCase().trim()

export async function GET(req: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies })

    const id = getClientIdentifier(req)
    const { ok, resetAt } = checkRateLimit(id, PDF_RATE_LIMIT, PDF_RATE_WINDOW_MS)
    if (!ok) {
      return NextResponse.json(
        { error: 'เกินจำนวนการขอ PDF ต่อนาที กรุณาลองใหม่ภายหลัง' },
        { status: 429, headers: { 'X-RateLimit-Reset': String(resetAt), 'Retry-After': '60' } }
      )
    }

    const patientIdParam = req.nextUrl.searchParams.get('patient_id')
    if (!patientIdParam) {
      return NextResponse.json({ error: 'กรุณาระบุ patient_id' }, { status: 400 })
    }

    const patientId = Number(patientIdParam)
    if (Number.isNaN(patientId)) {
      return NextResponse.json({ error: 'patient_id ต้องเป็นตัวเลข' }, { status: 400 })
    }

    const [
      patientRes,
      diagRes,
      mocaRes,
      hamdRes,
      mdsRes,
      epwRes,
      smellRes,
      tmseRes,
      rbdRes,
      rome4Res,
      visionRes,
    ] = await Promise.all([
      supabase
        .schema('core')
        .from('patients_v2')
        .select('id,first_name,last_name,age,province,collection_date,hn_number,thaiid,bmi,weight,height,chest_cm,waist_cm,hip_cm,neck_cm,bp_supine,pr_supine,bp_upright,pr_upright')
        .eq('id', patientId)
        .maybeSingle(),
      supabase.schema('core').from('patient_diagnosis_v2').select(DIAG_SELECT).eq('patient_id', patientId).maybeSingle(),
      supabase.schema('core').from('moca_v2').select('total_score').eq('patient_id', patientId).maybeSingle(),
      supabase.schema('core').from('hamd_v2').select('total_score,severity_level').eq('patient_id', patientId).maybeSingle(),
      supabase.schema('core').from('mds_updrs_v2').select('p1_total,p2_total,p3_total,p4_total,total_score').eq('patient_id', patientId).maybeSingle(),
      supabase.schema('core').from('epworth_v2').select('total_score').eq('patient_id', patientId).maybeSingle(),
      supabase.schema('core').from('smell_test_v2').select('test_type,total_score').eq('patient_id', patientId).maybeSingle(),
      supabase.schema('core').from('tmse_v2').select('total_score').eq('patient_id', patientId).maybeSingle(),
      supabase.schema('core').from('rbd_questionnaire_v2').select('total_score').eq('patient_id', patientId).maybeSingle(),
      supabase.schema('core').from('rome4_v2').select('total_score').eq('patient_id', patientId).maybeSingle(),
      supabase
        .schema('core')
        .from('vision_tests_v2')
        .select('color_paper_re_test,color_paper_re_retest,color_paper_le_test,color_paper_le_retest,color_app_re_test,color_app_re_retest,color_app_le_test,color_app_le_retest,contrast_manual_re,contrast_manual_le,contrast_app_re,contrast_app_le,va_re,va_re_pinhole,va_le,va_le_pinhole')
        .eq('patient_id', patientId)
        .maybeSingle(),
    ])

    const errors = [patientRes, diagRes, mocaRes, hamdRes, mdsRes, epwRes, smellRes, tmseRes, rbdRes, rome4Res, visionRes]
      .map((r) => r.error)
      .filter(Boolean)

    if (errors.length > 0) {
      return NextResponse.json(
        { error: 'ไม่สามารถดึงข้อมูลจาก core schema ได้', details: errors.map((e) => e?.message ?? String(e)).join('; ') },
        { status: 500 }
      )
    }

    if (!patientRes.data) {
      return NextResponse.json({ error: `ไม่พบข้อมูล patient_id: ${patientId}` }, { status: 404 })
    }

    const p = patientRes.data
    const diag = diagRes.data
    const moca = mocaRes.data
    const hamd = hamdRes.data
    const mds = mdsRes.data
    const epw = epwRes.data
    const smell = smellRes.data
    const tmse = tmseRes.data
    const rbd = rbdRes.data
    const rome4 = rome4Res.data
    const vision = visionRes.data

    const conditionRaw = normalize(diag?.condition)
    const isNewlyDiagnosis = conditionRaw.includes('newly')
    const isPD = conditionRaw.includes('pd') || conditionRaw.includes('parkinson')
    const isProdromal = conditionRaw.includes('prodromal') || conditionRaw.includes('high risk') || conditionRaw.includes('high-risk')
    const isHealthy = conditionRaw.includes('healthy') || conditionRaw.includes('control')
    const isNormal = conditionRaw.includes('normal') && !isPD && !isProdromal
    const isOther = !isPD && !isProdromal && !isHealthy && !isNormal

    const otherText = isOther
      ? (diag?.other_diagnosis_text ?? diag?.condition ?? '')
      : (diag?.other_diagnosis_text ?? '')

    const smellIsThai = smell?.test_type === 'thai_smell_test'
    const smellIsSniffin = smell?.test_type === 'sniffin_stick' || (!!smell?.total_score && !smellIsThai)
    const colorPaperDone = Boolean(vision?.color_paper_re_test || vision?.color_paper_re_retest || vision?.color_paper_le_test || vision?.color_paper_le_retest)
    const colorAppDone = Boolean(vision?.color_app_re_test || vision?.color_app_re_retest || vision?.color_app_le_test || vision?.color_app_le_retest)
    const contrastManualDone = Boolean(vision?.contrast_manual_re || vision?.contrast_manual_le)
    const contrastAppDone = Boolean(vision?.contrast_app_re || vision?.contrast_app_le)
    const vaDone = Boolean(vision?.va_re || vision?.va_le || vision?.va_re_pinhole || vision?.va_le_pinhole)

    const fdopa = yesNo(diag?.fdopa_pet_requested)
    const psgRequested = yesNo(diag?.rbd_suspected)

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
      @page { size: A4; margin: 30px; }
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
      .section { margin: 4px 0; margin-top: 0.3rem; }
      .checkbox {
        display: inline-block;
        width: 12px;
        height: 12px;
        border: 1px solid #000;
        margin-right: 5px;
        vertical-align: middle;
        text-align: center;
        line-height: 12px;
        position: relative;
        font-family: Arial, 'DejaVu Sans', sans-serif;
        font-size: 10px;
      }
      .checkbox.checked {
        font-family: Arial, 'DejaVu Sans', sans-serif;
        font-weight: bold;
        color: #000;
        font-size: 11px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
      }
      .field {
        border-bottom: 1px dotted #000;
        display: inline-block;
        min-width: 80px;
        padding: 0 3px;
        margin: 0 2px;
        text-align: center;
      }
      .indent { margin-left: 40px; padding-top: 6px; }
      .indent2 { margin-left: 80px; padding-top: 6px; }
      .sub-question { margin-left: 80px; padding-top: 6px; }
      .numbered-item { margin: 8px 0; }
      .numbered-item-2 { margin: 4px 0; margin-bottom: 2.5rem; }
      .page-break { page-break-before: always; }
    </style>
  </head>
  <body>
    <h2>Data sheet for high risk or suspected Prodromal PD and PD</h2>
    <h2>(Check PD: National Screening Project)</h2>
    <div class="section">
      ${cb(isPD)}<strong>PD</strong>
      <div class="indent">${cb(isNewlyDiagnosis)} Newly diagnosis</div>
      <div class="indent">${cb(isPD)} PD</div>
      <div class="indent2">${cb(!!diag?.disease_duration)} Disease duration ${field(diag?.disease_duration)} years</div>
      <div class="indent2">${cb(!!diag?.hy_stage)} H&amp;Y ${field(diag?.hy_stage)}</div>
    </div>

    <div class="section">
      <div>${cb(isProdromal)}<strong> Prodromal / High risk </strong> กรณีมีข้อใดข้อหนึ่งดังต่อไปนี้</div>
      <div class="indent">
        ${cb(!!diag?.rbd_suspected)} <strong>Suspected RBD</strong>: History of acting out of dream or vocalization or RBDQ &gt;= 17 or PSG confirmed
      </div>
      <div class="sub-question">
        ${cb(!!diag?.rbd_suspected)} อายุที่เริ่มมีอาการของนอนละเมอ ${field(diag?.rbd_onset_age)} ปี หรือ มีอาการมานานเท่าไหร่ ${field(diag?.rbd_duration)} ปี
      </div>
      <div class="indent">
        ${cb(!!diag?.hyposmia)} <strong>Hyposmia</strong>: History ได้กลิ่นลดลง Sniffin stick &lt;= 9
      </div>
      <div class="sub-question">
        ${cb(!!diag?.hyposmia)} อายุที่เริ่มมีอาการจมูกได้กลิ่นลดลง ${field(diag?.hyposmia_onset_age)} ปี หรือ มีอาการมานานเท่าไหร่ ${field(diag?.hyposmia_duration)} ปี
      </div>
    </div>

    <div class="indent">
      <div class="section">หรือ มีอาการนำ อย่างน้อย 2 ข้อจากอาการดังต่อไปนี้</div>
      <div class="indent">
        ${cb(!!diag?.constipation)} <strong>Constipation</strong>: History ถ่ายอุจจาระ ความถี่นานกว่าวันเว้นวัน หรือต้องใช้ยาระบาย หรือ ลักษณะอุจจาระแข็งขึ้น เรื้อรังในช่วง 3 เดือนที่ผ่านมา เมื่อเทียบกับก่อนหน้า or ROME IV &gt;= 2
      </div>
      <div class="sub-question">
        ${cb(!!diag?.constipation)} อายุที่เริ่มมีอาการท้องผูก ${field(diag?.constipation_onset_age)} ปี มีอาการท้องผูกมานานเท่าไหร่ ${field(diag?.constipation_duration)} ปี
      </div>
      <div class="indent">
        ${cb(!!diag?.depression)} <strong>Depression</strong>: ประวัติการได้รับการวินิจฉัยและรักษา หรือ HAM-D ตั้งแต่ 13 คะแนนขึ้นไป
      </div>
      <div class="sub-question">
        ${cb(!!diag?.depression)} อายุที่เริ่มมีอาการซึมเศร้า ${field(diag?.depression_onset_age)} ปี มีอาการซึมเศร้ามานานเท่าไหร่ ${field(diag?.depression_duration)} ปี
      </div>
      <div class="indent">
        ${cb(!!diag?.eds)} <strong>Excessive daytime sleepiness</strong>: ง่วงนอนมากผิดปกติในช่วงกลางวัน หรือ ESS ตั้งแต่ 10 คะแนน
      </div>
      <div class="sub-question">
        ${cb(!!diag?.eds)} อายุที่เริ่มมีอาการ EDS ${field(diag?.eds_onset_age)} ปี หรือ มีอาการ EDS มานานเท่าไหร่ ${field(diag?.eds_duration)} ปี
      </div>
      <div class="indent">
        ${cb(!!diag?.ans_dysfunction)} <strong>Autonomic dysfunction</strong>: มีอาการระบบประสาทอัตโนมัติผิดปกติข้อใดข้อหนึ่ง
      </div>
      <div class="sub-question">
        ${cb(!!diag?.ans_dysfunction)} อายุที่เริ่มมีอาการ ANS dysfunction ${field(diag?.ans_onset_age)} ปี หรือ มีอาการมานาน ${field(diag?.ans_duration)} ปี
      </div>
      <div class="indent">
        ${cb((mds?.p3_total ?? 0) > 3 || (mds?.total_score ?? 0) > 6)} <strong>Mild parkinsonian sign</strong>: UPDRS part III &gt; 3 หรือ total UPDRS &gt; 6
      </div>
      <div class="indent">
        ${cb(false)} <strong>Family history of PD (First degree)</strong>
      </div>
    </div>

    <div class="section">
      <div>${cb(isNormal)}<strong> Normal</strong></div>
    </div>

    <div class="section">
      <div>${cb(isOther)}<strong> Other diagnosis </strong>${field(otherText, 300)}</div>
    </div>

    <div class="section">
      <div>${cb(isHealthy)} <strong>Healthy</strong></div>
    </div>

    <div class="numbered-item"><strong>1.</strong> ชื่อ ${field(p.first_name)} นามสกุล ${field(p.last_name)}</div>
    <div class="numbered-item"><strong>2.</strong> อายุ ${field(p.age)} ปี</div>
    <div class="numbered-item"><strong>3.</strong> จังหวัด ${field(p.province)}</div>
    <div class="numbered-item"><strong>4.</strong> วันที่เก็บข้อมูล ${field(p.collection_date)}</div>
    <div class="numbered-item"><strong>5.</strong> HN (for KCMH patients) ${field(p.hn_number)}</div>
    <div class="numbered-item"><strong>6.</strong> น้ำหนัก ${field(p.weight)} กิโลกรัม, ส่วนสูง ${field(p.height)} เซนติเมตร, BMI ${field(p.bmi != null ? Number(p.bmi).toFixed(1) : null)} Kg/m²</div>

    <div class="section">
      รอบอก ${field(p.chest_cm)} ซม. รอบเอว ${field(p.waist_cm)} ซม. รอบคอ ${field(p.neck_cm)} ซม. รอบสะโพก ${field(p.hip_cm)} ซม.
    </div>
    <div class="section">
      ความดันโลหิต หลังนอน 3 นาที BP Supine ${field(p.bp_supine)} mmHg PR ${field(p.pr_supine)} /min
    </div>
    <div class="section">
      ความดันโลหิต หลังยืน 3 นาที BP Upright 3 min ${field(p.bp_upright)} mmHg PR ${field(p.pr_upright)} /min
    </div>

    <div class="page-break">
      <div class="numbered-item-2">
        <strong>7. Check PD application</strong>
        <div class="indent">${cb(false)} Demographic</div>
        <div class="indent">${cb(false)} 20-questions questionnaire</div>
        <div class="indent">${cb(false)} Voice analysis</div>
        <div class="indent">${cb(false)} Tremor test</div>
        <div class="indent">${cb(false)} Finger tapping test</div>
        <div class="indent">${cb(false)} Pinch to size test</div>
        <div class="indent">${cb(false)} Gait and balance testing</div>
      </div>

      <div class="numbered-item-2">
        <strong>8. MDS UPDRS</strong>
        <div class="indent">${cb(mds?.p1_total != null)} Part I ${field(mds?.p1_total)} คะแนน</div>
        <div class="indent">${cb(mds?.p2_total != null)} Part II ${field(mds?.p2_total)} คะแนน</div>
        <div class="indent">${cb(mds?.p3_total != null)} Part III ${field(mds?.p3_total)} คะแนน</div>
        <div class="indent">${cb(mds?.p4_total != null)} Part IV ${field(mds?.p4_total)} คะแนน</div>
        <div style="margin-top: 10px;">Total MDS-UPDRS ${field(mds?.total_score)} คะแนน</div>
      </div>

      <div class="numbered-item-2">
        <strong>9. Cognitive test</strong>
        <div class="indent">${cb(moca?.total_score != null)} MoCA ${field(moca?.total_score)} คะแนน or</div>
        <div class="indent">${cb(tmse?.total_score != null)} TMSE ${field(tmse?.total_score)} คะแนน</div>
      </div>

      <div class="numbered-item-2">
        <strong>10. Smell test</strong>
        <div class="indent">${cb(smellIsThai)} Thai smell test ${field(smellIsThai ? smell?.total_score : null)} คะแนน or</div>
        <div class="indent">${cb(smellIsSniffin)} Sniffin stick test ${field(smellIsSniffin ? smell?.total_score : null)} คะแนน</div>
      </div>

      <div class="numbered-item-2">
        <strong>11. Color discrimination testing</strong>
        <div class="indent">
          ${cb(colorPaperDone)} Yes (Paper)
          <div style="margin-left: 40px;">
            Right eye 1 ${field(vision?.color_paper_re_test)} คะแนน &nbsp;&nbsp;&nbsp; Right eye 2 ${field(vision?.color_paper_re_retest)} คะแนน<br>
            Left eye 1 ${field(vision?.color_paper_le_test)} คะแนน &nbsp;&nbsp;&nbsp;&nbsp; Left eye 2 ${field(vision?.color_paper_le_retest)} คะแนน
          </div>
        </div>
        <div class="indent">
          ${cb(colorAppDone)} Yes (Application)
          <div style="margin-left: 40px;">
            Right eye 1 ${field(vision?.color_app_re_test)} คะแนน &nbsp;&nbsp;&nbsp; Right eye 2 ${field(vision?.color_app_re_retest)} คะแนน<br>
            Left eye 1 ${field(vision?.color_app_le_test)} คะแนน &nbsp;&nbsp;&nbsp;&nbsp; Left eye 2 ${field(vision?.color_app_le_retest)} คะแนน
          </div>
        </div>
        <div class="indent">${cb(!colorPaperDone && !colorAppDone)} No</div>
      </div>

      <div class="numbered-item-2">
        <strong>12. Contrast discrimination testing</strong>
        <div class="indent">
          ${cb(contrastManualDone)} Yes (Manual)
          <div style="margin-left: 40px;">
            Right eye ${field(vision?.contrast_manual_re)} คะแนน &nbsp;&nbsp;&nbsp; Left eye ${field(vision?.contrast_manual_le)} คะแนน
          </div>
        </div>
        <div class="indent">
          ${cb(contrastAppDone)} Yes (Application)
          <div style="margin-left: 40px;">
            Right eye ${field(vision?.contrast_app_re)} คะแนน &nbsp;&nbsp;&nbsp; Left eye ${field(vision?.contrast_app_le)} คะแนน
          </div>
        </div>
        <div class="indent">${cb(!contrastManualDone && !contrastAppDone)} No</div>
      </div>
    </div>

    <div class="page-break">
      <div class="numbered-item-2">
        <strong>13. VA</strong>
        <div style="margin-left: 20px;">
          a. Right eye ${field(vision?.va_re)}
          <div style="margin-left: 20px; margin-top: 0.5rem; margin-bottom: 0.5rem;">i. Right eye with pin hole ${field(vision?.va_re_pinhole)}</div>
          b. Left eye ${field(vision?.va_le)}
          <div style="margin-left: 20px; margin-top: 0.5rem; margin-bottom: 0.5rem;">i. Left eye with pin hole ${field(vision?.va_le_pinhole)}</div>
        </div>
        ${!vaDone ? `<div class="indent">${field('', 180)}</div>` : ''}
      </div>

      <div class="numbered-item-2">
        <strong>14. Sleep domain</strong>
        <div class="indent">${cb(rbd?.total_score != null)} RBD Questionnaire ${field(rbd?.total_score)} คะแนน</div>
        <div class="indent">${cb(epw?.total_score != null)} Epworth Sleepiness Scale ${field(epw?.total_score)} คะแนน</div>
        <div class="indent">
          ${cb(psgRequested.yes)} Further PSG (RBD montage) request
          <div style="margin-left: 40px; margin-top: 0.5rem;">
            ${cb(psgRequested.yes)} Yes at ${field(null)} ${cb(psgRequested.no)} No
          </div>
        </div>
      </div>

      <div class="numbered-item-2">
        <strong>15. Behavioral / psychiatric domain</strong>
        <div class="indent">${cb(hamd?.total_score != null)} HAM-D ${field(hamd?.total_score)} คะแนน${hamd?.severity_level ? ` (${hamd.severity_level})` : ''}</div>
      </div>

      <div class="numbered-item-2">
        <strong>16. Constipation</strong>
        <div class="indent">${cb(rome4?.total_score != null)} ROME IV ${field(rome4?.total_score)} คะแนน</div>
      </div>

      <div class="numbered-item-2">
        <strong>17. ADLs Questionnaire</strong> ${field(diag?.adl_score)} คะแนน
      </div>

      <div class="numbered-item-2">
        <strong>18. SCOPA AUT</strong> ${field(diag?.scopa_aut_score)} คะแนน
      </div>

      <div class="numbered-item-2">
        <strong>19. Blood test</strong>
        <div class="indent">${cb(false)} Genetic test: GP2</div>
        <div class="indent">${cb(!!diag?.blood_test_note)} +/- เก็บเลือดไว้ก่อน further blood test เช่น Serum RT-QuIC</div>
        ${diag?.blood_test_note ? `<div class="indent">หมายเหตุ: ${diag.blood_test_note}</div>` : ''}
      </div>

      <div class="numbered-item-2">
        <strong>20. Further FDOPA PET scan request</strong>
        <div class="indent">
          ${cb(fdopa.yes)} Yes${diag?.fdopa_pet_score ? ` — Score: ${diag.fdopa_pet_score}` : ' at'} ${fdopa.yes ? '' : field(null)}
          ${cb(fdopa.no)} No
        </div>
      </div>
    </div>
  </body>
</html>
`

    const runPdf = async () => {
      const browser = await getBrowser()
      const page = await browser.newPage()
      try {
        await page.setContent(html, { waitUntil: 'networkidle' })
        return await page.pdf({ format: 'A4' })
      } finally {
        await page.close()
      }
    }

    let pdfBuffer: Buffer
    try {
      pdfBuffer = Buffer.from(await runPdf())
    } catch (e: any) {
      if (e?.message?.includes('has been closed') || e?.message?.includes('Target closed')) {
        resetBrowser()
        pdfBuffer = Buffer.from(await runPdf())
      } else {
        throw e
      }
    }

    const fileName = `QA_${patientId}_${p.first_name ?? ''}_${p.last_name ?? ''}`.replace(/\s+/g, '_')
    return new Response(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename*=UTF-8''${encodeURIComponent(`${fileName}.pdf`)}`,
      },
    })
  } catch (err: any) {
    console.error('QA PDF generation error:', err)
    return NextResponse.json(
      { error: 'เกิดข้อผิดพลาดขณะสร้าง PDF', details: err.message || err.toString() },
      { status: 500 }
    )
  }
}
