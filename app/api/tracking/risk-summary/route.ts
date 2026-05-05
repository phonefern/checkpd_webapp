import { NextRequest, NextResponse } from "next/server"
import { hasServiceRole, supabaseServer } from "@/lib/supabase-server"

type RiskStatus = "risk" | "normal" | "pending" | "no_test"

type RiskSummary = {
  risk: number
  normal: number
  pending: number
  noTest: number
}

type PostBody = {
  province?: string | null
  kind?: string | null
  userId?: string | null
  userDocIds?: unknown
  tempDocIds?: unknown
  parentDateFrom?: string | null
  parentDateTo?: string | null
}

type RiskRow = {
  user_id: string | null
  kind: string | null
  latest_status: string | null
  province: string | null
  parent_timestamp: string | null
  latest_record_at: string | null
  updated_at: string | null
}

const SELECT_COLS = "user_id,kind,latest_status,province,parent_timestamp,latest_record_at,updated_at"

// PostgREST embeds the IN(...) values into the URL query string. Supabase keeps
// the URL under ~2-4KB safely; 500 IDs (~36 chars each w/ commas) ≈ 18KB worst
// case, so chunk to keep each request well under the limit.
const ID_CHUNK_SIZE = 200

function normalizeStatus(value: unknown): RiskStatus | null {
  if (typeof value !== "string") return null
  const v = value.trim().toLowerCase()
  if (v === "risk" || v === "normal" || v === "pending" || v === "no_test") return v
  return null
}

function toStringArray(value: unknown): string[] | null {
  if (!Array.isArray(value)) return null
  const out: string[] = []
  for (const v of value) {
    if (typeof v === "string" && v.length > 0) out.push(v)
  }
  return out
}

type QueryFilters = {
  province: string | null
  effectiveKind: "all" | "users" | "temps"
  userId: string | null
  fromIso: string | null
  toIso: string | null
}

