export const PAGE_SIZE = 20

export type QaPatient = {
  id: number
  patient_uid: string
  created_at: string | null
  submission_timestamp: string | null
  first_name: string | null
  last_name: string | null
  age: number | null
  province: string | null
  collection_date: string | null
  hn_number: string | null
  thaiid: string | null
  bmi: number | null
  weight: number | null
  height: number | null
  chest_cm: number | null
  waist_cm: number | null
  hip_cm: number | null
  neck_cm: number | null
  bp_supine: string | null
  pr_supine: number | null
  bp_upright: string | null
  pr_upright: number | null
  visit_no: number
  total_visits: number
  same_day_visit_seq: number
  same_day_visit_count: number
}

export type QaDiagnosisRow = {
  patient_id: number
  condition: string | null
  hy_stage: string | null
  disease_duration: string | null
  other_diagnosis_text: string | null
  constipation: boolean | null
  constipation_onset_age: string | null
  constipation_duration: string | null
  rbd_suspected: boolean | null
  rbd_onset_age: string | null
  rbd_duration: string | null
  hyposmia: boolean | null
  hyposmia_onset_age: string | null
  hyposmia_duration: string | null
  depression: boolean | null
  depression_onset_age: string | null
  depression_duration: string | null
  eds: boolean | null
  eds_onset_age: string | null
  eds_duration: string | null
  ans_dysfunction: boolean | null
  ans_onset_age: string | null
  ans_duration: string | null
  mild_parkinsonian_sign: boolean | null
  family_history_pd: boolean | null
  adl_score: number | null
  scopa_aut_score: number | null
  blood_test_note: string | null
  fdopa_pet_requested: boolean | null
  fdopa_pet_score: string | null
}

export type QaScoreRow = {
  patient_id: number
  total_score: number | null
  recognize_count?: number | null
  perceive_count?: number | null
}
export type QaHamdRow = { patient_id: number; total_score: number | null; severity_level: string | null }
export type QaConditionFilter = '' | 'pd' | 'pdm' | 'other' | 'ctrl'

export type CheckpdRecordSummary = {
  user_id: string
  recorder: string
  record_id: string | null
  source_collection: string | null
  prediction_risk: boolean | null
  condition: string | null
  condition_status: string | null
  condition_changed_at: string | null
  test_result: string | null
  other: string | null
  tremor_resting_hz: number | null
  tremor_postural_hz: number | null
  balance_hz: number | null
  gait_hz: number | null
  dual_tap_left_score: number | null
  dual_tap_right_score: number | null
  questionnaire_total: number | null
  voice_ahh_ts: string | null
  voice_ypl_ts: string | null
  last_record_at: string | null
  updated_at: string | null
  thaiid: string | null
}

export type QaColorVisionSummary = { done: boolean; summary: string | null }

export type QaRow = {
  patient: QaPatient
  diag: QaDiagnosisRow | undefined
  conditionLabel: string
  has_checkpd: boolean
  moca: QaScoreRow | undefined
  hamd: QaHamdRow | undefined
  mds: QaScoreRow | undefined
  epw: QaScoreRow | undefined
  smell: QaScoreRow | undefined
  tmse: QaScoreRow | undefined
  rbd: QaScoreRow | undefined
  rome4: QaScoreRow | undefined
  food: QaScoreRow | undefined
  colorvision: QaColorVisionSummary | undefined
}

const normalize = (value: string | null | undefined) => (value ?? '').toLowerCase().trim()

export function normalizeQaConditionValue(value?: string | null): QaConditionFilter {
  const raw = normalize(value)

  if (!raw) return ''
  if (raw === '-') return ''
  if (raw === 'pd' || raw.includes('parkinson') || raw.includes('newly diagnosis')) return 'pd'
  if (raw === 'pdm' || raw.includes('prodromal') || raw.includes('high risk') || raw.includes('high-risk')) return 'pdm'
  if (raw === 'ctrl' || raw.includes('healthy') || raw.includes('control') || raw === 'normal') return 'ctrl'
  if (raw === 'other' || raw.includes('other diagnosis')) return 'other'

  return ''
}

export function formatQaConditionLabel(diag?: QaDiagnosisRow): string {
  const raw = normalize(diag?.condition)
  if (!raw || raw === '-') return '-'

  const normalized = normalizeQaConditionValue(diag?.condition)
  if (normalized) return normalized.toUpperCase()

  return diag?.condition?.trim() || '-'
}

export function isQaDiagnosed(diag?: QaDiagnosisRow): boolean {
  return normalizeQaConditionValue(diag?.condition) !== '' || normalize(diag?.other_diagnosis_text) !== ''
}

