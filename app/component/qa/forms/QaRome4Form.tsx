'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

interface Props {
  open: boolean
  patientId: number
  onClose: () => void
  onSaved: () => void
}

const QUESTIONS = [
  { key: 'q01_straining',             label: 'ต้องเบ่งอุจจาระอย่างน้อย 25% ของการขับถ่ายทั้งหมด' },
  { key: 'q02_hard_stool',            label: 'อุจจาระแข็งหรือเป็นก้อนอย่างน้อย 25% ของการขับถ่าย' },
  { key: 'q03_incomplete_evacuation', label: 'มีความรู้สึกว่าอุจจาระไม่หมดอย่างน้อย 25% ของการขับถ่าย' },
  { key: 'q04_anorectal_obstruction', label: 'มีความรู้สึกว่ามีสิ่งกีดขวางที่ทวารหนักอย่างน้อย 25% ของการขับถ่าย' },
  { key: 'q05_manual_maneuvers',      label: 'ต้องใช้มือช่วยในการขับถ่ายอย่างน้อย 25% ของการขับถ่าย' },
  { key: 'q06_less_3_per_week',       label: 'ขับถ่ายอุจจาระน้อยกว่า 3 ครั้งต่อสัปดาห์' },
]

type FormState = Record<string, number>
const EMPTY: FormState = {
  q01_straining: 0, q02_hard_stool: 0, q03_incomplete_evacuation: 0,
  q04_anorectal_obstruction: 0, q05_manual_maneuvers: 0, q06_less_3_per_week: 0,
}

export default function QaRome4Form({ open, patientId, onClose, onSaved }: Props) {
  const [form, setForm] = useState<FormState>(EMPTY)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    supabase.schema('core').from('rome4_v2')
      .select('q01_straining,q02_hard_stool,q03_incomplete_evacuation,q04_anorectal_obstruction,q05_manual_maneuvers,q06_less_3_per_week')
      .eq('patient_id', patientId).maybeSingle()
      .then(({ data }) => {
        if (data) {
          const f: FormState = {}
          for (const k of Object.keys(EMPTY)) f[k] = (data as unknown as Record<string, number>)[k] ?? 0
          setForm(f)
        } else {
          setForm(EMPTY)
        }
        setError(null)
      })
  }, [open, patientId])

  const score = Object.values(form).reduce((a, b) => a + b, 0)
  const interpretation = score >= 2 ? 'มีโอกาสเป็นท้องผูกเรื้อรัง (≥ 2 ข้อ)' : 'ปกติ (< 2 ข้อ)'

  const toggleQ = (key: string) =>
    setForm((p) => ({ ...p, [key]: p[key] === 1 ? 0 : 1 }))

  const handleSave = async () => {
    setSaving(true); setError(null)
    const { error: err } = await supabase.schema('core').from('rome4_v2').upsert(
      { patient_id: patientId, ...form, total_score: score },
      { onConflict: 'patient_id' }
    )
    setSaving(false)
    if (err) { setError(err.message); return }
    onSaved(); onClose()
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-h-[90vh] w-[95vw] sm:w-[90vw] lg:w-[82vw] sm:!max-w-[90vw] lg:!max-w-4xl overflow-y-auto p-4 sm:p-6">
        <DialogHeader><DialogTitle>ROME IV — เกณฑ์วินิจฉัยท้องผูก</DialogTitle></DialogHeader>
        <p className="text-sm text-muted-foreground mb-3">
          อาการเหล่านี้เกิดขึ้นอย่างน้อย 6 เดือน และ 3 เดือนที่ผ่านมา
        </p>
        <div className="space-y-2">
          {QUESTIONS.map((q, i) => (
            <div
              key={q.key}
              className={`flex items-center gap-3 p-4 rounded border cursor-pointer transition-colors ${form[q.key] ? 'bg-blue-50 border-blue-400' : 'hover:bg-muted/40'}`}
              onClick={() => toggleQ(q.key)}
            >
              <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 ${form[q.key] ? 'border-blue-600 bg-blue-600' : 'border-gray-400'}`}>
                {form[q.key] ? <span className="text-white text-sm font-bold">✓</span> : null}
              </div>
              <span className="text-base">{i + 1}. {q.label}</span>
            </div>
          ))}
        </div>
        <div className="mt-4 rounded bg-slate-50 p-3 text-sm font-semibold">
          ตอบใช่: {score} / 6 ข้อ &nbsp;—&nbsp; <span className={`font-normal ${score >= 2 ? 'text-red-600' : 'text-green-600'}`}>{interpretation}</span>
        </div>
        {error && <p className="text-sm text-red-600 mt-2">{error}</p>}
        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={onClose} disabled={saving}>ยกเลิก</Button>
          <Button onClick={handleSave} disabled={saving} className="bg-blue-600 hover:bg-blue-700 text-white">
            {saving ? 'กำลังบันทึก...' : 'บันทึก'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
