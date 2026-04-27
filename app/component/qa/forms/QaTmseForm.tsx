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
  calculation_100_7: number
  calculation_93_7: number
  calculation_86_7: number
  language_watch: number; language_shirt: number; language_repeat: number
  language_3step_take_paper: number; language_3step_fold_paper: number; language_3step_hand_paper: number
  language_read_close_eyes: number; language_draw: number; language_similarity: number
  recall: number
}

const EMPTY: FormState = {
  orientation_day: 0, orientation_date: 0, orientation_month: 0,
  orientation_time: 0, orientation_place: 0, orientation_picture: 0,
  registration: 0, attention: 0, calculation: 0,
  calculation_100_7: 0, calculation_93_7: 0, calculation_86_7: 0,
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
  const [totalScore, setTotalScore] = useState(0)
  const [calculationMode, setCalculationMode] = useState<'total' | 'steps'>('total')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    supabase.schema('core').from('tmse_v2')
      .select('orientation_day,orientation_date,orientation_month,orientation_time,orientation_place,orientation_picture,registration,attention,calculation,language_watch,language_shirt,language_repeat,language_3step_take_paper,language_3step_fold_paper,language_3step_hand_paper,language_read_close_eyes,language_draw,language_similarity,recall,total_score')
      .eq('patient_id', patientId).maybeSingle()
      .then(({ data }) => {
        if (data) {
          const d = data as unknown as Record<string, number | null>
          const f: FormState = {
            ...EMPTY,
            orientation_day: d.orientation_day ?? 0,
            orientation_date: d.orientation_date ?? 0,
            orientation_month: d.orientation_month ?? 0,
            orientation_time: d.orientation_time ?? 0,
            orientation_place: d.orientation_place ?? 0,
            orientation_picture: d.orientation_picture ?? 0,
            registration: d.registration ?? 0,
            attention: d.attention ?? 0,
            calculation: d.calculation ?? 0,
            language_watch: d.language_watch ?? 0,
            language_shirt: d.language_shirt ?? 0,
            language_repeat: d.language_repeat ?? 0,
            language_3step_take_paper: d.language_3step_take_paper ?? 0,
            language_3step_fold_paper: d.language_3step_fold_paper ?? 0,
            language_3step_hand_paper: d.language_3step_hand_paper ?? 0,
            language_read_close_eyes: d.language_read_close_eyes ?? 0,
            language_draw: d.language_draw ?? 0,
            language_similarity: d.language_similarity ?? 0,
            recall: d.recall ?? 0,
          }
          setForm(f)
          setCalculationMode('total')
          const calculated = (
            f.orientation_day + f.orientation_date + f.orientation_month +
            f.orientation_time + f.orientation_place + f.orientation_picture +
            f.registration + f.attention + f.calculation +
            f.language_watch + f.language_shirt + f.language_repeat +
            f.language_3step_take_paper + f.language_3step_fold_paper + f.language_3step_hand_paper +
            f.language_read_close_eyes + f.language_draw + f.language_similarity +
            f.recall
          )
          setTotalScore(d.total_score ?? calculated)
        } else {
          setForm(EMPTY)
          setCalculationMode('total')
          setTotalScore(0)
        }
        setError(null)
      })
  }, [open, patientId])

  const orientationTotal = form.orientation_day + form.orientation_date + form.orientation_month +
    form.orientation_time + form.orientation_place + form.orientation_picture
  const languageTotal = form.language_watch + form.language_shirt + form.language_repeat +
    form.language_3step_take_paper + form.language_3step_fold_paper + form.language_3step_hand_paper +
    form.language_read_close_eyes + form.language_draw + form.language_similarity
  const calculationStepsTotal = form.calculation_100_7 + form.calculation_93_7 + form.calculation_86_7
  const calculationScore = calculationMode === 'steps' ? calculationStepsTotal : form.calculation
  const calculatedScore = orientationTotal + form.registration + form.attention + calculationScore + languageTotal + form.recall
  const normalizedTotalScore = Number.isFinite(totalScore)
    ? Math.max(0, Math.min(30, totalScore))
    : 0
  const interpretation = normalizedTotalScore >= 23 ? 'ปกติ (≥ 23)' : 'มีแนวโน้มภาวะสมองเสื่อม (< 23)'

  const set = (key: keyof FormState, val: number) => setForm((p) => ({ ...p, [key]: val }))

  const handleSave = async () => {
    setSaving(true); setError(null)
    const payload = {
      patient_id: patientId,
      orientation_day: form.orientation_day,
      orientation_date: form.orientation_date,
      orientation_month: form.orientation_month,
      orientation_time: form.orientation_time,
      orientation_place: form.orientation_place,
      orientation_picture: form.orientation_picture,
      registration: form.registration,
      attention: form.attention,
      calculation: calculationScore,
      language_watch: form.language_watch,
      language_shirt: form.language_shirt,
      language_repeat: form.language_repeat,
      language_3step_take_paper: form.language_3step_take_paper,
      language_3step_fold_paper: form.language_3step_fold_paper,
      language_3step_hand_paper: form.language_3step_hand_paper,
      language_read_close_eyes: form.language_read_close_eyes,
      language_draw: form.language_draw,
      language_similarity: form.language_similarity,
      recall: form.recall,
      total_score: normalizedTotalScore,
    }
    const { error: err } = await supabase.schema('core').from('tmse_v2').upsert(
      payload,
      { onConflict: 'patient_id' }
    )
    setSaving(false)
    if (err) { setError(err.message); return }
    onSaved(); onClose()
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
        className="max-h-[90vh] w-[95vw] sm:w-[90vw] lg:w-[82vw] sm:!max-w-[90vw] lg:!max-w-4xl overflow-y-auto p-4 sm:p-6">
        <DialogHeader><DialogTitle>TMSE — Thai Mental State Examination</DialogTitle></DialogHeader>

        <div className="space-y-4 mt-2">
          {/* Orientation */}
          <div className="rounded border bg-white p-3">
            <p className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-2">
              Orientation (6 pts) — รวม: {orientationTotal}
            </p>
            {[
              { key: 'orientation_day', label: 'วันนี้ เป็นวันอะไรของสัปดาห์(จันทร์ อังคาร พุธ พฤหัส ฯลฯ)' },
              { key: 'orientation_date', label: 'วันนี้ วันที่เท่าไหร่' },
              { key: 'orientation_month', label: 'เดือนนี้ เดือนอะไร' },
              { key: 'orientation_time', label: 'ขณะนี้เป็นช่วงเวลาไหนของวัน (เช้า เที่ยง บ่าย เย็น)' },
              { key: 'orientation_place', label: 'ที่นี่ที่ไหน (บริเวณที่ตรวจ)' },
              { key: 'orientation_picture', label: 'คนที่เห็นในภาพนี้มีอาชีพอะไร (ภาพอยู่ด้านหลัง)' },
            ].map((item) => (
              <div key={item.key} className="flex items-center gap-3 py-1">
                <span className="text-base flex-1">{item.label}</span>
                <ScoreSelect value={form[item.key as keyof FormState]} max={1} onChange={(v) => set(item.key as keyof FormState, v)} />
                <span className="text-sm text-muted-foreground w-8">/1</span>
              </div>
            ))}
          </div>

          {/* Registration */}
          <div className="rounded border bg-white p-3">
            <p className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-2">Registration (3 pts)</p>
            <div className="flex flex-col gap-3">
              <p className="text-xs text-muted-foreground">
                ผู้ตรวจออกคำสั่งชื่อของ 3 สิ่งให้ผู้ถูกทดสอบฟังครั้งเดียว โดยเว้นระยะห่างประมาณ 1 วินาที แล้วให้ผู้ถูกทดสอบพูดซ้ำคำทั้ง 3 คำให้ถูกต้องตามที่ได้ยิน
              </p>
              <div className="flex items-center gap-3">
                <span className="text-base flex-1">ทวนคำ 3 คำแล้วจำเอาไว้: ต้นไม้, รถยนต์, มือ</span>
                <ScoreSelect value={form.registration} max={3} onChange={(v) => set('registration', v)} />
                <span className="text-xs text-muted-foreground w-6">/ 3</span>
              </div>
            </div>
          </div>

          {/* Attention */}
          <div className="rounded border bg-white p-3">
            <p className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-2">Attention (5 pts)</p>
            <div className="flex items-center gap-3">
              <span className="text-base flex-1">ให้บอกวันย้อนหลังจากวันอาทิตย์ถึงวันเสาร์ ให้ครบสัปดาห์ เช่น ศุกร์, พฤหัสบดี, พุธ, อังคาร, จันทร์</span>
              <ScoreSelect value={form.attention} max={5} onChange={(v) => set('attention', v)} />
              <span className="text-xs text-muted-foreground w-6">/ 5</span>
            </div>
          </div>

          {/* Calculation */}
          <div className="rounded border bg-white p-3">
            <p className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-2">Calculation (3 pts)</p>
            <p className="text-xs text-muted-foreground mb-2">
              ให้เลือกว่าข้อใดถูกต้องสำหรับแต่ละขั้นตอนของการลบ 7: 100-7, 93-7, 86-7
            </p>
            {[
              { key: 'calculation_100_7', label: '100 - 7' },
              { key: 'calculation_93_7', label: '93 - 7' },
              { key: 'calculation_86_7', label: '86 - 7' },
            ].map((item) => (
              <div key={item.key} className="flex items-center gap-3 py-1">
                <span className="text-base flex-1">{item.label}</span>
                <select
                  value={form[item.key as keyof FormState]}
                  onChange={(e) => {
                    set(item.key as keyof FormState, Number(e.target.value))
                    setCalculationMode('steps')
                  }}
                  className="border rounded p-1 text-sm w-28 shrink-0"
                >
                  <option value={0}>0 — ไม่ถูก</option>
                  <option value={1}>1 — ถูก</option>
                </select>
                <span className="text-sm text-muted-foreground w-8">/1</span>
              </div>
            ))}
            <div className="text-sm text-muted-foreground">คะแนนปัจจุบัน: {calculationScore} / 3</div>
          </div>

          {/* Language */}
          <div className="rounded border bg-white p-3">
            <p className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-2">
              Language (10 pts) — รวม: {languageTotal}
            </p>
      
            {[
              { key: 'language_watch', label: 'ผู้ทดสอบชี้ไปที่นาฬิกาข้อมูล แล้วถามผู้ถูกทดสอบว่าโดยทั่วไป "เราเรียกสิ่งนี้ว่าอะไร" (นาฬิกา)', max: 1 },
              { key: 'language_shirt', label: 'ผู้ทดสอบชี้ไปที่เสื้อของตนเอง แล้วถามผู้ทดสอบว่าโดยทั่วไป "เราเรียกสิ่งนี้ว่าอะไร" (เสื้อ/ผ้า)', max: 1 },
              { key: 'language_repeat', label: 'ผู้ทดสอบบอกผู้ทดสอบให้ตั้งใจฟังประโยคต่อไปนี้ให้ดี แล้วจำไว้ จากนั้นให้พูดตาม "ยายพาหลานไปซื้อขนมที่ตลาด"', max: 1 },
              { key: 'language_3step_take_paper', label: 'หยิบกระดาษด้วยมือขวา', max: 1 },
              { key: 'language_3step_fold_paper', label: 'พับกระดาษเป็นครี่งแผ่น', max: 1 },
              { key: 'language_3step_hand_paper', label: 'ส่งกระดาษให้ผู้ตรวจ', max: 1 },
              { key: 'language_read_close_eyes', label: 'ให้ผู้ทดสอบอ่านแล้วทำตามคำสั่ง "หลับตา" (ข้อความอยู่ด้านหลัง)', max: 1 },
              { key: 'language_draw', label: 'จงวาดภาพต่อไปนี้ให้เหมือนตัวอย่างมากที่สุด เท่าที่ท่านจะสามารถทำได้ (ภาพอยู่ด้านหลัง)', max: 2 },
              { key: 'language_similarity', label: 'กล้วยกับส้ม เหมือนกันคือผลไม้ แล้วแมวกับสุนัขเหมือนกันคือ (เป็นสัตว์. เป็นสิ่งมีชีวิต)', max: 1 },
            ].map((item) => (
              <div key={item.key} className="py-1">
                <div className="flex items-center gap-3">
                  <span className="text-base flex-1">{item.label}</span>
                  <ScoreSelect value={form[item.key as keyof FormState]} max={item.max} onChange={(v) => set(item.key as keyof FormState, v)} />
                  <span className="text-sm text-muted-foreground w-8">/{item.max}</span>
                </div>
                {item.key === 'language_repeat' && (
                  <p className="mt-1 pl-1 text-xs text-muted-foreground">
                  จงทำตามคำสั่งต่อไปนี้ (มี 3 ชั้นตอนคำสั่ง) ให้ผู้ทดสอบพูดต่อกันไปให้ครบทั้ง 3 ขั้นตอน "หยิบกระดาษด้วยมือขวา พับกระดาษเป็นครึ่งแผ่น แล้วส่งกระดาษให้ผู้ตรวจ
                  </p>
                )}
              </div>
            ))}
          </div>

          {/* Recall */}
          <div className="rounded border bg-white p-3">
            <p className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-2">Recall (3 pts)</p>
            <div className="flex items-center gap-3">
              <span className="text-base flex-1">สิ่งของ 3 อย่างที่บอกให้จำเมื่อสักครู่ มีอะไรบ้าง (ต้นไม้ รถยนต์ มือ)</span>
              <ScoreSelect value={form.recall} max={3} onChange={(v) => set('recall', v)} />
              <span className="text-xs text-muted-foreground w-6">/ 3</span>
            </div>
          </div>
        </div>

        <div className="mt-4 rounded border bg-white p-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div className="text-sm font-semibold">
              คะแนนรวม: {normalizedTotalScore} / 30 &nbsp;—&nbsp; <span className="font-normal">{interpretation}</span>
              <p className="text-xs font-normal text-muted-foreground mt-1">Calculated from sections: {calculatedScore}</p>
            </div>
            <div>
              <label htmlFor="tmse-total-score" className="block text-xs text-muted-foreground mb-1">total_score</label>
              <div className="flex items-center gap-2">
                <input
                  id="tmse-total-score"
                  type="number"
                  min={0}
                  max={30}
                  value={totalScore}
                  onChange={(e) => setTotalScore(Number(e.target.value))}
                  className="w-24 rounded border px-2 py-1 text-sm"
                />
                <Button type="button" variant="outline" onClick={() => setTotalScore(calculatedScore)} className="h-8 px-2 text-xs">
                  Use calc
                </Button>
              </div>
            </div>
          </div>
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