export function matchesQaConditionFilter(diag: QaDiagnosisRow, filter: QaConditionFilter): boolean {
  if (!filter) return true

  const normalized = normalizeQaConditionValue(diag.condition)
  if (normalized) return normalized === filter

  return filter === 'other' && normalize(diag.other_diagnosis_text) !== ''
}

export function hasQaGp2(diag?: QaDiagnosisRow): boolean {
  return normalize(diag?.blood_test_note).includes('gp2')
}

// ─── Condition badge colours ───────────────────────────────────────────────
export type QaConditionColor = 'pd' | 'pdm' | 'ctrl' | 'other' | 'none'

export function getConditionColor(label: string): QaConditionColor {
  const l = (label ?? '').toUpperCase().trim()
  if (l === 'PD') return 'pd'
  if (l === 'PDM') return 'pdm'
  if (l === 'CTRL') return 'ctrl'
  if (l === '-' || l === '' || l === '—') return 'none'
  return 'other'
}

export const CONDITION_BADGE_CLASS: Record<QaConditionColor, string> = {
  pd:    'bg-red-100 text-red-700 ring-1 ring-red-300',
  pdm:   'bg-orange-100 text-orange-700 ring-1 ring-orange-300',
  ctrl:  'bg-green-100 text-green-700 ring-1 ring-green-300',
  other: 'bg-slate-100 text-slate-600 ring-1 ring-slate-200',
  none:  'text-slate-400',
}

// ─── Score severity (aligned with QaPatientSummaryModal thresholds) ─────────
export type ScoreSeverity = 'good' | 'warn' | 'bad' | 'none'

export function getScoreSeverity(key: string, score: number | null): ScoreSeverity {
  if (score === null) return 'none'
  switch (key) {
    case 'moca':    return score >= 26 ? 'good' : score >= 18 ? 'warn' : 'bad'
    case 'tmse':    return score >= 24 ? 'good' : 'bad'
    case 'hamd':    return score <= 7  ? 'good' : score <= 12 ? 'warn' : 'bad'
    case 'mds':     return score <= 3  ? 'good' : score <= 6  ? 'warn' : 'bad'
    case 'epworth': return score <= 6  ? 'good' : score <= 9  ? 'warn' : 'bad'
    case 'smell':   return score >= 10 ? 'good' : 'bad'
    case 'rbd':     return score <= 16 ? 'good' : 'bad'
    case 'rome4':   return score <= 1  ? 'good' : 'bad'
    default:        return 'none'
  }
}

export function getSeverityLabel(key: string, score: number | null): string {
  if (score === null) return ''
  switch (key) {
    case 'moca':    return score >= 26 ? 'ปกติ' : score >= 18 ? 'MCI' : 'บกพร่อง'
    case 'tmse':    return score >= 24 ? 'ปกติ' : 'บกพร่อง'
    case 'hamd':    return score <= 7  ? 'ปกติ' : score <= 12 ? 'Mild' : 'Moderate+'
    case 'mds':     return score <= 3  ? 'ปกติ' : score <= 6  ? 'Borderline' : 'Mild sign'
    case 'epworth': return score <= 6  ? 'ปกติ' : score <= 9  ? 'Borderline' : 'EDS'
    case 'smell':   return score >= 10 ? 'ปกติ' : 'Hyposmia'
    case 'rbd':     return score <= 16 ? 'ปกติ' : 'Susp. RBD'
    case 'rome4':   return score <= 1  ? 'ปกติ' : 'Constipation'
    default:        return ''
  }
}

export const SEVERITY_DOT_CLASS: Record<ScoreSeverity, string> = {
  good: 'bg-green-500',
  warn: 'bg-amber-400',
  bad:  'bg-red-500',
  none: 'bg-slate-200',
}

export const SEVERITY_TEXT_CLASS: Record<ScoreSeverity, string> = {
  good: 'text-green-700',
  warn: 'text-amber-600',
  bad:  'text-red-600',
  none: 'text-slate-400',
}

export const SEVERITY_CARD_CLASS: Record<ScoreSeverity, string> = {
  good: 'border-green-300 bg-green-50/30',
  warn: 'border-amber-300 bg-amber-50/30',
  bad:  'border-red-300 bg-red-50/30',
  none: 'border-slate-200',
}

// ──────────────────────────────────────────────────────────────────────────────
export const QA_HY_OPTIONS = [
  { value: '', label: 'All H&Y' },
  { value: '1', label: '1' },
  { value: '1.5', label: '1.5' },
  { value: '2', label: '2' },
  { value: '2.5', label: '2.5' },
  { value: '3', label: '3' },
  { value: '4', label: '4' },
  { value: '5', label: '5' },
]
