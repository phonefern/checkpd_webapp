import { supabase } from '@/lib/supabase'
import type { QaPatient } from './types'

export const PATIENT_VISIT_SELECT =
  'id,patient_uid,created_at,submission_timestamp,first_name,last_name,age,province,collection_date,hn_number,thaiid,bmi,weight,height,chest_cm,waist_cm,hip_cm,neck_cm,bp_supine,pr_supine,bp_upright,pr_upright,visit_no,total_visits,same_day_visit_seq,same_day_visit_count'

export const cleanIdentityValue = (value: string | null | undefined) => (value ?? '').trim()

export function buildIdentityCacheKey(patient: QaPatient): string {
  const thaiid = cleanIdentityValue(patient.thaiid)
  if (thaiid) return `thaiid:${thaiid}`

  const hnNumber = cleanIdentityValue(patient.hn_number)
  if (hnNumber) return `hn:${hnNumber.toLowerCase()}`

  const firstName = cleanIdentityValue(patient.first_name).toLowerCase()
  const lastName = cleanIdentityValue(patient.last_name).toLowerCase()
  if (firstName && lastName) return `name:${firstName}|${lastName}`

  const patientUid = cleanIdentityValue(patient.patient_uid)
  if (patientUid) return `uid:${patientUid}`

  return `id:${patient.id}`
}

function toVisitDateKey(patient: QaPatient) {
  const collectionDate = cleanIdentityValue(patient.collection_date)
  if (collectionDate) return collectionDate
  const fallbackTs = patient.submission_timestamp ?? patient.created_at
  if (!fallbackTs) return ''
  const date = new Date(fallbackTs)
  if (Number.isNaN(date.getTime())) return ''
  return date.toISOString().slice(0, 10)
}

export function orderVisitsByCollectionDate(patients: QaPatient[]): QaPatient[] {
  const sorted = [...patients].sort((a, b) => {
    const dateA = toVisitDateKey(a)
    const dateB = toVisitDateKey(b)
    if (dateA !== dateB) {
      if (!dateA) return 1
      if (!dateB) return -1
      return dateA.localeCompare(dateB)
    }
    return a.id - b.id
  })

  const totalVisits = sorted.length
  const sameDayCounter = new Map<string, number>()
  const sameDayTotal = new Map<string, number>()

  for (const patient of sorted) {
    const dateKey = toVisitDateKey(patient) || '__unknown__'
    sameDayTotal.set(dateKey, (sameDayTotal.get(dateKey) ?? 0) + 1)
  }

  return sorted.map((patient, index) => {
    const dateKey = toVisitDateKey(patient) || '__unknown__'
    const seq = (sameDayCounter.get(dateKey) ?? 0) + 1
    sameDayCounter.set(dateKey, seq)

    return {
      ...patient,
      visit_no: index + 1,
      total_visits: totalVisits,
      same_day_visit_seq: seq,
      same_day_visit_count: sameDayTotal.get(dateKey) ?? 1,
    }
  })
}

export async function fetchIdentityMatchedVisits(
  base: QaPatient,
  patientSelect = PATIENT_VISIT_SELECT
): Promise<QaPatient[]> {
  const thaiid = cleanIdentityValue(base.thaiid)
  const hnNumber = cleanIdentityValue(base.hn_number)
  const firstName = cleanIdentityValue(base.first_name)
  const lastName = cleanIdentityValue(base.last_name)
  const patientUid = cleanIdentityValue(base.patient_uid)

  let matched: QaPatient[] = []

  if (thaiid) {
    const { data, error } = await supabase
      .from('patient_visits_v2')
      .select(patientSelect)
      .eq('thaiid', thaiid)
      .order('collection_date', { ascending: true, nullsFirst: false })
      .order('id', { ascending: true })

    if (error) {
      throw new Error(`patient_visits_v2 (thaiid): ${error.message}`)
    }
    matched = (data ?? []) as unknown as QaPatient[]
  }

  if (matched.length === 0 && hnNumber) {
    const { data, error } = await supabase
      .from('patient_visits_v2')
      .select(patientSelect)
      .ilike('hn_number', hnNumber)
      .order('collection_date', { ascending: true, nullsFirst: false })
      .order('id', { ascending: true })

    if (error) {
      throw new Error(`patient_visits_v2 (hn): ${error.message}`)
    }
    matched = (data ?? []) as unknown as QaPatient[]
  }

  if (matched.length === 0 && firstName && lastName) {
    const { data, error } = await supabase
      .from('patient_visits_v2')
      .select(patientSelect)
      .ilike('first_name', firstName)
      .ilike('last_name', lastName)
      .order('collection_date', { ascending: true, nullsFirst: false })
      .order('id', { ascending: true })

    if (error) {
      throw new Error(`patient_visits_v2 (name): ${error.message}`)
    }
    matched = (data ?? []) as unknown as QaPatient[]
  }

  if (matched.length === 0 && patientUid) {
    const { data, error } = await supabase
      .from('patient_visits_v2')
      .select(patientSelect)
      .eq('patient_uid', patientUid)
      .order('collection_date', { ascending: true, nullsFirst: false })
      .order('id', { ascending: true })

    if (error) {
      throw new Error(`patient_visits_v2 (patient_uid): ${error.message}`)
    }
    matched = (data ?? []) as unknown as QaPatient[]
  }

  return orderVisitsByCollectionDate(matched.length > 0 ? matched : [base])
}
