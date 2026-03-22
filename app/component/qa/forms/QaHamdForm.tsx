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
  q01: number; q02: number; q03: number; q04: number; q05: number; q06: number
  q07: number; q08: number; q09: number; q10: number; q11: number; q12: number
  q13: number; q14: number; q15: number; q16a: number; q16b: number; q17: number
  q16method: 'a' | 'b'
}
const EMPTY: FormState = {
  q01: 0, q02: 0, q03: 0, q04: 0, q05: 0, q06: 0,
  q07: 0, q08: 0, q09: 0, q10: 0, q11: 0, q12: 0,
  q13: 0, q14: 0, q15: 0, q16a: 0, q16b: 0, q17: 0,
  q16method: 'a',
}

const QUESTIONS_04: { key: keyof FormState; label: string }[] = [
  { key: 'q01', label: '1. อารมณ์ซึมเศร้า (DEPRESSED MOOD)' },
  { key: 'q02', label: '2. ความรู้สึกผิด/ความผิด (FEELINGS OF GUILT)' },
  { key: 'q03', label: '3. ความคิดฆ่าตัวตาย (SUICIDE)' },
  { key: 'q07', label: '7. การงานและกิจกรรม (WORK AND ACTIVITIES)' },
  { key: 'q08', label: '8. ความล้าเฉื่อย (RETARDATION: PSYCHOMOTOR)' },
  { key: 'q09', label: '9. อาการกระวนกระวาย (AGITATION)' },
  { key: 'q10', label: '10. ความวิตกกังวลในจิตใจ (ANXIETY PSYCHOLOGICAL)' },
  { key: 'q11', label: '11. ความวิตกกังวลซึ่งแสดงออกทางกาย (ANXIETY SOMATIC)' },
  { key: 'q15', label: '15. อาการคิดว่าตนป่วย (HYPOCHONDRIASIS)' },
]
const QUESTIONS_02: { key: keyof FormState; label: string }[] = [
  { key: 'q04', label: '4. การนอนไม่หลับช่วงต้น (INSOMNIA EARLY)' },
  { key: 'q05', label: '5. การนอนไม่หลับช่วงกลาง (INSOMNIA MIDDLE)' },
  { key: 'q06', label: '6. การตื่นนอนเช้ากว่าปกติ (INSOMNIA LATE)' },
  { key: 'q12', label: '12. อาการทางกาย – ระบบทางเดินอาหาร (SOMATIC GI)' },
  { key: 'q13', label: '13. อาการทางกาย – ทั่วไป (SOMATIC GENERAL)' },
  { key: 'q14', label: '14. อาการเกี่ยวกับระบบสืบพันธุ์ (GENITAL SYMPTOMS)' },
  { key: 'q17', label: '17. การหยั่งเห็นถึงความผิดปกติ (INSIGHT)' },
]

function getSeverity(score: number) {
  if (score <= 7)  return 'ไม่มีภาวะซึมเศร้า (≤ 7)'
  if (score <= 12) return 'ซึมเศร้าเล็กน้อย (8–12)'
  if (score <= 17) return 'ซึมเศร้าปานกลาง (13–17)'
  if (score <= 29) return 'ซึมเศร้าระดับรุนแรง (18–29)'
  return 'ซึมเศร้าระดับรุนแรงมาก (≥ 30)'
}

function ScoreSelect({ value, max, onChange }: { value: number; max: number; onChange: (v: number) => void }) {
  return (
    <select value={value} onChange={(e) => onChange(Number(e.target.value))} className="border rounded p-1 text-sm w-16">
      {Array.from({ length: max + 1 }, (_, i) => <option key={i} value={i}>{i}</option>)}
    </select>
  )
}

