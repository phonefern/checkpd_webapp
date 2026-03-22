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
  visuospatial_executive: number  // max 5
  naming: number                  // max 3
  attention_digits: number        // max 2
  attention_vigilance: number     // max 1
  attention_serial7: number       // max 3
  language_repeat: number         // max 2
  language_fluency: number        // max 1
  abstraction: number             // max 2
  delayed_recall: number          // max 5
  orientation: number             // max 6
}

const EMPTY: FormState = {
  visuospatial_executive: 0, naming: 0,
  attention_digits: 0, attention_vigilance: 0, attention_serial7: 0,
  language_repeat: 0, language_fluency: 0,
  abstraction: 0, delayed_recall: 0, orientation: 0,
}

function ScoreSelect({ value, max, onChange }: { value: number; max: number; onChange: (v: number) => void }) {
  return (
    <select value={value} onChange={(e) => onChange(Number(e.target.value))} className="border rounded p-1 text-sm w-16 shrink-0">
      {Array.from({ length: max + 1 }, (_, i) => <option key={i} value={i}>{i}</option>)}
    </select>
  )
}

const SECTIONS = [
  {
    title: 'Visuospatial / Executive',
    color: 'bg-purple-50',
    items: [
      { key: 'visuospatial_executive' as keyof FormState, label: 'Trail Making + Copy Cube + Clock Drawing (รวม)', max: 5,
        hint: 'Trail=1, Cube=1, Clock=3' },
    ],
  },
  {
    title: 'Naming',
    color: 'bg-yellow-50',
    items: [
      { key: 'naming' as keyof FormState, label: 'บอกชื่อสัตว์ 3 ตัว', max: 3, hint: 'แต่ละตัวที่ถูก = 1 คะแนน' },
    ],
  },
  {
    title: 'Attention',
    color: 'bg-blue-50',
    items: [
      { key: 'attention_digits' as keyof FormState, label: 'ทวนตัวเลข (Forward + Backward)', max: 2, hint: 'Forward 2 1 8 5 4 = 1, Backward 7 4 2 = 1' },
      { key: 'attention_vigilance' as keyof FormState, label: 'Vigilance (เคาะเมื่อได้ยินเลข 1)', max: 1, hint: 'ผิด ≤ 2 ครั้ง = 1' },
      { key: 'attention_serial7' as keyof FormState, label: 'Serial 7 (100-7 ต่อเนื่อง 5 ครั้ง)', max: 3, hint: '4-5 ถูก=3, 2-3 ถูก=2, 1 ถูก=1, 0=0' },
    ],
  },
  {
    title: 'Language',
    color: 'bg-green-50',
    items: [
      { key: 'language_repeat' as keyof FormState, label: 'ทวนประโยค (2 ประโยค)', max: 2, hint: 'แต่ละประโยค = 1' },
      { key: 'language_fluency' as keyof FormState, label: 'คำขึ้นต้นด้วย "ก" ≥ 11 คำ/นาที', max: 1, hint: '≥ 11 คำ = 1' },
    ],
  },
  {
    title: 'Abstraction',
    color: 'bg-orange-50',
    items: [
      { key: 'abstraction' as keyof FormState, label: 'อธิบายความเหมือน (2 คู่)', max: 2, hint: 'รถไฟ-จักรยาน, นาฬิกา-ไม้บรรทัด' },
    ],
  },
  {
    title: 'Delayed Recall',
    color: 'bg-red-50',
    items: [
      { key: 'delayed_recall' as keyof FormState, label: 'ทวน 5 คำ (หน้า ผ้าไหม วัด มะลิ สีแดง)', max: 5, hint: 'แต่ละคำ = 1, ไม่มีตัวช่วย' },
    ],
  },
  {
    title: 'Orientation',
    color: 'bg-teal-50',
    items: [
      { key: 'orientation' as keyof FormState, label: 'วัน เดือน ปี วัน สถานที่ จังหวัด', max: 6, hint: 'แต่ละข้อ = 1' },
    ],
  },
]

export default function QaMocaForm({ open, patientId, onClose, onSaved }: Props) {
  const [form, setForm] = useState<FormState>(EMPTY)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    supabase.schema('core').from('moca_v2')
      .select('visuospatial_executive,naming,attention_digits,attention_vigilance,attention_serial7,language_repeat,language_fluency,abstraction,delayed_recall,orientation')
      .eq('patient_id', patientId).maybeSingle()
      .then(({ data }) => {
        if (data) {
          const d = data as Record<string, number | null>
          setForm({
            visuospatial_executive: d.visuospatial_executive ?? 0,
            naming: d.naming ?? 0,
            attention_digits: d.attention_digits ?? 0,
            attention_vigilance: d.attention_vigilance ?? 0,
            attention_serial7: d.attention_serial7 ?? 0,
            language_repeat: d.language_repeat ?? 0,
            language_fluency: d.language_fluency ?? 0,
            abstraction: d.abstraction ?? 0,
            delayed_recall: d.delayed_recall ?? 0,
            orientation: d.orientation ?? 0,
          })
        } else {
          setForm(EMPTY)
        }
        setError(null)
      })
  }, [open, patientId])

  const score = Object.values(form).reduce((a, b) => a + b, 0)
  const interpretation = score >= 26 ? 'ปกติ (≥ 26)' : 'มีความเสี่ยง (< 26)'

  const set = (key: keyof FormState, val: number) => setForm((p) => ({ ...p, [key]: val }))

  const handleSave = async () => {
    setSaving(true); setError(null)
    const { error: err } = await supabase.schema('core').from('moca_v2').upsert(
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
        <DialogHeader><DialogTitle>MoCA — Montreal Cognitive Assessment</DialogTitle></DialogHeader>
        <div className="space-y-3 mt-2">
          {SECTIONS.map((sec) => (
            <div key={sec.title} className={`rounded border p-3 ${sec.color}`}>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">{sec.title}</p>
              {sec.items.map((item) => (
                <div key={item.key} className="flex items-center gap-3 py-1">
                  <div className="flex-1">
                    <p className="text-sm">{item.label}</p>
                    <p className="text-xs text-muted-foreground">{item.hint}</p>
                  </div>
                  <ScoreSelect value={form[item.key]} max={item.max} onChange={(v) => set(item.key, v)} />
                  <span className="text-xs text-muted-foreground w-10">/ {item.max}</span>
                </div>
              ))}
            </div>
          ))}
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
