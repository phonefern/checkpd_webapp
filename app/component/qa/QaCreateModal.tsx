'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { QA_HY_OPTIONS, QaPatient, QaDiagnosisRow } from './types'
import type { AppRole } from '@/lib/access'
import { provinceOptions } from '@/app/types/user'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'

const CONDITION_OPTIONS = [
  { value: '', label: '-- Select condition --' },
  { value: 'pd', label: 'PD' },
  { value: 'pdm', label: 'PDM' },
  { value: 'other', label: 'OTHER' },
  { value: 'ctrl', label: 'CTRL' },
  { value: '-', label: '-' },
]

const DIAGNOSIS_GUIDES = [
  'Suspected RBD: History of acting out of dream or vocalization or RBDQ >= 17 or PSG confirmed',
  'Hyposmia: History ได้กลิ่นลดลง หรือ Sniffin stick <= 9',
  'Constipation: History ถ่ายอุจจาระความถี่นานกว่าวันเว้นวัน หรือต้องใช้ยาระบาย หรืออุจจาระแข็งขึ้นเรื้อรังในช่วง 3 เดือนที่ผ่านมาเมื่อเทียบกับก่อนหน้า หรือ ROME IV >= 2',
  'Depression: ประวัติการได้รับการวินิจฉัยและรักษา หรือ HAM-D >= 13',
  'Excessive daytime sleepiness: ง่วงนอนมากผิดปกติในช่วงกลางวัน หรือ ESS >= 10',
  'Autonomic dysfunction: มีอาการระบบประสาทอัตโนมัติผิดปกติข้อใดข้อหนึ่ง เช่น หน้ามืดหรือเป็นลมเมื่อเปลี่ยนท่า, กลั้นปัสสาวะไม่อยู่, อวัยวะเพศไม่แข็งตัว',
  'Mild parkinsonian sign: UPDRS part III > 3 (ไม่รวม postural and kinetic tremor) หรือ total UPDRS > 6 โดยยังไม่เข้า criteria PD และไม่ได้นับคะแนน potential confounder เช่น โรคข้อ',
  'Family history of PD (first degree): ญาติสายตรงเป็น PD',
]

const HAMD_GUIDES = [
  'Score 0-7: No depression',
  'Score 8-12: Mild depression',
  'Score 13-17: Moderate depression (less than major depression)',
  'Score 18-29: Moderate depression (major depression)',
  'Score 30+: Severe depression',
]

const EPWORTH_GUIDES = [
  '<7: Normal',
  '7-9: Borderline',
  '>9: Severe',
]

type AssessmentKind = 'moca' | 'hamd' | 'mds' | 'epworth' | 'smell' | 'tmse' | 'rbd' | 'rome4'

type AssessmentScores = {
  moca: number | null
  hamd: number | null
  hamdSeverity: string | null
  mds: number | null
  epworth: number | null
  smell: number | null
  tmse: number | null
  rbd: number | null
  rome4: number | null
}

type AssessmentCategoryTone = 'muted' | 'good' | 'warn' | 'bad'

type AssessmentThreshold = {
  max?: number
  min?: number
  label: string
  tone: AssessmentCategoryTone
}

type AssessmentCategory = {
  label: string
  tone: string
}

const EMPTY_ASSESSMENTS: AssessmentScores = {
  moca: null,
  hamd: null,
  hamdSeverity: null,
  mds: null,
  epworth: null,
  smell: null,
  tmse: null,
  rbd: null,
  rome4: null,
}

const ASSESSMENT_MAX_SCORES: Record<AssessmentKind, number> = {
  moca: 30,
  hamd: 52,
  mds: 199,
  epworth: 24,
  smell: 16,
  tmse: 30,
  rbd: 100,
  rome4: 6,
}

const ASSESSMENT_THRESHOLDS: Record<AssessmentKind, AssessmentThreshold[]> = {
  hamd: [
    { max: 7, label: 'No depression', tone: 'good' },
    { max: 12, label: 'Mild depression', tone: 'warn' },
    { max: 17, label: 'Moderate depression', tone: 'bad' },
    { max: 29, label: 'Major depression', tone: 'bad' },
    { min: 30, label: 'Severe depression', tone: 'bad' },
  ],
  epworth: [
    { max: 6, label: 'Normal', tone: 'good' },
    { max: 9, label: 'Borderline', tone: 'warn' },
    { min: 10, label: 'Excessive daytime sleepiness', tone: 'bad' },
  ],
  rbd: [
    { max: 16, label: 'Normal', tone: 'good' },
    { min: 17, label: 'Suspected RBD', tone: 'bad' },
  ],
  rome4: [
    { max: 1, label: 'Normal', tone: 'good' },
    { min: 2, label: 'Functional constipation', tone: 'bad' },
  ],
  mds: [
    { max: 3, label: 'Normal', tone: 'good' },
    { max: 6, label: 'Borderline', tone: 'warn' },
    { min: 7, label: 'Mild parkinsonian sign', tone: 'bad' },
  ],
  smell: [
    { max: 9, label: 'Hyposmia', tone: 'bad' },
    { min: 10, label: 'Normal', tone: 'good' },
  ],
  moca: [
    { max: 17, label: 'Severe cognitive impairment', tone: 'bad' },
    { max: 25, label: 'Mild cognitive impairment', tone: 'warn' },
    { min: 26, label: 'Normal', tone: 'good' },
  ],
  tmse: [
    { max: 23, label: 'Cognitive impairment', tone: 'bad' },
    { min: 24, label: 'Normal', tone: 'good' },
  ],
}

const ASSESSMENT_TONE_STYLES = {
  muted: 'inline-flex max-w-full items-center rounded-full bg-slate-100 px-2 py-0.5 text-[10px] sm:text-xs font-medium leading-tight text-slate-500 break-words',
  good: 'inline-flex max-w-full items-center rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] sm:text-xs font-medium leading-tight text-emerald-700 break-words',
  warn: 'inline-flex max-w-full items-center rounded-full bg-orange-50 px-2 py-0.5 text-[10px] sm:text-xs font-medium leading-tight text-orange-700 break-words',
  bad: 'inline-flex max-w-full items-center rounded-full bg-rose-50 px-2 py-0.5 text-[10px] sm:text-xs font-medium leading-tight text-rose-700 break-words',
}

