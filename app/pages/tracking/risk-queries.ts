export type RiskSummary = {
  risk: number
  normal: number
  pending: number
  noTest: number
}

export type RiskSummaryDebug = {
  hasServiceRole: boolean
  filters: {
    province: string | null
    kindParam: string | null
    userId: string | null
    userDocIdCount: number | null
    tempDocIdCount: number | null
    parentDateFrom: string | null
    parentDateTo: string | null
  }
  counts?: {
    totalRows: number
    matchedRows: number
    skippedByProvince: number
    skippedByKind: number
    skippedByUserId: number
    skippedByDocIdSet: number
    skippedByDate: number
    chunks?: number
  }
  statusCounter?: Record<string, number>
  shortCircuit?: string
}

export type RiskSummaryResult = RiskSummary & { debug?: RiskSummaryDebug }

export type RiskSummaryFilter = {
  province?: string
  kind?: 'all' | 'users' | 'temps'
  userId?: string
  /** Firebase doc IDs from `users` collection (already filtered by Firebase dateRange/province on the page) */
  userDocIds?: string[]
  /** Firebase doc IDs from `temps` collection */
  tempDocIds?: string[]
  /** Optional secondary filter on Supabase parent_timestamp range */
  parentDateFrom?: Date
  parentDateTo?: Date
  /** When true, ask the API for diagnostic counters in the response */
  debug?: boolean
}

export type ManualRiskJobTriggerResult = {
  ok: boolean
  mode?: 'gcloud' | 'http'
  startedAt?: string
  jobName?: string
  region?: string
  output?: string
  warning?: string | null
  error?: string
}

export async function fetchRiskSummaryByFilter(filter: RiskSummaryFilter): Promise<RiskSummaryResult> {
  const body = {
    province: filter.province,
    kind: filter.kind,
    userId: filter.userId,
    userDocIds: filter.userDocIds,
    tempDocIds: filter.tempDocIds,
    parentDateFrom: filter.parentDateFrom?.toISOString(),
    parentDateTo: filter.parentDateTo?.toISOString(),
  }

  const url = filter.debug ? "/api/tracking/risk-summary?debug=1" : "/api/tracking/risk-summary"
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    cache: "no-store",
  })

  if (!res.ok) {
    const msg = await res.text()
    throw new Error(`Risk summary request failed: ${msg}`)
  }

  return (await res.json()) as RiskSummaryResult
}

export async function triggerManualRiskSummaryJob(): Promise<ManualRiskJobTriggerResult> {
  const res = await fetch("/api/tracking/risk-summary/trigger-job", {
    method: "POST",
    cache: "no-store",
  })

  const data = (await res.json()) as ManualRiskJobTriggerResult
  if (!res.ok || !data.ok) {
    throw new Error(data.error || "Manual trigger failed")
  }
  return data
}
