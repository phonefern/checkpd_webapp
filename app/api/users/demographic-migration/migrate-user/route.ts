import { NextResponse } from "next/server"

import { adminDb } from "@/lib/firebaseAdmin"
import { hasServiceRole, supabaseServer } from "@/lib/supabase-server"
import { UsersPageAccessError, requireUsersPageAccess } from "@/lib/users-page-access"

const FIELDS_TO_COUNT = [
  "balance",
  "dualTap",
  "dualTapRight",
  "gaitWalk",
  "pinchToSize",
  "pinchToSizeRight",
  "questionnaire",
  "tremorPostural",
  "tremorResting",
  "voiceAhh",
  "voiceYPL",
] as const

const SUMMARY_COUNT_COLUMNS: Record<(typeof FIELDS_TO_COUNT)[number], string> = {
  balance: "balance",
  dualTap: "dualtap",
  dualTapRight: "dualtapright",
  gaitWalk: "gaitwalk",
  pinchToSize: "pinchtosize",
  pinchToSizeRight: "pinchtosizeright",
  questionnaire: "questionnaire",
  tremorPostural: "tremorpostural",
  tremorResting: "tremorresting",
  voiceAhh: "voiceahh",
  voiceYPL: "voiceypl",
}

type FirestoreCollectionName = "users" | "temps"
type FirestoreRow = Record<string, unknown>
type RecordGroupItem = {
  timestamp: number
  recordId: string
  data: FirestoreRow
}

export async function POST(request: Request) {
  try {
    await requireUsersPageAccess(request)

    if (!hasServiceRole) {
      return NextResponse.json(
        { status: "error", error: "SUPABASE_SERVICE_ROLE_KEY is required for manual user sync." },
        { status: 500 }
      )
    }

    let body: { userId?: unknown }
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ status: "error", error: "Invalid JSON body." }, { status: 400 })
    }

    const userId = typeof body.userId === "string" ? body.userId.trim() : ""
    if (!userId) {
      return NextResponse.json({ status: "error", error: "userId is required." }, { status: 400 })
    }

    const result = await syncFirestoreUserToSupabase(userId)
    if (result.status !== "ok") {
      return NextResponse.json(result, { status: result.statusCode })
    }

    return NextResponse.json(result)
  } catch (err) {
    if (err instanceof UsersPageAccessError) {
      return NextResponse.json({ status: "error", error: err.message }, { status: err.status })
    }
    const message = err instanceof Error ? err.message : "Manual sync failed."
    console.error("[users/demographic-migration/migrate-user]", message)
    return NextResponse.json({ status: "error", error: message }, { status: 500 })
  }
}

async function syncFirestoreUserToSupabase(userId: string): Promise<
  | {
      status: "ok"
      user_id: string
      kind: FirestoreCollectionName
      summaries_updated: number
    }
  | {
      status: "error"
      error: string
      statusCode: number
    }
> {
  const found = await findFirestoreUser(userId)
  if (!found) {
    return {
      status: "error",
      error: `No Firestore document found for id=${userId} in users/temps.`,
      statusCode: 404,
    }
  }

  const userUpsert = await supabaseServer.from("users").upsert(toPublicUserPayload(userId, found.data), {
    onConflict: "id",
  })
  if (userUpsert.error) throw userUpsert.error

  const recordsSnap = await found.ref.collection("records").get()
  const summaries = buildSummaryRows(userId, found.data, recordsSnap.docs.map((doc) => ({ id: doc.id, data: doc.data() })))

  if (summaries.length > 0) {
    const summaryUpsert = await supabaseServer.from("user_record_summary").upsert(summaries, {
      onConflict: "user_id,recorder",
    })
    if (summaryUpsert.error) throw summaryUpsert.error
  }

  return {
    status: "ok",
    user_id: userId,
    kind: found.kind,
    summaries_updated: summaries.length,
  }
}

async function findFirestoreUser(userId: string) {
  const preferred: FirestoreCollectionName[] = /^[0-9]+$/.test(userId) ? ["temps", "users"] : ["users", "temps"]

  for (const kind of preferred) {
    const ref = adminDb.collection(kind).doc(userId)
    const doc = await ref.get()
    if (doc.exists) {
      return {
        kind,
        ref,
        data: doc.data() ?? {},
      }
    }
  }

  return null
}