interface FormState {
  patient_uid: string
  first_name: string
  last_name: string
  thaiid: string
  hn_number: string
  age: string
  province: string
  collection_date: string
  bmi: string
  weight: string
  height: string
  chest_cm: string
  waist_cm: string
  hip_cm: string
  neck_cm: string
  bp_supine: string
  pr_supine: string
  bp_upright: string
  pr_upright: string
  condition: string
  hy_stage: string
  disease_duration: string
  other_diagnosis_text: string
  rbd_suspected: boolean
  rbd_onset_age: string
  rbd_duration: string
  hyposmia: boolean
  hyposmia_onset_age: string
  hyposmia_duration: string
  constipation: boolean
  constipation_onset_age: string
  constipation_duration: string
  depression: boolean
  depression_onset_age: string
  depression_duration: string
  eds: boolean
  eds_onset_age: string
  eds_duration: string
  ans_dysfunction: boolean
  ans_onset_age: string
  ans_duration: string
  mild_parkinsonian_sign: boolean
  family_history_pd: boolean
  adl_score: string
  scopa_aut_score: string
  blood_test_note: string
  fdopa_pet_requested: boolean
  fdopa_pet_score: string
}

const EMPTY: FormState = {
  patient_uid: '',
  first_name: '',
  last_name: '',
  thaiid: '',
  hn_number: '',
  age: '',
  province: '',
  collection_date: '',
  bmi: '',
  weight: '',
  height: '',
  chest_cm: '',
  waist_cm: '',
  hip_cm: '',
  neck_cm: '',
  bp_supine: '',
  pr_supine: '',
  bp_upright: '',
  pr_upright: '',
  condition: '',
  hy_stage: '',
  disease_duration: '',
  other_diagnosis_text: '',
  rbd_suspected: false,
  rbd_onset_age: '',
  rbd_duration: '',
  hyposmia: false,
  hyposmia_onset_age: '',
  hyposmia_duration: '',
  constipation: false,
  constipation_onset_age: '',
  constipation_duration: '',
  depression: false,
  depression_onset_age: '',
  depression_duration: '',
  eds: false,
  eds_onset_age: '',
  eds_duration: '',
  ans_dysfunction: false,
  ans_onset_age: '',
  ans_duration: '',
  mild_parkinsonian_sign: false,
  family_history_pd: false,
  adl_score: '',
  scopa_aut_score: '',
  blood_test_note: '',
  fdopa_pet_requested: false,
  fdopa_pet_score: '',
}

function generatePatientUid() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  const randomHex = () => Math.floor((1 + Math.random()) * 0x10000).toString(16).slice(1)
  return `${randomHex()}${randomHex()}-${randomHex()}-4${randomHex().slice(0, 3)}-a${randomHex().slice(0, 3)}-${randomHex()}${randomHex()}${randomHex()}`
}

const normalizeIdentityValue = (value: string | null | undefined) => (value ?? '').trim()

async function resolveExistingPatientUid(form: FormState): Promise<string | null> {
  const thaiid = normalizeIdentityValue(form.thaiid)
  const hnNumber = normalizeIdentityValue(form.hn_number)
  const firstName = normalizeIdentityValue(form.first_name)
  const lastName = normalizeIdentityValue(form.last_name)

  const selectCols = 'id,patient_uid,collection_date,submission_timestamp,created_at'

  const pickUid = (rows: Array<{ patient_uid: string | null }>) => {
    const uid = rows.find((r) => (r.patient_uid ?? '').trim().length > 0)?.patient_uid?.trim()
    return uid ?? null
  }

  if (thaiid) {
    const { data, error } = await supabase
      .schema('core')
      .from('patients_v2')
      .select(selectCols)
      .eq('thaiid', thaiid)
      .order('collection_date', { ascending: false, nullsFirst: false })
      .order('id', { ascending: false })
      .limit(1)

    if (error) throw new Error(`patients_v2 (thaiid lookup): ${error.message}`)
    const uid = pickUid(data ?? [])
    if (uid) return uid
  }

  if (hnNumber) {
    const { data, error } = await supabase
      .schema('core')
      .from('patients_v2')
      .select(selectCols)
      .ilike('hn_number', hnNumber)
      .order('collection_date', { ascending: false, nullsFirst: false })
      .order('id', { ascending: false })
      .limit(1)

    if (error) throw new Error(`patients_v2 (hn lookup): ${error.message}`)
    const uid = pickUid(data ?? [])
    if (uid) return uid
  }

  if (firstName && lastName) {
    const { data, error } = await supabase
      .schema('core')
      .from('patients_v2')
      .select(selectCols)
      .ilike('first_name', firstName)
      .ilike('last_name', lastName)
      .order('collection_date', { ascending: false, nullsFirst: false })
      .order('id', { ascending: false })
      .limit(1)

    if (error) throw new Error(`patients_v2 (name lookup): ${error.message}`)
    const uid = pickUid(data ?? [])
    if (uid) return uid
  }

  return null
}

function buildDiagPayload(form: FormState) {
  const otherDiagnosisText = form.other_diagnosis_text.trim()

  return {
    condition: form.condition || null,
    hy_stage: form.hy_stage || null,
    disease_duration: form.disease_duration.trim() || null,
    other_diagnosis_text: otherDiagnosisText || null,
    rbd_suspected: form.rbd_suspected,
    rbd_onset_age: form.rbd_suspected ? form.rbd_onset_age.trim() || null : null,
    rbd_duration: form.rbd_suspected ? form.rbd_duration.trim() || null : null,
    hyposmia: form.hyposmia,
    hyposmia_onset_age: form.hyposmia ? form.hyposmia_onset_age.trim() || null : null,
    hyposmia_duration: form.hyposmia ? form.hyposmia_duration.trim() || null : null,
    constipation: form.constipation,
    constipation_onset_age: form.constipation ? form.constipation_onset_age.trim() || null : null,
    constipation_duration: form.constipation ? form.constipation_duration.trim() || null : null,
    depression: form.depression,
    depression_onset_age: form.depression ? form.depression_onset_age.trim() || null : null,
    depression_duration: form.depression ? form.depression_duration.trim() || null : null,
    eds: form.eds,
    eds_onset_age: form.eds ? form.eds_onset_age.trim() || null : null,
    eds_duration: form.eds ? form.eds_duration.trim() || null : null,
    ans_dysfunction: form.ans_dysfunction,
    ans_onset_age: form.ans_dysfunction ? form.ans_onset_age.trim() || null : null,
    ans_duration: form.ans_dysfunction ? form.ans_duration.trim() || null : null,
    mild_parkinsonian_sign: form.mild_parkinsonian_sign,
    family_history_pd: form.family_history_pd,
    adl_score: form.adl_score ? Number(form.adl_score) : null,
    scopa_aut_score: form.scopa_aut_score ? Number(form.scopa_aut_score) : null,
    blood_test_note: form.blood_test_note.trim() || null,
    fdopa_pet_requested: form.fdopa_pet_requested || null,
    fdopa_pet_score: form.fdopa_pet_requested ? form.fdopa_pet_score.trim() || null : null,
  }
}