export default function QaHamdForm({ open, patientId, onClose, onSaved }: Props) {
  const [form, setForm] = useState<FormState>(EMPTY)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    supabase.schema('core').from('hamd_v2')
      .select('q01_depressed_mood,q02_guilt,q03_suicide,q04_insomnia_early,q05_insomnia_middle,q06_insomnia_late,q07_work_activities,q08_retardation,q09_agitation,q10_anxiety_psychological,q11_anxiety_somatic,q12_somatic_gastrointestinal,q13_somatic_general,q14_genital_symptoms,q15_hypochondriasis,q16a_weight_loss_history,q16b_weight_loss_measured,q17_insight')
      .eq('patient_id', patientId).maybeSingle()
      .then(({ data }) => {
        if (data) {
          const d = data as Record<string, number | null>
          setForm({
            q01: d.q01_depressed_mood ?? 0, q02: d.q02_guilt ?? 0, q03: d.q03_suicide ?? 0,
            q04: d.q04_insomnia_early ?? 0, q05: d.q05_insomnia_middle ?? 0, q06: d.q06_insomnia_late ?? 0,
            q07: d.q07_work_activities ?? 0, q08: d.q08_retardation ?? 0, q09: d.q09_agitation ?? 0,
            q10: d.q10_anxiety_psychological ?? 0, q11: d.q11_anxiety_somatic ?? 0,
            q12: d.q12_somatic_gastrointestinal ?? 0, q13: d.q13_somatic_general ?? 0,
            q14: d.q14_genital_symptoms ?? 0, q15: d.q15_hypochondriasis ?? 0,
            q16a: d.q16a_weight_loss_history ?? 0, q16b: d.q16b_weight_loss_measured ?? 0,
            q17: d.q17_insight ?? 0,
            q16method: d.q16b_weight_loss_measured != null ? 'b' : 'a',
          })
        } else {
          setForm(EMPTY)
        }
        setError(null)
      })
  }, [open, patientId])

  const q16score = form.q16method === 'a' ? form.q16a : form.q16b
  const score = form.q01 + form.q02 + form.q03 + form.q04 + form.q05 + form.q06 +
    form.q07 + form.q08 + form.q09 + form.q10 + form.q11 + form.q12 +
    form.q13 + form.q14 + form.q15 + q16score + form.q17
  const severity = getSeverity(score)

  const set = (key: keyof FormState, val: number) => setForm((p) => ({ ...p, [key]: val }))

  const handleSave = async () => {
    setSaving(true); setError(null)
    const payload = {
      patient_id: patientId,
      q01_depressed_mood: form.q01, q02_guilt: form.q02, q03_suicide: form.q03,
      q04_insomnia_early: form.q04, q05_insomnia_middle: form.q05, q06_insomnia_late: form.q06,
      q07_work_activities: form.q07, q08_retardation: form.q08, q09_agitation: form.q09,
      q10_anxiety_psychological: form.q10, q11_anxiety_somatic: form.q11,
      q12_somatic_gastrointestinal: form.q12, q13_somatic_general: form.q13,
      q14_genital_symptoms: form.q14, q15_hypochondriasis: form.q15,
      q16a_weight_loss_history: form.q16method === 'a' ? form.q16a : null,
      q16b_weight_loss_measured: form.q16method === 'b' ? form.q16b : null,
      q17_insight: form.q17,
      total_score: score, severity_level: severity,
    }
    const { error: err } = await supabase.schema('core').from('hamd_v2').upsert(payload, { onConflict: 'patient_id' })
    setSaving(false)
    if (err) { setError(err.message); return }
    onSaved(); onClose()
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>HAM-D — Hamilton Depression Rating Scale</DialogTitle></DialogHeader>

        <p className="text-xs font-semibold text-muted-foreground mt-2 mb-1">คะแนน 0–4</p>
        <div className="space-y-2">
          {QUESTIONS_04.map((q) => (
            <div key={q.key} className="flex items-center gap-3 py-1 border-b">
              <span className="text-sm flex-1">{q.label}</span>
              <ScoreSelect value={form[q.key] as number} max={4} onChange={(v) => set(q.key, v)} />
            </div>
          ))}
        </div>

        <p className="text-xs font-semibold text-muted-foreground mt-4 mb-1">คะแนน 0–2</p>
        <div className="space-y-2">
          {QUESTIONS_02.map((q) => (
            <div key={q.key} className="flex items-center gap-3 py-1 border-b">
              <span className="text-sm flex-1">{q.label}</span>
              <ScoreSelect value={form[q.key] as number} max={2} onChange={(v) => set(q.key, v)} />
            </div>
          ))}
        </div>

        <div className="mt-4 border rounded p-3 space-y-2">
          <p className="text-sm font-medium">16. น้ำหนักลด (LOSS OF WEIGHT) — เลือกวิธี</p>
          <div className="flex gap-4 text-sm">
            <label className="flex items-center gap-1 cursor-pointer">
              <input type="radio" checked={form.q16method === 'a'} onChange={() => setForm((p) => ({ ...p, q16method: 'a' }))} />
              ก. ประวัติ (0–2)
            </label>
            <label className="flex items-center gap-1 cursor-pointer">
              <input type="radio" checked={form.q16method === 'b'} onChange={() => setForm((p) => ({ ...p, q16method: 'b' }))} />
              ข. วัดน้ำหนัก (0–2)
            </label>
          </div>
          {form.q16method === 'a' && (
            <div className="flex items-center gap-3">
              <span className="text-xs text-muted-foreground flex-1">ก. ซักประวัติ: 0=ไม่ลด / 1=อาจลด / 2=ลดแน่นอน</span>
              <ScoreSelect value={form.q16a} max={2} onChange={(v) => set('q16a', v)} />
            </div>
          )}
          {form.q16method === 'b' && (
            <div className="flex items-center gap-3">
              <span className="text-xs text-muted-foreground flex-1">ข. วัดจริง: 0=&lt;0.5 กก. / 1=0.5–1 กก. / 2=&gt;1 กก.</span>
              <ScoreSelect value={form.q16b} max={2} onChange={(v) => set('q16b', v)} />
            </div>
          )}
        </div>

        <div className="mt-4 rounded bg-slate-50 p-3 text-sm font-semibold">
          คะแนนรวม: {score} / 52 &nbsp;—&nbsp; <span className="font-normal">{severity}</span>
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
