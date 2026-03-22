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
  { key: 'q01_reading',       label: 'ขณะนั่งอ่านหนังสือ' },
  { key: 'q02_watching_tv',   label: 'ขณะดูโทรทัศน์' },
  { key: 'q03_sitting_public',label: 'ขณะนั่งเฉยๆ นอกบ้าน ในที่สาธารณะ' },
  { key: 'q04_passenger',     label: 'ขณะนั่งเป็นผู้โดยสารในรถ รถไฟ หรือเครื่องบิน เป็นเวลานาน 1 ชั่วโมง' },
  { key: 'q05_after_lunch',   label: 'ขณะนั่งเงียบๆ หลังรับประทานอาหารกลางวัน (ไม่มีการดื่มแอลกอฮอล์)' },
  { key: 'q06_sitting_resting',label: 'ขณะนั่งเอนหลังพักผ่อนช่วงบ่าย เมื่อมีโอกาส' },
  { key: 'q07_stopped_traffic',label: 'ขณะขับรถแล้วต้องหยุดนิ่ง 2-3 นาที ตามจังหวะการจราจร' },
]

type FormState = Record<string, number>
const EMPTY: FormState = {
  q01_reading: 0, q02_watching_tv: 0, q03_sitting_public: 0,
  q04_passenger: 0, q05_after_lunch: 0, q06_sitting_resting: 0, q07_stopped_traffic: 0,
}

function getInterpretation(score: number) {
  if (score <= 6) return 'ปกติ (≤ 6)'
  if (score <= 9) return 'มีแนวโน้มง่วงผิดปกติ (7–9)'
  return 'ผิดปกติชัดเจน (≥ 10)'
}

export default function QaEpworthForm({ open, patientId, onClose, onSaved }: Props) {
  const [form, setForm] = useState<FormState>(EMPTY)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    supabase.schema('core').from('epworth_v2')
      .select('q01_reading,q02_watching_tv,q03_sitting_public,q04_passenger,q05_after_lunch,q06_sitting_resting,q07_stopped_traffic')
      .eq('patient_id', patientId).maybeSingle()
      .then(({ data }) => {
        if (data) {
          const f: FormState = {}
          for (const k of Object.keys(EMPTY)) f[k] = (data as Record<string, number>)[k] ?? 0
          setForm(f)
        } else {
          setForm(EMPTY)
        }
        setError(null)
      })
  }, [open, patientId])

  const score = Object.values(form).reduce((a, b) => a + b, 0)
  const interpretation = getInterpretation(score)

  const handleSave = async () => {
    setSaving(true); setError(null)
    const { error: err } = await supabase.schema('core').from('epworth_v2').upsert(
      { patient_id: patientId, ...form, total_score: score, interpretation },
      { onConflict: 'patient_id' }
    )
    setSaving(false)
    if (err) { setError(err.message); return }
    onSaved(); onClose()
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Epworth Sleepiness Scale</DialogTitle></DialogHeader>
        <p className="text-xs text-muted-foreground mb-3">
          0 = ไม่เคยเลย &nbsp;|&nbsp; 1 = มีโอกาสเล็กน้อย &nbsp;|&nbsp; 2 = มีโอกาสปานกลาง &nbsp;|&nbsp; 3 = มีโอกาสสูงมาก
        </p>
        <div className="space-y-1">
          {QUESTIONS.map((q, i) => (
            <div key={q.key} className="flex items-center gap-3 py-2 border-b">
              <span className="text-sm flex-1">{i + 1}. {q.label}</span>
              <select
                value={form[q.key]}
                onChange={(e) => setForm((p) => ({ ...p, [q.key]: Number(e.target.value) }))}
                className="border rounded p-1 text-sm w-16"
              >
                {[0, 1, 2, 3].map((v) => <option key={v} value={v}>{v}</option>)}
              </select>
            </div>
          ))}
        </div>
        <div className="mt-4 rounded bg-slate-50 p-3 text-sm font-semibold">
          คะแนนรวม: {score} / 21 &nbsp;—&nbsp; <span className="font-normal">{interpretation}</span>
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
