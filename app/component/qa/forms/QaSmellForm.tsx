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

type SmellQuestion = {
  answerKey: string
  recognizeKey: string
  perceiveKey: string
  label: string
  options: string[]
  correct: string
}

const QUESTIONS: SmellQuestion[] = [
  { answerKey: 'smell_01_answer', recognizeKey: 'smell_01_recognize', perceiveKey: 'smell_01_perceive', label: 'กลิ่นที่ 1', options: ['A. ส้ม', 'B. สตรอเบอรี', 'C. แบล็กเบอร์รี', 'D. สับปะรด'], correct: 'A' },
  { answerKey: 'smell_02_answer', recognizeKey: 'smell_02_recognize', perceiveKey: 'smell_02_perceive', label: 'กลิ่นที่ 2', options: ['A. ควัน', 'B. เครื่องหนัง', 'C. กาว', 'D. หญ้า'], correct: 'B' },
  { answerKey: 'smell_03_answer', recognizeKey: 'smell_03_recognize', perceiveKey: 'smell_03_perceive', label: 'กลิ่นที่ 3', options: ['A. น้ำผึ้ง', 'B. ช็อกโกแลต', 'C. วานิลลา', 'D. ซินนามอน/อบเชย'], correct: 'D' },
  { answerKey: 'smell_04_answer', recognizeKey: 'smell_04_recognize', perceiveKey: 'smell_04_perceive', label: 'กลิ่นที่ 4', options: ['A. ต้นหอม', 'B. ต้นสน', 'C. เปปเปอร์มินต์', 'D. หัวหอม'], correct: 'C' },
  { answerKey: 'smell_05_answer', recognizeKey: 'smell_05_recognize', perceiveKey: 'smell_05_perceive', label: 'กลิ่นที่ 5', options: ['A. มะพร้าว', 'B. ถั่ววอลนัต', 'C. กล้วย', 'D. เชอรี่'], correct: 'C' },
  { answerKey: 'smell_06_answer', recognizeKey: 'smell_06_recognize', perceiveKey: 'smell_06_perceive', label: 'กลิ่นที่ 6', options: ['A. ลูกพีช', 'B. แอปเปิ้ล', 'C. มะนาว', 'D. เกรปฟรุต'], correct: 'C' },
  { answerKey: 'smell_07_answer', recognizeKey: 'smell_07_recognize', perceiveKey: 'smell_07_perceive', label: 'กลิ่นที่ 7', options: ['A. ชะเอม', 'B. เชอรี่', 'C. สเปียร์มินต์', 'D. คุกกี้'], correct: 'A' },
  { answerKey: 'smell_08_answer', recognizeKey: 'smell_08_recognize', perceiveKey: 'smell_08_perceive', label: 'กลิ่นที่ 8', options: ['A. มัสตาร์ด', 'B. เมนทอล', 'C. ยาง', 'D. น้ำมันสน'], correct: 'D' },
  { answerKey: 'smell_09_answer', recognizeKey: 'smell_09_recognize', perceiveKey: 'smell_09_perceive', label: 'กลิ่นที่ 9', options: ['A. หัวหอม', 'B. กระเทียม', 'C. กะหล่ำปลีดอง', 'D. แคร์รอต'], correct: 'B' },
  { answerKey: 'smell_10_answer', recognizeKey: 'smell_10_recognize', perceiveKey: 'smell_10_perceive', label: 'กลิ่นที่ 10', options: ['A. บุหรี่', 'B. กาแฟ', 'C. ไวน์', 'D. ควันไฟ'], correct: 'B' },
  { answerKey: 'smell_11_answer', recognizeKey: 'smell_11_recognize', perceiveKey: 'smell_11_perceive', label: 'กลิ่นที่ 11', options: ['A. เมลอน', 'B. ส้ม', 'C. ลูกพีช', 'D. แอปเปิ้ล'], correct: 'D' },
  { answerKey: 'smell_12_answer', recognizeKey: 'smell_12_recognize', perceiveKey: 'smell_12_perceive', label: 'กลิ่นที่ 12', options: ['A. กานพลู', 'B. พริกไทย', 'C. ซินนามอน', 'D. มัสตาร์ด'], correct: 'A' },
  { answerKey: 'smell_13_answer', recognizeKey: 'smell_13_recognize', perceiveKey: 'smell_13_perceive', label: 'กลิ่นที่ 13', options: ['A. สาลี่', 'B. ลูกพรุน', 'C. ลูกพีช', 'D. สับปะรด'], correct: 'D' },
  { answerKey: 'smell_14_answer', recognizeKey: 'smell_14_recognize', perceiveKey: 'smell_14_perceive', label: 'กลิ่นที่ 14', options: ['A. คาโมมายล์', 'B. กุหลาบ', 'C. ราสป์เบอร์รี', 'D. เชอรี่'], correct: 'B' },
  { answerKey: 'smell_15_answer', recognizeKey: 'smell_15_recognize', perceiveKey: 'smell_15_perceive', label: 'กลิ่นที่ 15', options: ['A. โป๊ยกั๊ก', 'B. น้ำผึ้ง', 'C. รัม', 'D. ต้นสน'], correct: 'A' },
  { answerKey: 'smell_16_answer', recognizeKey: 'smell_16_recognize', perceiveKey: 'smell_16_perceive', label: 'กลิ่นที่ 16', options: ['A. ขนมปัง', 'B. ชีส', 'C. ปลา', 'D. แฮม'], correct: 'C' },
]

