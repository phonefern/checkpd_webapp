'use client'
import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { QaPatient } from './types'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { X } from 'lucide-react'
import QaEpworthForm from './forms/QaEpworthForm'
import QaHamdForm from './forms/QaHamdForm'
import QaMocaForm from './forms/QaMocaForm'
import QaTmseForm from './forms/QaTmseForm'
import QaSmellForm from './forms/QaSmellForm'
import QaMdsForm from './forms/QaMdsForm'
import QaRome4Form from './forms/QaRome4Form'
import QaRbdForm from './forms/QaRbdForm'
import QaFoodForm from './forms/QaFoodForm'

type TestKey = 'epworth' | 'hamd' | 'moca' | 'tmse' | 'smell' | 'mds' | 'rome4' | 'rbd' | 'food'

interface TestScores {
  epworth: number | null
  hamd: number | null
  moca: number | null
  tmse: number | null
  smell: number | null
  mds: number | null
  rome4: number | null
  rbd: number | null
  food: number | null
}

const EMPTY_SCORES: TestScores = {
  epworth: null, hamd: null, moca: null, tmse: null, smell: null,
  mds: null, rome4: null, rbd: null, food: null,
}

const TESTS: { key: TestKey; name: string; nameEn: string; maxScore: number; emoji: string }[] = [
  { key: 'moca', name: 'MoCA', nameEn: 'Montreal Cognitive Assessment', maxScore: 30, emoji: '🧠' },
  { key: 'tmse', name: 'TMSE', nameEn: 'Thai Mental State Examination', maxScore: 30, emoji: '🧠' },
  { key: 'hamd', name: 'HAM-D', nameEn: 'Hamilton Depression Rating Scale', maxScore: 52, emoji: '💊' },
  { key: 'mds', name: 'MDS-UPDRS', nameEn: 'MDS Unified Parkinson\'s Rating Scale', maxScore: 260, emoji: '🦾' },
  { key: 'epworth', name: 'Epworth', nameEn: 'Epworth Sleepiness Scale', maxScore: 21, emoji: '😴' },
  { key: 'smell', name: 'Smell Test', nameEn: 'Thai Smell Identification Test', maxScore: 16, emoji: '👃' },
  { key: 'rbd', name: 'RBD Questionnaire', nameEn: 'REM Sleep Behavior Disorder', maxScore: 52, emoji: '🌙' },
  { key: 'rome4', name: 'ROME IV', nameEn: 'Rome IV Constipation Criteria', maxScore: 6, emoji: '🏥' },
  { key: 'food', name: 'Food (มีดี)', nameEn: 'Thai MIND Diet Assessment', maxScore: 10, emoji: '🥗' },
]

interface Props {
  open: boolean
  patient: QaPatient | null
  onClose: () => void
  onUpdated: () => void
}