function toPublicUserPayload(userId: string, data: FirestoreRow) {
  return {
    id: userId,
    age: toInteger(data.age),
    bod: toTimestampString(data.bod),
    educationstatus: toNullableString(data.educationStatus),
    email: toNullableString(data.email),
    emorument: toNullableString(data.emorument ?? data.emolument),
    ethnicity: toNullableString(data.ethnicity),
    firstname: toNullableString(data.firstName),
    gender: toNullableString(data.gender),
    idcardaddress: toNullableString(data.idCardAddress),
    irb: toBooleanOrNull(data.irb),
    isstaff: toBooleanOrNull(data.isStaff),
    lastname: toNullableString(data.lastName),
    lastupdate: toTimestampString(data.lastUpdate),
    liveaddress: toNullableString(data.liveAddress),
    maritalstatus: toNullableString(data.maritalStatus),
    occupation: toNullableString(data.occupation),
    pdpa: toNullableString(data.pdpa),
    perfixname: toNullableString(data.perfixName),
    phonenumber: toNullableString(data.phoneNumber),
    remind: toTimestampString(data.remind),
    thaiid: toNullableString(data.thaiId),
    timestamp: toTimestampString(data.timestamp),
  }
}

function buildSummaryRows(
  userId: string,
  userData: FirestoreRow,
  records: Array<{ id: string; data: FirestoreRow }>
) {
  const grouped = new Map<string, RecordGroupItem[]>()

  for (const record of records) {
    const recorder = toNullableString(record.data.recorder) || "unknown"
    const timestamp =
      toMillis(record.data.lastUpdate) ??
      toMillis(record.data.timestamp) ??
      Number.NEGATIVE_INFINITY
    const items = grouped.get(recorder) ?? []
    items.push({ timestamp, recordId: record.id, data: record.data })
    grouped.set(recorder, items)
  }

  const rows: Array<Record<string, unknown>> = []
  const now = new Date().toISOString()
  const thaiid = toNullableString(userData.thaiId)

  for (const [recorder, items] of grouped.entries()) {
    items.sort((a, b) => b.timestamp - a.timestamp)
    const bestRecord =
      items.find((item) => hasPredictionRiskValue(item.data)) ??
      items.find((item) => isRecord(item.data.prediction)) ??
      items[0]

    const counts = Object.fromEntries(
      FIELDS_TO_COUNT.map((field) => [SUMMARY_COUNT_COLUMNS[field], countPresent(items, field)])
    )

    rows.push({
      user_id: userId,
      thaiid,
      recorder,
      record_id: bestRecord.recordId,
      version: toNullableString(bestRecord.data.version),
      last_update: toTimestampString(bestRecord.data.lastUpdate ?? bestRecord.data.timestamp),
      prediction_risk: normalizeRisk(getPredictionRisk(bestRecord.data)),
      record_count: items.length,
      updated_at: now,
      ...counts,
    })
  }

  return rows
}

function countPresent(items: RecordGroupItem[], field: (typeof FIELDS_TO_COUNT)[number]) {
  return items.reduce((count, item) => (item.data[field] == null ? count : count + 1), 0)
}

function getPredictionRisk(data: FirestoreRow) {
  const prediction = data.prediction
  if (!isRecord(prediction) || !("risk" in prediction)) return undefined
  return prediction.risk
}

function hasPredictionRiskValue(data: FirestoreRow) {
  const value = getPredictionRisk(data)
  return value !== undefined && value !== null
}

function normalizeRisk(value: unknown): boolean | null {
  if (typeof value === "boolean") return value
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase()
    if (normalized === "true") return true
    if (normalized === "false") return false
  }
  return null
}

function toBooleanOrNull(value: unknown): boolean | null {
  if (typeof value === "boolean") return value
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase()
    if (normalized === "true") return true
    if (normalized === "false") return false
  }
  return null
}

function toInteger(value: unknown): number | null {
  if (value == null || value === "") return null
  const numberValue = Number(value)
  return Number.isInteger(numberValue) ? numberValue : null
}

function toNullableString(value: unknown): string | null {
  if (value == null) return null
  const stringValue = String(value).trim()
  return stringValue ? stringValue : null
}

function toMillis(value: unknown): number | null {
  if (value == null || value === "") return null
  if (value instanceof Date) return value.getTime()
  if (typeof value === "number" && Number.isFinite(value)) {
    return value
  }
  if (typeof value === "string") {
    const parsed = Date.parse(value)
    return Number.isNaN(parsed) ? null : parsed
  }
  if (isRecord(value) && typeof value.toDate === "function") {
    const date = value.toDate()
    return date instanceof Date ? date.getTime() : null
  }
  return null
}

function toTimestampString(value: unknown): string | null {
  const millis = toMillis(value)
  return millis == null ? null : new Date(millis).toISOString()
}

function isRecord(value: unknown): value is Record<string, any> {
  return typeof value === "object" && value !== null
}
