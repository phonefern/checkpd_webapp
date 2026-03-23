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

type QuestionDef = {
  key: keyof FormState
  title: string
  subtitle?: string
  description?: string
  options: { value: number; label: string }[]
}

const QUESTIONS: QuestionDef[] = [
  {
    key: 'q01', title: '1. อารมณ์ซึมเศร้า (DEPRESSED MOOD)',
    subtitle: 'เศร้าใจ, สิ้นหวัง, หมดกำลังใจ, ไร้ค่า',
    options: [
      { value: 0, label: '0 — ไม่มี' },
      { value: 1, label: '1 — จะบอกภาวะความรู้สึกนี้ต่อเมื่อถามเท่านั้น' },
      { value: 2, label: '2 — บอกภาวะความรู้สึกนี้ออกมาเอง' },
      { value: 3, label: '3 — สื่อภาวะนี้โดยภาษากาย ได้แก่ สีหน้า ท่าทาง น้ำเสียง ท่าทางจะร้องไห้' },
      { value: 4, label: '4 — ผู้ป่วยบอกชัดเจนทั้งคำพูดและภาษากาย' },
    ],
  },
  {
    key: 'q02', title: '2. ความรู้สึกผิด (FEELINGS OF GUILT)',
    options: [
      { value: 0, label: '0 — ไม่มี' },
      { value: 1, label: '1 — ติเตียนตนเอง รู้สึกตนเองทำให้ผู้อื่นเสียใจ' },
      { value: 2, label: '2 — ครุ่นคำนึงถึงความผิดพลาดหรือการก่อกรรมทำบาปในอดีต' },
      { value: 3, label: '3 — มีอาการหลงผิดว่าตนเองมีความผิดบาป / ป่วยเพราะถูกลงโทษ' },
      { value: 4, label: '4 — ได้ยินเสียงกล่าวโทษ หรือเห็นภาพหลอนที่ข่มขู่' },
    ],
  },
  {
    key: 'q03', title: '3. ความคิดฆ่าตัวตาย (SUICIDE)',
    options: [
      { value: 0, label: '0 — ไม่มี' },
      { value: 1, label: '1 — รู้สึกชีวิตไร้ค่า' },
      { value: 2, label: '2 — คิดว่าตนเองน่าจะตาย หรือมีความคิดเกี่ยวกับการตาย' },
      { value: 3, label: '3 — มีความคิดหรือท่าทีจะฆ่าตัวตาย' },
      { value: 4, label: '4 — พยายามฆ่าตัวตาย (ความพยายามใดๆ ที่รุนแรง ให้คะแนน 4)' },
    ],
  },
  {
    key: 'q04', title: '4. การนอนไม่หลับช่วงต้น (INSOMNIA EARLY)',
    options: [
      { value: 0, label: '0 — ไม่มีปัญหา นอนหลับได้ปกติ' },
      { value: 1, label: '1 — มีนอนหลับยากบางครั้ง (นานกว่า 30 นาที)' },
      { value: 2, label: '2 — นอนหลับยากทุกคืน' },
    ],
  },
  {
    key: 'q05', title: '5. การนอนไม่หลับช่วงกลางคืน (INSOMNIA MIDDLE)',
    options: [
      { value: 0, label: '0 — ไม่มีปัญหา' },
      { value: 1, label: '1 — กระสับกระส่าย นอนหลับไม่สนิทช่วงกลางคืน' },
      { value: 2, label: '2 — ตื่นกลางดึก (ยกเว้นเพื่อปัสสาวะ)' },
    ],
  },
  {
    key: 'q06', title: '6. การตื่นนอนเช้ากว่าปกติ (INSOMNIA LATE)',
    options: [
      { value: 0, label: '0 — ไม่มีปัญหา' },
      { value: 1, label: '1 — ตื่นแต่เช้ามืด แต่นอนหลับต่อได้' },
      { value: 2, label: '2 — ตื่นเช้ากว่าปกติ ไม่สามารถนอนหลับต่อได้' },
    ],
  },
  {
    key: 'q07', title: '7. การงานและกิจกรรม (WORK AND ACTIVITIES)',
    options: [
      { value: 0, label: '0 — ไม่มีปัญหา' },
      { value: 1, label: '1 — รู้สึกไม่มีสมรรถภาพ เหนื่อยล้า อ่อนแรงในการทำกิจกรรม' },
      { value: 2, label: '2 — หมดความสนใจในกิจกรรม รู้สึกต้องบังคับตนเองทำงาน' },
      { value: 3, label: '3 — ใช้เวลาในการทำงานลดลง (ถ้าอยู่รพ. ทำกิจกรรม < 3 ชม./วัน)' },
      { value: 4, label: '4 — ไม่ได้ทำงานเพราะเจ็บป่วย (อยู่รพ. ไม่ทำกิจกรรมใดเลย)' },
    ],
  },
  {
    key: 'q08', title: '8. ความล้าเฉื่อย (RETARDATION: PSYCHOMOTOR)',
    subtitle: 'ความเชื่องช้าของความคิดและการพูด สมาธิเสื่อม การเคลื่อนไหวลดลง',
    options: [
      { value: 0, label: '0 — การพูดและความคิดปกติ' },
      { value: 1, label: '1 — มีความเฉื่อยชาเล็กน้อยขณะสัมภาษณ์' },
      { value: 2, label: '2 — มีความเฉื่อยชาชัดเจนขณะสัมภาษณ์' },
      { value: 3, label: '3 — สัมภาษณ์ได้อย่างลำบาก' },
      { value: 4, label: '4 — อยู่นิ่งเฉย ไม่ขยับเขยื้อน' },
    ],
  },
  {
    key: 'q09', title: '9. อาการกระวนกระวาย (AGITATION)',
    options: [
      { value: 0, label: '0 — ไม่มี' },
      { value: 1, label: '1 — หงุดหงิดงุ่นง่าน' },
      { value: 2, label: '2 — เล่นมือ สางผม ฯลฯ' },
      { value: 3, label: '3 — ขยับตัวไปมา นั่งนิ่งๆ ไม่ได้' },
      { value: 4, label: '4 — บีบมือ กัดเล็บ ดึงผม กัดริมฝีปาก' },
    ],
  },
  {
    key: 'q10', title: '10. ความวิตกกังวลในจิตใจ (ANXIETY PSYCHOLOGICAL)',
    options: [
      { value: 0, label: '0 — ไม่มีปัญหา' },
      { value: 1, label: '1 — รู้สึกตึงเครียดและหงุดหงิด' },
      { value: 2, label: '2 — กังวลในเรื่องเล็กน้อย' },
      { value: 3, label: '3 — การพูดหรือสีหน้ามีท่าทีหวั่นวิตก' },
      { value: 4, label: '4 — แสดงความหวาดกลัวโดยไม่ต้องถาม' },
    ],
  },
  {
    key: 'q11', title: '11. ความวิตกกังวลซึ่งแสดงออกทางกาย (ANXIETY SOMATIC)',
    description: 'อาการด้านสรีระ เช่น ปากแห้ง ลมขึ้น ท้องเสีย ใจสั่น หายใจหอบ เหงื่อออก ปัสสาวะบ่อย',
    options: [
      { value: 0, label: '0 — ไม่มี' },
      { value: 1, label: '1 — เล็กน้อย' },
      { value: 2, label: '2 — ปานกลาง' },
      { value: 3, label: '3 — รุนแรง' },
      { value: 4, label: '4 — เสื่อมสมรรถภาพ' },
    ],
  },
  {
    key: 'q12', title: '12. อาการทางกาย ระบบทางเดินอาหาร (SOMATIC GI)',
    options: [
      { value: 0, label: '0 — ไม่มี' },
      { value: 1, label: '1 — เบื่ออาหาร แต่รับประทานได้โดยไม่ต้องกระตุ้น รู้สึกหน่วงในท้อง' },
      { value: 2, label: '2 — รับประทานอาหารยาก ต้องมีคนกระตุ้น หรือต้องใช้ยาระบาย' },
    ],
  },
  {
    key: 'q13', title: '13. อาการทางกาย ทั่วไป (SOMATIC GENERAL)',
    options: [
      { value: 0, label: '0 — ไม่มี' },
      { value: 1, label: '1 — ตึงแขนขา ปวดหลัง ปวดศีรษะ ปวดกล้ามเนื้อ ไม่มีแรงและอ่อนเพลีย' },
      { value: 2, label: '2 — มีอาการใดๆ ที่ชัดเจน' },
    ],
  },
  {
    key: 'q14', title: '14. อาการเกี่ยวกับระบบสืบพันธุ์ (GENITAL SYMPTOMS)',
    options: [
      { value: 0, label: '0 — ไม่มี (เช่น หมดความสนใจทางเพศ ประจำเดือนผิดปกติ)' },
      { value: 1, label: '1 — เล็กน้อย' },
      { value: 2, label: '2 — ปานกลาง' },
    ],
  },
  {
    key: 'q15', title: '15. อาการคิดว่าตนป่วยเป็นโรคทางกาย (HYPOCHONDRIASIS)',
    options: [
      { value: 0, label: '0 — ไม่มี' },
      { value: 1, label: '1 — สนใจอยู่แต่เรื่องของตนเอง (ด้านร่างกาย)' },
      { value: 2, label: '2 — หมกมุ่นเรื่องสุขภาพ' },
      { value: 3, label: '3 — แจ้งอาการต่างๆ บ่อย เรียกร้องความช่วยเหลือ' },
      { value: 4, label: '4 — มีอาการหลงผิดว่าตนป่วยเป็นโรคทางกาย' },
    ],
  },
  {
    key: 'q17', title: '17. การหยั่งเห็นถึงความผิดปกติของตนเอง (INSIGHT)',
    options: [
      { value: 0, label: '0 — ตระหนักว่าตนเองกำลังซึมเศร้าและเจ็บป่วย' },
      { value: 1, label: '1 — ตระหนักว่าเจ็บป่วย แต่โยงสาเหตุกับปัจจัยอื่น (ดินฟ้าอากาศ การทำงานหนัก ฯลฯ)' },
      { value: 2, label: '2 — ปฏิเสธการเจ็บป่วยโดยสิ้นเชิง' },
    ],
  },
]

