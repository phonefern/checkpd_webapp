export const PAGE_SIZE = 20

export type QaPatient = {
  id: number
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

export type QaScoreRow = { patient_id: number; total_score: number | null }
export type QaHamdRow = { patient_id: number; total_score: number | null; severity_level: string | null }
export type QaConditionFilter = '' | 'pd' | 'pdm' | 'other' | 'ctrl'

export type QaRow = {
  visitNo: number
  patient: QaPatient
  diag: QaDiagnosisRow | undefined
  conditionLabel: string
  moca: QaScoreRow | undefined
  hamd: QaHamdRow | undefined
  mds: QaScoreRow | undefined
  epw: QaScoreRow | undefined
  smell: QaScoreRow | undefined
  tmse: QaScoreRow | undefined
  rbd: QaScoreRow | undefined
  rome4: QaScoreRow | undefined
}

const normalize = (value: string | null | undefined) => (value ?? '').toLowerCase().trim()

export function normalizeQaConditionValue(value?: string | null): QaConditionFilter {
  const raw = normalize(value)

  if (!raw) return ''
  if (raw === 'pd' || raw.includes('parkinson') || raw.includes('newly diagnosis')) return 'pd'
  if (raw === 'pdm' || raw.includes('prodromal') || raw.includes('high risk') || raw.includes('high-risk')) return 'pdm'
  if (raw === 'ctrl' || raw.includes('healthy') || raw.includes('control') || raw === 'normal') return 'ctrl'
  if (raw === 'other' || raw.includes('other diagnosis')) return 'other'

  return 'other'
}

export function formatQaConditionLabel(diag?: QaDiagnosisRow): string {
  const normalized = normalizeQaConditionValue(diag?.condition)
  if (normalized) return normalized.toUpperCase()

  return '-'
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
