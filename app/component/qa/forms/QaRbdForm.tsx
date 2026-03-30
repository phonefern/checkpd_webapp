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
  { key: 'q01', label: '1. คุณฝันบ่อยหรือไม่',                                                     group: 'A' },
  { key: 'q02', label: '2. คุณฝันร้ายบ่อยหรือไม่',                                                  group: 'A' },
  { key: 'q03', label: '3. ความฝันมีเนื้อหาสะเทือนใจและน่าเศร้า',                                   group: 'A' },
  { key: 'q04', label: '4. ความฝันมีเนื้อหารุนแรงหรือก้าวร้าว (ทะเลาะ ต่อสู้)',                     group: 'A' },
  { key: 'q05', label: '5. ความฝันมีเนื้อหาน่ากลัวหรือน่าสยดสยอง (ผีไล่ตาม หลอกหลอน)',            group: 'A' },
  { key: 'q06', label: '6. คุณละเมอพูดหรือออกเสียงระหว่างหลับ',                                     group: 'B' },
  { key: 'q07', label: '7. คุณตะโกน โวยวาย หรือพูดคำหยาบระหว่างนอนหลับ',                           group: 'B' },
  { key: 'q08', label: '8. คุณขยับแขนหรือขาตามเนื้อหาความฝัน',                                      group: 'B' },
  { key: 'q09', label: '9. คุณเคยพลัดตกจากที่นอน',                                                  group: 'B' },
  { key: 'q10', label: '10. คุณเคยทำร้ายตัวเองหรือคู่นอนระหว่างหลับ',                               group: 'B' },
  { key: 'q11', label: '11. คุณเคยพยายามทำร้ายคู่นอนหรือเกือบทำร้ายตัวเอง',                        group: 'B' },
  { key: 'q12', label: '12. เหตุการณ์ข้อ 10 หรือ 11 เกี่ยวข้องกับเนื้อหาความฝัน',                  group: 'B' },
  { key: 'q13', label: '13. เหตุการณ์ต่างๆ รบกวนการนอนหลับของคุณ',                                  group: 'A' },
]

const FREQ_OPTIONS = [
  { value: '1', label: '1–3 ครั้ง/ปี' },
  { value: '2', label: '1–3 ครั้ง/เดือน' },
  { value: '3', label: '1–3 ครั้ง/สัปดาห์' },
  { value: '4', label: 'มากกว่า 3 ครั้ง/สัปดาห์' },
]

type Answer = 'yes' | 'no' | 'unknown'
type QState = { answer: Answer; frequency: string }
type FormState = Record<string, QState>
const makeEmpty = (): FormState =>
  Object.fromEntries(QUESTIONS.map((q) => [q.key, { answer: 'no' as Answer, frequency: '' }]))

function calcScore(form: FormState): number {
  return QUESTIONS.reduce((total, q) => {
    const { answer, frequency } = form[q.key]
    if (answer !== 'yes' || !frequency) return total
    const freq = Number(frequency)
    return total + (q.group === 'A' ? freq : freq * 2)
  }, 0)
}

function AnswerToggle({ value, onChange }: { value: Answer; onChange: (v: Answer) => void }) {
  const opts: Answer[] = ['no', 'yes', 'unknown']
  const labels: Record<Answer, string> = { no: 'ไม่', yes: 'ใช่', unknown: 'ไม่แน่ใจ' }
  return (
    <div className="flex gap-1">
      {opts.map((v) => (
        <button
          key={v}
          onClick={() => onChange(v)}
          className={`px-3 py-1.5 text-sm rounded border transition-colors ${value === v ? 'bg-blue-600 text-white border-blue-600' : 'hover:bg-muted/60'}`}
        >
          {labels[v]}
        </button>
      ))}
    </div>
  )
}

export default function QaRbdForm({ open, patientId, onClose, onSaved }: Props) {
  const [form, setForm] = useState<FormState>(makeEmpty())
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    const cols = QUESTIONS.flatMap((q) => [`${q.key}_answer`, `${q.key}_frequency`]).join(',')
    supabase.schema('core').from('rbd_questionnaire_v2')
      .select(cols)
      .eq('patient_id', patientId).maybeSingle()
      .then(({ data }) => {
        if (data) {
          const d = data as unknown as Record<string, string | null>
          const f = makeEmpty()
          for (const q of QUESTIONS) {
            f[q.key] = {
              answer: (d[`${q.key}_answer`] as Answer) ?? 'no',
              frequency: d[`${q.key}_frequency`] ?? '',
            }
          }
          setForm(f)
        } else {
          setForm(makeEmpty())
        }
        setError(null)
      })
  }, [open, patientId])

  const score = calcScore(form)
  const interpretation = score >= 17 ? 'มีความเสี่ยงสูงต่อ RBD (≥ 17)' : 'มีความเสี่ยงต่ำต่อ RBD (< 17)'

  const setQ = (key: string, patch: Partial<QState>) =>
    setForm((p) => ({ ...p, [key]: { ...p[key], ...patch } }))

  const handleSave = async () => {
    setSaving(true); setError(null)
    const payload: Record<string, string | number | null> = { patient_id: patientId, total_score: score }
    for (const q of QUESTIONS) {
      const { answer, frequency } = form[q.key]
      const freq = answer === 'yes' && frequency ? Number(frequency) : null
      payload[`${q.key}_answer`] = answer
      payload[`${q.key}_frequency`] = answer === 'yes' ? (frequency || null) : null
      payload[`${q.key}_score`] = freq != null ? (q.group === 'A' ? freq : freq * 2) : 0
    }
    const { error: err } = await supabase.schema('core').from('rbd_questionnaire_v2').upsert(payload, { onConflict: 'patient_id' })
    setSaving(false)
    if (err) { setError(err.message); return }
    onSaved(); onClose()
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>RBD Questionnaire — แบบประเมินพฤติกรรมการนอนหลับ</DialogTitle></DialogHeader>
        <p className="text-sm text-muted-foreground mb-3">
          กลุ่ม A: ตอบใช่ = คะแนนตามความถี่ (1–4) &nbsp;|&nbsp; กลุ่ม B: ตอบใช่ = ความถี่ × 2 (2–8)
        </p>
        <div className="space-y-3">
          {QUESTIONS.map((q) => {
            const state = form[q.key]
            return (
              <div key={q.key} className="border rounded p-4">
                <div className="flex items-start gap-3">
                  <p className="text-base flex-1">{q.label} <span className="text-sm text-muted-foreground">(กลุ่ม {q.group})</span></p>
                  <AnswerToggle value={state.answer} onChange={(v) => setQ(q.key, { answer: v, frequency: v !== 'yes' ? '' : state.frequency })} />
                </div>
                {state.answer === 'yes' && (
                  <div className="mt-2 flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">ความถี่:</span>
                    <div className="flex gap-1.5 flex-wrap">
                      {FREQ_OPTIONS.map((f) => (
                        <button
                          key={f.value}
                          onClick={() => setQ(q.key, { frequency: f.value })}
                          className={`px-3 py-1.5 text-sm rounded border transition-colors ${state.frequency === f.value ? 'bg-blue-600 text-white border-blue-600' : 'hover:bg-muted/60'}`}
                        >
                          {f.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
        <div className="mt-4 rounded bg-slate-50 p-3 text-sm font-semibold">
          คะแนนรวม: {score} &nbsp;—&nbsp; <span className={`font-normal ${score >= 17 ? 'text-red-600' : 'text-green-600'}`}>{interpretation}</span>
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
