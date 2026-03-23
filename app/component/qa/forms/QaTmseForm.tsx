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

type FormState = {
  orientation_day: number; orientation_date: number; orientation_month: number
  orientation_time: number; orientation_place: number; orientation_picture: number
  registration: number
  attention: number
  calculation: number
  language_watch: number; language_shirt: number; language_repeat: number
  language_3step_take_paper: number; language_3step_fold_paper: number; language_3step_hand_paper: number
  language_read_close_eyes: number; language_draw: number; language_similarity: number
  recall: number
}

const EMPTY: FormState = {
  orientation_day: 0, orientation_date: 0, orientation_month: 0,
  orientation_time: 0, orientation_place: 0, orientation_picture: 0,
  registration: 0, attention: 0, calculation: 0,
  language_watch: 0, language_shirt: 0, language_repeat: 0,
  language_3step_take_paper: 0, language_3step_fold_paper: 0, language_3step_hand_paper: 0,
  language_read_close_eyes: 0, language_draw: 0, language_similarity: 0,
  recall: 0,
}

function ScoreSelect({ value, max, onChange }: { value: number; max: number; onChange: (v: number) => void }) {
  return (
    <select value={value} onChange={(e) => onChange(Number(e.target.value))} className="border rounded p-1 text-sm w-16 shrink-0">
      {Array.from({ length: max + 1 }, (_, i) => <option key={i} value={i}>{i}</option>)}
    </select>
  )
}

