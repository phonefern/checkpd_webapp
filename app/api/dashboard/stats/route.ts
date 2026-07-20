import { unstable_cache } from "next/cache"
import { NextRequest, NextResponse } from "next/server"
import { supabaseServer } from "@/lib/supabase-server"
import type { DashboardStatsPayload, RiskFilter } from "@/app/component/dashboard/types"

const FILTER_TEXT_MAX_LENGTH = 100
const RISK_FILTERS = new Set<RiskFilter>(["all", "risk", "no_risk", "unknown"])

type DashboardStatsRpcArgs = {
  p_start: string | null
  p_end: string | null
  p_province: string | null
  p_area: string | null
  p_risk: RiskFilter
}

function hasSupabaseAuthCookie(request: NextRequest): boolean {
  return request.cookies
    .getAll()
    .some((cookie) => cookie.name.startsWith("sb-") && cookie.name.includes("auth-token"))
}

function normalizeTextParam(value: string | null): string | null {
  const trimmed = (value ?? "").trim()
  if (!trimmed) return null
  return trimmed.slice(0, FILTER_TEXT_MAX_LENGTH)
}

function normalizeDateParam(value: string | null): string | null {
  const trimmed = (value ?? "").trim()
  if (!trimmed) return null
  return /^\d{4}-\d{2}-\d{2}$/.test(trimmed) ? trimmed : null
}

function normalizeRiskParam(value: string | null): RiskFilter {
  const trimmed = (value ?? "all").trim().toLowerCase()
  return RISK_FILTERS.has(trimmed as RiskFilter) ? (trimmed as RiskFilter) : "all"
}

const getCachedDashboardStats = unstable_cache(
  async (args: DashboardStatsRpcArgs): Promise<DashboardStatsPayload> => {
    const { data, error } = await supabaseServer.rpc("dashboard_stats", args)
    if (error) throw error
    return data as DashboardStatsPayload
  },
  ["dashboard-stats-rpc-v1"],
  { revalidate: 300 }
)

export async function GET(request: NextRequest) {
  if (!hasSupabaseAuthCookie(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { searchParams } = request.nextUrl
  const args: DashboardStatsRpcArgs = {
    p_start: normalizeDateParam(searchParams.get("start")),
    p_end: normalizeDateParam(searchParams.get("end")),
    p_province: normalizeTextParam(searchParams.get("province")),
    p_area: normalizeTextParam(searchParams.get("area")),
    p_risk: normalizeRiskParam(searchParams.get("risk")),
  }

  try {
    const payload = await getCachedDashboardStats(args)
    return NextResponse.json(payload, {
      headers: {
        "Cache-Control": "private, max-age=60",
      },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Dashboard stats query failed"
    console.error("[dashboard/stats] RPC failed", { message, args })
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
