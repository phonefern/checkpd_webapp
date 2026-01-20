// app/pages/component/types.ts

/* =========================
   Core Data Types
========================= */
export type PatientSummary = {
  id: string
  thaiid: string
  firstname: string
  lastname: string
  prediction_risk: boolean | null
  condition: 'pd' | 'ctrl' | 'pdm' | string
  area: string
  test_result: string
  timestamp: string
  last_update: string
  last_migrate: string | null
  province?: string
  region?: string
  gender?: string
  source?: string
  record_id?: string
  other?: string
}
/* =========================
   Record / File
========================= */

export type FileInfo = {
  name: string
  size: number
  downloaded: boolean
}

/* =========================
   Filter Options (Raw)
========================= */

// condition
export const conditionOptions = [
  { value: 'pd', label: 'PD' },
  { value: 'ctrl', label: 'Control' },
  { value: 'pdm', label: 'Prodromal' },
  { value: 'other', label: 'Other Disease' }
] as const

// area
// use data the same supabase

// test result
export const testStatusOptions = [
  { value: 'ทำแบบทดสอบครบ', label: 'ทำแบบทดสอบครบ (Completed)' },
  { value: 'ทำแบบทดสอบบางส่วน', label: 'ทำแบบทดสอบบางส่วน (Incomplete)' },
  { value: 'ไม่ได้ทำแบบทดสอบ', label: 'ไม่ได้ทำแบบทดสอบ (Unattempte)' }
] as const

// prediction risk
export const riskOptions = [
  { value: "true", label: 'High Risk' },
  { value: "false", label: 'Low Risk' },
  { value: "null", label: 'Not Evaluate' }
] as const

// test types
export type TestType =
  'voiceahh'
  | 'voiceypl'
  | 'tremorresting'
  | 'tremorpostural'
  | 'dualtapright'
  | 'dualtap'
  | 'pinchtosizeright'
  | 'pinchtosize'
  | 'gaitwalk'
  | 'balance'
  | 'questionnaire'

export const TEST_OPTIONS: readonly TestType[] = [
  'voiceahh',
  'voiceypl',
  'tremorresting',
  'tremorpostural',
  'dualtapright',
  'dualtap',
  'pinchtosizeright',
  'pinchtosize',
  'gaitwalk',
  'balance',
  'questionnaire'
] as const

/* =========================
   Summary Option
========================= */

export interface SummaryProps {
  selectedCount: number
  filteredCount: number
  onDownload: () => void
  sortBy: 'ID' | 'TEST'
  setSortBy: (v: 'ID' | 'TEST') => void
}

/* =========================
   Table
========================= */

export interface PatientRecord {
  id: string
  firstname: string
  lastname: string
  thaiid: string | null
  prediction_risk: boolean | null
  condition: string
  area: string
  timestamp: string
  last_update: string | null
  last_migrate: string | null
}

export interface PatientTableProps {
  data: PatientRecord[]
  totalAfterFilter: number
  totalAll: number
  selectedIds: string[]
  onToggleSelect: (id: string) => void
}