export default function QaTmseForm({ open, patientId, onClose, onSaved }: Props) {
  const [form, setForm] = useState<FormState>(EMPTY)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    supabase.schema('core').from('tmse_v2')
      .select('orientation_day,orientation_date,orientation_month,orientation_time,orientation_place,orientation_picture,registration,attention,calculation,language_watch,language_shirt,language_repeat,language_3step_take_paper,language_3step_fold_paper,language_3step_hand_paper,language_read_close_eyes,language_draw,language_similarity,recall')
      .eq('patient_id', patientId).maybeSingle()
      .then(({ data }) => {
        if (data) {
          const d = data as unknown as Record<string, number | null>
          const f: FormState = {} as FormState
          for (const k of Object.keys(EMPTY)) f[k as keyof FormState] = (d[k] ?? 0) as never
          setForm(f)
        } else {
          setForm(EMPTY)
        }
        setError(null)
      })
  }, [open, patientId])

  const orientationTotal = form.orientation_day + form.orientation_date + form.orientation_month +
    form.orientation_time + form.orientation_place + form.orientation_picture
  const languageTotal = form.language_watch + form.language_shirt + form.language_repeat +
    form.language_3step_take_paper + form.language_3step_fold_paper + form.language_3step_hand_paper +
    form.language_read_close_eyes + form.language_draw + form.language_similarity
  const score = orientationTotal + form.registration + form.attention + form.calculation + languageTotal + form.recall
  const interpretation = score >= 23 ? 'ปกติ (≥ 23)' : 'มีแนวโน้มภาวะสมองเสื่อม (< 23)'

  const set = (key: keyof FormState, val: number) => setForm((p) => ({ ...p, [key]: val }))

  const handleSave = async () => {
    setSaving(true); setError(null)
    const { error: err } = await supabase.schema('core').from('tmse_v2').upsert(
      { patient_id: patientId, ...form, total_score: score },
      { onConflict: 'patient_id' }
    )
    setSaving(false)
    if (err) { setError(err.message); return }
    onSaved(); onClose()
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>TMSE — Thai Mental State Examination</DialogTitle></DialogHeader>

        <div className="space-y-4 mt-2">
          {/* Orientation */}
          <div className="rounded border p-3 bg-purple-50">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
              Orientation (6 pts) — รวม: {orientationTotal}
            </p>
            {[
              { key: 'orientation_day', label: 'วัน (day of week)' },
              { key: 'orientation_date', label: 'วันที่ (date)' },
              { key: 'orientation_month', label: 'เดือน (month)' },
              { key: 'orientation_time', label: 'เวลา (time)' },
              { key: 'orientation_place', label: 'สถานที่ (place)' },
              { key: 'orientation_picture', label: 'ภาพ (picture)' },
            ].map((item) => (
              <div key={item.key} className="flex items-center gap-3 py-1">
                <span className="text-sm flex-1">{item.label}</span>
                <ScoreSelect value={form[item.key as keyof FormState]} max={1} onChange={(v) => set(item.key as keyof FormState, v)} />
                <span className="text-xs text-muted-foreground w-6">/ 1</span>
              </div>
            ))}
          </div>

          {/* Registration */}
          <div className="rounded border p-3 bg-blue-50">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Registration (3 pts)</p>
            <div className="flex items-center gap-3">
              <span className="text-sm flex-1">ทวนคำ 3 คำ (ต้นไม้ รถยนต์ มือ)</span>
              <ScoreSelect value={form.registration} max={3} onChange={(v) => set('registration', v)} />
              <span className="text-xs text-muted-foreground w-6">/ 3</span>
            </div>
          </div>

          {/* Attention */}
          <div className="rounded border p-3 bg-yellow-50">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Attention (5 pts)</p>
            <div className="flex items-center gap-3">
              <span className="text-sm flex-1">นับถอยหลัง 93, 86, 79, 72, 65 (ลบ 100-7)</span>
              <ScoreSelect value={form.attention} max={5} onChange={(v) => set('attention', v)} />
              <span className="text-xs text-muted-foreground w-6">/ 5</span>
            </div>
          </div>

          {/* Calculation */}
          <div className="rounded border p-3 bg-green-50">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Calculation (3 pts)</p>
            <div className="flex items-center gap-3">
              <span className="text-sm flex-1">คำนวณ: มี 20 บาท ซื้อ 3 บาท เหลือเท่าไร ×3</span>
              <ScoreSelect value={form.calculation} max={3} onChange={(v) => set('calculation', v)} />
              <span className="text-xs text-muted-foreground w-6">/ 3</span>
            </div>
          </div>

          {/* Language */}
          <div className="rounded border p-3 bg-orange-50">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
              Language (10 pts) — รวม: {languageTotal}
            </p>
            {[
              { key: 'language_watch', label: 'บอกชื่อนาฬิกา', max: 1 },
              { key: 'language_shirt', label: 'บอกชื่อเสื้อ', max: 1 },
              { key: 'language_repeat', label: 'ทวนประโยค "วันนี้อากาศดีมาก"', max: 1 },
              { key: 'language_3step_take_paper', label: '3-step: หยิบกระดาษ', max: 1 },
              { key: 'language_3step_fold_paper', label: '3-step: พับกระดาษ', max: 1 },
              { key: 'language_3step_hand_paper', label: '3-step: วางกระดาษ', max: 1 },
              { key: 'language_read_close_eyes', label: 'อ่าน "ปิดตา" แล้วทำตาม', max: 1 },
              { key: 'language_draw', label: 'วาดรูปตามตัวอย่าง (pentagon)', max: 1 },
              { key: 'language_similarity', label: 'อธิบายความเหมือน (2 คู่)', max: 2 },
            ].map((item) => (
              <div key={item.key} className="flex items-center gap-3 py-1">
                <span className="text-sm flex-1">{item.label}</span>
                <ScoreSelect value={form[item.key as keyof FormState]} max={item.max} onChange={(v) => set(item.key as keyof FormState, v)} />
                <span className="text-xs text-muted-foreground w-6">/ {item.max}</span>
              </div>
            ))}
          </div>

          {/* Recall */}
          <div className="rounded border p-3 bg-red-50">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Recall (3 pts)</p>
            <div className="flex items-center gap-3">
              <span className="text-sm flex-1">ทวนคำ 3 คำจากก่อนหน้า (ต้นไม้ รถยนต์ มือ)</span>
              <ScoreSelect value={form.recall} max={3} onChange={(v) => set('recall', v)} />
              <span className="text-xs text-muted-foreground w-6">/ 3</span>
            </div>
          </div>
        </div>

        <div className="mt-4 rounded bg-slate-50 p-3 text-sm font-semibold">
          คะแนนรวม: {score} / 30 &nbsp;—&nbsp; <span className="font-normal">{interpretation}</span>
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
