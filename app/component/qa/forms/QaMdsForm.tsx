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

// ---- helpers ----
function ScoreSelect({ value, max = 4, onChange }: { value: number; max?: number; onChange: (v: number) => void }) {
  return (
    <select value={value} onChange={(e) => onChange(Number(e.target.value))} className="border rounded p-1 text-sm w-14 shrink-0">
      {Array.from({ length: max + 1 }, (_, i) => <option key={i} value={i}>{i}</option>)}
    </select>
  )
}

function QRow({ num, label, value, max = 4, onChange }: { num: string; label: string; value: number; max?: number; onChange: (v: number) => void }) {
  return (
    <div className="flex items-center gap-2 py-1 border-b">
      <span className="text-xs text-muted-foreground w-8 shrink-0">{num}</span>
      <span className="text-xs flex-1">{label}</span>
      <ScoreSelect value={value} max={max} onChange={onChange} />
    </div>
  )
}

// ---- state ----
type P1 = { q01:number;q02:number;q03:number;q04:number;q05:number;q06:number;q07:number;q08:number;q09:number;q10:number;q11:number;q12:number;q13:number }
type P2 = { q01:number;q02:number;q03:number;q04:number;q05:number;q06:number;q07:number;q08:number;q09:number;q10:number;q11:number;q12:number;q13:number }
type P3 = { q01:number;q02:number;q03a:number;q03b:number;q03c:number;q03d:number;q03e:number;q04a:number;q04b:number;q05a:number;q05b:number;q06a:number;q06b:number;q07a:number;q07b:number;q08a:number;q08b:number;q09:number;q10:number;q11:number;q12:number;q13:number;q14:number;q15a:number;q15b:number;q16a:number;q16b:number;q17a:number;q17b:number;q17c:number;q17d:number;q17e:number;q18:number;dyskinesia_present:boolean;dyskinesia_interfere:boolean;hy_stage:string }
type P4 = { q01:number;q02:number;q03:number;q04:number;q05:number;q06:number }

const mkP1 = ():P1 => ({ q01:0,q02:0,q03:0,q04:0,q05:0,q06:0,q07:0,q08:0,q09:0,q10:0,q11:0,q12:0,q13:0 })
const mkP2 = ():P2 => ({ q01:0,q02:0,q03:0,q04:0,q05:0,q06:0,q07:0,q08:0,q09:0,q10:0,q11:0,q12:0,q13:0 })
const mkP3 = ():P3 => ({ q01:0,q02:0,q03a:0,q03b:0,q03c:0,q03d:0,q03e:0,q04a:0,q04b:0,q05a:0,q05b:0,q06a:0,q06b:0,q07a:0,q07b:0,q08a:0,q08b:0,q09:0,q10:0,q11:0,q12:0,q13:0,q14:0,q15a:0,q15b:0,q16a:0,q16b:0,q17a:0,q17b:0,q17c:0,q17d:0,q17e:0,q18:0,dyskinesia_present:false,dyskinesia_interfere:false,hy_stage:'' })
const mkP4 = ():P4 => ({ q01:0,q02:0,q03:0,q04:0,q05:0,q06:0 })

function sum(obj: Record<string, number | boolean | string>): number {
  return Object.values(obj).reduce((a, v) => a + (typeof v === 'number' ? v : 0), 0) as number
}

const TABS = ['Part I', 'Part II', 'Part III', 'Part IV']

