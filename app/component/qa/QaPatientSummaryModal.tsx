'use client'

import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  hasQaGp2,
  isQaDiagnosed,
  formatQaConditionLabel,
  type QaDiagnosisRow,
  type QaHamdRow,
  type QaPatient,
  type QaRow,
  type QaScoreRow,
} from './types'

interface Props {
  row: QaRow | null
  onClose: () => void
}

type ScoreCategory = {
  label: string
  tone: string
}

type CategoryToneKey = 'muted' | 'good' | 'warn' | 'bad'

type ScoreThreshold = {
  max?: number
  min?: number
  label: string
  tone: CategoryToneKey
}

type FeatureItem = {
  key: string
  label: string
  active: boolean | null | undefined
  onsetAge?: string | null
  duration?: string | null
}

const DIAG_SELECT =
  'patient_id,condition,hy_stage,disease_duration,other_diagnosis_text,constipation,constipation_onset_age,constipation_duration,rbd_suspected,rbd_onset_age,rbd_duration,hyposmia,hyposmia_onset_age,hyposmia_duration,depression,depression_onset_age,depression_duration,eds,eds_onset_age,eds_duration,ans_dysfunction,ans_onset_age,ans_duration,mild_parkinsonian_sign,family_history_pd,adl_score,scopa_aut_score,blood_test_note,fdopa_pet_requested,fdopa_pet_score'

const SCORE_THRESHOLDS: Record<string, ScoreThreshold[]> = {
  hamd: [
    { max: 7, label: 'No depression', tone: 'good' },
    { max: 12, label: 'Mild depression', tone: 'warn' },
    { max: 17, label: 'Moderate depression', tone: 'bad' },
    { max: 29, label: 'Major depression', tone: 'bad' },
    { min: 30, label: 'Severe depression', tone: 'bad' },
  ],
  epworth: [
    { max: 6, label: 'Normal', tone: 'good' },
    { max: 9, label: 'Borderline', tone: 'warn' },
    { min: 10, label: 'Excessive daytime sleepiness', tone: 'bad' },
  ],
  rbd: [
    { max: 16, label: 'Normal', tone: 'good' },
    { min: 17, label: 'Suspected RBD', tone: 'bad' },
  ],
  rome4: [
    { max: 1, label: 'Normal', tone: 'good' },
    { min: 2, label: 'Functional constipation', tone: 'bad' },
  ],
  mds: [
    { max: 3, label: 'Normal', tone: 'good' },
    { max: 6, label: 'Borderline', tone: 'warn' },
    { min: 7, label: 'Mild parkinsonian sign', tone: 'bad' },
  ],
  smell: [
    { max: 9, label: 'Hyposmia', tone: 'bad' },
    { min: 10, label: 'Normal', tone: 'good' },
  ],
  moca: [
    { max: 17, label: 'Severe cognitive impairment', tone: 'bad' },
    { max: 25, label: 'Mild cognitive impairment', tone: 'warn' },
    { min: 26, label: 'Normal', tone: 'good' },
  ],
  tmse: [
    { max: 23, label: 'Cognitive impairment', tone: 'bad' },
    { min: 24, label: 'Normal', tone: 'good' },
  ],
}

const TEST_MAX_SCORES: Record<string, number | undefined> = {
  moca: 30,
  hamd: 52,
  mds: 199,
  epworth: 24,
  smell: 16,
  tmse: 30,
  rbd: 100,
  rome4: 6,
}

