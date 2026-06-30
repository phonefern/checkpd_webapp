// app/component/storage/buildPatientQuery.ts
import { SupabaseClient } from '@supabase/supabase-js'
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
    .schema('checkpd')
    .from('user_record_storage_list')
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
      effective_date`)
    .not('condition', 'is', null)

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
  // เรียงตาม "Recorded" ล่าสุดขึ้นก่อน — ตรงกับคอลัมน์ที่แสดง (last_update ?? timestamp)
  // last_update เป็นหลัก, timestamp เป็น fallback; ค่า null ไปท้ายสุด
  // id/record_id เป็น tiebreaker ให้ pagination เสถียร
  query = query.order('last_update', { ascending: false, nullsFirst: false })
    .order('timestamp', { ascending: false, nullsFirst: false })
    .order('id', { ascending: true })
    .order('record_id', { ascending: true })

  /* ---------- PAGINATION ---------- */
  if (filters.page && filters.pageSize) {
    const from = (filters.page - 1) * filters.pageSize
    const to = from + filters.pageSize! - 1
    query = query.range(from, to)
  }

  return query

}
