'use client'

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { hasQaGp2, isQaDiagnosed, type QaRow } from './types'

interface Props {
  row: QaRow | null
  onClose: () => void
}

type ScoreCategory = {
  label: string
  tone: string
}

type FeatureItem = {
  key: string
  label: string
  active: boolean | null | undefined
  onsetAge?: string | null
  duration?: string | null
}

export default function QaPatientSummaryModal({ row, onClose }: Props) {
  if (!row) return null

  const { patient: p, diag, moca, hamd, mds, epw, smell, tmse, rbd, rome4, conditionLabel } = row
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
      <DialogContent className="max-h-[90vh] w-[96vw] max-w-4xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            Patient Summary - {p.first_name} {p.last_name}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-1">
          <section className="rounded-lg border p-4">
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">General</h3>
            <div className="grid gap-x-6 gap-y-2 text-sm md:grid-cols-2">
              <InfoRow label="HN" value={p.hn_number} />
              <InfoRow label="Age" value={p.age != null ? `${p.age} years` : null} />
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

          <section className="rounded-lg border p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Diagnosis</h3>
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
            <section className="rounded-lg border p-4">
              <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">Prodromal Features</h3>
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

          <section className="rounded-lg border p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Assessments</h3>
              <span className="text-xs text-muted-foreground">Preliminary categories, update thresholds later</span>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <ScoreCard label="MoCA" score={moca?.total_score} category={getPreliminaryScoreCategory('moca', moca?.total_score)} />
              <ScoreCard label="HAMD" score={hamd?.total_score} suffix={hamd?.severity_level} category={getPreliminaryScoreCategory('hamd', hamd?.total_score)} />
              <ScoreCard label="MDS-UPDRS" score={mds?.total_score} category={getPreliminaryScoreCategory('mds', mds?.total_score)} />
              <ScoreCard label="Epworth" score={epw?.total_score} category={getPreliminaryScoreCategory('epworth', epw?.total_score)} />
              <ScoreCard label="Smell Test" score={smell?.total_score} category={getPreliminaryScoreCategory('smell', smell?.total_score)} />
              <ScoreCard label="TMSE" score={tmse?.total_score} category={getPreliminaryScoreCategory('tmse', tmse?.total_score)} />
              <ScoreCard label="RBD Questionnaire" score={rbd?.total_score} category={getPreliminaryScoreCategory('rbd', rbd?.total_score)} />
              <ScoreCard label="Rome IV" score={rome4?.total_score} category={getPreliminaryScoreCategory('rome4', rome4?.total_score)} />
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
      <span className="shrink-0 text-muted-foreground">{label}:</span>
      <span className="font-medium">{value ?? '-'}</span>
    </div>
  )
}

function LongInfoRow({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="md:col-span-2">
      <div className="mb-1 text-muted-foreground">{label}</div>
      <div className="rounded-md bg-slate-50 px-3 py-2 text-sm font-medium whitespace-pre-wrap break-words">
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
    <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
      <div className="mb-2 text-sm font-semibold text-slate-900">{label}</div>
      <div className="space-y-1 text-sm">
        <div className="flex gap-2">
          <span className="text-muted-foreground">Onset age:</span>
          <span className="font-medium">{onsetAge?.trim() || '-'}</span>
        </div>
        <div className="flex gap-2">
          <span className="text-muted-foreground">Duration:</span>
          <span className="font-medium">{duration?.trim() || '-'}</span>
        </div>
      </div>
    </div>
  )
}

function ScoreCard({
  label,
  score,
  suffix,
  category,
}: {
  label: string
  score: number | null | undefined
  suffix?: string | null
  category: ScoreCategory
}) {
  return (
    <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
      <div className="mb-2 flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-semibold text-slate-900">{label}</div>
          {suffix && <div className="text-xs text-muted-foreground">{suffix}</div>}
        </div>
        <span className={category.tone}>{category.label}</span>
      </div>
      <div className="text-sm">
        <span className="text-muted-foreground">Score:</span>{' '}
        <span className="font-semibold">{score != null ? score : '-'}</span>
      </div>
    </div>
  )
}

function getPreliminaryScoreCategory(kind: string, score: number | null | undefined): ScoreCategory {
  if (score == null) {
    return { label: 'No data', tone: CATEGORY_STYLES.muted }
  }

  // Temporary thresholds for UI grouping only. Replace with the correct clinical cutoffs later.
  switch (kind) {
    case 'moca':
    case 'tmse':
    case 'smell':
      if (score >= 25) return { label: 'Prelim: Good', tone: CATEGORY_STYLES.good }
      if (score >= 18) return { label: 'Prelim: Borderline', tone: CATEGORY_STYLES.warn }
      return { label: 'Prelim: Low', tone: CATEGORY_STYLES.bad }
    case 'hamd':
    case 'epworth':
    case 'mds':
    case 'rbd':
    case 'rome4':
    default:
      if (score <= 7) return { label: 'Prelim: Low', tone: CATEGORY_STYLES.good }
      if (score <= 14) return { label: 'Prelim: Medium', tone: CATEGORY_STYLES.warn }
      return { label: 'Prelim: High', tone: CATEGORY_STYLES.bad }
  }
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

const STATUS_STYLES = {
  done: 'rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-700',
  pending: 'rounded-full bg-yellow-100 px-2.5 py-0.5 text-xs font-medium text-yellow-700',
}

const CATEGORY_STYLES = {
  muted: 'rounded-full bg-slate-200 px-2 py-0.5 text-xs font-medium text-slate-700',
  good: 'rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700',
  warn: 'rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700',
  bad: 'rounded-full bg-rose-100 px-2 py-0.5 text-xs font-medium text-rose-700',
}
