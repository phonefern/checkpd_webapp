import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const MAX_ROWS = 5000

const hasServiceRole = Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY)

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

type Pair = { userId: string; recordId: string | null }

type FilterParams = {
  searchId?: string
  searchCondition?: string
  searchRisk?: string
  searchOther?: string
  searchArea?: string
  searchSource?: string
  searchProvince?: string
  startDate?: string
  endDate?: string
}

export async function POST(req: NextRequest) {
  try {
    if (!hasServiceRole) {
      return NextResponse.json(
        { error: "Missing SUPABASE_SERVICE_ROLE_KEY. Core schema export requires service role access." },
        { status: 500 }
      )
    }

    const body = await req.json()
    const { mode, pairs, filters } = body as {
      mode: "selected" | "filtered"
      pairs?: Pair[]
      filters?: FilterParams
    }

    let rowPairs: Pair[] = []

    if (mode === "selected") {
      if (!Array.isArray(pairs) || pairs.length === 0) {
        return NextResponse.json({ error: "No rows selected" }, { status: 400 })
      }
      rowPairs = pairs
    } else if (mode === "filtered") {
      rowPairs = await fetchFilteredPairs(filters ?? {})
      if (rowPairs.length === 0) {
        return NextResponse.json({ error: "No data found for the current filters" }, { status: 400 })
      }
      if (rowPairs.length > MAX_ROWS) {
        return NextResponse.json(
          { error: `Too many rows (${rowPairs.length}). Max is ${MAX_ROWS}. Please narrow the filters.` },
          { status: 400 }
        )
      }
    } else {
      return NextResponse.json({ error: "Invalid mode" }, { status: 400 })
    }

    const csv = await buildCsv(rowPairs)
    const date = new Date().toISOString().slice(0, 10).replace(/-/g, "")
    const BOM = "\uFEFF"

    return new NextResponse(BOM + csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="checkpd_export_${date}.csv"`,
      },
    })
  } catch (err) {
    console.error("[export/users-csv]", err)
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 })
  }
}

async function fetchFilteredPairs(filters: FilterParams): Promise<Pair[]> {
  let query = supabaseAdmin
    .from("user_record_summary_with_users")
    .select("id,record_id")
    .order("timestamp", { ascending: false })
    .limit(MAX_ROWS + 1)

  if (filters.searchId?.trim()) {
    const p = `%${filters.searchId.trim()}%`
    query = query.or(
      `id.ilike.${p},record_id.ilike.${p},firstname.ilike.${p},lastname.ilike.${p},recorder.ilike.${p},thaiid.ilike.${p}`
    )
  }
  if (filters.startDate) query = query.gte("timestamp", filters.startDate)
  if (filters.endDate) {
    const next = new Date(filters.endDate)
    next.setDate(next.getDate() + 1)
    query = query.lt("timestamp", next.toISOString())
  }
  if (filters.searchCondition?.trim()) query = query.eq("condition", filters.searchCondition)
  if (filters.searchRisk?.trim()) {
    if (filters.searchRisk === "null") query = query.is("prediction_risk", null)
    else query = query.eq("prediction_risk", filters.searchRisk === "true")
  }
  if (filters.searchOther?.trim()) query = query.eq("other", filters.searchOther)
  if (filters.searchArea?.trim()) query = query.eq("area", filters.searchArea)
  if (filters.searchSource?.trim()) query = query.eq("source", filters.searchSource)
  if (filters.searchProvince?.trim()) query = query.eq("province", filters.searchProvince)

  const { data, error } = await query
  if (error) throw error
  return (data ?? []).map((r: Record<string, unknown>) => ({
    userId: r.id as string,
    recordId: (r.record_id as string | null) ?? null,
  }))
}

async function buildCsv(pairs: Pair[]): Promise<string> {
  const userIds = [...new Set(pairs.map((p) => p.userId))]

  // ── Batch A: public schema ─────────────────────────────────────────
  const [pubUsersRes, pubSummaryRes] = await Promise.all([
    supabaseAdmin.from("users").select("*").in("id", userIds),
    supabaseAdmin
      .from("user_record_summary")
      .select("user_id,record_id,condition,other")
      .in("user_id", userIds),
  ])
  if (pubUsersRes.error) throw pubUsersRes.error
  if (pubSummaryRes.error) throw pubSummaryRes.error

  const pubUsersMap = indexBy(pubUsersRes.data ?? [], "id")

  // public.user_record_summary: keyed by (user_id, record_id) and fallback by user_id
  const pubSummaryByRecord: Record<string, Record<string, unknown>> = {}
  const pubSummaryByUser: Record<string, Record<string, unknown>> = {}
  for (const row of (pubSummaryRes.data ?? []) as Record<string, unknown>[]) {
    const uid = row.user_id as string
    const rid = row.record_id as string | null
    if (rid) {
      const key = `${uid}||${rid}`
      if (!pubSummaryByRecord[key]) pubSummaryByRecord[key] = row
    }
    if (!pubSummaryByUser[uid]) pubSummaryByUser[uid] = row
  }

  // ── Batch B: checkpd schema ────────────────────────────────────────
  const [cpUsersRes, cpSummaryRes, cpRecordsRes] = await Promise.all([
    supabaseAdmin.schema("checkpd").from("users").select("*").in("id", userIds),
    supabaseAdmin
      .schema("checkpd")
      .from("record_summary")
      .select("user_id,record_id,prediction_risk,test_result,questionnaire_total")
      .in("user_id", userIds)
      .order("last_record_at", { ascending: false, nullsFirst: false }),
    supabaseAdmin
      .schema("checkpd")
      .from("records")
      .select("id,user_id,record_id")
      .in("user_id", userIds),
  ])
  if (cpUsersRes.error) throw cpUsersRes.error
  if (cpSummaryRes.error) throw cpSummaryRes.error
  if (cpRecordsRes.error) throw cpRecordsRes.error

  const cpUsersMap = indexBy(cpUsersRes.data ?? [], "id")

  // checkpd.record_summary: prefer exact (user_id, record_id) match, fallback latest per user_id
  const cpSummaryByRecord: Record<string, Record<string, unknown>> = {}
  const cpSummaryByUser: Record<string, Record<string, unknown>> = {}
  for (const row of (cpSummaryRes.data ?? []) as Record<string, unknown>[]) {
    const uid = row.user_id as string
    const rid = row.record_id as string | null
    if (!cpSummaryByUser[uid]) cpSummaryByUser[uid] = row
    if (rid) {
      const key = `${uid}||${rid}`
      if (!cpSummaryByRecord[key]) cpSummaryByRecord[key] = row
    }
  }

  // checkpd.records: (user_id, record_id) → record_pk (bigint id)
  const cpRecordPkMap: Record<string, number> = {}
  for (const row of (cpRecordsRes.data ?? []) as Record<string, unknown>[]) {
    const key = `${row.user_id}||${row.record_id ?? ""}`
    if (!cpRecordPkMap[key]) cpRecordPkMap[key] = row.id as number
  }

  const recordPks = Object.values(cpRecordPkMap)

  // checkpd.questionnaire — one row per record_pk (UNIQUE constraint)
  let cpQuestMap: Record<number, Record<string, unknown>> = {}
  if (recordPks.length > 0) {
    const cpQuestRes = await supabaseAdmin
      .schema("checkpd")
      .from("questionnaire")
      .select(
        "record_pk,q01,q02,q03,q04,q05,q06,q07,q08,q09,q10,q11,q12,q13,q14,q15,q16,q17,q18,q19,q20,total"
      )
      .in("record_pk", recordPks)
    if (cpQuestRes.error) throw cpQuestRes.error
    cpQuestMap = indexBy(cpQuestRes.data ?? [], "record_pk") as Record<number, Record<string, unknown>>
  }

  // ── Batch C: core schema via thaiid ───────────────────────────────
  const thaiids = [
    ...new Set(
      pairs
        .map((pair) => {
          const pairKey = `${pair.userId}||${pair.recordId ?? ""}`
          const pub = pubUsersMap[pair.userId] ?? {}
          const cpu = cpUsersMap[pair.userId] ?? {}
          const pubSum = pubSummaryByRecord[pairKey] ?? pubSummaryByUser[pair.userId] ?? {}
          const cpSum = cpSummaryByRecord[pairKey] ?? cpSummaryByUser[pair.userId] ?? {}
          const rawThaiId =
            str(cpSum.thaiid) ||
            str(pubSum.thaiid) ||
            str(cpu.thai_id) ||
            str(pub.thaiid)
          return thaiIdVariants(rawThaiId)
        })
        .flat()
        .filter(Boolean)
    ),
  ]

  type ScoreMap = Record<number, Record<string, unknown>>
  let patientMap: Record<string, number> = {}   // thaiid → patient_id (latest visit)
  let diagnosisMap: ScoreMap = {}
  let mocaMap: ScoreMap = {}
  let hamdMap: ScoreMap = {}
  let mdsMap: ScoreMap = {}
  let epworthMap: ScoreMap = {}
  let smellMap: ScoreMap = {}
  let tmseMap: ScoreMap = {}
  let rbdMap: ScoreMap = {}
  let rome4Map: ScoreMap = {}

  if (thaiids.length > 0) {
    console.info("[export/users-csv] thaiid candidates:", thaiids.length)
    const patientsRes = await supabaseAdmin
      .schema("core")
      .from("patients_v2")
      .select("id,thaiid")
      .in("thaiid", thaiids)
      .order("submission_timestamp", { ascending: false, nullsFirst: false })
      .order("id", { ascending: false })
    if (patientsRes.error) throw patientsRes.error
    let patientRows = (patientsRes.data ?? []) as Record<string, unknown>[]

    // Fallback: if exact IN() fails (format mismatch), scan thaiid rows and match by normalized digits.
    if (patientRows.length === 0) {
      const normalizedWanted = new Set(thaiids.map(normalizeThaiId).filter(Boolean))
      const scannedRows = await fetchPatientsByNormalizedThaiId(normalizedWanted)
      patientRows = scannedRows
      console.info("[export/users-csv] fallback normalized matches:", scannedRows.length)
    }

    console.info("[export/users-csv] matched patients_v2 rows:", patientRows.length)

    // one patient_id per thaiid (first result = latest submission)
    for (const row of patientRows) {
      const tidRaw = str(row.thaiid).trim()
      const tidNorm = normalizeThaiId(tidRaw)
      const pid = row.id as number
      if (tidRaw && !patientMap[tidRaw]) patientMap[tidRaw] = pid
      if (tidNorm && !patientMap[tidNorm]) patientMap[tidNorm] = pid
    }

    const patientIds = Object.values(patientMap)
    console.info("[export/users-csv] unique patient_ids for score lookup:", patientIds.length)
    if (patientIds.length > 0) {
      const [diagRes, mocaRes, hamdRes, mdsRes, epRes, smellRes, tmseRes, rbdRes, rome4Res] =
        await Promise.all([
          supabaseAdmin
            .schema("core")
            .from("patient_diagnosis_v2")
            .select(
              "patient_id,condition,hy_stage,disease_duration," +
              "rbd_suspected,hyposmia,constipation,depression,eds," +
              "ans_dysfunction,mild_parkinsonian_sign,family_history_pd," +
              "adl_score,scopa_aut_score,fdopa_pet_score"
            )
            .in("patient_id", patientIds),
          supabaseAdmin.schema("core").from("moca_v2").select("patient_id,total_score").in("patient_id", patientIds),
          supabaseAdmin.schema("core").from("hamd_v2").select("patient_id,total_score").in("patient_id", patientIds),
          supabaseAdmin.schema("core").from("mds_updrs_v2").select("patient_id,total_score,p3_total").in("patient_id", patientIds),
          supabaseAdmin.schema("core").from("epworth_v2").select("patient_id,total_score").in("patient_id", patientIds),
          supabaseAdmin.schema("core").from("smell_test_v2").select("patient_id,total_score").in("patient_id", patientIds),
          supabaseAdmin.schema("core").from("tmse_v2").select("patient_id,total_score").in("patient_id", patientIds),
          supabaseAdmin.schema("core").from("rbd_questionnaire_v2").select("patient_id,total_score").in("patient_id", patientIds),
          supabaseAdmin.schema("core").from("rome4_v2").select("patient_id,total_score").in("patient_id", patientIds),
        ])
      if (diagRes.error) throw diagRes.error
      if (mocaRes.error) throw mocaRes.error
      if (hamdRes.error) throw hamdRes.error
      if (mdsRes.error) throw mdsRes.error
      if (epRes.error) throw epRes.error
      if (smellRes.error) throw smellRes.error
      if (tmseRes.error) throw tmseRes.error
      if (rbdRes.error) throw rbdRes.error
      if (rome4Res.error) throw rome4Res.error
      diagnosisMap = indexBy(diagRes.data ?? [], "patient_id") as ScoreMap
      mocaMap     = indexBy(mocaRes.data  ?? [], "patient_id") as ScoreMap
      hamdMap     = indexBy(hamdRes.data  ?? [], "patient_id") as ScoreMap
      mdsMap      = indexBy(mdsRes.data   ?? [], "patient_id") as ScoreMap
      epworthMap  = indexBy(epRes.data    ?? [], "patient_id") as ScoreMap
      smellMap    = indexBy(smellRes.data ?? [], "patient_id") as ScoreMap
      tmseMap     = indexBy(tmseRes.data  ?? [], "patient_id") as ScoreMap
      rbdMap      = indexBy(rbdRes.data   ?? [], "patient_id") as ScoreMap
      rome4Map    = indexBy(rome4Res.data ?? [], "patient_id") as ScoreMap
    }
  }

  // ── Assemble CSV ───────────────────────────────────────────────────
  const headers = [
    // identity
    "user_id", "record_id", "area",
    // demographics (checkpd.users preferred, public.users fallback)
    "first_name", "last_name", "gender", "age", "phone_number", "thaiid", "province",
    // public record summary
    "condition", "other",
    // checkpd summary
    "prediction_risk", "test_result", "questionnaire_total",
    // questionnaire items
    "q01","q02","q03","q04","q05","q06","q07","q08","q09","q10",
    "q11","q12","q13","q14","q15","q16","q17","q18","q19","q20",
    // core — diagnosis flags
    "diagnosis_condition","hy_stage","disease_duration",
    "rbd_suspected","hyposmia","constipation","depression","eds",
    "ans_dysfunction","mild_parkinsonian_sign","family_history_pd",
    "adl_score","scopa_aut_score","fdopa_pet_score",
    // core — clinical scores
    "moca_total","hamd_total","mds_updrs_total",
    "epworth_total","smell_total","tmse_total","rbd_total","rome4_total",
  ]

  const lines: string[] = [headers.map(csvCell).join(",")]

  for (const pair of pairs) {
    const { userId, recordId } = pair
    const pairKey = `${userId}||${recordId ?? ""}`

    const pub    = pubUsersMap[userId] ?? {}
    const cpu    = cpUsersMap[userId]  ?? {}
    const pubSum = pubSummaryByRecord[pairKey] ?? pubSummaryByUser[userId] ?? {}
    const cpSum  = cpSummaryByRecord[pairKey] ?? cpSummaryByUser[userId] ?? {}

    const recordPk = cpRecordPkMap[pairKey]
    const quest    = recordPk != null ? (cpQuestMap[recordPk] ?? {}) : {}

    const thaiid =
      str(cpSum.thaiid) ||
      str(pubSum.thaiid) ||
      str(cpu.thai_id) ||
      str(pub.thaiid)
    const thaiidNorm = normalizeThaiId(thaiid)
    const patientId = patientMap[thaiid] ?? (thaiidNorm ? patientMap[thaiidNorm] : undefined)
    const noCore    = patientId == null

    const diag    = noCore ? {} : (diagnosisMap[patientId] ?? {})
    const moca    = noCore ? {} : (mocaMap[patientId]      ?? {})
    const hamd    = noCore ? {} : (hamdMap[patientId]      ?? {})
    const mds     = noCore ? {} : (mdsMap[patientId]       ?? {})
    const epworth = noCore ? {} : (epworthMap[patientId]   ?? {})
    const smell   = noCore ? {} : (smellMap[patientId]     ?? {})
    const tmse    = noCore ? {} : (tmseMap[patientId]      ?? {})
    const rbd     = noCore ? {} : (rbdMap[patientId]       ?? {})
    const rome4   = noCore ? {} : (rome4Map[patientId]     ?? {})

    const rbdTotal = toNumber(rbd.total_score)
    const smellTotal = toNumber(smell.total_score)
    const rome4Total = toNumber(rome4.total_score)
    const hamdTotal = toNumber(hamd.total_score)
    const epworthTotal = toNumber(epworth.total_score)
    const mdsTotal = toNumber(mds.total_score)
    const mdsP3Total = toNumber(mds.p3_total)

    // Derived clinical flags (guide-based) with existing clinician flag as fallback.
    const derivedRbd = toBool(diag.rbd_suspected) || (rbdTotal != null && rbdTotal >= 17)
    const derivedHyposmia = toBool(diag.hyposmia) || (smellTotal != null && smellTotal <= 9)
    const derivedConstipation = toBool(diag.constipation) || (rome4Total != null && rome4Total >= 2)
    const derivedDepression = toBool(diag.depression) || (hamdTotal != null && hamdTotal >= 13)
    const derivedEds = toBool(diag.eds) || (epworthTotal != null && epworthTotal >= 10)
    const derivedMildParkinsonianSign =
      toBool(diag.mild_parkinsonian_sign) ||
      (mdsP3Total != null && mdsP3Total > 3) ||
      (mdsTotal != null && mdsTotal > 6)

    const row: string[] = [
      userId,
      recordId ?? "",
      str(pub.area),
      str(cpu.first_name)   || str(pub.firstname),
      str(cpu.last_name)    || str(pub.lastname),
      str(cpu.gender)       || str(pub.gender),
      str(cpu.age)          || str(pub.age),
      str(cpu.phone_number) || str(pub.phonenumber),
      str(cpu.thai_id)      || str(pub.thaiid),
      str(cpu.province)     || str(pub.province),
      // public record summary
      str(pubSum.condition),
      str(pubSum.other),
      // checkpd summary
      fBool(cpSum.prediction_risk),
      str(cpSum.test_result),
      str(cpSum.questionnaire_total),
      // questionnaire items
      str(quest.q01), str(quest.q02), str(quest.q03), str(quest.q04), str(quest.q05),
      str(quest.q06), str(quest.q07), str(quest.q08), str(quest.q09), str(quest.q10),
      str(quest.q11), str(quest.q12), str(quest.q13), str(quest.q14), str(quest.q15),
      str(quest.q16), str(quest.q17), str(quest.q18), str(quest.q19), str(quest.q20),
      // core — diagnosis flags
      str(diag.condition),
      str(diag.hy_stage),
      str(diag.disease_duration),
      fYesNo(derivedRbd),
      fYesNo(derivedHyposmia),
      fYesNo(derivedConstipation),
      fYesNo(derivedDepression),
      fYesNo(derivedEds),
      fYesNo(diag.ans_dysfunction),
      fYesNo(derivedMildParkinsonianSign),
      fYesNo(diag.family_history_pd),
      str(diag.adl_score),
      str(diag.scopa_aut_score),
      str(diag.fdopa_pet_score),
      // core — clinical scores
      str(moca.total_score),
      str(hamd.total_score),
      str(mds.total_score),
      str(epworth.total_score),
      str(smell.total_score),
      str(tmse.total_score),
      str(rbd.total_score),
      str(rome4.total_score),
    ]
    lines.push(row.map(csvCell).join(","))
  }

  return lines.join("\r\n")
}

// ── Helpers ────────────────────────────────────────────────────────────────

function indexBy(arr: unknown[], key: string): Record<string, Record<string, unknown>> {
  const map: Record<string, Record<string, unknown>> = {}
  for (const row of arr as Record<string, unknown>[]) {
    const k = String(row[key])
    if (!map[k]) map[k] = row
  }
  return map
}

function str(v: unknown): string {
  if (v === null || v === undefined) return ""
  if (typeof v === "boolean") return v ? "true" : "false"
  return String(v)
}

function fBool(v: unknown): string {
  if (v === true) return "true"
  if (v === false) return "false"
  return ""
}

function fYesNo(v: unknown): string {
  if (v === true) return "Yes"
  if (v === false) return "No"
  return ""
}

function toBool(v: unknown): boolean {
  return v === true
}

function toNumber(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

function csvCell(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n") || value.includes("\r")) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}

function normalizeThaiId(v: string): string {
  return v.replace(/\D/g, "")
}

function thaiIdVariants(v: string): string[] {
  const raw = v.trim()
  const normalized = normalizeThaiId(raw)
  if (!raw && !normalized) return []
  if (raw && normalized && raw !== normalized) return [raw, normalized]
  return [raw || normalized]
}

async function fetchPatientsByNormalizedThaiId(normalizedWanted: Set<string>): Promise<Record<string, unknown>[]> {
  const matches: Record<string, unknown>[] = []
  const pageSize = 1000
  let from = 0

  while (true) {
    const { data, error } = await supabaseAdmin
      .schema("core")
      .from("patients_v2")
      .select("id,thaiid")
      .not("thaiid", "is", null)
      .order("submission_timestamp", { ascending: false, nullsFirst: false })
      .order("id", { ascending: false })
      .range(from, from + pageSize - 1)

    if (error) throw error
    if (!data || data.length === 0) break

    for (const row of data as Record<string, unknown>[]) {
      const normalized = normalizeThaiId(str(row.thaiid))
      if (normalized && normalizedWanted.has(normalized)) {
        matches.push(row)
      }
    }

    if (data.length < pageSize) break
    from += pageSize
  }

  return matches
}
