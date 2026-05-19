export type RiskFilter = "all" | "risk" | "no_risk" | "unknown"

export type DashboardFilters = {
  startDate: string | null
  endDate: string | null
  province: string | null
  area: string | null
  risk: RiskFilter
}

export type CheckpdRiskRow = {
  user_id: string
  prediction_risk: boolean | null
  condition: string | null
  test_result: string | null
  last_record_at: string | null
  thaiid: string | null
}

export type CheckpdUserRow = {
  id: string
  prefix_name: string | null
  first_name: string | null
  last_name: string | null
  gender: string | null
  age: number | null
  province: string | null
  area: string | null
  region: string | null
  thai_id: string | null
  phone_number: string | null
  firebase_created_at: string | null
}

export type LatestUserRisk = {
  user_id: string
  prediction_risk: boolean | null
  condition: string | null
  test_result: string | null
  last_record_at: string | null
  thaiid: string | null
}

export type KpiMetrics = {
  total: number
  risk: number
  noRisk: number
  unknown: number
}

export type ChartDatum = {
  name: string
  count: number
}

export type DashboardTableRow = {
  user_id: string
  first_name: string | null
  last_name: string | null
  gender: string | null
  age: number | null
  province: string | null
  area: string | null
  thai_id: string | null
  prediction_risk: boolean | null
  condition: string | null
  test_result: string | null
  last_record_at: string | null
}

export const DEFAULT_FILTERS: DashboardFilters = {
  startDate: null,
  endDate: null,
  province: null,
  area: null,
  risk: "all",
}

export function toRiskLabel(value: boolean | null): "Risk" | "No risk" | "Unknown" {
  if (value === true) return "Risk"
  if (value === false) return "No risk"
  return "Unknown"
}

export function normalizeText(value: string | null | undefined): string {
  return (value ?? "").trim().toLowerCase()
}

export function buildLatestRiskByUser(rows: CheckpdRiskRow[]): Map<string, LatestUserRisk> {
  const map = new Map<string, LatestUserRisk>()
  for (const row of rows) {
    const existing = map.get(row.user_id)
    if (!existing) {
      map.set(row.user_id, row)
      continue
    }
    const existingTs = existing.last_record_at ? new Date(existing.last_record_at).getTime() : -1
    const nextTs = row.last_record_at ? new Date(row.last_record_at).getTime() : -1
    // Canonical risk per user = latest row by last_record_at when duplicates from multiple recorders exist.
    if (nextTs > existingTs) map.set(row.user_id, row)
  }
  return map
}

export function computeKpis(rows: LatestUserRisk[]): KpiMetrics {
  let risk = 0
  let noRisk = 0
  let unknown = 0
  for (const row of rows) {
    if (row.prediction_risk === true) risk += 1
    else if (row.prediction_risk === false) noRisk += 1
    else unknown += 1
  }
  return { total: rows.length, risk, noRisk, unknown }
}

export function aggregateBy(rows: CheckpdUserRow[], key: "province" | "area"): ChartDatum[] {
  const acc = new Map<string, number>()
  for (const row of rows) {
    const bucket = (row[key] ?? "").trim() || "ไม่ระบุ"
    acc.set(bucket, (acc.get(bucket) ?? 0) + 1)
  }
  return Array.from(acc.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
}

export function topWithTail(rows: ChartDatum[], limit: number): ChartDatum[] {
  if (rows.length <= limit) return rows
  const head = rows.slice(0, limit)
  const tailCount = rows.slice(limit).reduce((sum, row) => sum + row.count, 0)
  head.push({ name: `+ ${rows.length - limit} more`, count: tailCount })
  return head
}