interface Props {
  open: boolean
  onClose: () => void
  onCreated: () => void
  editPatient?: QaPatient | null
  editDiag?: QaDiagnosisRow | null
  prefillPatient?: QaPatient | null
  prefillData?: Partial<FormState>
  role?: AppRole | null
}

export default function QaCreateModal({ open, onClose, onCreated, editPatient, editDiag, prefillPatient, prefillData, role }: Props) {
  const isEdit = !!editPatient
  const canUseAssessmentAssist = isEdit && (role === 'doctor' || role === 'admin' || role === 'super_admin')
  const canEditPatientInfo = isEdit && (role === 'admin' || role === 'super_admin')
  const editPatientId = editPatient?.id ?? null
  const canEditDiag = role !== 'medical_staff'
  const [form, setForm] = useState<FormState>(EMPTY)
  const [assessments, setAssessments] = useState<AssessmentScores>(EMPTY_ASSESSMENTS)
  const [loadingAssessments, setLoadingAssessments] = useState(false)
  const [assessmentError, setAssessmentError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const set = (field: keyof FormState, value: string | boolean) =>
    setForm((prev) => ({ ...prev, [field]: value }))

  // Pre-fill form in edit mode, add-visit mode, or from prefillData
  useEffect(() => {
    if (!open) return

    if (editPatient) {
      setForm({
        patient_uid: editPatient.patient_uid,
        first_name: editPatient.first_name ?? '',
        last_name: editPatient.last_name ?? '',
        thaiid: editPatient.thaiid ?? '',
        hn_number: editPatient.hn_number ?? '',
        age: editPatient.age != null ? String(editPatient.age) : '',
        province: editPatient.province ?? '',
        collection_date: editPatient.collection_date ?? '',
        bmi: editPatient.bmi != null ? String(editPatient.bmi) : '',
        weight: editPatient.weight != null ? String(editPatient.weight) : '',
        height: editPatient.height != null ? String(editPatient.height) : '',
        chest_cm: editPatient.chest_cm != null ? String(editPatient.chest_cm) : '',
        waist_cm: editPatient.waist_cm != null ? String(editPatient.waist_cm) : '',
        hip_cm: editPatient.hip_cm != null ? String(editPatient.hip_cm) : '',
        neck_cm: editPatient.neck_cm != null ? String(editPatient.neck_cm) : '',
        bp_supine: editPatient.bp_supine ?? '',
        pr_supine: editPatient.pr_supine != null ? String(editPatient.pr_supine) : '',
        bp_upright: editPatient.bp_upright ?? '',
        pr_upright: editPatient.pr_upright != null ? String(editPatient.pr_upright) : '',
        condition: editDiag?.condition ?? '',
        hy_stage: editDiag?.hy_stage ?? '',
        disease_duration: editDiag?.disease_duration ?? '',
        other_diagnosis_text: editDiag?.other_diagnosis_text ?? '',
        rbd_suspected: editDiag?.rbd_suspected ?? false,
        rbd_onset_age: editDiag?.rbd_onset_age ?? '',
        rbd_duration: editDiag?.rbd_duration ?? '',
        hyposmia: editDiag?.hyposmia ?? false,
        hyposmia_onset_age: editDiag?.hyposmia_onset_age ?? '',
        hyposmia_duration: editDiag?.hyposmia_duration ?? '',
        constipation: editDiag?.constipation ?? false,
        constipation_onset_age: editDiag?.constipation_onset_age ?? '',
        constipation_duration: editDiag?.constipation_duration ?? '',
        depression: editDiag?.depression ?? false,
        depression_onset_age: editDiag?.depression_onset_age ?? '',
        depression_duration: editDiag?.depression_duration ?? '',
        eds: editDiag?.eds ?? false,
        eds_onset_age: editDiag?.eds_onset_age ?? '',
        eds_duration: editDiag?.eds_duration ?? '',
        ans_dysfunction: editDiag?.ans_dysfunction ?? false,
        ans_onset_age: editDiag?.ans_onset_age ?? '',
        ans_duration: editDiag?.ans_duration ?? '',
        mild_parkinsonian_sign: editDiag?.mild_parkinsonian_sign ?? false,
        family_history_pd: editDiag?.family_history_pd ?? false,
        adl_score: editDiag?.adl_score != null ? String(editDiag.adl_score) : '',
        scopa_aut_score: editDiag?.scopa_aut_score != null ? String(editDiag.scopa_aut_score) : '',
        blood_test_note: editDiag?.blood_test_note ?? '',
        fdopa_pet_requested: editDiag?.fdopa_pet_requested ?? false,
        fdopa_pet_score: editDiag?.fdopa_pet_score ?? '',
      })
    } else if (prefillPatient) {
      const today = new Date().toISOString().slice(0, 10)
      setForm({
        ...EMPTY,
        patient_uid: prefillPatient.patient_uid,
        first_name: prefillPatient.first_name ?? '',
        last_name: prefillPatient.last_name ?? '',
        thaiid: prefillPatient.thaiid ?? '',
        hn_number: prefillPatient.hn_number ?? '',
        age: prefillPatient.age != null ? String(prefillPatient.age) : '',
        province: prefillPatient.province ?? '',
        collection_date: today,
        bmi: prefillPatient.bmi != null ? String(prefillPatient.bmi) : '',
        weight: prefillPatient.weight != null ? String(prefillPatient.weight) : '',
        height: prefillPatient.height != null ? String(prefillPatient.height) : '',
        chest_cm: prefillPatient.chest_cm != null ? String(prefillPatient.chest_cm) : '',
        waist_cm: prefillPatient.waist_cm != null ? String(prefillPatient.waist_cm) : '',
        hip_cm: prefillPatient.hip_cm != null ? String(prefillPatient.hip_cm) : '',
        neck_cm: prefillPatient.neck_cm != null ? String(prefillPatient.neck_cm) : '',
        bp_supine: prefillPatient.bp_supine ?? '',
        pr_supine: prefillPatient.pr_supine != null ? String(prefillPatient.pr_supine) : '',
        bp_upright: prefillPatient.bp_upright ?? '',
        pr_upright: prefillPatient.pr_upright != null ? String(prefillPatient.pr_upright) : '',
      })
    } else {
      setForm({
        ...EMPTY,
        patient_uid: generatePatientUid(),
        ...(prefillData ?? {}),
      })
    }
  }, [open, editPatient, editDiag, prefillPatient, prefillData])

  useEffect(() => {
    if (!open || !canUseAssessmentAssist || !editPatientId) {
      setAssessments(EMPTY_ASSESSMENTS)
      setLoadingAssessments(false)
      setAssessmentError(null)
      return
    }

    let alive = true
    setLoadingAssessments(true)
    setAssessmentError(null)

    Promise.all([
      supabase.schema('core').from('moca_v2').select('total_score').eq('patient_id', editPatientId).maybeSingle(),
      supabase.schema('core').from('hamd_v2').select('total_score,severity_level').eq('patient_id', editPatientId).maybeSingle(),
      supabase.schema('core').from('mds_updrs_v2').select('total_score').eq('patient_id', editPatientId).maybeSingle(),
      supabase.schema('core').from('epworth_v2').select('total_score').eq('patient_id', editPatientId).maybeSingle(),
      supabase.schema('core').from('smell_test_v2').select('total_score').eq('patient_id', editPatientId).maybeSingle(),
      supabase.schema('core').from('tmse_v2').select('total_score').eq('patient_id', editPatientId).maybeSingle(),
      supabase.schema('core').from('rbd_questionnaire_v2').select('total_score').eq('patient_id', editPatientId).maybeSingle(),
      supabase.schema('core').from('rome4_v2').select('total_score').eq('patient_id', editPatientId).maybeSingle(),
    ])
      .then(([mocaRes, hamdRes, mdsRes, epworthRes, smellRes, tmseRes, rbdRes, rome4Res]) => {
        if (!alive) return

        const errors = [mocaRes, hamdRes, mdsRes, epworthRes, smellRes, tmseRes, rbdRes, rome4Res]
          .map((res, i) => (res.error ? `table[${i}]: ${res.error.message}` : null))
          .filter(Boolean)

        if (errors.length > 0) {
          setAssessmentError(errors.join(', '))
          setAssessments(EMPTY_ASSESSMENTS)
          return
        }

        const hamdData = hamdRes.data as { total_score: number | null; severity_level: string | null } | null
        setAssessments({
          moca: (mocaRes.data as { total_score: number | null } | null)?.total_score ?? null,
          hamd: hamdData?.total_score ?? null,
          hamdSeverity: hamdData?.severity_level ?? null,
          mds: (mdsRes.data as { total_score: number | null } | null)?.total_score ?? null,
          epworth: (epworthRes.data as { total_score: number | null } | null)?.total_score ?? null,
          smell: (smellRes.data as { total_score: number | null } | null)?.total_score ?? null,
          tmse: (tmseRes.data as { total_score: number | null } | null)?.total_score ?? null,
          rbd: (rbdRes.data as { total_score: number | null } | null)?.total_score ?? null,
          rome4: (rome4Res.data as { total_score: number | null } | null)?.total_score ?? null,
        })
      })
      .catch((err) => {
        if (!alive) return
        setAssessmentError(err instanceof Error ? err.message : String(err))
        setAssessments(EMPTY_ASSESSMENTS)
      })
      .finally(() => {
        if (alive) setLoadingAssessments(false)
      })

    return () => {
      alive = false
    }
  }, [open, canUseAssessmentAssist, editPatientId])

  useEffect(() => {
    if (!open || !canUseAssessmentAssist || !canEditDiag) return

    const shouldEnableRbd = (assessments.rbd ?? -1) >= 17
    const shouldEnableHyposmia = assessments.smell != null && assessments.smell <= 9
    const shouldEnableConstipation = (assessments.rome4 ?? -1) >= 2
    const shouldEnableDepression = (assessments.hamd ?? -1) >= 13
    const shouldEnableEds = (assessments.epworth ?? -1) >= 10
    const shouldEnableMildParkinsonianSign = (assessments.mds ?? -1) >= 7

    if (
      !shouldEnableRbd &&
      !shouldEnableHyposmia &&
      !shouldEnableConstipation &&
      !shouldEnableDepression &&
      !shouldEnableEds &&
      !shouldEnableMildParkinsonianSign
    ) {
      return
    }

    setForm((prev) => ({
      ...prev,
      rbd_suspected: prev.rbd_suspected || shouldEnableRbd,
      hyposmia: prev.hyposmia || shouldEnableHyposmia,
      constipation: prev.constipation || shouldEnableConstipation,
      depression: prev.depression || shouldEnableDepression,
      eds: prev.eds || shouldEnableEds,
      mild_parkinsonian_sign: prev.mild_parkinsonian_sign || shouldEnableMildParkinsonianSign,
    }))
  }, [open, canUseAssessmentAssist, canEditDiag, assessments])

  const handleSubmit = async () => {
    if (!form.first_name.trim() || !form.last_name.trim()) {
      setError('กรุณากรอกชื่อและนามสกุล')
      return
    }

    setSaving(true)
    setError(null)

    try {
      const diagPayload = buildDiagPayload(form)
      const hasDiag = Object.values(diagPayload).some((v) => v !== null && v !== false && v !== '')

      if (isEdit && editPatient) {
        // --- Edit mode: UPDATE patients_v2, UPSERT patient_diagnosis_v2 ---
        const { error: patErr } = await supabase
          .schema('core')
          .from('patients_v2')
          .update({
            patient_uid: form.patient_uid,
            first_name: form.first_name.trim() || null,
            last_name: form.last_name.trim() || null,
            thaiid: form.thaiid.trim() || null,
            hn_number: form.hn_number.trim() || null,
            age: form.age ? Number(form.age) : null,
            province: form.province || null,
            collection_date: form.collection_date || null,
            bmi: form.bmi ? Number(form.bmi) : null,
            weight: form.weight ? Number(form.weight) : null,
            height: form.height ? Number(form.height) : null,
            chest_cm: form.chest_cm ? Number(form.chest_cm) : null,
            waist_cm: form.waist_cm ? Number(form.waist_cm) : null,
            hip_cm: form.hip_cm ? Number(form.hip_cm) : null,
            neck_cm: form.neck_cm ? Number(form.neck_cm) : null,
            bp_supine: form.bp_supine.trim() || null,
            pr_supine: form.pr_supine ? Number(form.pr_supine) : null,
            bp_upright: form.bp_upright.trim() || null,
            pr_upright: form.pr_upright ? Number(form.pr_upright) : null,
          })
          .eq('id', editPatient.id)

        if (patErr) throw new Error(`patients_v2: ${patErr.message}`)

        const { error: diagErr } = await supabase
          .schema('core')
          .from('patient_diagnosis_v2')
          .upsert({ patient_id: editPatient.id, ...diagPayload }, { onConflict: 'patient_id' })

        if (diagErr) throw new Error(`patient_diagnosis_v2: ${diagErr.message}`)
      } else {
        // --- Create mode: INSERT patients_v2, then INSERT patient_diagnosis_v2 ---
        const matchedPatientUid = await resolveExistingPatientUid(form)
        const patientUidForInsert = matchedPatientUid ?? form.patient_uid ?? generatePatientUid()

        const { data: patientData, error: patErr } = await supabase
          .schema('core')
          .from('patients_v2')
          .insert({
            patient_uid: patientUidForInsert,
            form_submission_hash: `qa-manual-${Date.now()}-${Math.random().toString(36).slice(2)}`,
            submission_timestamp: new Date().toISOString(),
            first_name: form.first_name.trim() || null,
            last_name: form.last_name.trim() || null,
            thaiid: form.thaiid.trim() || null,
            hn_number: form.hn_number.trim() || null,
            age: form.age ? Number(form.age) : null,
            province: form.province || null,
            collection_date: form.collection_date || null,
            bmi: form.bmi ? Number(form.bmi) : null,
            weight: form.weight ? Number(form.weight) : null,
            height: form.height ? Number(form.height) : null,
            chest_cm: form.chest_cm ? Number(form.chest_cm) : null,
            waist_cm: form.waist_cm ? Number(form.waist_cm) : null,
            hip_cm: form.hip_cm ? Number(form.hip_cm) : null,
            neck_cm: form.neck_cm ? Number(form.neck_cm) : null,
            bp_supine: form.bp_supine.trim() || null,
            pr_supine: form.pr_supine ? Number(form.pr_supine) : null,
            bp_upright: form.bp_upright.trim() || null,
            pr_upright: form.pr_upright ? Number(form.pr_upright) : null,
          })
          .select('id')
          .single()

        if (patErr) throw new Error(`patients_v2: ${patErr.message}`)

        if (hasDiag) {
          const { error: diagErr } = await supabase
            .schema('core')
            .from('patient_diagnosis_v2')
            .insert({ patient_id: patientData.id, ...diagPayload })

          if (diagErr) throw new Error(`patient_diagnosis_v2: ${diagErr.message}`)
        }
      }

      setForm(EMPTY)
      onCreated()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setSaving(false)
    }
  }

  const handleClose = () => {
    if (saving) return
    setForm(EMPTY)
    setError(null)
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="max-h-[90vh] w-[95vw] sm:w-[92vw] lg:w-[88vw] sm:!max-w-[92vw] lg:!max-w-[88vw] xl:!max-w-6xl overflow-y-auto p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle>
            {isEdit
              ? 'แก้ไขข้อมูลผู้ป่วย'
              : prefillPatient
                ? `เพิ่ม Visit - ${prefillPatient.first_name ?? ''} ${prefillPatient.last_name ?? ''}`.trim()
                : 'เพิ่มผู้ป่วยใหม่ (core schema)'}
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-4 py-2">
          {canUseAssessmentAssist && (
            <>
              <div className="col-span-2 rounded-xl border border-slate-200 bg-slate-50 p-4">
                {canEditPatientInfo ? (
                  <>
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">ชื่อ</Label>
                        <Input value={form.first_name} onChange={(e) => set('first_name', e.target.value)} placeholder="ชื่อจริง" />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">นามสกุล</Label>
                        <Input value={form.last_name} onChange={(e) => set('last_name', e.target.value)} placeholder="นามสกุล" />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">อายุ</Label>
                        <Input type="number" min={0} max={150} value={form.age} onChange={(e) => set('age', e.target.value)} placeholder="ปี" />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">วันที่เก็บข้อมูล</Label>
                        <Input type="date" value={form.collection_date} onChange={(e) => set('collection_date', e.target.value)} />
                      </div>
                    </div>
                    <div className="mt-2 text-xs text-slate-500">HN: {form.hn_number || '-'}</div>
                  </>
                ) : (
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-600">
                    <span className="font-semibold text-slate-900">
                      {form.first_name || '-'} {form.last_name || '-'}
                    </span>
                    <span>HN: {form.hn_number || '-'}</span>
                    <span>Age: {form.age || '-'}</span>
                    <span>Collection: {form.collection_date || '-'}</span>
                  </div>
                )}
              </div>

              <div className="col-span-2 border-t pt-2">
                <p className="text-sm font-medium text-muted-foreground">Assessment Scores</p>
              </div>

              {loadingAssessments ? (
                <div className="col-span-2 rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
                  Loading assessment scores...
                </div>
              ) : (
                <div className="col-span-2 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  <AssessmentScoreCard kind="mds" label="MDS-UPDRS" score={assessments.mds} maxScore={ASSESSMENT_MAX_SCORES.mds} />
                  <AssessmentScoreCard kind="moca" label="MoCA" score={assessments.moca} maxScore={ASSESSMENT_MAX_SCORES.moca} />
                  <AssessmentScoreCard kind="tmse" label="TMSE" score={assessments.tmse} maxScore={ASSESSMENT_MAX_SCORES.tmse} />
                  <AssessmentScoreCard kind="hamd" label="HAMD" score={assessments.hamd} maxScore={ASSESSMENT_MAX_SCORES.hamd} suffix={assessments.hamdSeverity} />
                  <AssessmentScoreCard kind="epworth" label="Epworth" score={assessments.epworth} maxScore={ASSESSMENT_MAX_SCORES.epworth} />
                  <AssessmentScoreCard kind="smell" label="Smell Test" score={assessments.smell} maxScore={ASSESSMENT_MAX_SCORES.smell} />
                  <AssessmentScoreCard kind="rbd" label="RBD Questionnaire" score={assessments.rbd} maxScore={ASSESSMENT_MAX_SCORES.rbd} />
                  <AssessmentScoreCard kind="rome4" label="Rome IV" score={assessments.rome4} maxScore={ASSESSMENT_MAX_SCORES.rome4} />
                </div>
              )}

              {assessmentError && (
                <div className="col-span-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                  Unable to load assessment scores: {assessmentError}
                </div>
              )}
            </>
          )}

          {!canUseAssessmentAssist && (
            <>
          {/* Patient info */}
          <div className="space-y-1">
            <Label>ชื่อ *</Label>
            <Input value={form.first_name} onChange={(e) => set('first_name', e.target.value)} placeholder="ชื่อจริง" />
          </div>
          <div className="space-y-1">
            <Label>นามสกุล *</Label>
            <Input value={form.last_name} onChange={(e) => set('last_name', e.target.value)} placeholder="นามสกุล" />
          </div>
          <div className="col-span-2 space-y-1">
            <Label>เลขบัตรประชาชน (Thai ID)</Label>
            <Input
              value={form.thaiid}
              onChange={(e) => set('thaiid', e.target.value.replace(/\D/g, '').slice(0, 13))}
              placeholder="เลข 13 หลัก"
              maxLength={13}
              className="font-mono"
            />
          </div>
          <div className="space-y-1">
            <Label>HN Number</Label>
            <Input value={form.hn_number} onChange={(e) => set('hn_number', e.target.value)} placeholder="HN" />
          </div>
          <div className="space-y-1">
            <Label>อายุ</Label>
            <Input type="number" min={0} max={150} value={form.age} onChange={(e) => set('age', e.target.value)} placeholder="ปี" />
          </div>
          <div className="space-y-1">
            <Label>จังหวัด</Label>
            <select
              value={form.province}
              onChange={(e) => set('province', e.target.value)}
              className="w-full border border-gray-300 rounded-md p-2 text-sm"
            >
              <option value="">-- เลือกจังหวัด --</option>
              {provinceOptions.filter((o) => o.value !== 'null').map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <Label>วันที่เก็บข้อมูล</Label>
            <Input type="date" value={form.collection_date} onChange={(e) => set('collection_date', e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label>BMI</Label>
            <Input type="number" step="0.1" value={form.bmi} onChange={(e) => set('bmi', e.target.value)} placeholder="kg/m²" />
          </div>

          {/* Body measurements */}
          <div className="col-span-2 border-t pt-2">
            <p className="text-sm font-medium text-muted-foreground">ข้อมูลร่างกาย (ไม่บังคับ)</p>
          </div>

          <div className="space-y-1">
            <Label>น้ำหนัก (kg)</Label>
            <Input type="number" step="0.1" value={form.weight} onChange={(e) => set('weight', e.target.value)} placeholder="กิโลกรัม" />
          </div>
          <div className="space-y-1">
            <Label>ส่วนสูง (cm)</Label>
            <Input type="number" step="0.1" value={form.height} onChange={(e) => set('height', e.target.value)} placeholder="เซนติเมตร" />
          </div>
          <div className="space-y-1">
            <Label>รอบอก (cm)</Label>
            <Input type="number" step="0.1" value={form.chest_cm} onChange={(e) => set('chest_cm', e.target.value)} placeholder="ซม." />
          </div>
          <div className="space-y-1">
            <Label>รอบเอว (cm)</Label>
            <Input type="number" step="0.1" value={form.waist_cm} onChange={(e) => set('waist_cm', e.target.value)} placeholder="ซม." />
          </div>
          <div className="space-y-1">
            <Label>รอบสะโพก (cm)</Label>
            <Input type="number" step="0.1" value={form.hip_cm} onChange={(e) => set('hip_cm', e.target.value)} placeholder="ซม." />
          </div>
          <div className="space-y-1">
            <Label>รอบคอ (cm)</Label>
            <Input type="number" step="0.1" value={form.neck_cm} onChange={(e) => set('neck_cm', e.target.value)} placeholder="ซม." />
          </div>
          <div className="space-y-1">
            <Label>BP Supine (mmHg)</Label>
            <Input value={form.bp_supine} onChange={(e) => set('bp_supine', e.target.value)} placeholder="เช่น 120/80" />
          </div>
          <div className="space-y-1">
            <Label>PR Supine (/min)</Label>
            <Input type="number" value={form.pr_supine} onChange={(e) => set('pr_supine', e.target.value)} placeholder="ครั้ง/นาที" />
          </div>
          <div className="space-y-1">
            <Label>BP Upright (mmHg)</Label>
            <Input value={form.bp_upright} onChange={(e) => set('bp_upright', e.target.value)} placeholder="เช่น 110/70" />
          </div>
          <div className="space-y-1">
            <Label>PR Upright (/min)</Label>
            <Input type="number" value={form.pr_upright} onChange={(e) => set('pr_upright', e.target.value)} placeholder="ครั้ง/นาที" />
          </div>
            </>
          )}

          {/* Diagnosis */}
          <div className="col-span-2 border-t pt-2">
            <div className="flex items-center gap-2">
              <p className="text-sm font-medium text-muted-foreground">ข้อมูลการวินิจฉัย (ไม่บังคับ)</p>
              {!canEditDiag && (
                <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full">
                  เฉพาะแพทย์เท่านั้น
                </span>
              )}
            </div>
          </div>

          <div className="col-span-2 rounded-lg border border-slate-200 bg-slate-50 p-4">
            <div className="mb-2 text-sm font-semibold text-slate-900">Diagnosis Guide</div>
            <div className="space-y-2 text-sm leading-6 text-slate-700">
              {DIAGNOSIS_GUIDES.map((guide) => (
                <p key={guide}>{guide}</p>
              ))}
            </div>
          </div>

          <div className="space-y-1">
            <Label>Condition</Label>
            <select
              value={form.condition}
              onChange={(e) => set('condition', e.target.value.toLowerCase())}
              disabled={!canEditDiag}
              className="w-full border border-gray-300 rounded-md p-2 text-sm disabled:bg-gray-100 disabled:text-muted-foreground disabled:cursor-not-allowed"
            >
              {CONDITION_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <Label>H&amp;Y Stage</Label>
            <select
              value={form.hy_stage}
              onChange={(e) => set('hy_stage', e.target.value)}
              disabled={!canEditDiag}
              className="w-full border border-gray-300 rounded-md p-2 text-sm disabled:bg-gray-100 disabled:text-muted-foreground disabled:cursor-not-allowed"
            >
              {QA_HY_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <Label>Disease duration</Label>
            <Input value={form.disease_duration} onChange={(e) => set('disease_duration', e.target.value)} placeholder="เช่น 2 ปี" disabled={!canEditDiag} />
          </div>
          <div className="col-span-2 space-y-1">
            <Label>Other diagnosis</Label>
            <textarea
              value={form.other_diagnosis_text}
              onChange={(e) => set('other_diagnosis_text', e.target.value)}
              placeholder="Additional diagnosis details"
              disabled={!canEditDiag}
              rows={4}
              className="w-full resize-y rounded-md border border-gray-300 px-3 py-2 text-sm disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-muted-foreground"
            />
          </div>

          {/* Prodromal Flags */}
          <div className="col-span-2 border-t pt-2">
            <p className="text-sm font-medium text-muted-foreground">Prodromal Flags</p>
          </div>

          {/* RBD */}
          <div className="col-span-2 space-y-2">
            <label className={`flex items-center gap-2 text-sm font-medium ${canEditDiag ? 'cursor-pointer' : 'cursor-not-allowed opacity-60'}`}>
              <input type="checkbox" checked={form.rbd_suspected} onChange={(e) => canEditDiag && set('rbd_suspected', e.target.checked)} disabled={!canEditDiag} className="h-4 w-4" />
              Suspected RBD
            </label>
            {form.rbd_suspected && (
              <div className="grid grid-cols-2 gap-2 pl-6">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Onset Age</Label>
                  <Input value={form.rbd_onset_age} onChange={(e) => set('rbd_onset_age', e.target.value)} placeholder="เช่น 60 ปี" className="text-sm" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Duration</Label>
                  <Input value={form.rbd_duration} onChange={(e) => set('rbd_duration', e.target.value)} placeholder="เช่น 2 ปี" className="text-sm" />
                </div>
              </div>
            )}
          </div>

          {/* Hyposmia */}
          <div className="col-span-2 space-y-2">
            <label className={`flex items-center gap-2 text-sm font-medium ${canEditDiag ? 'cursor-pointer' : 'cursor-not-allowed opacity-60'}`}>
              <input type="checkbox" checked={form.hyposmia} onChange={(e) => canEditDiag && set('hyposmia', e.target.checked)} disabled={!canEditDiag} className="h-4 w-4" />
              Hyposmia
            </label>
            {form.hyposmia && (
              <div className="grid grid-cols-2 gap-2 pl-6">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Onset Age</Label>
                  <Input value={form.hyposmia_onset_age} onChange={(e) => set('hyposmia_onset_age', e.target.value)} placeholder="เช่น 60 ปี" className="text-sm" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Duration</Label>
                  <Input value={form.hyposmia_duration} onChange={(e) => set('hyposmia_duration', e.target.value)} placeholder="เช่น 2 ปี" className="text-sm" />
                </div>
              </div>
            )}
          </div>

          {/* Constipation */}
          <div className="col-span-2 space-y-2">
            <label className={`flex items-center gap-2 text-sm font-medium ${canEditDiag ? 'cursor-pointer' : 'cursor-not-allowed opacity-60'}`}>
              <input type="checkbox" checked={form.constipation} onChange={(e) => canEditDiag && set('constipation', e.target.checked)} disabled={!canEditDiag} className="h-4 w-4" />
              Constipation
            </label>
            {form.constipation && (
              <div className="grid grid-cols-2 gap-2 pl-6">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Onset Age</Label>
                  <Input value={form.constipation_onset_age} onChange={(e) => set('constipation_onset_age', e.target.value)} placeholder="เช่น 60 ปี" className="text-sm" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Duration</Label>
                  <Input value={form.constipation_duration} onChange={(e) => set('constipation_duration', e.target.value)} placeholder="เช่น 2 ปี" className="text-sm" />
                </div>
              </div>
            )}
          </div>

          {/* Depression */}
          <div className="col-span-2 space-y-2">
            <label className={`flex items-center gap-2 text-sm font-medium ${canEditDiag ? 'cursor-pointer' : 'cursor-not-allowed opacity-60'}`}>
              <input type="checkbox" checked={form.depression} onChange={(e) => canEditDiag && set('depression', e.target.checked)} disabled={!canEditDiag} className="h-4 w-4" />
              Depression
            </label>
            {form.depression && (
              <div className="grid grid-cols-2 gap-2 pl-6">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Onset Age</Label>
                  <Input value={form.depression_onset_age} onChange={(e) => set('depression_onset_age', e.target.value)} placeholder="เช่น 60 ปี" className="text-sm" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Duration</Label>
                  <Input value={form.depression_duration} onChange={(e) => set('depression_duration', e.target.value)} placeholder="เช่น 2 ปี" className="text-sm" />
                </div>
              </div>
            )}
          </div>

          {/* EDS */}
          <div className="col-span-2 space-y-2">
            <label className={`flex items-center gap-2 text-sm font-medium ${canEditDiag ? 'cursor-pointer' : 'cursor-not-allowed opacity-60'}`}>
              <input type="checkbox" checked={form.eds} onChange={(e) => canEditDiag && set('eds', e.target.checked)} disabled={!canEditDiag} className="h-4 w-4" />
              Excessive Daytime Sleepiness (EDS)
            </label>
            {form.eds && (
              <div className="grid grid-cols-2 gap-2 pl-6">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Onset Age</Label>
                  <Input value={form.eds_onset_age} onChange={(e) => set('eds_onset_age', e.target.value)} placeholder="เช่น 60 ปี" className="text-sm" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Duration</Label>
                  <Input value={form.eds_duration} onChange={(e) => set('eds_duration', e.target.value)} placeholder="เช่น 2 ปี" className="text-sm" />
                </div>
              </div>
            )}
          </div>

          {/* ANS dysfunction */}
          <div className="col-span-2 space-y-2">
            <label className={`flex items-center gap-2 text-sm font-medium ${canEditDiag ? 'cursor-pointer' : 'cursor-not-allowed opacity-60'}`}>
              <input type="checkbox" checked={form.ans_dysfunction} onChange={(e) => canEditDiag && set('ans_dysfunction', e.target.checked)} disabled={!canEditDiag} className="h-4 w-4" />
              ANS Dysfunction
            </label>
            {form.ans_dysfunction && (
              <div className="grid grid-cols-2 gap-2 pl-6">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Onset Age</Label>
                  <Input value={form.ans_onset_age} onChange={(e) => set('ans_onset_age', e.target.value)} placeholder="เช่น 60 ปี" className="text-sm" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Duration</Label>
                  <Input value={form.ans_duration} onChange={(e) => set('ans_duration', e.target.value)} placeholder="เช่น 2 ปี" className="text-sm" />
                </div>
              </div>
            )}
          </div>

          <div className="col-span-2 space-y-2">
            <label className={`flex items-center gap-2 text-sm font-medium ${canEditDiag ? 'cursor-pointer' : 'cursor-not-allowed opacity-60'}`}>
              <input type="checkbox" checked={form.mild_parkinsonian_sign} onChange={(e) => canEditDiag && set('mild_parkinsonian_sign', e.target.checked)} disabled={!canEditDiag} className="h-4 w-4" />
              Mild parkinsonian sign
            </label>
          </div>

          <div className="col-span-2 space-y-2">
            <label className={`flex items-center gap-2 text-sm font-medium ${canEditDiag ? 'cursor-pointer' : 'cursor-not-allowed opacity-60'}`}>
              <input type="checkbox" checked={form.family_history_pd} onChange={(e) => canEditDiag && set('family_history_pd', e.target.checked)} disabled={!canEditDiag} className="h-4 w-4" />
              Family history of PD (First degree)
            </label>
          </div>

          {/* Clinical Scores */}
          <div className="col-span-2 border-t pt-2">
            <p className="text-sm font-medium text-muted-foreground">Clinical Scores</p>
          </div>
{/* 
          <div className="col-span-2 grid gap-3 lg:grid-cols-2">
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
              {/* <div className="mb-2 text-sm font-semibold text-slate-900">HAM-D Severity Guide</div> */}
              {/* <div className="space-y-1 text-sm text-slate-700">
                {HAMD_GUIDES.map((guide) => (
                  <p key={guide}>{guide}</p>
                ))}
              </div>
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
              <div className="mb-2 text-sm font-semibold text-slate-900">Epworth Interpretation Guide</div>
              <div className="space-y-1 text-sm text-slate-700">
                {EPWORTH_GUIDES.map((guide) => (
                  <p key={guide}>{guide}</p>
                ))}
              </div> */}
            {/* </div> */}
          {/* </div> */}

          <div className="space-y-1">
            <Label>ADL Score</Label>
            <Input type="number" value={form.adl_score} onChange={(e) => set('adl_score', e.target.value)} placeholder="คะแนน" disabled={!canEditDiag} />
          </div>
          <div className="space-y-1">
            <Label>SCOPA-AUT Score</Label>
            <Input type="number" value={form.scopa_aut_score} onChange={(e) => set('scopa_aut_score', e.target.value)} placeholder="คะแนน" disabled={!canEditDiag} />
          </div>
          <div className="col-span-2 space-y-1">
            <Label>Blood Test Note</Label>
            <div className="flex items-center gap-2">
              <Input value={form.blood_test_note} onChange={(e) => set('blood_test_note', e.target.value)} placeholder="เช่น Genetic test: GP2" disabled={!canEditDiag} className="flex-1" />
              <button type="button" onClick={() => set('blood_test_note', 'Genetic test: GP2')} className="px-4 py-2 border border-gray-300 rounded text-sm text-gray-700 hover:bg-gray-50" disabled={!canEditDiag}>
                Auto fill
              </button>
            </div>
          </div>

          <div className="col-span-2 space-y-2">
            <label className={`flex items-center gap-2 text-sm font-medium ${canEditDiag ? 'cursor-pointer' : 'cursor-not-allowed opacity-60'}`}>
              <input type="checkbox" checked={form.fdopa_pet_requested} onChange={(e) => canEditDiag && set('fdopa_pet_requested', e.target.checked)} disabled={!canEditDiag} className="h-4 w-4" />
              FDOPA PET Requested
            </label>
            {form.fdopa_pet_requested && (
              <div className="pl-6">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">FDOPA PET Score / Result</Label>
                  <Input value={form.fdopa_pet_score} onChange={(e) => set('fdopa_pet_score', e.target.value)} placeholder="ผลหรือค่า score" className="text-sm" />
                </div>
              </div>
            )}
          </div>
        </div>

        {error && (
          <p className="text-sm text-red-600 mt-1"><strong>Error:</strong> {error}</p>
        )}

        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={handleClose} disabled={saving}>ยกเลิก</Button>
          <Button onClick={handleSubmit} disabled={saving} className="bg-blue-600 hover:bg-blue-700 text-white">
            {saving ? 'กำลังบันทึก...' : isEdit ? 'บันทึกการแก้ไข' : 'บันทึก'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function getAssessmentCategory(kind: AssessmentKind, score: number | null | undefined): AssessmentCategory {
  if (score == null) return { label: 'No data', tone: ASSESSMENT_TONE_STYLES.muted }

  const thresholds = ASSESSMENT_THRESHOLDS[kind]
  if (!thresholds) return { label: String(score), tone: ASSESSMENT_TONE_STYLES.muted }

  for (const threshold of thresholds) {
    if (threshold.min != null && threshold.max != null) {
      if (score >= threshold.min && score <= threshold.max) {
        return { label: threshold.label, tone: ASSESSMENT_TONE_STYLES[threshold.tone] }
      }
      continue
    }

    if (threshold.max != null && score <= threshold.max) {
      return { label: threshold.label, tone: ASSESSMENT_TONE_STYLES[threshold.tone] }
    }

    if (threshold.min != null && score >= threshold.min) {
      return { label: threshold.label, tone: ASSESSMENT_TONE_STYLES[threshold.tone] }
    }
  }

  return { label: String(score), tone: ASSESSMENT_TONE_STYLES.muted }
}

function progressColor(category: AssessmentCategory): string {
  if (category.tone.includes('emerald') || category.tone.includes('green')) return 'bg-emerald-400'
  if (category.tone.includes('amber') || category.tone.includes('orange')) return 'bg-orange-400'
  if (category.tone.includes('rose') || category.tone.includes('red')) return 'bg-rose-400'
  return 'bg-slate-300'
}

function AssessmentScoreCard({
  kind,
  label,
  score,
  maxScore,
  suffix,
}: {
  kind: AssessmentKind
  label: string
  score: number | null | undefined
  maxScore: number
  suffix?: string | null
}) {
  const category = getAssessmentCategory(kind, score)
  const pct = score != null && maxScore ? Math.min((score / maxScore) * 100, 100) : null

  return (
    <div className="rounded-xl bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <div className="text-sm font-semibold text-slate-700">{label}</div>
        <span className={category.tone}>{category.label}</span>
      </div>

      <div className="mt-3 flex items-baseline gap-2">
        <span className="text-2xl font-bold text-slate-900">{score != null ? score : '-'}</span>
        <span className="text-sm text-gray-400">/ {maxScore}</span>
      </div>

      {suffix && <div className="mt-1 text-xs text-gray-500">{suffix}</div>}

      {pct != null && (
        <div className="mt-3 h-1.5 w-full rounded-full bg-slate-100">
          <div
            className={`h-1.5 rounded-full transition-all ${progressColor(category)}`}
            style={{ width: `${pct}%` }}
          />
        </div>
      )}
    </div>
  )
}
