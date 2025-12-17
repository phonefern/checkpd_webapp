// app/component/storage/buildPatientQuery.ts
import { SupabaseClient } from '@supabase/supabase-js'

export type FilterParams = {
  search?: string
  condition?: string
  area?: string
  testStatus?: string
  risk?: boolean | null
  startDate?: string | null
  endDate?: string | null
  lastMigrated?: string | null
}

export const buildPatientQuery = (
  supabase: SupabaseClient,
  filters: FilterParams
) => {
  let query = supabase
    .from('user_record_summary_with_users')
    .select('*')

  /* ---------- Search ---------- */
  if (filters.search) {
    const q = `%${filters.search}%`
    query = query.or(
      [
        `firstname.ilike.${q}`,
        `lastname.ilike.${q}`,
        `thaiid.ilike.${q}`,
        `id.ilike.${q}`,
      ].join(',')
    )
  }

  /* ---------- Condition ---------- */
  if (filters.condition && filters.condition !== 'all') {
    query = query.eq('condition', filters.condition)
  }

  /* ---------- Area ---------- */
  if (filters.area && filters.area !== 'all') {
    query = query.eq('area', filters.area)
  }

  /* ---------- Test Status ---------- */
  if (filters.testStatus && filters.testStatus !== 'all') {
    query = query.eq('test_result', filters.testStatus)
  }

  /* ---------- Risk ---------- */
  if (filters.risk === true) query = query.eq('prediction_risk', true)
  if (filters.risk === false) query = query.eq('prediction_risk', false)
  if (filters.risk === null) query = query.is('prediction_risk', null)

  /* ---------- Record Date (ใช้ timestamp ตรง ๆ) ---------- */
  if (filters.startDate) {
    query = query.gte('timestamp', filters.startDate)
  }

  if (filters.endDate) {
    query = query.lte('timestamp', filters.endDate)
  }

  /* ---------- Last Migrated ---------- */
  if (filters.lastMigrated) {
    query = query.eq('last_migrate', filters.lastMigrated)
  }

  return query
}
