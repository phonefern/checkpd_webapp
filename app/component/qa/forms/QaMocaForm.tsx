'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import Image from 'next/image'

interface Props {
  open: boolean
  patientId: number
  onClose: () => void
  onSaved: () => void
}

type FormState = {
  visuospatial_executive: number  // max 5 (trail 1 + cube 1 + clock 3)
  naming: number                  // max 3
  attention_digits: number        // max 2 (forward 1 + backward 1)
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

// ── Score Button Group ──────────────────────────────────────────────────────
function ScoreButtons({ value, options, onChange }: {
  value: number
  options: { label: string; score: number }[]
  onChange: (v: number) => void
}) {
  return (
    <div className="flex flex-wrap gap-2 pt-1">
      {options.map((opt) => (
        <button
          key={opt.score}
          type="button"
          onClick={() => onChange(opt.score)}
          className={`px-3 py-1.5 rounded-lg border text-sm font-medium transition-colors ${
            value === opt.score
              ? 'bg-blue-500 text-white border-blue-500'
              : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}

// ── Task Card (image + instruction + optional score) ────────────────────────
function TaskCard({ title, instruction, image, value, options, onChange }: {
  title: string
  instruction: string
  image?: string
  value?: number
  options?: { label: string; score: number }[]
  onChange?: (v: number) => void
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      <div className="px-4 pt-3 pb-1">
        <p className="text-sm font-semibold uppercase tracking-wide text-slate-400">{title}</p>
        <p className="text-base text-slate-600 mt-1 leading-relaxed whitespace-pre-line">{instruction}</p>
      </div>
      {image && (
        <div className="px-4 py-2">
          <Image
            src={image}
            alt={title}
            width={600}
            height={300}
            className="w-full h-auto rounded-lg border bg-white object-contain"
          />
        </div>
      )}
      {options && onChange && value !== undefined && (
        <div className="px-4 pb-3 pt-1">
          <ScoreButtons value={value} options={options} onChange={onChange} />
        </div>
      )}
    </div>
  )
}

// ── Section Header ──────────────────────────────────────────────────────────
function SectionHeader({ title, score, max, color }: { title: string; score: number; max: number; color: string }) {
  return (
    <div className={`flex items-center justify-between px-4 py-2 rounded-xl ${color}`}>
      <span className="text-base font-bold uppercase tracking-wide">{title}</span>
      <span className="text-base font-semibold tabular-nums">{score} / {max}</span>
    </div>
  )
}

// ── Practice Card (no score, gray) ─────────────────────────────────────────
function PracticeCard({ instruction }: { instruction: string }) {
  return (
    <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-3">
      <p className="text-sm font-semibold uppercase tracking-wide text-slate-400 mb-1">MEMORY — Encoding (ฝึกฝน, ไม่คิดคะแนน)</p>
      <p className="text-base text-slate-600 leading-relaxed">{instruction}</p>
    </div>
  )
}

// ── Main Form ───────────────────────────────────────────────────────────────
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
          const d = data as unknown as Record<string, number | null>
          setForm({
            visuospatial_executive: d.visuospatial_executive ?? 0,
            naming:                 d.naming ?? 0,
            attention_digits:       d.attention_digits ?? 0,
            attention_vigilance:    d.attention_vigilance ?? 0,
            attention_serial7:      d.attention_serial7 ?? 0,
            language_repeat:        d.language_repeat ?? 0,
            language_fluency:       d.language_fluency ?? 0,
            abstraction:            d.abstraction ?? 0,
            delayed_recall:         d.delayed_recall ?? 0,
            orientation:            d.orientation ?? 0,
          })
        } else {
          setForm(EMPTY)
        }
        setError(null)
      })
  }, [open, patientId])

  const score = Object.values(form).reduce((a, b) => a + b, 0)
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
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg">MoCA — Montreal Cognitive Assessment</DialogTitle>
        </DialogHeader>

        {/* Score summary bar */}
        <div className="flex items-center justify-between bg-slate-50 border rounded-xl px-4 py-3">
          <div>
            <p className="text-xs text-slate-500">คะแนนรวม</p>
            <p className="text-3xl font-extrabold text-slate-800">{score} <span className="text-base font-normal text-slate-400">/ 30</span></p>
          </div>
          <div className={`px-4 py-2 rounded-xl text-sm font-semibold ${score >= 26 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
            {score >= 26 ? 'ปกติ (≥ 26)' : 'มีความเสี่ยง (< 26)'}
          </div>
        </div>

        <div className="space-y-5 mt-1">

          {/* ── VISUOSPATIAL / EXECUTIVE ── */}
          <section className="space-y-3">
            <SectionHeader title="Visuospatial / Executive" score={form.visuospatial_executive} max={5} color="bg-purple-100 text-purple-900" />

            {/* Display-only image cards */}
            <TaskCard
              title="Trail Making — 1 คะแนน"
              instruction="ให้ผู้ทดสอบลากเส้นตามลำดับสลับกัน: 1 → ก → 2 → ข → 3 → ค → 4 → ง → 5 → จ (ห้ามยกปากกา ถ้าผิดให้แก้แล้วลากต่อ)"
              image="/img/asset/number_assessment.png"
            />
            <TaskCard
              title="Copy Cube — 1 คะแนน"
              instruction="ให้ผู้ทดสอบวาดรูปลูกบาศก์ 3 มิติตามตัวอย่าง ต้องมีมิติ มีเส้นขนาน และมุมถูกต้อง"
              image="/img/asset/Cube.png"
            />
            <TaskCard
              title="Clock Drawing — 3 คะแนน"
              instruction={"ให้ผู้ทดสอบวาดนาฬิกา ให้เข็มชี้เวลา 11:10 น.\n• รูปทรงวงกลม = 1\n• ตัวเลข 1–12 ครบและถูกตำแหน่ง = 1\n• เข็มชี้ 11:10 ถูกต้อง = 1"}
              image="/img/asset/clock.png"
            />

            {/* Combined score selector */}
            <div className="bg-purple-50 border border-purple-200 rounded-xl px-4 py-3">
              <p className="text-sm font-semibold text-purple-700 mb-2">
                คะแนนรวม Visuospatial / Executive &nbsp;
                <span className="font-normal text-purple-500">(Trail 1 + Cube 1 + Clock 3 = max 5)</span>
              </p>
              <div className="flex flex-wrap gap-2">
                {[0,1,2,3,4,5].map((n) => (
                  <button key={n} type="button"
                    onClick={() => set('visuospatial_executive', n)}
                    className={`w-10 h-10 rounded-lg border text-sm font-bold transition-colors ${
                      form.visuospatial_executive === n
                        ? 'bg-purple-600 text-white border-purple-600'
                        : 'bg-white text-slate-700 border-slate-300 hover:bg-purple-50'
                    }`}
                  >{n}</button>
                ))}
              </div>
            </div>
          </section>

          {/* ── NAMING ── */}
          <section className="space-y-3">
            <SectionHeader title="Naming" score={form.naming} max={3} color="bg-yellow-100 text-yellow-900" />
            <TaskCard
              title="Naming Animals — 3 คะแนน"
              instruction="ชี้รูปภาพทีละตัว ให้ผู้ทดสอบบอกชื่อสัตว์ทั้ง 3 ตัว (สิงโต / แรด / อูฐ)"
              image="/img/asset/animals2.png"
              value={form.naming}
              options={[
                { label: 'ถูก 3 ตัว (3)', score: 3 },
                { label: 'ถูก 2 ตัว (2)', score: 2 },
                { label: 'ถูก 1 ตัว (1)', score: 1 },
                { label: 'ไม่ถูกต้อง (0)', score: 0 },
              ]}
              onChange={(v) => set('naming', v)}
            />
          </section>

          {/* ── MEMORY (practice) ── */}
          <PracticeCard instruction='อ่านคำต่อไปนี้ช้าๆ 1 คำ/วินาที แล้วให้ผู้ทดสอบทวน 2 ครั้ง: "หน้า — ผ้าไหม — วัด — มะลิ — สีแดง" (ไม่คิดคะแนน บันทึกเพื่อทดสอบ Delayed Recall ภายหลัง)' />

          {/* ── ATTENTION ── */}
          <section className="space-y-3">
            <SectionHeader title="Attention" score={form.attention_digits + form.attention_vigilance + form.attention_serial7} max={6} color="bg-blue-100 text-blue-900" />

            <TaskCard
              title="Digit Span — 2 คะแนน"
              instruction={'Forward: อ่าน "2–1–8–5–4" ให้ทวนตามลำดับ (1 คะแนน)\nBackward: อ่าน "7–4–2" ให้ทวนย้อนกลับ (1 คะแนน)'}
              value={form.attention_digits}
              options={[
                { label: 'ถูกทั้ง 2 (2)', score: 2 },
                { label: 'ถูก 1 (1)', score: 1 },
                { label: 'ไม่ถูก (0)', score: 0 },
              ]}
              onChange={(v) => set('attention_digits', v)}
            />

            <TaskCard
              title="Vigilance — 1 คะแนน"
              instruction='อ่านตัวเลข: "5 2 1 3 9 4 1 1 8 0 6 2 1 5 1 9 4 5 1 1 1 4 1 9 0 5 1 1 2" ให้ผู้ทดสอบเคาะโต๊ะทุกครั้งที่ได้ยินเลข "1" (ผิด ≤ 2 ครั้ง = 1 คะแนน)'
              value={form.attention_vigilance}
              options={[
                { label: 'ผิด ≤ 2 ครั้ง (1)', score: 1 },
                { label: 'ผิด > 2 ครั้ง (0)', score: 0 },
              ]}
              onChange={(v) => set('attention_vigilance', v)}
            />

            <TaskCard
              title="Serial 7 Subtraction — 3 คะแนน"
              instruction="ให้ลบ 100 − 7 ต่อเนื่อง 5 ครั้ง: 93, 86, 79, 72, 65 (4–5 ถูก=3 / 2–3 ถูก=2 / 1 ถูก=1 / 0=0)"
              value={form.attention_serial7}
              options={[
                { label: '4–5 ถูก (3)', score: 3 },
                { label: '2–3 ถูก (2)', score: 2 },
                { label: '1 ถูก (1)', score: 1 },
                { label: 'ไม่ถูก (0)', score: 0 },
              ]}
              onChange={(v) => set('attention_serial7', v)}
            />
          </section>

          {/* ── LANGUAGE ── */}
          <section className="space-y-3">
            <SectionHeader title="Language" score={form.language_repeat + form.language_fluency} max={3} color="bg-green-100 text-green-900" />

            <TaskCard
              title="Sentence Repetition — 2 คะแนน"
              instruction={`ให้พูดตามคำต่อคำ:\n1) "ฉันรู้ว่าจ้าวเป็นคนที่ช่วยได้คนเดียว"\n2) "แมวดำมักซ่อนตัวอยู่ใต้โซฟาหน้าเตาไฟเวลาสุนัขเข้ามา"`}
              value={form.language_repeat}
              options={[
                { label: 'ถูกทั้ง 2 (2)', score: 2 },
                { label: 'ถูก 1 (1)', score: 1 },
                { label: 'ไม่ถูก (0)', score: 0 },
              ]}
              onChange={(v) => set('language_repeat', v)}
            />

            <TaskCard
              title='Verbal Fluency — 1 คะแนน'
              instruction='บอกคำที่ขึ้นต้นด้วย "ก" ให้ได้ ≥ 11 คำ ภายใน 1 นาที (ยกเว้นชื่อเฉพาะ)'
              value={form.language_fluency}
              options={[
                { label: '≥ 11 คำ (1)', score: 1 },
                { label: '< 11 คำ (0)', score: 0 },
              ]}
              onChange={(v) => set('language_fluency', v)}
            />
          </section>

          {/* ── ABSTRACTION ── */}
          <section className="space-y-3">
            <SectionHeader title="Abstraction" score={form.abstraction} max={2} color="bg-orange-100 text-orange-900" />
            <TaskCard
              title="Abstraction — 2 คะแนน"
              instruction={`อธิบายความเหมือนระหว่างคู่คำ:\n1) "รถไฟ — จักรยาน" เหมือนกันอย่างไร? (ตอบ: พาหนะ)\n2) "นาฬิกา — ไม้บรรทัด" เหมือนกันอย่างไร? (ตอบ: เครื่องมือวัด)`}
              value={form.abstraction}
              options={[
                { label: 'ถูกทั้ง 2 คู่ (2)', score: 2 },
                { label: 'ถูก 1 คู่ (1)', score: 1 },
                { label: 'ไม่ถูก (0)', score: 0 },
              ]}
              onChange={(v) => set('abstraction', v)}
            />
          </section>

          {/* ── DELAYED RECALL ── */}
          <section className="space-y-3">
            <SectionHeader title="Delayed Recall" score={form.delayed_recall} max={5} color="bg-red-100 text-red-900" />
            <TaskCard
              title="Delayed Recall — 5 คะแนน"
              instruction='ให้ทวน 5 คำที่จำไว้ก่อนหน้า (ห้ามให้ตัวช่วย): "หน้า — ผ้าไหม — วัด — มะลิ — สีแดง" (แต่ละคำที่ถูก = 1 คะแนน)'
              value={form.delayed_recall}
              options={[
                { label: '5 คำ (5)', score: 5 },
                { label: '4 คำ (4)', score: 4 },
                { label: '3 คำ (3)', score: 3 },
                { label: '2 คำ (2)', score: 2 },
                { label: '1 คำ (1)', score: 1 },
                { label: 'ไม่ได้เลย (0)', score: 0 },
              ]}
              onChange={(v) => set('delayed_recall', v)}
            />
          </section>

          {/* ── ORIENTATION ── */}
          <section className="space-y-3">
            <SectionHeader title="Orientation" score={form.orientation} max={6} color="bg-teal-100 text-teal-900" />
            <TaskCard
              title="Orientation — 6 คะแนน"
              instruction="ถามผู้ทดสอบทีละข้อ (แต่ละข้อที่ถูก = 1 คะแนน): วันที่ / เดือน / ปี (พ.ศ.) / วันในสัปดาห์ / สถานที่ / จังหวัด"
              value={form.orientation}
              options={[6,5,4,3,2,1,0].map((n) => ({ label: `${n} ข้อ (${n})`, score: n }))}
              onChange={(v) => set('orientation', v)}
            />
          </section>

        </div>

        {/* Total score footer */}
        <div className={`mt-4 rounded-xl p-4 flex items-center justify-between ${score >= 26 ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
          <div>
            <p className="text-xs text-slate-500">คะแนนรวม MoCA</p>
            <p className={`text-2xl font-extrabold ${score >= 26 ? 'text-green-800' : 'text-red-800'}`}>{score} / 30</p>
          </div>
          <p className={`text-sm font-medium ${score >= 26 ? 'text-green-700' : 'text-red-700'}`}>
            {score >= 26 ? 'ปกติ (≥ 26)' : 'มีความเสี่ยง / ความบกพร่องทางสติปัญญา (< 26)'}
          </p>
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
