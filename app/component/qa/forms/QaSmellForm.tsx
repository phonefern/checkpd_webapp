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
  { key: 'smell_01_answer', label: 'กลิ่นที่ 1',  options: ['A. ส้ม','B. สตรอเบอรี','C. แบล็กเบอร์รี','D. สับปะรด'],   correct: 'A' },
  { key: 'smell_02_answer', label: 'กลิ่นที่ 2',  options: ['A. ควัน','B. เครื่องหนัง','C. กาว','D. หญ้า'],           correct: 'B' },
  { key: 'smell_03_answer', label: 'กลิ่นที่ 3',  options: ['A. น้ำผึ้ง','B. ช็อกโกแลต','C. วานิลลา','D. ซินนามอน/อบเชย'], correct: 'D' },
  { key: 'smell_04_answer', label: 'กลิ่นที่ 4',  options: ['A. ต้นหอม','B. ต้นสน','C. เปปเปอร์มินต์','D. หัวหอม'],    correct: 'C' },
  { key: 'smell_05_answer', label: 'กลิ่นที่ 5',  options: ['A. มะพร้าว','B. ถั่ววอลนัต','C. กล้วย','D. เชอรี่'],      correct: 'C' },
  { key: 'smell_06_answer', label: 'กลิ่นที่ 6',  options: ['A. ลูกพีช','B. แอปเปิ้ล','C. มะนาว','D. เกรปฟรุต'],      correct: 'C' },
  { key: 'smell_07_answer', label: 'กลิ่นที่ 7',  options: ['A. ชะเอม','B. เชอรี่','C. สเปียร์มินต์','D. คุกกี้'],     correct: 'A' },
  { key: 'smell_08_answer', label: 'กลิ่นที่ 8',  options: ['A. มัสตาร์ด','B. เมนทอล','C. ยาง','D. น้ำมันสน'],        correct: 'D' },
  { key: 'smell_09_answer', label: 'กลิ่นที่ 9',  options: ['A. หัวหอม','B. กระเทียม','C. กะหล่ำปลีดอง','D. แคร์รอต'], correct: 'B' },
  { key: 'smell_10_answer', label: 'กลิ่นที่ 10', options: ['A. บุหรี่','B. กาแฟ','C. ไวน์','D. ควันไฟ'],              correct: 'B' },
  { key: 'smell_11_answer', label: 'กลิ่นที่ 11', options: ['A. เมลอน','B. ส้ม','C. ลูกพีช','D. แอปเปิ้ล'],           correct: 'D' },
  { key: 'smell_12_answer', label: 'กลิ่นที่ 12', options: ['A. กานพลู','B. พริกไทย','C. ซินนามอน','D. มัสตาร์ด'],    correct: 'A' },
  { key: 'smell_13_answer', label: 'กลิ่นที่ 13', options: ['A. สาลี่','B. ลูกพรุน','C. ลูกพีช','D. สับปะรด'],        correct: 'D' },
  { key: 'smell_14_answer', label: 'กลิ่นที่ 14', options: ['A. คาโมมายล์','B. กุหลาบ','C. ราสป์เบอร์รี','D. เชอรี่'], correct: 'B' },
  { key: 'smell_15_answer', label: 'กลิ่นที่ 15', options: ['A. โป๊ยกั๊ก','B. น้ำผึ้ง','C. รัม','D. ต้นสน'],           correct: 'A' },
  { key: 'smell_16_answer', label: 'กลิ่นที่ 16', options: ['A. ขนมปัง','B. ชีส','C. ปลา','D. แฮม'],                  correct: 'C' },
]

type FormState = Record<string, string>
const EMPTY: FormState = Object.fromEntries(QUESTIONS.map((q) => [q.key, '']))

function getInterpretation(score: number) {
  if (score >= 12) return 'ปกติ (≥ 12)'
  if (score >= 9)  return 'ผิดปกติเล็กน้อย (9–11)'
  return 'ผิดปกติอย่างมาก (≤ 8)'
}

export default function QaSmellForm({ open, patientId, onClose, onSaved }: Props) {
  const [form, setForm] = useState<FormState>(EMPTY)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    const cols = QUESTIONS.map((q) => q.key).join(',')
    supabase.schema('core').from('smell_test_v2')
      .select(cols)
      .eq('patient_id', patientId).maybeSingle()
      .then(({ data }) => {
        if (data) {
          const f: FormState = {}
          for (const k of Object.keys(EMPTY)) f[k] = (data as unknown as Record<string, string>)[k] ?? ''
          setForm(f)
        } else {
          setForm(EMPTY)
        }
        setError(null)
      })
  }, [open, patientId])

  const score = QUESTIONS.filter((q) => form[q.key] === q.correct).length
  const interpretation = getInterpretation(score)

  const handleSave = async () => {
    setSaving(true); setError(null)
    const { error: err } = await supabase.schema('core').from('smell_test_v2').upsert(
      { patient_id: patientId, test_type: 'thai_smell_test', ...form, total_score: score },
      { onConflict: 'patient_id' }
    )
    setSaving(false)
    if (err) { setError(err.message); return }
    onSaved(); onClose()
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>แบบทดสอบความสามารถในการดมกลิ่น (Thai Smell Test)</DialogTitle></DialogHeader>
        <div className="grid grid-cols-2 gap-3 mt-2">
          {QUESTIONS.map((q, i) => {
            const chosen = form[q.key]
            const isCorrect = chosen === q.correct
            return (
              <div key={q.key} className="border rounded p-2">
                <p className="text-xs font-medium mb-1 text-muted-foreground">{i + 1}. {q.label}</p>
                <div className="flex flex-wrap gap-1">
                  {q.options.map((opt) => {
                    const val = opt.charAt(0)
                    const active = chosen === val
                    return (
                      <button
                        key={val}
                        onClick={() => setForm((p) => ({ ...p, [q.key]: val }))}
                        className={`px-2 py-1 text-xs rounded border transition-colors ${active ? 'bg-blue-600 text-white border-blue-600' : 'hover:bg-muted/60'}`}
                      >
                        {opt}
                      </button>
                    )
                  })}
                  {chosen && (
                    <span className={`ml-1 text-xs self-center ${isCorrect ? 'text-green-600' : 'text-red-500'}`}>
                      {isCorrect ? '✓' : `✗ (${q.correct})`}
                    </span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
        <div className="mt-4 rounded bg-slate-50 p-3 text-sm font-semibold">
          คะแนน: {score} / 16 &nbsp;—&nbsp; <span className="font-normal">{interpretation}</span>
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