type AnswerMap = Record<string, string>
type FlagMap = Record<string, boolean | null>

const EMPTY_ANSWERS: AnswerMap = Object.fromEntries(QUESTIONS.map((q) => [q.answerKey, '']))
const EMPTY_FLAGS: FlagMap = Object.fromEntries(
  QUESTIONS.flatMap((q) => [[q.recognizeKey, null], [q.perceiveKey, null]])
)

function getInterpretation(score: number) {
  if (score >= 12) return 'ปกติ (>= 12)'
  if (score >= 8) return 'ผิดปกติเล็กน้อย (9-11)'
  return 'ผิดปกติอย่างมาก (<= 9)'
}

export default function QaSmellForm({ open, patientId, onClose, onSaved }: Props) {
  const [answers, setAnswers] = useState<AnswerMap>(EMPTY_ANSWERS)
  const [flags, setFlags] = useState<FlagMap>(EMPTY_FLAGS)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    const cols = [...QUESTIONS.map((q) => q.answerKey), ...Object.keys(EMPTY_FLAGS)].join(',')
    supabase
      .schema('core')
      .from('smell_test_v2')
      .select(cols)
      .eq('patient_id', patientId)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          const nextAnswers: AnswerMap = { ...EMPTY_ANSWERS }
          const nextFlags: FlagMap = { ...EMPTY_FLAGS }
          const record = data as unknown as Record<string, string | boolean | null>
          for (const key of Object.keys(nextAnswers)) nextAnswers[key] = (record[key] ?? '') as string
          for (const key of Object.keys(nextFlags)) nextFlags[key] = (record[key] ?? null) as boolean | null
          setAnswers(nextAnswers)
          setFlags(nextFlags)
        } else {
          setAnswers(EMPTY_ANSWERS)
          setFlags(EMPTY_FLAGS)
        }
        setError(null)
      })
  }, [open, patientId])

  const score = QUESTIONS.filter((q) => answers[q.answerKey] === q.correct).length
  const recognizeCount = QUESTIONS.filter((q) => flags[q.recognizeKey] === true).length
  const perceiveCount = QUESTIONS.filter((q) => flags[q.perceiveKey] === true).length
  const interpretation = getInterpretation(score)

  const setAnswerWithAutoYes = (q: SmellQuestion, val: string) => {
    setAnswers((prev) => ({ ...prev, [q.answerKey]: val }))
    setFlags((prev) => ({
      ...prev,
      [q.recognizeKey]: true,
      [q.perceiveKey]: true,
    }))
  }

  const toggleFlag = (key: string, value: boolean) => {
    setFlags((prev) => ({ ...prev, [key]: prev[key] === value ? null : value }))
  }

  const handleSave = async () => {
    setSaving(true)
    setError(null)

    const payload = {
      patient_id: patientId,
      test_type: 'sniffin_stick',
      ...answers,
      ...flags,
      total_score: score,
      recognize_count: recognizeCount,
      perceive_count: perceiveCount,
    }

    const { error: err } = await supabase
      .schema('core')
      .from('smell_test_v2')
      .upsert(payload, { onConflict: 'patient_id' })

    setSaving(false)
    if (err) {
      setError(err.message)
      return
    }
    onSaved()
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
        className="max-h-[90vh] w-[95vw] sm:w-[92vw] lg:w-[86vw] sm:!max-w-[92vw] lg:!max-w-5xl overflow-y-auto p-4 sm:p-6"
      >
        <DialogHeader>
          <DialogTitle>แบบทดสอบความสามารถในการดมกลิ่น (Sniffin stick test)</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-1 gap-3 mt-2">
          {QUESTIONS.map((q, i) => {
            const chosen = answers[q.answerKey]
            const isCorrect = chosen === q.correct
            const recognize = flags[q.recognizeKey]
            const perceive = flags[q.perceiveKey]

            return (
              <div key={q.answerKey} className="border rounded p-3 flex flex-col gap-3 sm:flex-row sm:items-start">
                {/* Left: รู้จักกลิ่น / ได้กลิ่น */}
                <div className="flex flex-col gap-2 sm:w-64 sm:shrink-0">
                  <div className="flex items-center gap-2 text-sm">
                    <span className="w-24 shrink-0 text-muted-foreground">รู้จักกลิ่น:</span>
                    <button
                      type="button"
                      onClick={() => toggleFlag(q.recognizeKey, true)}
                      className={`rounded border px-2 py-0.5 ${recognize === true ? 'border-emerald-600 bg-emerald-600 text-white' : 'hover:bg-muted/60'}`}
                    >
                      ใช่
                    </button>
                    <button
                      type="button"
                      onClick={() => toggleFlag(q.recognizeKey, false)}
                      className={`rounded border px-2 py-0.5 ${recognize === false ? 'border-slate-700 bg-slate-700 text-white' : 'hover:bg-muted/60'}`}
                    >
                      ไม่ใช่
                    </button>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <span className="w-24 shrink-0 text-muted-foreground">ได้กลิ่น:</span>
                    <button
                      type="button"
                      onClick={() => toggleFlag(q.perceiveKey, true)}
                      className={`rounded border px-2 py-0.5 ${perceive === true ? 'border-emerald-600 bg-emerald-600 text-white' : 'hover:bg-muted/60'}`}
                    >
                      ใช่
                    </button>
                    <button
                      type="button"
                      onClick={() => toggleFlag(q.perceiveKey, false)}
                      className={`rounded border px-2 py-0.5 ${perceive === false ? 'border-slate-700 bg-slate-700 text-white' : 'hover:bg-muted/60'}`}
                    >
                      ไม่ใช่
                    </button>
                  </div>
                </div>

                {/* Right: label + answer options */}
                <div className="flex-1">
                  <p className="text-sm font-medium mb-2 text-muted-foreground">{i + 1}. {q.label}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {q.options.map((opt) => {
                      const val = opt.charAt(0)
                      const active = chosen === val
                      return (
                        <button
                          key={val}
                          type="button"
                          onClick={() => setAnswerWithAutoYes(q, val)}
                          className={`px-2.5 py-1 text-sm rounded border transition-colors ${active ? 'bg-blue-600 text-white border-blue-600' : 'hover:bg-muted/60'}`}
                        >
                          {opt}
                        </button>
                      )
                    })}
                    {chosen && (
                      <span className={`ml-1 text-sm self-center ${isCorrect ? 'text-green-600' : 'text-red-500'}`}>
                        {isCorrect ? '✓' : `✗ (${q.correct})`}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
        <div className="mt-4 rounded bg-slate-50 p-3 text-sm font-semibold">
          คะแนน {score} / 16 · รู้จัก {recognizeCount} / 16 · ได้กลิ่น {perceiveCount} / 16 &nbsp;—&nbsp; <span className="font-normal">{interpretation}</span>
        </div>
        {error && <p className="text-sm text-red-600 mt-2">{error}</p>}
        <DialogFooter className="sticky bottom-0 bg-white border-t -mx-4 sm:-mx-6 px-4 sm:px-6 py-3 mt-6">
          <Button variant="outline" onClick={onClose} disabled={saving}>ยกเลิก</Button>
          <Button onClick={handleSave} disabled={saving} className="bg-blue-600 hover:bg-blue-700 text-white">
            {saving ? 'กำลังบันทึก...' : 'บันทึก'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
