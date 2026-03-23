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
  adl_score: number | null
  scopa_aut_score: number | null
  blood_test_note: string | null
  fdopa_pet_requested: boolean | null
  fdopa_pet_score: string | null
}

export type QaScoreRow = { patient_id: number; total_score: number | null }
export type QaHamdRow = { patient_id: number; total_score: number | null; severity_level: string | null }
export type QaConditionCategory =
  | 'Healthy'
  | 'Prodromal / High risk'
  | 'PD'
  | 'Constipation'
  | 'Suspected RBD'
  | 'Normal'
  | 'Other diagnosis'
  | 'Hyposmia'

export type QaRow = {
  patient: QaPatient
  diag: QaDiagnosisRow | undefined
  conditionLabel: QaConditionCategory
  moca: QaScoreRow | undefined
  hamd: QaHamdRow | undefined
  mds: QaScoreRow | undefined
  epw: QaScoreRow | undefined
  smell: QaScoreRow | undefined
  tmse: QaScoreRow | undefined
  rbd: QaScoreRow | undefined
  rome4: QaScoreRow | undefined
}

export const QA_CONDITION_OPTIONS = [
  { value: '', label: 'All Conditions' },
  { value: 'Healthy', label: 'Healthy' },
  { value: 'Prodromal / High risk', label: 'Prodromal / High risk' },
  { value: 'PD', label: 'PD' },
  { value: 'Constipation', label: 'Constipation' },
  { value: 'Suspected RBD', label: 'Suspected RBD' },
  { value: 'Normal', label: 'Normal' },
  { value: 'Other diagnosis', label: 'Other diagnosis' },
  { value: 'Hyposmia', label: 'Hyposmia' },
]

const CONDITION_KEYWORDS: Record<QaConditionCategory, string[]> = {
  Healthy: ['healthy'],
  'Prodromal / High risk': ['prodromal', 'high risk', 'high-risk'],
  PD: ['pd', 'parkinson'],
  Constipation: ['constipation'],
  'Suspected RBD': ['rbd', 'rem sleep behavior'],
  Normal: ['normal'],
  'Other diagnosis': ['other diagnosis', 'other'],
  Hyposmia: ['hyposmia', 'smell', 'olfactory'],
}

const normalize = (value: string | null | undefined) => (value ?? '').toLowerCase().trim()

export function detectQaCondition(diag?: QaDiagnosisRow): QaConditionCategory {
  if (!diag) return 'Other diagnosis'
  if (diag.constipation) return 'Constipation'
  if (diag.rbd_suspected) return 'Suspected RBD'

  const raw = `${normalize(diag.condition)} ${normalize(diag.other_diagnosis_text)}`
  for (const label of Object.keys(CONDITION_KEYWORDS) as QaConditionCategory[]) {
    if (CONDITION_KEYWORDS[label].some((kw) => raw.includes(kw))) return label
  }
  return 'Other diagnosis'
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