export default function QaMdsForm({ open, patientId, onClose, onSaved }: Props) {
  const [tab, setTab] = useState(0)
  const [p1, setP1] = useState<P1>(mkP1())
  const [p2, setP2] = useState<P2>(mkP2())
  const [p3, setP3] = useState<P3>(mkP3())
  const [p4, setP4] = useState<P4>(mkP4())
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    supabase.schema('core').from('mds_updrs_v2').select('*').eq('patient_id', patientId).maybeSingle()
      .then(({ data }) => {
        if (data) {
          const d = data as Record<string, number | boolean | string | null>
          const n = (k: string) => Number(d[k] ?? 0)
          const b = (k: string) => Boolean(d[k] ?? false)
          setP1({ q01:n('p1_q01_cognitive_impairment'),q02:n('p1_q02_hallucinations_psychosis'),q03:n('p1_q03_depressed_mood'),q04:n('p1_q04_anxious_mood'),q05:n('p1_q05_apathy'),q06:n('p1_q06_dds'),q07:n('p1_q07_sleep_problems'),q08:n('p1_q08_daytime_sleepiness'),q09:n('p1_q09_pain_sensations'),q10:n('p1_q10_urinary_problems'),q11:n('p1_q11_constipation_problems'),q12:n('p1_q12_lightheadedness'),q13:n('p1_q13_fatigue') })
          setP2({ q01:n('p2_q01_speech'),q02:n('p2_q02_saliva_drooling'),q03:n('p2_q03_chewing_swallowing'),q04:n('p2_q04_eating_tasks'),q05:n('p2_q05_dressing'),q06:n('p2_q06_hygiene'),q07:n('p2_q07_handwriting'),q08:n('p2_q08_hobbies_activities'),q09:n('p2_q09_turning_in_bed'),q10:n('p2_q10_tremor'),q11:n('p2_q11_getting_out_of_bed'),q12:n('p2_q12_walking_balance'),q13:n('p2_q13_freezing') })
          setP3({ q01:n('p3_q01_speech'),q02:n('p3_q02_facial_expression'),q03a:n('p3_q03a_rigidity_neck'),q03b:n('p3_q03b_rigidity_rue'),q03c:n('p3_q03c_rigidity_lue'),q03d:n('p3_q03d_rigidity_rle'),q03e:n('p3_q03e_rigidity_lle'),q04a:n('p3_q04a_finger_tapping_right'),q04b:n('p3_q04b_finger_tapping_left'),q05a:n('p3_q05a_hand_movements_right'),q05b:n('p3_q05b_hand_movements_left'),q06a:n('p3_q06a_pronation_sup_right'),q06b:n('p3_q06b_pronation_sup_left'),q07a:n('p3_q07a_toe_tapping_right'),q07b:n('p3_q07b_toe_tapping_left'),q08a:n('p3_q08a_leg_agility_right'),q08b:n('p3_q08b_leg_agility_left'),q09:n('p3_q09_arising_from_chair'),q10:n('p3_q10_gait'),q11:n('p3_q11_freezing_of_gait'),q12:n('p3_q12_postural_stability'),q13:n('p3_q13_posture'),q14:n('p3_q14_global_spontaneity'),q15a:n('p3_q15a_postural_tremor_right'),q15b:n('p3_q15b_postural_tremor_left'),q16a:n('p3_q16a_kinetic_tremor_right'),q16b:n('p3_q16b_kinetic_tremor_left'),q17a:n('p3_q17a_rest_tremor_rue'),q17b:n('p3_q17b_rest_tremor_lue'),q17c:n('p3_q17c_rest_tremor_rle'),q17d:n('p3_q17d_rest_tremor_lle'),q17e:n('p3_q17e_rest_tremor_lip_jaw'),q18:n('p3_q18_constancy_rest_tremor'),dyskinesia_present:b('p3_dyskinesia_present'),dyskinesia_interfere:b('p3_dyskinesia_interfere'),hy_stage:String(d['p3_hy_stage'] ?? '') })
          setP4({ q01:n('p4_q01_dyskinesia_time'),q02:n('p4_q02_dyskinesia_impact'),q03:n('p4_q03_off_state_time'),q04:n('p4_q04_fluctuation_impact'),q05:n('p4_q05_motor_fluctuation_complex'),q06:n('p4_q06_painful_off_dystonia') })
        } else {
          setP1(mkP1()); setP2(mkP2()); setP3(mkP3()); setP4(mkP4())
        }
        setError(null)
      })
  }, [open, patientId])

  const p1Total = sum(p1 as unknown as Record<string, number>)
  const p2Total = sum(p2 as unknown as Record<string, number>)
  const p3Numeric: Record<string, number> = {}
  for (const [k, v] of Object.entries(p3)) { if (typeof v === 'number') p3Numeric[k] = v }
  const p3Total = sum(p3Numeric)
  const p4Total = sum(p4 as unknown as Record<string, number>)
  const total = p1Total + p2Total + p3Total + p4Total

  const set1 = (k: keyof P1, v: number) => setP1((p) => ({ ...p, [k]: v }))
  const set2 = (k: keyof P2, v: number) => setP2((p) => ({ ...p, [k]: v }))
  const set3n = (k: keyof P3, v: number) => setP3((p) => ({ ...p, [k]: v }))
  const set4 = (k: keyof P4, v: number) => setP4((p) => ({ ...p, [k]: v }))

  const handleSave = async () => {
    setSaving(true); setError(null)
    const payload = {
      patient_id: patientId,
      p1_q01_cognitive_impairment:p1.q01, p1_q02_hallucinations_psychosis:p1.q02, p1_q03_depressed_mood:p1.q03, p1_q04_anxious_mood:p1.q04, p1_q05_apathy:p1.q05, p1_q06_dds:p1.q06, p1_q07_sleep_problems:p1.q07, p1_q08_daytime_sleepiness:p1.q08, p1_q09_pain_sensations:p1.q09, p1_q10_urinary_problems:p1.q10, p1_q11_constipation_problems:p1.q11, p1_q12_lightheadedness:p1.q12, p1_q13_fatigue:p1.q13, p1_total:p1Total,
      p2_q01_speech:p2.q01, p2_q02_saliva_drooling:p2.q02, p2_q03_chewing_swallowing:p2.q03, p2_q04_eating_tasks:p2.q04, p2_q05_dressing:p2.q05, p2_q06_hygiene:p2.q06, p2_q07_handwriting:p2.q07, p2_q08_hobbies_activities:p2.q08, p2_q09_turning_in_bed:p2.q09, p2_q10_tremor:p2.q10, p2_q11_getting_out_of_bed:p2.q11, p2_q12_walking_balance:p2.q12, p2_q13_freezing:p2.q13, p2_total:p2Total,
      p3_q01_speech:p3.q01, p3_q02_facial_expression:p3.q02, p3_q03a_rigidity_neck:p3.q03a, p3_q03b_rigidity_rue:p3.q03b, p3_q03c_rigidity_lue:p3.q03c, p3_q03d_rigidity_rle:p3.q03d, p3_q03e_rigidity_lle:p3.q03e, p3_q04a_finger_tapping_right:p3.q04a, p3_q04b_finger_tapping_left:p3.q04b, p3_q05a_hand_movements_right:p3.q05a, p3_q05b_hand_movements_left:p3.q05b, p3_q06a_pronation_sup_right:p3.q06a, p3_q06b_pronation_sup_left:p3.q06b, p3_q07a_toe_tapping_right:p3.q07a, p3_q07b_toe_tapping_left:p3.q07b, p3_q08a_leg_agility_right:p3.q08a, p3_q08b_leg_agility_left:p3.q08b, p3_q09_arising_from_chair:p3.q09, p3_q10_gait:p3.q10, p3_q11_freezing_of_gait:p3.q11, p3_q12_postural_stability:p3.q12, p3_q13_posture:p3.q13, p3_q14_global_spontaneity:p3.q14, p3_q15a_postural_tremor_right:p3.q15a, p3_q15b_postural_tremor_left:p3.q15b, p3_q16a_kinetic_tremor_right:p3.q16a, p3_q16b_kinetic_tremor_left:p3.q16b, p3_q17a_rest_tremor_rue:p3.q17a, p3_q17b_rest_tremor_lue:p3.q17b, p3_q17c_rest_tremor_rle:p3.q17c, p3_q17d_rest_tremor_lle:p3.q17d, p3_q17e_rest_tremor_lip_jaw:p3.q17e, p3_q18_constancy_rest_tremor:p3.q18, p3_dyskinesia_present:p3.dyskinesia_present, p3_dyskinesia_interfere:p3.dyskinesia_interfere, p3_hy_stage:p3.hy_stage || null, p3_total:p3Total,
      p4_q01_dyskinesia_time:p4.q01, p4_q02_dyskinesia_impact:p4.q02, p4_q03_off_state_time:p4.q03, p4_q04_fluctuation_impact:p4.q04, p4_q05_motor_fluctuation_complex:p4.q05, p4_q06_painful_off_dystonia:p4.q06, p4_total:p4Total,
      total_score: total,
    }
    const { error: err } = await supabase.schema('core').from('mds_updrs_v2').upsert(payload, { onConflict: 'patient_id' })
    setSaving(false)
    if (err) { setError(err.message); return }
    onSaved(); onClose()
  }

  const tabScores = [p1Total, p2Total, p3Total, p4Total]

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>MDS-UPDRS — Movement Disorder Society Unified Parkinson's Disease Rating Scale</DialogTitle></DialogHeader>

        {/* Tab bar */}
        <div className="flex gap-1 mt-2 border-b">
          {TABS.map((t, i) => (
            <button
              key={t}
              onClick={() => setTab(i)}
              className={`px-4 py-2 text-sm rounded-t border-b-2 transition-colors ${tab === i ? 'border-blue-600 text-blue-700 font-medium' : 'border-transparent hover:bg-muted/40'}`}
            >
              {t} <span className="ml-1 text-xs text-muted-foreground">({tabScores[i]})</span>
            </button>
          ))}
        </div>

        {/* Part I */}
        {tab === 0 && (
          <div className="space-y-1 mt-2">
            <p className="text-xs font-semibold text-muted-foreground mb-2">Non-Motor Experiences of Daily Living (0–4 ต่อข้อ)</p>
            {[
              ['1.1','ความบกพร่องทางการรับรู้ (Cognitive impairment)','q01'],
              ['1.2','ภาพหลอน/ความคิดผิดปกติ (Hallucinations/psychosis)','q02'],
              ['1.3','อารมณ์ซึมเศร้า (Depressed mood)','q03'],
              ['1.4','อารมณ์วิตกกังวล (Anxious mood)','q04'],
              ['1.5','ความเฉยเมย (Apathy)','q05'],
              ['1.6','อาการ DDS (Features of DDS)','q06'],
              ['1.7','ปัญหาการนอน (Sleep problems)','q07'],
              ['1.8','ง่วงนอนกลางวัน (Daytime sleepiness)','q08'],
              ['1.9','ความเจ็บปวด/ความรู้สึกผิดปกติ (Pain/other sensations)','q09'],
              ['1.10','ปัญหาระบบปัสสาวะ (Urinary problems)','q10'],
              ['1.11','ปัญหาท้องผูก (Constipation problems)','q11'],
              ['1.12','เวียนศีรษะเมื่อลุก (Lightheadedness on standing)','q12'],
              ['1.13','อาการเหนื่อยล้า (Fatigue)','q13'],
            ].map(([num, label, k]) => (
              <QRow key={k} num={num} label={label} value={p1[k as keyof P1]} onChange={(v) => set1(k as keyof P1, v)} />
            ))}
            <p className="text-xs text-right text-muted-foreground mt-2">รวม Part I: {p1Total}</p>
          </div>
        )}

        {/* Part II */}
        {tab === 1 && (
          <div className="space-y-1 mt-2">
            <p className="text-xs font-semibold text-muted-foreground mb-2">Motor Experiences of Daily Living (0–4 ต่อข้อ)</p>
            {[
              ['2.1','การพูด (Speech)','q01'],
              ['2.2','น้ำลายไหล (Saliva and drooling)','q02'],
              ['2.3','การเคี้ยว/กลืน (Chewing and swallowing)','q03'],
              ['2.4','การรับประทานอาหาร (Eating tasks)','q04'],
              ['2.5','การแต่งตัว (Dressing)','q05'],
              ['2.6','สุขอนามัย (Hygiene)','q06'],
              ['2.7','การเขียน (Handwriting)','q07'],
              ['2.8','งานอดิเรก/กิจกรรม (Doing hobbies/activities)','q08'],
              ['2.9','การพลิกตัวบนเตียง (Turning in bed)','q09'],
              ['2.10','อาการสั่น (Tremor)','q10'],
              ['2.11','การลุกจากเตียง (Getting out of bed)','q11'],
              ['2.12','การเดิน/ทรงตัว (Walking and balance)','q12'],
              ['2.13','อาการหยุดชะงัก (Freezing)','q13'],
            ].map(([num, label, k]) => (
              <QRow key={k} num={num} label={label} value={p2[k as keyof P2]} onChange={(v) => set2(k as keyof P2, v)} />
            ))}
            <p className="text-xs text-right text-muted-foreground mt-2">รวม Part II: {p2Total}</p>
          </div>
        )}

        {/* Part III */}
        {tab === 2 && (
          <div className="space-y-1 mt-2">
            <p className="text-xs font-semibold text-muted-foreground mb-2">Motor Examination (0–4 ต่อข้อ)</p>
            {[
              ['3.1','การพูด (Speech)','q01'],
              ['3.2','การแสดงสีหน้า (Facial expression)','q02'],
              ['3.3a','ความตึงของกล้ามเนื้อ: คอ (Rigidity – neck)','q03a'],
              ['3.3b','ความตึง: แขนขวา (RUE)','q03b'],
              ['3.3c','ความตึง: แขนซ้าย (LUE)','q03c'],
              ['3.3d','ความตึง: ขาขวา (RLE)','q03d'],
              ['3.3e','ความตึง: ขาซ้าย (LLE)','q03e'],
              ['3.4a','Finger tapping – ขวา','q04a'],
              ['3.4b','Finger tapping – ซ้าย','q04b'],
              ['3.5a','Hand movements – ขวา','q05a'],
              ['3.5b','Hand movements – ซ้าย','q05b'],
              ['3.6a','Pronation-supination – ขวา','q06a'],
              ['3.6b','Pronation-supination – ซ้าย','q06b'],
              ['3.7a','Toe tapping – ขวา','q07a'],
              ['3.7b','Toe tapping – ซ้าย','q07b'],
              ['3.8a','Leg agility – ขวา','q08a'],
              ['3.8b','Leg agility – ซ้าย','q08b'],
              ['3.9','ลุกจากเก้าอี้ (Arising from chair)','q09'],
              ['3.10','การเดิน (Gait)','q10'],
              ['3.11','อาการหยุดชะงัก (Freezing of gait)','q11'],
              ['3.12','เสถียรภาพท่ายืน (Postural stability)','q12'],
              ['3.13','ท่าทาง (Posture)','q13'],
              ['3.14','ความคล่องตัวโดยรวม (Global spontaneity)','q14'],
              ['3.15a','Postural tremor – มือขวา','q15a'],
              ['3.15b','Postural tremor – มือซ้าย','q15b'],
              ['3.16a','Kinetic tremor – มือขวา','q16a'],
              ['3.16b','Kinetic tremor – มือซ้าย','q16b'],
              ['3.17a','Rest tremor – แขนขวา (RUE)','q17a'],
              ['3.17b','Rest tremor – แขนซ้าย (LUE)','q17b'],
              ['3.17c','Rest tremor – ขาขวา (RLE)','q17c'],
              ['3.17d','Rest tremor – ขาซ้าย (LLE)','q17d'],
              ['3.17e','Rest tremor – ริมฝีปาก/คาง','q17e'],
              ['3.18','ความสม่ำเสมอของ rest tremor','q18'],
            ].map(([num, label, k]) => (
              <QRow key={k} num={num} label={label} value={p3[k as keyof P3] as number} onChange={(v) => set3n(k as keyof P3, v)} />
            ))}

            {/* Dyskinesia + H&Y */}
            <div className="mt-3 pt-2 border-t space-y-2">
              <div className="flex items-center gap-3">
                <span className="text-xs flex-1">D1. มี dyskinesias ระหว่างการตรวจ?</span>
                <div className="flex gap-1">
                  {[true, false].map((v) => (
                    <button key={String(v)} onClick={() => setP3((p) => ({ ...p, dyskinesia_present: v }))}
                      className={`px-2 py-1 text-xs rounded border ${p3.dyskinesia_present === v ? 'bg-blue-600 text-white border-blue-600' : 'hover:bg-muted/60'}`}>
                      {v ? 'ใช่' : 'ไม่'}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs flex-1">D2. Dyskinesias รบกวนการตรวจ?</span>
                <div className="flex gap-1">
                  {[true, false].map((v) => (
                    <button key={String(v)} onClick={() => setP3((p) => ({ ...p, dyskinesia_interfere: v }))}
                      className={`px-2 py-1 text-xs rounded border ${p3.dyskinesia_interfere === v ? 'bg-blue-600 text-white border-blue-600' : 'hover:bg-muted/60'}`}>
                      {v ? 'ใช่' : 'ไม่'}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs flex-1">H&amp;Y Stage</span>
                <select value={p3.hy_stage} onChange={(e) => setP3((p) => ({ ...p, hy_stage: e.target.value }))}
                  className="border rounded p-1 text-sm w-20">
                  {['','1','1.5','2','2.5','3','4','5'].map((v) => <option key={v} value={v}>{v || '-'}</option>)}
                </select>
              </div>
            </div>
            <p className="text-xs text-right text-muted-foreground mt-2">รวม Part III: {p3Total}</p>
          </div>
        )}

        {/* Part IV */}
        {tab === 3 && (
          <div className="space-y-1 mt-2">
            <p className="text-xs font-semibold text-muted-foreground mb-2">Motor Complications (0–4 ต่อข้อ)</p>
            {[
              ['4.1','เวลาที่มี dyskinesias (Time spent with dyskinesias)','q01'],
              ['4.2','ผลกระทบจาก dyskinesias (Functional impact)','q02'],
              ['4.3','เวลาที่อยู่ใน OFF state (Time in OFF state)','q03'],
              ['4.4','ผลกระทบจาก fluctuations (Impact of fluctuations)','q04'],
              ['4.5','ความซับซ้อนของ motor fluctuations','q05'],
              ['4.6','Painful OFF-state dystonia','q06'],
            ].map(([num, label, k]) => (
              <QRow key={k} num={num} label={label} value={p4[k as keyof P4]} onChange={(v) => set4(k as keyof P4, v)} />
            ))}
            <p className="text-xs text-right text-muted-foreground mt-2">รวม Part IV: {p4Total}</p>
          </div>
        )}

        <div className="mt-4 rounded bg-slate-50 p-3 text-sm font-semibold">
          คะแนนรวมทั้งหมด: {total} &nbsp;|&nbsp;
          <span className="font-normal text-xs">I:{p1Total} II:{p2Total} III:{p3Total} IV:{p4Total}</span>
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