function getSeverity(score: number) {
  if (score <= 7)  return { text: 'ไม่มีภาวะซึมเศร้า (≤ 7)',          color: 'bg-green-50 text-green-800' }
  if (score <= 12) return { text: 'ซึมเศร้าเล็กน้อย (8–12)',            color: 'bg-yellow-50 text-yellow-800' }
  if (score <= 17) return { text: 'ซึมเศร้าปานกลาง (13–17)',           color: 'bg-orange-50 text-orange-800' }
  if (score <= 29) return { text: 'ซึมเศร้าระดับรุนแรง (18–29)',       color: 'bg-red-50 text-red-800' }
  return            { text: 'ซึมเศร้าระดับรุนแรงมาก (≥ 30)',           color: 'bg-red-100 text-red-900' }
}

function RadioQuestion({
  q, value, onChange,
}: { q: QuestionDef; value: number; onChange: (v: number) => void }) {
  return (
    <div className="border rounded p-3 bg-white space-y-2">
      <p className="text-sm font-medium">{q.title}</p>
      {q.subtitle   && <p className="text-xs text-muted-foreground italic">{q.subtitle}</p>}
      {q.description && <p className="text-xs text-blue-700 bg-blue-50 rounded p-2">{q.description}</p>}
      <div className="space-y-1 pt-1">
        {q.options.map((opt) => (
          <label key={opt.value} className="flex items-start gap-2 cursor-pointer hover:bg-slate-50 rounded p-1 transition-colors">
            <input
              type="radio"
              name={q.key}
              checked={value === opt.value}
              onChange={() => onChange(opt.value)}
              className="mt-0.5 shrink-0"
            />
            <span className={`text-sm ${value === opt.value ? 'font-medium text-blue-700' : 'text-slate-700'}`}>
              {opt.label}
            </span>
          </label>
        ))}
      </div>
    </div>
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
      total_score: score, severity_level: severity.text,
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

        <div className="space-y-3 mt-2">
          {QUESTIONS.map((q) => (
            <RadioQuestion key={q.key} q={q} value={form[q.key] as number} onChange={(v) => set(q.key, v)} />
          ))}

          {/* Question 16: Weight loss */}
          <div className="border rounded p-3 bg-white space-y-3">
            <p className="text-sm font-medium">16. น้ำหนักลด (LOSS OF WEIGHT) — เลือกวิธีประเมิน</p>
            <div className="flex gap-6">
              <label className="flex items-center gap-2 cursor-pointer text-sm">
                <input type="radio" checked={form.q16method === 'a'} onChange={() => setForm((p) => ({ ...p, q16method: 'a' }))} />
                ก. ซักประวัติ
              </label>
              <label className="flex items-center gap-2 cursor-pointer text-sm">
                <input type="radio" checked={form.q16method === 'b'} onChange={() => setForm((p) => ({ ...p, q16method: 'b' }))} />
                ข. ชั่งน้ำหนักจริง
              </label>
            </div>

            {form.q16method === 'a' && (
              <div className="space-y-1">
                {[
                  { value: 0, label: '0 — ไม่มีน้ำหนักลด' },
                  { value: 1, label: '1 — อาจมีน้ำหนักลด ซึ่งเกี่ยวเนื่องกับการเจ็บป่วยครั้งนี้' },
                  { value: 2, label: '2 — น้ำหนักลดชัดเจน (ตามคำบอกเล่าของผู้ป่วย)' },
                ].map((opt) => (
                  <label key={opt.value} className="flex items-start gap-2 cursor-pointer hover:bg-slate-50 rounded p-1">
                    <input type="radio" checked={form.q16a === opt.value} onChange={() => set('q16a', opt.value)} className="mt-0.5 shrink-0" />
                    <span className={`text-sm ${form.q16a === opt.value ? 'font-medium text-blue-700' : 'text-slate-700'}`}>{opt.label}</span>
                  </label>
                ))}
              </div>
            )}

            {form.q16method === 'b' && (
              <div className="space-y-1">
                {[
                  { value: 0, label: '0 — น้ำหนักลดน้อยกว่า 0.5 กก. ใน 1 สัปดาห์' },
                  { value: 1, label: '1 — น้ำหนักลดมากกว่า 0.5 กก. ใน 1 สัปดาห์' },
                  { value: 2, label: '2 — น้ำหนักลดมากกว่า 1 กก. ใน 1 สัปดาห์' },
                ].map((opt) => (
                  <label key={opt.value} className="flex items-start gap-2 cursor-pointer hover:bg-slate-50 rounded p-1">
                    <input type="radio" checked={form.q16b === opt.value} onChange={() => set('q16b', opt.value)} className="mt-0.5 shrink-0" />
                    <span className={`text-sm ${form.q16b === opt.value ? 'font-medium text-blue-700' : 'text-slate-700'}`}>{opt.label}</span>
                  </label>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className={`mt-4 rounded p-3 text-sm font-semibold ${severity.color}`}>
          คะแนนรวม: {score} / 52 &nbsp;—&nbsp; <span className="font-normal">{severity.text}</span>
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
