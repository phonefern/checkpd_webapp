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

export const conditionOptions = [
  { value: 'pd', label: 'PD' },
  { value: 'ctrl', label: 'Control' },
  { value: 'pdm', label: 'Prodromal' }
] as const

export const areaOptions = [
  { value: 'รพ.จุฬาลงกรณ์' , label: 'รพ.จุฬาลงกรณ์ (ChulaPD Clinic)'},
  { value: 'ศรีสะเกษ' , label: 'ศรีสะเกษ (Si Sa Ket)'},
  { value: 'นนทบุรี' , label: 'นนทบุรี (Nonthaburi)'},
  { value: 'เพชรบุรี' , label: 'เพชรบุรี (Phetchaburi)'},
  { value: 'นครปฐม' , label: 'นครปฐม (Nakhon Pathom)'},
  { value: 'นครสวรรค์' , label: 'นครสวรรค์ (Nakhon Sawan)'},
  { value: 'เชียงราย' , label: 'เชียงราย (Chiang Rai)'},
  { value: 'ปทุมธานี' , label: 'ปทุมธานี (Pathum Thani)'},
  { value: 'กรุงเทพมหานคร' , label: 'กรุงเทพมหานคร (Bangkok)'},
  { value: 'สมุทรปราการ' , label: 'สมุทปราการ (Samut Prakan)'}
] as const

export const testStatusOptions = [
  { value: 'ทำแบบทดสอบครบ', label: 'ทำแบบทดสอบครบ (Completed)' },
  { value: 'ทำแบบทดสอบบางส่วน', label: 'ทำแบบทดสอบบางส่วน (Incomplete)' },
  { value: 'ไม่ได้ทำแบบทดสอบ', label: 'ไม่ได้ทำแบบทดสอบ (Unattempte)' }
] as const

export const riskOptions = [
  { value: true, label: 'High Risk' },
  { value: false, label: 'Low Risk' },
  { value: null, label: 'Not Evaluate' }
] as const