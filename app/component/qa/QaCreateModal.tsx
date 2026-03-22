'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { QA_CONDITION_OPTIONS, QA_HY_OPTIONS } from './types'
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
  hn_number: string
  age: string
  province: string
  collection_date: string
  bmi: string
  condition: string
  hy_stage: string
  disease_duration: string
  other_diagnosis_text: string
  constipation: boolean
  rbd_suspected: boolean
}

const EMPTY: FormState = {
  first_name: '',
  last_name: '',
  hn_number: '',
  age: '',
  province: '',
  collection_date: '',
  bmi: '',
  condition: '',
  hy_stage: '',
  disease_duration: '',
  other_diagnosis_text: '',
  constipation: false,
  rbd_suspected: false,
}

interface Props {
  open: boolean
  onClose: () => void
  onCreated: () => void
}

export default function QaCreateModal({ open, onClose, onCreated }: Props) {
  const [form, setForm] = useState<FormState>(EMPTY)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const set = (field: keyof FormState, value: string | boolean) =>
    setForm((prev) => ({ ...prev, [field]: value }))

  const handleSubmit = async () => {
    if (!form.first_name.trim() || !form.last_name.trim()) {
      setError('กรุณากรอกชื่อและนามสกุล')
      return
    }

    setSaving(true)
    setError(null)

    try {
      // 1. Insert patient
      const { data: patientData, error: patErr } = await supabase
        .schema('core')
        .from('patients_v2')
        .insert({
          form_submission_hash: `qa-manual-${Date.now()}-${Math.random().toString(36).slice(2)}`,
          first_name: form.first_name.trim() || null,
          last_name: form.last_name.trim() || null,
          hn_number: form.hn_number.trim() || null,
          age: form.age ? Number(form.age) : null,
          province: form.province || null,
          collection_date: form.collection_date || null,
          bmi: form.bmi ? Number(form.bmi) : null,
        })
        .select('id')
        .single()

      if (patErr) throw new Error(`patients_v2: ${patErr.message}`)

      const patientId = patientData.id

      // 2. Insert diagnosis if any diagnosis field is filled
      const hasDiag =
        form.condition ||
        form.hy_stage ||
        form.disease_duration ||
        form.other_diagnosis_text ||
        form.constipation ||
        form.rbd_suspected

      if (hasDiag) {
        const { error: diagErr } = await supabase
          .schema('core')
          .from('patient_diagnosis_v2')
          .insert({
            patient_id: patientId,
            condition: form.condition || null,
            hy_stage: form.hy_stage || null,
            disease_duration: form.disease_duration.trim() || null,
            other_diagnosis_text: form.other_diagnosis_text.trim() || null,
            constipation: form.constipation,
            rbd_suspected: form.rbd_suspected,
          })

        if (diagErr) throw new Error(`patient_diagnosis_v2: ${diagErr.message}`)
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
          <DialogTitle>เพิ่มผู้ป่วยใหม่ (core schema)</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-4 py-2">
          {/* Patient info */}
          <div className="space-y-1">
            <Label>ชื่อ *</Label>
            <Input
              value={form.first_name}
              onChange={(e) => set('first_name', e.target.value)}
              placeholder="ชื่อจริง"
            />
          </div>
          <div className="space-y-1">
            <Label>นามสกุล *</Label>
            <Input
              value={form.last_name}
              onChange={(e) => set('last_name', e.target.value)}
              placeholder="นามสกุล"
            />
          </div>
          <div className="space-y-1">
            <Label>HN Number</Label>
            <Input
              value={form.hn_number}
              onChange={(e) => set('hn_number', e.target.value)}
              placeholder="HN"
            />
          </div>
          <div className="space-y-1">
            <Label>อายุ</Label>
            <Input
              type="number"
              min={0}
              max={150}
              value={form.age}
              onChange={(e) => set('age', e.target.value)}
              placeholder="ปี"
            />
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
            <Input
              type="date"
              value={form.collection_date}
              onChange={(e) => set('collection_date', e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label>BMI</Label>
            <Input
              type="number"
              step="0.1"
              value={form.bmi}
              onChange={(e) => set('bmi', e.target.value)}
              placeholder="kg/m²"
            />
          </div>

          {/* Divider */}
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
            <Input
              value={form.disease_duration}
              onChange={(e) => set('disease_duration', e.target.value)}
              placeholder="เช่น 2 ปี"
            />
          </div>
          <div className="space-y-1">
            <Label>Other diagnosis</Label>
            <Input
              value={form.other_diagnosis_text}
              onChange={(e) => set('other_diagnosis_text', e.target.value)}
              placeholder="รายละเอียดเพิ่มเติม"
            />
          </div>

          <div className="col-span-2 flex gap-6">
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={form.constipation}
                onChange={(e) => set('constipation', e.target.checked)}
                className="h-4 w-4"
              />
              Constipation
            </label>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={form.rbd_suspected}
                onChange={(e) => set('rbd_suspected', e.target.checked)}
                className="h-4 w-4"
              />
              Suspected RBD
            </label>
          </div>
        </div>

        {error && (
          <p className="text-sm text-red-600 mt-1"><strong>Error:</strong> {error}</p>
        )}

        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={handleClose} disabled={saving}>
            ยกเลิก
          </Button>
          <Button onClick={handleSubmit} disabled={saving} className="bg-blue-600 hover:bg-blue-700 text-white">
            {saving ? 'กำลังบันทึก...' : 'บันทึก'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