export default function QaPatientSummaryModal({ row, onClose }: Props) {
  if (!row) return null

  const [visitRows, setVisitRows] = useState<QaRow[]>([])
  const [selectedPatientId, setSelectedPatientId] = useState<number | null>(row.patient.id)
  const [loadingHistory, setLoadingHistory] = useState(false)
  const [historyError, setHistoryError] = useState<string | null>(null)

  useEffect(() => {
    if (!row) return

    let active = true
    const seedPatientId = row.patient.id
    setSelectedPatientId(seedPatientId)
    setLoadingHistory(true)
    setHistoryError(null)

    const fetchVisitHistory = async () => {
      try {
        const base = row.patient
        const patientSelect =
          'id,patient_uid,created_at,submission_timestamp,first_name,last_name,age,province,collection_date,hn_number,thaiid,bmi,weight,height,chest_cm,waist_cm,hip_cm,neck_cm,bp_supine,pr_supine,bp_upright,pr_upright,visit_no,total_visits,same_day_visit_seq,same_day_visit_count'

        const patientUid = base.patient_uid?.trim()
        if (!patientUid) {
          if (!active) return
          setVisitRows([row])
          setSelectedPatientId(seedPatientId)
          setLoadingHistory(false)
          return
        }

        const { data: patientsData, error: patientsError } = await supabase
          .from('patient_visits_v2')
          .select(patientSelect)
          .eq('patient_uid', patientUid)
          .order('collection_date', { ascending: true, nullsFirst: false })
          .order('id', { ascending: true })

        if (patientsError) throw new Error(`patient_visits_v2: ${patientsError.message}`)

        const patients = (patientsData ?? []) as QaPatient[]
        const visitPatients = patients.length > 0 ? patients : [base]
        const patientIds = visitPatients.map((p) => p.id)

        const [diagRes, mocaRes, hamdRes, mdsRes, epwRes, smellRes, tmseRes, rbdRes, rome4Res] =
          await Promise.all([
            supabase.schema('core').from('patient_diagnosis_v2').select(DIAG_SELECT).in('patient_id', patientIds),
            supabase.schema('core').from('moca_v2').select('patient_id,total_score').in('patient_id', patientIds),
            supabase.schema('core').from('hamd_v2').select('patient_id,total_score,severity_level').in('patient_id', patientIds),
            supabase.schema('core').from('mds_updrs_v2').select('patient_id,total_score').in('patient_id', patientIds),
            supabase.schema('core').from('epworth_v2').select('patient_id,total_score').in('patient_id', patientIds),
            supabase.schema('core').from('smell_test_v2').select('patient_id,total_score').in('patient_id', patientIds),
            supabase.schema('core').from('tmse_v2').select('patient_id,total_score').in('patient_id', patientIds),
            supabase.schema('core').from('rbd_questionnaire_v2').select('patient_id,total_score').in('patient_id', patientIds),
            supabase.schema('core').from('rome4_v2').select('patient_id,total_score').in('patient_id', patientIds),
          ])

        const errors = [diagRes, mocaRes, hamdRes, mdsRes, epwRes, smellRes, tmseRes, rbdRes, rome4Res]
          .map((r, i) => (r.error ? `table[${i}]: ${r.error.message}` : null))
          .filter(Boolean)

        if (errors.length > 0) throw new Error(errors.join(', '))

        const diagMap = Object.fromEntries((diagRes.data ?? []).map((d: QaDiagnosisRow) => [d.patient_id, d]))
        const mocaMap = Object.fromEntries((mocaRes.data ?? []).map((d: QaScoreRow) => [d.patient_id, d]))
        const hamdMap = Object.fromEntries((hamdRes.data ?? []).map((d: QaHamdRow) => [d.patient_id, d]))
        const mdsMap = Object.fromEntries((mdsRes.data ?? []).map((d: QaScoreRow) => [d.patient_id, d]))
        const epwMap = Object.fromEntries((epwRes.data ?? []).map((d: QaScoreRow) => [d.patient_id, d]))
        const smellMap = Object.fromEntries((smellRes.data ?? []).map((d: QaScoreRow) => [d.patient_id, d]))
        const tmseMap = Object.fromEntries((tmseRes.data ?? []).map((d: QaScoreRow) => [d.patient_id, d]))
        const rbdMap = Object.fromEntries((rbdRes.data ?? []).map((d: QaScoreRow) => [d.patient_id, d]))
        const rome4Map = Object.fromEntries((rome4Res.data ?? []).map((d: QaScoreRow) => [d.patient_id, d]))

        const mappedRows: QaRow[] = visitPatients.map((patient) => {
          const diag = diagMap[patient.id] as QaDiagnosisRow | undefined
          return {
            patient,
            diag,
            conditionLabel: formatQaConditionLabel(diag),
            moca: mocaMap[patient.id] as QaScoreRow | undefined,
            hamd: hamdMap[patient.id] as QaHamdRow | undefined,
            mds: mdsMap[patient.id] as QaScoreRow | undefined,
            epw: epwMap[patient.id] as QaScoreRow | undefined,
            smell: smellMap[patient.id] as QaScoreRow | undefined,
            tmse: tmseMap[patient.id] as QaScoreRow | undefined,
            rbd: rbdMap[patient.id] as QaScoreRow | undefined,
            rome4: rome4Map[patient.id] as QaScoreRow | undefined,
          }
        })

        if (!active) return
        setVisitRows(mappedRows)
        setSelectedPatientId((prev) => (prev != null && mappedRows.some((v) => v.patient.id === prev) ? prev : seedPatientId))
      } catch (err) {
        if (!active) return
        setHistoryError(err instanceof Error ? err.message : String(err))
        setVisitRows([row])
        setSelectedPatientId(seedPatientId)
      } finally {
        if (active) setLoadingHistory(false)
      }
    }

    fetchVisitHistory()
    return () => {
      active = false
    }
  }, [row])

  const activeRow = useMemo(() => {
    if (!row) return null
    if (visitRows.length === 0) return row
    if (selectedPatientId != null) {
      const selected = visitRows.find((v) => v.patient.id === selectedPatientId)
      if (selected) return selected
    }
    return visitRows.find((v) => v.patient.id === row.patient.id) ?? visitRows[visitRows.length - 1]
  }, [row, selectedPatientId, visitRows])

  if (!activeRow) return null

  const { patient: p, diag, moca, hamd, mds, epw, smell, tmse, rbd, rome4, conditionLabel } = activeRow
  const diagnosed = isQaDiagnosed(diag)
  const hasGp2 = hasQaGp2(diag)

  const prodromalFeatures: FeatureItem[] = [
    {
      key: 'constipation',
      label: 'Constipation',
      active: diag?.constipation,
      onsetAge: diag?.constipation_onset_age,
      duration: diag?.constipation_duration,
    },
    {
      key: 'rbd',
      label: 'Suspected RBD',
      active: diag?.rbd_suspected,
      onsetAge: diag?.rbd_onset_age,
      duration: diag?.rbd_duration,
    },
    {
      key: 'hyposmia',
      label: 'Hyposmia',
      active: diag?.hyposmia,
      onsetAge: diag?.hyposmia_onset_age,
      duration: diag?.hyposmia_duration,
    },
    {
      key: 'depression',
      label: 'Depression',
      active: diag?.depression,
      onsetAge: diag?.depression_onset_age,
      duration: diag?.depression_duration,
    },
    {
      key: 'eds',
      label: 'EDS',
      active: diag?.eds,
      onsetAge: diag?.eds_onset_age,
      duration: diag?.eds_duration,
    },
    {
      key: 'ans',
      label: 'ANS Dysfunction',
      active: diag?.ans_dysfunction,
      onsetAge: diag?.ans_onset_age,
      duration: diag?.ans_duration,
    },
    {
      key: 'mild_parkinsonian_sign',
      label: 'Mild parkinsonian sign',
      active: diag?.mild_parkinsonian_sign,
    },
    {
      key: 'family_history_pd',
      label: 'Family history of PD (First degree)',
      active: diag?.family_history_pd,
    },
  ].filter((item) => item.active)

  return (
    <Dialog open={!!row} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-h-[90vh] w-[95vw] sm:w-[92vw] lg:w-[88vw] sm:!max-w-[92vw] lg:!max-w-[88vw] xl:!max-w-6xl overflow-y-auto p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle>Patient Summary</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-1 sm:space-y-5">
          {/* Hero Header */}
          <div className="flex flex-col gap-3 border-b border-slate-100 pb-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <h2 className="text-xl font-bold text-slate-900 truncate">
                {p.first_name} {p.last_name}
              </h2>
              <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-gray-500">
                <span>HN: {p.hn_number ?? '-'}</span>
                <span>Age: {p.age ?? '-'}</span>
                <span>Visit {p.visit_no}</span>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {/* Condition badge */}
              {conditionLabel !== '-' && (
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                  {conditionLabel}
                </span>
              )}
              {/* Diag status badge */}
              <span className={diagnosed ? STATUS_STYLES.done : STATUS_STYLES.pending}>
                {diagnosed ? 'Diagnosed' : 'Pending'}
              </span>
            </div>
          </div>

          <section className="rounded-xl bg-slate-50/60 p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400">Visit History</h3>
              <span className="text-xs text-gray-500">{visitRows.length || 1} visits</span>
            </div>
          {!loadingHistory && (
            <div className="flex gap-2 overflow-x-auto pb-1">
              {(visitRows.length > 0 ? visitRows : [row]).map((visit) => {
                const active = visit.patient.id === p.id
                return (
                  <button
                    key={visit.patient.id}
                    type="button"
                    onClick={() => setSelectedPatientId(visit.patient.id)}
                    className={`shrink-0 rounded-lg px-4 py-2 text-sm text-left transition-colors ${active
                        ? 'bg-blue-50 text-blue-700 ring-1 ring-blue-200'
                        : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50'
                      }`}
                  >
                    <div className="font-semibold">Visit {visit.patient.visit_no}</div>
                    <div className="text-xs opacity-70">Collection date: {visit.patient.collection_date ?? '-'}</div>
                    <div className="text-[10px] opacity-70">
                      {formatSubmittedTime(visit.patient.submission_timestamp ?? visit.patient.created_at)}
                    </div>
                    {visit.patient.same_day_visit_count > 1 && (
                      <div className="mt-1 text-[10px] font-medium text-amber-700">
                        Same-day {visit.patient.same_day_visit_seq}/{visit.patient.same_day_visit_count}
                      </div>
                    )}
                  </button>
                )
              })}
            </div>
          )}

          {loadingHistory && (
            <div className="rounded-md bg-slate-50 px-3 py-2 text-sm text-muted-foreground">Loading visit history...</div>
          )}

          {historyError && (
            <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">Unable to load all visits: {historyError}</div>
          )}
          </section>

          <section className="rounded-xl bg-slate-50/60 p-4">
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-400">Vitals & Physical</h3>
            <div className="grid gap-x-8 gap-y-2 text-sm sm:grid-cols-2 lg:grid-cols-3">
              <InfoRow label="Province" value={p.province} />
              <InfoRow label="Collection Date" value={p.collection_date} />
              <InfoRow label="BMI" value={p.bmi != null ? Number(p.bmi).toFixed(1) : null} />
              <InfoRow label="Weight / Height" value={p.weight && p.height ? `${p.weight} kg / ${p.height} cm` : null} />
              <InfoRow label="Chest" value={p.chest_cm != null ? `${p.chest_cm} cm` : null} />
              <InfoRow label="Waist / Hip / Neck" value={formatBodyMeasures(p.waist_cm, p.hip_cm, p.neck_cm)} />
              <InfoRow label="BP Supine / PR" value={formatVitalPair(p.bp_supine, p.pr_supine)} />
              <InfoRow label="BP Upright / PR" value={formatVitalPair(p.bp_upright, p.pr_upright)} />
            </div>
          </section>

          <section className="rounded-xl bg-slate-50/60 p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400">Diagnosis</h3>
              <span className={diagnosed ? STATUS_STYLES.done : STATUS_STYLES.pending}>
                {diagnosed ? 'Diagnosed' : 'Pending'}
              </span>
            </div>

            <div className="grid gap-x-6 gap-y-2 text-sm md:grid-cols-2">
              <InfoRow label="Condition" value={conditionLabel} />
              <InfoRow label="H&Y Stage" value={diag?.hy_stage} />
              <InfoRow label="Disease Duration" value={diag?.disease_duration} />
              <InfoRow label="GP2" value={hasGp2 ? 'GP2' : '-'} />
              <InfoRow label="ADL Score" value={diag?.adl_score != null ? String(diag.adl_score) : null} />
              <InfoRow label="SCOPA-AUT" value={diag?.scopa_aut_score != null ? String(diag.scopa_aut_score) : null} />
              <LongInfoRow label="Other Diagnosis" value={diag?.other_diagnosis_text} />
              <LongInfoRow label="Blood Test Note" value={diag?.blood_test_note} />
              <LongInfoRow label="FDOPA PET" value={formatFdopa(diag?.fdopa_pet_requested, diag?.fdopa_pet_score)} />
            </div>
          </section>

          {prodromalFeatures.length > 0 && (
            <section className="rounded-xl bg-slate-50/60 p-4">
              <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-400">Prodromal Features</h3>
              <div className="grid gap-3 md:grid-cols-2">
                {prodromalFeatures.map((item) => (
                  <FeatureCard
                    key={item.key}
                    label={item.label}
                    onsetAge={item.onsetAge}
                    duration={item.duration}
                  />
                ))}
              </div>
            </section>
          )}

          <section className="rounded-xl bg-slate-50/60 p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400">Assessments</h3>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              <AssessmentCard
                className="lg:col-span-2 xl:col-span-2"
                label="MDS-UPDRS"
                score={mds?.total_score}
                maxScore={TEST_MAX_SCORES.mds}
                category={getScoreCategory('mds', mds?.total_score)}
              />
              <AssessmentCard
                label="MoCA"
                score={moca?.total_score}
                maxScore={TEST_MAX_SCORES.moca}
                category={getScoreCategory('moca', moca?.total_score)}
              />
              <AssessmentCard
                label="TMSE"
                score={tmse?.total_score}
                maxScore={TEST_MAX_SCORES.tmse}
                category={getScoreCategory('tmse', tmse?.total_score)}
              />
              <AssessmentCard
                label="HAMD"
                score={hamd?.total_score}
                maxScore={TEST_MAX_SCORES.hamd}
                suffix={hamd?.severity_level}
                category={getScoreCategory('hamd', hamd?.total_score)}
              />
              <AssessmentCard
                label="Epworth"
                score={epw?.total_score}
                maxScore={TEST_MAX_SCORES.epworth}
                category={getScoreCategory('epworth', epw?.total_score)}
              />
              <AssessmentCard
                label="Smell Test"
                score={smell?.total_score}
                maxScore={TEST_MAX_SCORES.smell}
                category={getScoreCategory('smell', smell?.total_score)}
              />
              <AssessmentCard
                label="RBD Questionnaire"
                score={rbd?.total_score}
                maxScore={TEST_MAX_SCORES.rbd}
                category={getScoreCategory('rbd', rbd?.total_score)}
              />
              <AssessmentCard
                label="Rome IV"
                score={rome4?.total_score}
                maxScore={TEST_MAX_SCORES.rome4}
                category={getScoreCategory('rome4', rome4?.total_score)}
              />
            </div>
          </section>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function InfoRow({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="flex gap-2">
      <span className="shrink-0 text-gray-500 text-sm">{label}:</span>
      <span className="text-slate-900 font-medium text-sm">{value ?? '-'}</span>
    </div>
  )
}

function LongInfoRow({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="md:col-span-2">
      <div className="mb-1 text-gray-500 text-sm">{label}</div>
      <div className="rounded-md bg-white px-3 py-2 text-sm text-slate-900 font-medium whitespace-pre-wrap break-words shadow-sm">
        {value?.trim() || '-'}
      </div>
    </div>
  )
}

function FeatureCard({
  label,
  onsetAge,
  duration,
}: {
  label: string
  onsetAge?: string | null
  duration?: string | null
}) {
  return (
    <div className="rounded-lg bg-white p-3 shadow-sm">
      <div className="mb-2 text-sm font-semibold text-slate-900">{label}</div>
      <div className="space-y-1 text-sm">
        <div className="flex gap-2">
          <span className="text-gray-500">Onset age:</span>
          <span className="text-slate-900 font-medium">{onsetAge?.trim() || '-'}</span>
        </div>
        <div className="flex gap-2">
          <span className="text-gray-500">Duration:</span>
          <span className="text-slate-900 font-medium">{duration?.trim() || '-'}</span>
        </div>
      </div>
    </div>
  )
}

function AssessmentCard({
  label,
  score,
  maxScore,
  suffix,
  category,
  className,
}: {
  label: string
  score: number | null | undefined
  maxScore?: number
  suffix?: string | null
  category: ScoreCategory
  className?: string
}) {
  const pct = score != null && maxScore ? Math.min((score / maxScore) * 100, 100) : null

  return (
    <div className={`rounded-xl bg-white p-4 shadow-sm ${className ?? ''}`}>
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="text-sm font-semibold text-slate-700">{label}</div>
        </div>
        <span className={category.tone}>{category.label}</span>
      </div>

      <div className="mt-3 flex items-baseline gap-2">
        <span className="text-2xl font-bold text-slate-900">{score != null ? score : '-'}</span>
        {maxScore && <span className="text-sm text-gray-400">/ {maxScore}</span>}
      </div>

      {suffix && <div className="mt-1 text-xs text-gray-500">{suffix}</div>}

      {pct != null && (
        <div className="mt-3 h-1.5 w-full rounded-full bg-slate-100">
          <div
            className={`h-1.5 rounded-full transition-all ${progressColor(category)}`}
            style={{ width: `${pct}%` }}
          />
        </div>
      )}
    </div>
  )
}

function progressColor(category: ScoreCategory): string {
  if (category.tone.includes('emerald') || category.tone.includes('green')) return 'bg-emerald-400'
  if (category.tone.includes('amber') || category.tone.includes('orange')) return 'bg-orange-400'
  if (category.tone.includes('rose') || category.tone.includes('red')) return 'bg-rose-400'
  return 'bg-slate-300'
}

function getScoreCategory(kind: string, score: number | null | undefined): ScoreCategory {
  if (score == null) {
    return { label: 'No data', tone: CATEGORY_STYLES.muted }
  }

  const thresholds = SCORE_THRESHOLDS[kind]
  if (!thresholds) {
    return { label: String(score), tone: CATEGORY_STYLES.muted }
  }

  for (const threshold of thresholds) {
    if (threshold.min != null && threshold.max != null) {
      if (score >= threshold.min && score <= threshold.max) {
        return { label: threshold.label, tone: CATEGORY_STYLES[threshold.tone] }
      }
      continue
    }

    if (threshold.max != null && score <= threshold.max) {
      return { label: threshold.label, tone: CATEGORY_STYLES[threshold.tone] }
    }

    if (threshold.min != null && score >= threshold.min) {
      return { label: threshold.label, tone: CATEGORY_STYLES[threshold.tone] }
    }
  }

  return { label: String(score), tone: CATEGORY_STYLES.muted }
}

function formatBodyMeasures(
  waist: number | null | undefined,
  hip: number | null | undefined,
  neck: number | null | undefined
) {
  const parts = [
    waist != null ? `Waist ${waist} cm` : null,
    hip != null ? `Hip ${hip} cm` : null,
    neck != null ? `Neck ${neck} cm` : null,
  ].filter(Boolean)

  return parts.length > 0 ? parts.join(' / ') : null
}

function formatVitalPair(bp: string | null | undefined, pr: number | null | undefined) {
  if (!bp && pr == null) return null
  if (bp && pr != null) return `${bp} / ${pr} bpm`
  if (bp) return bp
  return `${pr} bpm`
}

function formatFdopa(requested: boolean | null | undefined, score: string | null | undefined) {
  if (!requested && !score) return null
  if (requested && score?.trim()) return `Requested / ${score.trim()}`
  if (requested) return 'Requested'
  return score?.trim() || null
}

function formatSubmittedTime(value: string | null | undefined) {
  if (!value) return 'Submitted time: -'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Submitted time: -'
  return `Submitted time: ${date.toLocaleString('th-TH')}`
}

const STATUS_STYLES = {
  done: 'rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700',
  pending: 'rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-700',
}

const CATEGORY_STYLES = {
  muted: 'inline-flex max-w-full items-center rounded-full bg-slate-100 px-2 py-0.5 text-[10px] sm:text-xs font-medium leading-tight text-slate-500 break-words',
  good: 'inline-flex max-w-full items-center rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] sm:text-xs font-medium leading-tight text-emerald-700 break-words',
  warn: 'inline-flex max-w-full items-center rounded-full bg-orange-50 px-2 py-0.5 text-[10px] sm:text-xs font-medium leading-tight text-orange-700 break-words',
  bad: 'inline-flex max-w-full items-center rounded-full bg-rose-50 px-2 py-0.5 text-[10px] sm:text-xs font-medium leading-tight text-rose-700 break-words',
}