async function fetchRowsForIds(ids: string[], filters: QueryFilters): Promise<RiskRow[]> {
  if (ids.length === 0) return []

  const collected: RiskRow[] = []

  for (let offset = 0; offset < ids.length; offset += ID_CHUNK_SIZE) {
    const chunk = ids.slice(offset, offset + ID_CHUNK_SIZE)

    let q = supabaseServer
      .from("checkpd_user_risk")
      .select(SELECT_COLS)
      .in("user_id", chunk)

    if (filters.effectiveKind !== "all") {
      q = q.eq("kind", filters.effectiveKind)
    }
    if (filters.province) {
      q = q.eq("province", filters.province)
    }
    if (filters.userId) {
      q = q.eq("user_id", filters.userId)
    }
    if (filters.fromIso) {
      q = q.gte("parent_timestamp", filters.fromIso)
    }
    if (filters.toIso) {
      q = q.lte("parent_timestamp", filters.toIso)
    }

    q = q.order("parent_timestamp", { ascending: false, nullsFirst: false })

    // Lift the default 1000-row PostgREST cap. Each chunk can return at most
    // 2 × ID_CHUNK_SIZE rows in theory (one per kind per user_id), so this is
    // a safe ceiling.
    q = q.range(0, ID_CHUNK_SIZE * 4 - 1)

    const { data, error } = await q
    if (error) throw error
    if (data) collected.push(...(data as RiskRow[]))
  }

  return collected
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => ({}))) as PostBody
    const province = typeof body.province === "string" && body.province.trim() ? body.province.trim() : null
    const kindParam = typeof body.kind === "string" ? body.kind.trim().toLowerCase() : null
    const userId = typeof body.userId === "string" && body.userId.trim() ? body.userId.trim() : null
    const userDocIds = toStringArray(body.userDocIds)
    const tempDocIds = toStringArray(body.tempDocIds)
    const fromIso = typeof body.parentDateFrom === "string" ? body.parentDateFrom : null
    const toIso = typeof body.parentDateTo === "string" ? body.parentDateTo : null
    const debug = req.nextUrl.searchParams.get("debug") === "1"

    const effectiveKind: "all" | "users" | "temps" =
      kindParam === "users" || kindParam === "temps" ? kindParam : "all"

    const debugInfo = {
      hasServiceRole,
      filters: {
        province,
        kindParam,
        userId,
        userDocIdCount: userDocIds?.length ?? null,
        tempDocIdCount: tempDocIds?.length ?? null,
        parentDateFrom: fromIso,
        parentDateTo: toIso,
      },
    }

    // Build the union of doc-id buckets that should be queried, respecting
    // the kind filter so we don't waste a round-trip for an excluded bucket.
    const usersBucket = effectiveKind === "temps" ? [] : userDocIds ?? []
    const tempsBucket = effectiveKind === "users" ? [] : tempDocIds ?? []

    // We require Firebase to define the user population. If the page sent
    // empty arrays for both buckets, return zeros without hitting Supabase.
    const allIds = Array.from(new Set([...usersBucket, ...tempsBucket]))
    if (allIds.length === 0) {
      const empty: RiskSummary = { risk: 0, normal: 0, pending: 0, noTest: 0 }
      return NextResponse.json(
        debug
          ? {
              ...empty,
              debug: {
                ...debugInfo,
                shortCircuit: "no-doc-ids",
                counts: {
                  totalRows: 0,
                  matchedRows: 0,
                  skippedByProvince: 0,
                  skippedByKind: 0,
                  skippedByUserId: 0,
                  skippedByDocIdSet: 0,
                  skippedByDate: 0,
                  chunks: 0,
                },
                statusCounter: {},
              },
            }
          : empty
      )
    }

    let rows: RiskRow[]
    try {
      rows = await fetchRowsForIds(allIds, {
        province,
        effectiveKind,
        userId,
        fromIso,
        toIso,
      })
    } catch (err) {
      const error = err as { message?: string; code?: string; details?: string; hint?: string }
      console.error("[tracking/risk-summary] query error", {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
        hasServiceRole,
        idCount: allIds.length,
      })
      return NextResponse.json({ error: error.message ?? "Query error" }, { status: 500 })
    }

    // Apply kind-specific bucket membership. Postgres already filtered by
    // user_id and (optionally) kind, but a doc.id could in theory exist as
    // both kinds in Supabase. Enforce the bucket pairing here.
    const userDocIdSet = new Set(usersBucket)
    const tempDocIdSet = new Set(tempsBucket)

    const summary: RiskSummary = { risk: 0, normal: 0, pending: 0, noTest: 0 }
    const statusCounter: Record<string, number> = {}
    let matchedRows = 0
    let skippedByDocIdSet = 0

    for (const r of rows) {
      const rowKind = r.kind ?? ""
      const rowUserId = r.user_id ?? ""

      let inBucket = true
      if (rowKind === "users") inBucket = userDocIdSet.has(rowUserId)
      else if (rowKind === "temps") inBucket = tempDocIdSet.has(rowUserId)
      // unknown kind: keep, since we did not filter it out at DB level

      if (!inBucket) {
        skippedByDocIdSet += 1
        continue
      }

      matchedRows += 1
      const status = normalizeStatus(r.latest_status)
      const rawStatus = r.latest_status ?? "(null)"
      statusCounter[rawStatus] = (statusCounter[rawStatus] ?? 0) + 1
      if (status === "risk") summary.risk += 1
      else if (status === "normal") summary.normal += 1
      else if (status === "pending") summary.pending += 1
      else if (status === "no_test") summary.noTest += 1
    }

    if (debug) {
      const payload = {
        ...summary,
        debug: {
          ...debugInfo,
          counts: {
            // After this refactor, totalRows == rows returned by Postgres after
            // server-side filtering. Most "skip" categories are now zero
            // because filtering happens in DB; we keep the keys for stable
            // shape but only docIdSet skipping survives in app code.
            totalRows: rows.length,
            matchedRows,
            skippedByProvince: 0,
            skippedByKind: 0,
            skippedByUserId: 0,
            skippedByDocIdSet,
            skippedByDate: 0,
            chunks: Math.ceil(allIds.length / ID_CHUNK_SIZE),
          },
          statusCounter,
        },
      }
      console.log("[tracking/risk-summary] debug", payload.debug)
      return NextResponse.json(payload)
    }

    return NextResponse.json(summary)
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unexpected error" },
      { status: 500 }
    )
  }
}
