import { NextRequest, NextResponse } from 'next/server'
import { checkRateLimit, getClientIdentifier } from '@/lib/rateLimit'
import { generateQaPdfBuffer } from '@/lib/generateQaPdfBuffer'
import { hasServiceRole, supabaseServer as supabase } from '@/lib/supabase-server'

export const runtime = 'nodejs'

const PDF_RATE_LIMIT = 15
const PDF_RATE_WINDOW_MS = 60 * 1000

const DIAG_SELECT =
  'patient_id,condition,hy_stage,disease_duration,other_diagnosis_text,constipation,constipation_onset_age,constipation_duration,rbd_suspected,rbd_onset_age,rbd_duration,hyposmia,hyposmia_onset_age,hyposmia_duration,depression,depression_onset_age,depression_duration,eds,eds_onset_age,eds_duration,ans_dysfunction,ans_onset_age,ans_duration,mild_parkinsonian_sign,family_history_pd,adl_score,scopa_aut_score,blood_test_note,fdopa_pet_requested,fdopa_pet_score'

export async function GET(req: NextRequest) {
  try {

    const id = getClientIdentifier(req)
    const { ok, resetAt } = checkRateLimit(id, PDF_RATE_LIMIT, PDF_RATE_WINDOW_MS)
    if (!ok) {
      return NextResponse.json(
        { error: 'เกินจำนวนการขอ PDF ต่อนาที กรุณาลองใหม่ภายหลัง' },
        { status: 429, headers: { 'X-RateLimit-Reset': String(resetAt), 'Retry-After': '60' } },
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
        {
          error: 'ไม่สามารถดึงข้อมูลจาก core schema ได้',
          details: errors.map((e) => e?.message ?? String(e)).join('; '),
        },
        { status: 500 },
      )
    }

    if (!patientRes.data) {
      if (!hasServiceRole) {
        return NextResponse.json(
          {
            error: 'ไม่พบข้อมูลหรือไม่มีสิทธิ์อ่านจาก core schema',
            details: 'กรุณาตั้งค่า SUPABASE_SERVICE_ROLE_KEY ใน .env.local แล้ว restart dev server',
          },
          { status: 403 },
        )
      }
      return NextResponse.json({ error: `ไม่พบข้อมูล patient_id: ${patientId}` }, { status: 404 })
    }

    const p = patientRes.data

    // New PDF module path (PLAN-008): pure JS render with @react-pdf/renderer.
    // If you need to temporarily compare with legacy HTML/Playwright, keep old route in git history.
    const pdfBuffer = await generateQaPdfBuffer({
      patient: p,
      diag: diagRes.data,
      moca: mocaRes.data,
      hamd: hamdRes.data,
      mds: mdsRes.data,
      epw: epwRes.data,
      smell: smellRes.data,
      tmse: tmseRes.data,
      rbd: rbdRes.data,
      rome4: rome4Res.data,
      vision: visionRes.data,
    })

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
      { status: 500 },
    )
  }
}