export default function QaAssessmentModal({ open, patient, onClose, onUpdated }: Props) {
  const [scores, setScores] = useState<TestScores>(EMPTY_SCORES)
  const [loadingScores, setLoadingScores] = useState(false)
  const [activeForm, setActiveForm] = useState<TestKey | null>(null)

  const fetchScores = useCallback(async () => {
    if (!patient) return
    setLoadingScores(true)
    const pid = patient.id
    const [epwRes, hamdRes, mocaRes, tmseRes, smellRes, mdsRes, rome4Res, rbdRes, foodRes] = await Promise.all([
      supabase.schema('core').from('epworth_v2').select('total_score').eq('patient_id', pid).maybeSingle(),
      supabase.schema('core').from('hamd_v2').select('total_score').eq('patient_id', pid).maybeSingle(),
      supabase.schema('core').from('moca_v2').select('total_score').eq('patient_id', pid).maybeSingle(),
      supabase.schema('core').from('tmse_v2').select('total_score').eq('patient_id', pid).maybeSingle(),
      supabase.schema('core').from('smell_test_v2').select('total_score').eq('patient_id', pid).maybeSingle(),
      supabase.schema('core').from('mds_updrs_v2').select('total_score').eq('patient_id', pid).maybeSingle(),
      supabase.schema('core').from('rome4_v2').select('total_score').eq('patient_id', pid).maybeSingle(),
      supabase.schema('core').from('rbd_questionnaire_v2').select('total_score').eq('patient_id', pid).maybeSingle(),
      supabase.schema('core').from('food_questionnaire_v2').select('total_score').eq('patient_id', pid).maybeSingle(),
    ])
    setScores({
      epworth: (epwRes.data as { total_score: number } | null)?.total_score ?? null,
      hamd: (hamdRes.data as { total_score: number } | null)?.total_score ?? null,
      moca: (mocaRes.data as { total_score: number } | null)?.total_score ?? null,
      tmse: (tmseRes.data as { total_score: number } | null)?.total_score ?? null,
      smell: (smellRes.data as { total_score: number } | null)?.total_score ?? null,
      mds: (mdsRes.data as { total_score: number } | null)?.total_score ?? null,
      rome4: (rome4Res.data as { total_score: number } | null)?.total_score ?? null,
      rbd: (rbdRes.data as { total_score: number } | null)?.total_score ?? null,
      food: (foodRes.data as { total_score: number } | null)?.total_score ?? null,
    })
    setLoadingScores(false)
  }, [patient])

  useEffect(() => {
    if (open && patient) fetchScores()
    else setScores(EMPTY_SCORES)
  }, [open, patient, fetchScores])

  const handleSaved = () => {
    fetchScores()
    onUpdated()
  }

  if (!patient) return null

  const formProps = { patientId: patient.id, onClose: () => setActiveForm(null), onSaved: handleSaved }

  return (
    <>
      <Dialog open={open && activeForm === null} onOpenChange={(v) => !v && onClose()}>
        <DialogContent className="max-h-[90vh] w-[95vw] sm:w-[90vw] lg:w-[84vw] sm:!max-w-[90vw] lg:!max-w-5xl overflow-y-auto p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>แบบทดสอบ — {patient.first_name} {patient.last_name}</span>
            </DialogTitle>
          </DialogHeader>

          {loadingScores ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500" />
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-3 mt-2">
              {TESTS.map((t) => {
                const score = scores[t.key]
                const done = score !== null
                return (
                  <button
                    key={t.key}
                    onClick={() => setActiveForm(t.key)}
                    className="text-left border rounded-lg p-3 hover:bg-muted/40 hover:border-blue-400 transition-all group"
                  >
                    <div className="flex items-start justify-between mb-1">
                      <span className="text-xl">{t.emoji}</span>
                      <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${done ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                        {done ? '✓ เสร็จ' : 'ยังไม่ได้ทำ'}
                      </span>
                    </div>
                    <p className="text-sm font-semibold leading-tight">{t.name}</p>
                    <p className="text-xs text-muted-foreground mt-0.5 truncate">{t.nameEn}</p>
                    {done ? (
                      <p className="text-sm font-bold text-blue-700 mt-1">{score} <span className="font-normal text-xs text-muted-foreground">/ {t.maxScore}</span></p>
                    ) : (
                      <p className="text-xs text-muted-foreground mt-1">คลิกเพื่อเริ่ม</p>
                    )}
                  </button>
                )
              })}
            </div>
          )}

          <div className="mt-4 text-xs text-muted-foreground">
            เสร็จแล้ว {TESTS.filter((t) => scores[t.key] !== null).length} / {TESTS.length} แบบทดสอบ
          </div>
        </DialogContent>
      </Dialog>

      {/* Individual test forms */}
      <QaEpworthForm open={activeForm === 'epworth'} {...formProps} />
      <QaHamdForm open={activeForm === 'hamd'}    {...formProps} />
      <QaMocaForm open={activeForm === 'moca'}    {...formProps} />
      <QaTmseForm open={activeForm === 'tmse'}    {...formProps} />
      <QaSmellForm open={activeForm === 'smell'}   {...formProps} />
      <QaMdsForm open={activeForm === 'mds'}     {...formProps} />
      <QaRome4Form open={activeForm === 'rome4'}   {...formProps} />
      <QaRbdForm open={activeForm === 'rbd'}     {...formProps} />
      <QaFoodForm open={activeForm === 'food'}    {...formProps} />
    </>
  )
}
