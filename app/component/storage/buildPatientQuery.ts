// app/component/storage/buildPatientQuery.ts
import { SupabaseClient } from '@supabase/supabase-js'
import { TEST_FILE_KEYWORDS } from './testConfig'
import { TestType } from './types'

export type FilterParams = {
  search?: string
  condition?: string
  area?: string
  testStatus?: string
  risk?: boolean | null
  selectedTest?: TestType[]
  startDate?: string | null
  endDate?: string | null
  lastMigrated?: string | null

  page?: number
  pageSize?: number
}

export const buildPatientQuery = (
  supabase: SupabaseClient,
  filters: FilterParams
) => {
  let query = supabase
    .from('user_record_with_users_and_storage')
    .select(`id,
      record_id,
      firstname,
      lastname,
      thaiid,
      province,
      gender,
      condition,
      test_result,
      prediction_risk,
      version,
      timestamp,
      last_update,
      area,
      last_migrate,
      storage_base_path`,
      { count: 'exact' })

  /* ================= Search =================
     รองรับ:
     - firstname
     - lastname
     - firstname + lastname
     - thaiid
     - user_id
  =========================================== */
  if (filters.search) {
    const terms = filters.search.trim().split(/\s+/)

    terms.forEach(term => {
      const q = `%${term}%`
      query = query.or(
        [
          `firstname.ilike.${q}`,
          `lastname.ilike.${q}`,
          `thaiid.ilike.${q}`,
          `id.ilike.${q}`,
        ].join(',')
      )
    })
  }

  /* ================= Condition ================= */
  if (filters.condition && filters.condition !== 'all') {
    query = query.eq('condition', filters.condition)
  }

  /* ================= Area ================= */
  if (filters.area && filters.area !== 'all') {
    query = query.eq('area', filters.area)
  }

  /* ================= Risk ================= */
  if (filters.risk === true) query = query.eq('prediction_risk', true)
  if (filters.risk === false) query = query.eq('prediction_risk', false)
  if (filters.risk === null) query = query.is('prediction_risk', null)

  /* ================= test status ================= */
  if (filters.testStatus && filters.testStatus !== 'all') {
    switch (filters.testStatus) {
      case 'ทำแบบทดสอบครบ':
        query = query.eq('test_result', 'ทำแบบทดสอบครบ')
        break

      case 'ทำแบบทดสอบบางส่วน':
        query = query.eq('test_result', 'ทำแบบทดสอบบางส่วน')
        break

      case 'ไม่ได้ทำแบบทดสอบ':
        query = query.or('test_result.is.null,test_result.eq.none')
        break
    }
  }

  /* ================= Tests ================= */
  if (filters.selectedTest?.length) {
    const ors: string[] = []
    filters.selectedTest.forEach(t =>
      TEST_FILE_KEYWORDS[t].forEach(k =>
        ors.push(`storage_base_path.ilike.%${k}%`)
      )
    )
    query = query.or(ors.join(','))
  }

  /* ================= Recorded Date ================= */
  if (filters.startDate) {
    query = query.gte('effective_date', filters.startDate)
  }

  if (filters.endDate) {
    query = query.lte('effective_date', filters.endDate)
  }

  /* ================= Last Migrated ================= */
  if (filters.lastMigrated) {
    const start = `${filters.lastMigrated}T00:00:00Z`
    const end = `${filters.lastMigrated}T23:59:59Z`

    query = query
      .gte('last_migrate', start)
      .lte('last_migrate', end)
  }


  /* ---------- ORDER ---------- */
  query = query.order('last_migrate', { ascending: false })

  /* ---------- PAGINATION ---------- */
  if (filters.page && filters.pageSize) {
    const from = (filters.page - 1) * filters.pageSize
    const to = from + filters.pageSize! - 1
    query = query.range(from, to)
  }

  return query

}