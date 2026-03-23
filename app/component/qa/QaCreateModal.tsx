'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { QA_CONDITION_OPTIONS, QA_HY_OPTIONS, QaPatient, QaDiagnosisRow } from './types'
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
  adl_score: '',
  scopa_aut_score: '',
  blood_test_note: '',
  fdopa_pet_requested: false,
  fdopa_pet_score: '',
}

function buildDiagPayload(form: FormState) {
  return {
    condition: form.condition || null,
    hy_stage: form.hy_stage || null,
    disease_duration: form.disease_duration.trim() || null,
    other_diagnosis_text: form.other_diagnosis_text.trim() || null,
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
  prefillData?: Partial<FormState>
}

export default function QaCreateModal({ open, onClose, onCreated, editPatient, editDiag, prefillData }: Props) {
  const isEdit = !!editPatient
  const [form, setForm] = useState<FormState>(EMPTY)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const set = (field: keyof FormState, value: string | boolean) =>
    setForm((prev) => ({ ...prev, [field]: value }))

  // Pre-fill form in edit mode or from prefillData
  useEffect(() => {
    if (open && editPatient) {
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
        adl_score: editDiag?.adl_score != null ? String(editDiag.adl_score) : '',
        scopa_aut_score: editDiag?.scopa_aut_score != null ? String(editDiag.scopa_aut_score) : '',
        blood_test_note: editDiag?.blood_test_note ?? '',
        fdopa_pet_requested: editDiag?.fdopa_pet_requested ?? false,
        fdopa_pet_score: editDiag?.fdopa_pet_score ?? '',
      })
    } else if (open && !editPatient) {
      setForm(prefillData ? { ...EMPTY, ...prefillData } : EMPTY)
    }
  }, [open, editPatient, editDiag, prefillData])

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
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'แก้ไขข้อมูลผู้ป่วย' : 'เพิ่มผู้ป่วยใหม่ (core schema)'}</DialogTitle>
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
            <p className="text-sm font-medium text-muted-foreground">ข้อมูลการวินิจฉัย (ไม่บังคับ)</p>
          </div>

          <div className="space-y-1">
            <Label>Condition</Label>
            <select
              value={form.condition}
              onChange={(e) => set('condition', e.target.value)}
              className="w-full border border-gray-300 rounded-md p-2 text-sm"
            >
              {QA_CONDITION_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <Label>H&amp;Y Stage</Label>
            <select
              value={form.hy_stage}
              onChange={(e) => set('hy_stage', e.target.value)}
              className="w-full border border-gray-300 rounded-md p-2 text-sm"
            >
              {QA_HY_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <Label>Disease duration</Label>
            <Input value={form.disease_duration} onChange={(e) => set('disease_duration', e.target.value)} placeholder="เช่น 2 ปี" />
          </div>
          <div className="space-y-1">
            <Label>Other diagnosis</Label>
            <Input value={form.other_diagnosis_text} onChange={(e) => set('other_diagnosis_text', e.target.value)} placeholder="รายละเอียดเพิ่มเติม" />
          </div>

          {/* Prodromal Flags */}
          <div className="col-span-2 border-t pt-2">
            <p className="text-sm font-medium text-muted-foreground">Prodromal Flags</p>
          </div>

          {/* RBD */}
          <div className="col-span-2 space-y-2">
            <label className="flex items-center gap-2 text-sm font-medium cursor-pointer">
              <input type="checkbox" checked={form.rbd_suspected} onChange={(e) => set('rbd_suspected', e.target.checked)} className="h-4 w-4" />
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
            <label className="flex items-center gap-2 text-sm font-medium cursor-pointer">
              <input type="checkbox" checked={form.hyposmia} onChange={(e) => set('hyposmia', e.target.checked)} className="h-4 w-4" />
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
            <label className="flex items-center gap-2 text-sm font-medium cursor-pointer">
              <input type="checkbox" checked={form.constipation} onChange={(e) => set('constipation', e.target.checked)} className="h-4 w-4" />
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
            <label className="flex items-center gap-2 text-sm font-medium cursor-pointer">
              <input type="checkbox" checked={form.depression} onChange={(e) => set('depression', e.target.checked)} className="h-4 w-4" />
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
            <label className="flex items-center gap-2 text-sm font-medium cursor-pointer">
              <input type="checkbox" checked={form.eds} onChange={(e) => set('eds', e.target.checked)} className="h-4 w-4" />
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
            <label className="flex items-center gap-2 text-sm font-medium cursor-pointer">
              <input type="checkbox" checked={form.ans_dysfunction} onChange={(e) => set('ans_dysfunction', e.target.checked)} className="h-4 w-4" />
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

          {/* Clinical Scores */}
          <div className="col-span-2 border-t pt-2">
            <p className="text-sm font-medium text-muted-foreground">Clinical Scores</p>
          </div>

          <div className="space-y-1">
            <Label>ADL Score</Label>
            <Input type="number" value={form.adl_score} onChange={(e) => set('adl_score', e.target.value)} placeholder="คะแนน" />
          </div>
          <div className="space-y-1">
            <Label>SCOPA-AUT Score</Label>
            <Input type="number" value={form.scopa_aut_score} onChange={(e) => set('scopa_aut_score', e.target.value)} placeholder="คะแนน" />
          </div>
          <div className="col-span-2 space-y-1">
            <Label>Blood Test Note</Label>
            <Input value={form.blood_test_note} onChange={(e) => set('blood_test_note', e.target.value)} placeholder="หมายเหตุผลเลือด" />
          </div>

          <div className="col-span-2 space-y-2">
            <label className="flex items-center gap-2 text-sm font-medium cursor-pointer">
              <input type="checkbox" checked={form.fdopa_pet_requested} onChange={(e) => set('fdopa_pet_requested', e.target.checked)} className="h-4 w-4" />
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
