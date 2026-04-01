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
  { key: 'q01_vegetables',          label: 'บริโภคผัก (ผักใบเขียว มะเขือเทศ แครอท) อย่างน้อยวันละ 2 มื้อ' },
  { key: 'q02_fruits',              label: 'บริโภคผลไม้ หรือน้ำผลไม้คั้นสด 1–2 ครั้งต่อวัน' },
  { key: 'q03_nuts',                label: 'รับประทานถั่ว (ถั่วลิสง เม็ดมะม่วง อัลมอนด์ ถั่วแดง ดำ) อย่างน้อย 3 ครั้งต่อสัปดาห์' },
  { key: 'q04_whole_grains',        label: 'บริโภคธัญพืชไม่ขัดสี (ข้าวกล้อง ขนมปังธัญพืช) เป็นประจำ' },
  { key: 'q05_white_meat',          label: 'บริโภคเนื้อสัตว์เนื้อขาว (ไก่ ปลา/อาหารทะเล) อย่างน้อย 2 ครั้งต่อสัปดาห์' },
  { key: 'q06_red_meat_less',       label: 'บริโภคเนื้อแดง (หมู วัว) น้อยกว่า 2 ครั้งต่อสัปดาห์' },
  { key: 'q07_processed_meat_avoid',label: 'หลีกเลี่ยงเนื้อสัตว์แปรรูป (หมูยอ กุนเชียง เบคอน ไส้กรอก)' },
  { key: 'q08_dairy',               label: 'บริโภคผลิตภัณฑ์นม (โยเกิร์ต ชีส นม) 1–2 ครั้งต่อสัปดาห์' },
  { key: 'q09_olive_oil',           label: 'ใช้น้ำมันมะกอกเป็นน้ำมันหลักในการปรุงอาหาร' },
  { key: 'q10_avoid_sweets',        label: 'หลีกเลี่ยงขนมหวาน/เบเกอรี ที่มีน้ำตาลสูง' },
]

type FormState = Record<string, number>
const EMPTY: FormState = {
  q01_vegetables: 0, q02_fruits: 0, q03_nuts: 0, q04_whole_grains: 0, q05_white_meat: 0,
  q06_red_meat_less: 0, q07_processed_meat_avoid: 0, q08_dairy: 0, q09_olive_oil: 0, q10_avoid_sweets: 0,
}

function getInterpretation(score: number) {
  if (score >= 8) return 'ดีมาก (≥ 8)'
  if (score >= 6) return 'ดี (6–7)'
  if (score >= 4) return 'ปานกลาง (4–5)'
  return 'ควรปรับปรุง (< 4)'
}

export default function QaFoodForm({ open, patientId, onClose, onSaved }: Props) {
  const [form, setForm] = useState<FormState>(EMPTY)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    supabase.schema('core').from('food_questionnaire_v2')
      .select('q01_vegetables,q02_fruits,q03_nuts,q04_whole_grains,q05_white_meat,q06_red_meat_less,q07_processed_meat_avoid,q08_dairy,q09_olive_oil,q10_avoid_sweets')
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
  const interpretation = getInterpretation(score)

  const toggleQ = (key: string) =>
    setForm((p) => ({ ...p, [key]: p[key] === 1 ? 0 : 1 }))

  const handleSave = async () => {
    setSaving(true); setError(null)
    const { error: err } = await supabase.schema('core').from('food_questionnaire_v2').upsert(
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
        <DialogHeader><DialogTitle>แบบประเมินพฤติกรรมการรับประทานอาหาร (มีดี)</DialogTitle></DialogHeader>
        <p className="text-sm text-muted-foreground mb-3">คลิกข้อที่ตอบ "ใช่"</p>
        <div className="space-y-2">
          {QUESTIONS.map((q, i) => (
            <div
              key={q.key}
              className={`flex items-center gap-3 p-4 rounded border cursor-pointer transition-colors ${form[q.key] ? 'bg-green-50 border-green-400' : 'hover:bg-muted/40'}`}
              onClick={() => toggleQ(q.key)}
            >
              <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 ${form[q.key] ? 'border-green-600 bg-green-600' : 'border-gray-400'}`}>
                {form[q.key] ? <span className="text-white text-sm font-bold">✓</span> : null}
              </div>
              <span className="text-base">{i + 1}. {q.label}</span>
            </div>
          ))}
        </div>
        <div className="mt-4 rounded bg-slate-50 p-3 text-sm font-semibold">
          คะแนน: {score} / 10 &nbsp;—&nbsp; <span className="font-normal">{interpretation}</span>
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
