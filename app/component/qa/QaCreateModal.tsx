'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { QA_HY_OPTIONS, QaPatient, QaDiagnosisRow, normalizeQaConditionValue } from './types'
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

interface FormState {
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

function buildDiagPayload(form: FormState) {
  const otherDiagnosisText = form.other_diagnosis_text.trim()

  return {
    condition: form.condition || (otherDiagnosisText ? 'other' : null),
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
  const canEditDiag = role !== 'medical_staff'
  const [form, setForm] = useState<FormState>(EMPTY)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const set = (field: keyof FormState, value: string | boolean) =>
    setForm((prev) => ({ ...prev, [field]: value }))

  // Pre-fill form in edit mode, add-visit mode, or from prefillData
  useEffect(() => {
    if (!open) return

    if (editPatient) {
      setForm({
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
        condition: normalizeQaConditionValue(editDiag?.condition ?? (editDiag?.other_diagnosis_text ? 'other' : '')),
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
      setForm(prefillData ? { ...EMPTY, ...prefillData } : EMPTY)
    }
  }, [open, editPatient, editDiag, prefillPatient, prefillData])

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
        const { data: patientData, error: patErr } = await supabase
          .schema('core')
          .from('patients_v2')
          .insert({
            form_submission_hash: `qa-manual-${Date.now()}-${Math.random().toString(36).slice(2)}`,
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
