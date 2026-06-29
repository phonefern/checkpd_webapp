import { readFile } from "fs/promises"
import path from "path"
import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import JSZip from "jszip"
import { parseOther } from "@/lib/otherDiagnosis"

const IN_CHUNK_SIZE = 200
const QUERY_PAGE_SIZE = 1000
const BOM = "\uFEFF"

export const maxDuration = 300

const hasServiceRole = Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY)

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

const exportScopes = ["demo", "demo_test", "demo_test_screening", "full", "full_detail"] as const

type ExportScope = (typeof exportScopes)[number]
type Pair = { userId: string; recordId: string | null }
type RowMap = Record<string, Record<string, unknown>>
type ScoreMap = Record<number, Record<string, unknown>>

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

type CsvBuildResult = {
  csv: string
  includesQuestionnaire: boolean
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
      scope?: string
    }
    const scope = parseScope(body.scope)
    if (!scope) {
      return NextResponse.json(
        { error: "Invalid scope. Must be one of: demo, demo_test, demo_test_screening, full." },
        { status: 400 }
      )
    }

    let rowPairs: Pair[] = []

    if (mode === "selected") {
      if (!Array.isArray(pairs) || pairs.length === 0) {
        return NextResponse.json({ error: "No rows selected" }, { status: 400 })
      }
      rowPairs = pairs
    } else if (mode === "filtered") {
      rowPairs = await fetchFilteredPairs(filters ?? {})
    } else {
      return NextResponse.json({ error: "Invalid mode" }, { status: 400 })
    }

    const date = new Date().toISOString().slice(0, 10).replace(/-/g, "")
    const built = await buildCsv(rowPairs, scope)
    const zipBuffer = await buildZip({
      csv: built.csv,
      date,
      scope,
      includesQuestionnaire: built.includesQuestionnaire,
    })

    return new NextResponse(new Uint8Array(zipBuffer), {
      status: 200,
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="checkpd_${scope}_${date}.zip"`,
      },
    })
  } catch (err) {
    console.error("[export/users-csv]", err)
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 })
  }
}

async function fetchFilteredPairs(filters: FilterParams): Promise<Pair[]> {
  const out: Pair[] = []
  let from = 0

  while (true) {
    const { data, error } = await buildFilteredPairsQuery(filters, from, from + QUERY_PAGE_SIZE - 1)
    if (error) throw error
    if (!data || data.length === 0) break

    out.push(
      ...(data as Record<string, unknown>[]).map((r) => ({
        userId: r.id as string,
        recordId: (r.record_id as string | null) ?? null,
      }))
    )

    if (data.length < QUERY_PAGE_SIZE) break
    from += QUERY_PAGE_SIZE
  }

  return out
}

function buildFilteredPairsQuery(filters: FilterParams, from: number, to: number) {
  let query = supabaseAdmin
    .from("user_record_summary_with_users")
    .select("id,record_id")
    .order("timestamp", { ascending: false })
    .range(from, to)

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
  for (const otherDiagnosis of parseOther(filters.searchOther)) {
    query = query.ilike("other", `%${otherDiagnosis}%`)
  }
  if (filters.searchArea?.trim()) query = query.eq("area", filters.searchArea)
  if (filters.searchSource?.trim()) query = query.eq("source", filters.searchSource)
  if (filters.searchProvince?.trim()) query = query.eq("province", filters.searchProvince)

  return query
}

// Correct answer key for smell_test_v2 items 1–16
const SMELL_CORRECT = ["A","B","D","C","C","C","A","D","B","B","D","A","D","B","A","C"]

function encodeSmell(given: unknown, correct: string): string {
  const g = str(given).trim().toUpperCase()
  if (!g) return ""
  return g === correct ? "1" : "0"
}

async function buildCsv(pairs: Pair[], scope: ExportScope): Promise<CsvBuildResult> {
  const userIds = [...new Set(pairs.map((p) => p.userId))]
  const includeCore = scope === "demo_test" || scope === "demo_test_screening" || scope === "full" || scope === "full_detail"
  const includeScreening = scope === "demo_test_screening" || scope === "full" || scope === "full_detail"
  const includeAdmin = scope === "full" || scope === "full_detail"
  const includeDetail = scope === "full_detail"

  const [viewRows, pubUsersData, pubSummaryData, cpUsersData] = await Promise.all([
    fetchInChunks<Record<string, unknown>>(userIds, (chunkIds, from, to) =>
      supabaseAdmin
        .from("user_record_summary_with_users")
        .select(
          "id,record_id,thaiid,firstname,lastname,age,source,gender,region,province,timestamp,last_update,prediction_risk,condition,test_result,other,area"
        )
        .in("id", chunkIds as string[])
        .order("timestamp", { ascending: false, nullsFirst: false })
        .range(from, to)
    ),
    fetchInChunks<Record<string, unknown>>(userIds, (chunkIds, from, to) =>
      supabaseAdmin.from("users").select("*").in("id", chunkIds as string[]).range(from, to)
    ),
    includeAdmin
      ? fetchInChunks<Record<string, unknown>>(userIds, (chunkIds, from, to) =>
          supabaseAdmin
            .from("user_record_summary")
            .select("user_id,record_id,condition,other")
            .in("user_id", chunkIds as string[])
            .range(from, to)
        )
      : Promise.resolve([]),
    fetchInChunks<Record<string, unknown>>(userIds, (chunkIds, from, to) =>
      supabaseAdmin.schema("checkpd").from("users").select("*").in("id", chunkIds as string[]).range(from, to)
    ),
  ])

  const viewByRecord: RowMap = {}
  const viewByUser: RowMap = {}
  for (const row of viewRows) {
    const uid = row.id as string
    const rid = row.record_id as string | null
    if (rid) {
      const key = `${uid}||${rid}`
      if (!viewByRecord[key]) viewByRecord[key] = row
    }
    if (!viewByUser[uid]) viewByUser[uid] = row
  }

  const pubUsersMap = indexBy(pubUsersData, "id")
  const cpUsersMap = indexBy(cpUsersData, "id")

  // Event name lookup (small table) so checkpd.users.event_id resolves to a name.
  const { data: eventRows } = await supabaseAdmin
    .schema("checkpd")
    .from("events")
    .select("id,name_en,name_th")
  const eventMap = indexBy(eventRows ?? [], "id")
  const { byRecord: pubSummaryByRecord, byUser: pubSummaryByUser } = indexSummaryRows(pubSummaryData, "user_id")

  let cpSummaryByRecord: RowMap = {}
  let cpSummaryByUser: RowMap = {}
  let cpRecordPkMap: Record<string, number> = {}
  let cpQuestMap: Record<number, Record<string, unknown>> = {}

  if (includeScreening) {
    const [cpSummaryData, cpRecordsData] = await Promise.all([
      fetchInChunks<Record<string, unknown>>(userIds, (chunkIds, from, to) =>
        supabaseAdmin
          .schema("checkpd")
          .from("record_summary")
          .select("user_id,record_id,questionnaire_total")
          .in("user_id", chunkIds as string[])
          .order("last_record_at", { ascending: false, nullsFirst: false })
          .range(from, to)
      ),
      fetchInChunks<Record<string, unknown>>(userIds, (chunkIds, from, to) =>
        supabaseAdmin
          .schema("checkpd")
          .from("records")
          .select("id,user_id,record_id")
          .in("user_id", chunkIds as string[])
          .range(from, to)
      ),
    ])

    const indexedCpSummary = indexSummaryRows(cpSummaryData, "user_id")
    cpSummaryByRecord = indexedCpSummary.byRecord
    cpSummaryByUser = indexedCpSummary.byUser

    for (const row of cpRecordsData) {
      const key = `${row.user_id}||${row.record_id ?? ""}`
      if (!cpRecordPkMap[key]) cpRecordPkMap[key] = row.id as number
    }

    const recordPks = Object.values(cpRecordPkMap)
    if (recordPks.length > 0) {
      const cpQuestData = await fetchInChunks<Record<string, unknown>>(recordPks, (chunkIds, from, to) =>
        supabaseAdmin
          .schema("checkpd")
          .from("questionnaire")
          .select(
            "record_pk,q01,q02,q03,q04,q05,q06,q07,q08,q09,q10,q11,q12,q13,q14,q15,q16,q17,q18,q19,q20,total"
          )
          .in("record_pk", chunkIds as number[])
          .range(from, to)
      )
      cpQuestMap = indexBy(cpQuestData, "record_pk") as Record<number, Record<string, unknown>>
    }
  }

  const coreData = includeCore
    ? await fetchCoreData({
        pairs,
        pubUsersMap,
        cpUsersMap,
        viewByRecord,
        viewByUser,
        includeDetail,
      })
    : emptyCoreData()

  const headers = buildHeaders({ includeCore, includeScreening, includeAdmin, includeDetail })
  const lines: string[] = [headers.map(csvCell).join(",")]

  for (const pair of pairs) {
    const { userId, recordId } = pair
    const pairKey = `${userId}||${recordId ?? ""}`

    const viewRow = viewByRecord[pairKey] ?? viewByUser[userId] ?? {}
    const pub = pubUsersMap[userId] ?? {}
    const cpu = cpUsersMap[userId] ?? {}
    const pubSum = pubSummaryByRecord[pairKey] ?? pubSummaryByUser[userId] ?? {}
    const cpSum = cpSummaryByRecord[pairKey] ?? cpSummaryByUser[userId] ?? {}
    const recordPk = cpRecordPkMap[pairKey]
    const quest = recordPk != null ? cpQuestMap[recordPk] ?? {} : {}

    const thaiid = str(viewRow.thaiid) || str(cpu.thai_id) || str(pub.thaiid)
    const thaiidNorm = normalizeThaiId(thaiid)
    const eventId = str(cpu.event_id)
    const ev = eventId ? eventMap[eventId] ?? {} : {}
    const patientId = coreData.patientMap[thaiid] ?? (thaiidNorm ? coreData.patientMap[thaiidNorm] : undefined)
    const noCore = patientId == null

    const diag = noCore ? {} : coreData.diagnosisMap[patientId] ?? {}
    const moca = noCore ? {} : coreData.mocaMap[patientId] ?? {}
    const hamd = noCore ? {} : coreData.hamdMap[patientId] ?? {}
    const mds = noCore ? {} : coreData.mdsMap[patientId] ?? {}
    const epworth = noCore ? {} : coreData.epworthMap[patientId] ?? {}
    const smell = noCore ? {} : coreData.smellMap[patientId] ?? {}
    const tmse = noCore ? {} : coreData.tmseMap[patientId] ?? {}
    const rbd = noCore ? {} : coreData.rbdMap[patientId] ?? {}
    const rome4 = noCore ? {} : coreData.rome4Map[patientId] ?? {}

    const row: string[] = [
      userId,
      recordId ?? "",
      str(viewRow.timestamp),
      str(viewRow.area) || str(pub.area),
      str(cpu.first_name) || str(viewRow.firstname) || str(pub.firstname),
      str(cpu.last_name) || str(viewRow.lastname) || str(pub.lastname),
      str(cpu.gender) || str(viewRow.gender) || str(pub.gender),
      str(cpu.age) || str(viewRow.age) || str(pub.age),
      str(cpu.phone_number) || str(pub.phonenumber),
      str(cpu.thai_id) || thaiid,
      str(cpu.province) || str(viewRow.province) || str(pub.province),
      str(cpu.education_status),
      str(cpu.occupation),
      str(cpu.emolument),
      str(cpu.ethnicity),
      str(cpu.marital_status),
      str(cpu.congenital_disease),
      normalizeYesNo(cpu.smoking),
      normalizeYesNo(cpu.alcohol),
      normalizeYesNo(cpu.coffee),
      normalizeYesNo(cpu.milk),
      normalizeYesNo(cpu.exercise),
      normalizeYesNo(cpu.insecticide),
      normalizeYesNo(cpu.narcotic),
      normalizeYesNo(cpu.severe_head_injury),
      eventId,
      str(ev.name_en),
      str(ev.name_th),
    ]

    if (includeAdmin) {
      row.push(str(pubSum.condition) || str(viewRow.condition), str(pubSum.other) || str(viewRow.other))
    }

    if (includeScreening) {
      row.push(
        fBool(viewRow.prediction_risk),
        str(viewRow.test_result),
        str(cpSum.questionnaire_total) || str(quest.total),
        str(quest.q01),
        str(quest.q02),
        str(quest.q03),
        str(quest.q04),
        str(quest.q05),
        str(quest.q06),
        str(quest.q07),
        str(quest.q08),
        str(quest.q09),
        str(quest.q10),
        str(quest.q11),
        str(quest.q12),
        str(quest.q13),
        str(quest.q14),
        str(quest.q15),
        str(quest.q16),
        str(quest.q17),
        str(quest.q18),
        str(quest.q19),
        str(quest.q20)
      )
    }

    if (includeCore) {
      const derived = deriveClinicalFlags({ diag, hamd, mds, epworth, smell, rbd, rome4 })
      row.push(
        str(diag.condition),
        str(diag.hy_stage),
        str(diag.disease_duration),
        fYesNo(derived.rbd),
        fYesNo(derived.hyposmia),
        fYesNo(derived.constipation),
        fYesNo(derived.depression),
        fYesNo(derived.eds),
        fYesNo(diag.ans_dysfunction),
        fYesNo(derived.mildParkinsonianSign),
        fYesNo(diag.family_history_pd),
        str(diag.adl_score),
        str(diag.scopa_aut_score),
        str(diag.fdopa_pet_score),
        str(moca.total_score),
        str(hamd.total_score),
        str(mds.total_score),
        str(epworth.total_score),
        str(smell.total_score),
        str(tmse.total_score),
        str(rbd.total_score),
        str(rome4.total_score)
      )
      if (includeDetail) {
        for (let i = 1; i <= 13; i++) {
          const q = String(i).padStart(2, "0")
          row.push(str(rbd[`q${q}_score`]), str(rbd[`q${q}_frequency`]))
        }
        for (let i = 0; i < 16; i++) {
          const q = String(i + 1).padStart(2, "0")
          row.push(encodeSmell(smell[`smell_${q}_answer`], SMELL_CORRECT[i]))
        }
      }
    }

    lines.push(row.map(csvCell).join(","))
  }

  return {
    csv: lines.join("\r\n"),
    includesQuestionnaire: includeScreening,
  }
}

function buildHeaders(flags: { includeCore: boolean; includeScreening: boolean; includeAdmin: boolean; includeDetail?: boolean }) {
  const headers = [
    "user_id",
    "record_id",
    "timestamp",
    "area",
    "first_name",
    "last_name",
    "gender",
    "age",
    "phone_number",
    "thaiid",
    "province",
    "education_status",
    "occupation",
    "emolument",
    "ethnicity",
    "marital_status",
    "congenital_disease",
    "smoking",
    "alcohol",
    "coffee",
    "milk",
    "exercise",
    "insecticide",
    "narcotic",
    "severe_head_injury",
    "event_id",
    "event_name_en",
    "event_name_th",
  ]

  if (flags.includeAdmin) {
    headers.push("condition", "other")
  }

  if (flags.includeScreening) {
    headers.push(
      "prediction_risk",
      "test_result",
      "questionnaire_total",
      "q01",
      "q02",
      "q03",
      "q04",
      "q05",
      "q06",
      "q07",
      "q08",
      "q09",
      "q10",
      "q11",
      "q12",
      "q13",
      "q14",
      "q15",
      "q16",
      "q17",
      "q18",
      "q19",
      "q20"
    )
  }

  if (flags.includeCore) {
    headers.push(
      "diagnosis_condition",
      "hy_stage",
      "disease_duration",
      "rbd_suspected",
      "hyposmia",
      "constipation",
      "depression",
      "eds",
      "ans_dysfunction",
      "mild_parkinsonian_sign",
      "family_history_pd",
      "adl_score",
      "scopa_aut_score",
      "fdopa_pet_score",
      "moca_total",
      "hamd_total",
      "mds_updrs_total",
      "epworth_total",
      "smell_total",
      "tmse_total",
      "rbd_total",
      "rome4_total"
    )
    if (flags.includeDetail) {
      for (let i = 1; i <= 13; i++) {
        headers.push(`rbd${i}`, `rbd${i}.1`)
      }
      for (let i = 1; i <= 16; i++) {
        headers.push(`s${i}`)
      }
    }
  }

  return headers
}

async function fetchCoreData(params: {
  pairs: Pair[]
  pubUsersMap: RowMap
  cpUsersMap: RowMap
  viewByRecord: RowMap
  viewByUser: RowMap
  includeDetail?: boolean
}) {
  const thaiids = [
    ...new Set(
      params.pairs
        .map((pair) => {
          const pairKey = `${pair.userId}||${pair.recordId ?? ""}`
          const viewRow = params.viewByRecord[pairKey] ?? params.viewByUser[pair.userId] ?? {}
          const pub = params.pubUsersMap[pair.userId] ?? {}
          const cpu = params.cpUsersMap[pair.userId] ?? {}
          return thaiIdVariants(str(viewRow.thaiid) || str(cpu.thai_id) || str(pub.thaiid))
        })
        .flat()
        .filter(Boolean)
    ),
  ]

  const coreData = emptyCoreData()
  if (thaiids.length === 0) return coreData

  console.info("[export/users-csv] thaiid candidates:", thaiids.length)
  const patientRows = await fetchPatientRows(thaiids)
  console.info("[export/users-csv] matched patients_v2 rows:", patientRows.length)

  for (const row of patientRows) {
    const tidRaw = str(row.thaiid).trim()
    const tidNorm = normalizeThaiId(tidRaw)
    const pid = row.id as number
    if (tidRaw && !coreData.patientMap[tidRaw]) coreData.patientMap[tidRaw] = pid
    if (tidNorm && !coreData.patientMap[tidNorm]) coreData.patientMap[tidNorm] = pid
  }

  const patientIds = [...new Set(Object.values(coreData.patientMap))]
  console.info("[export/users-csv] unique patient_ids for score lookup:", patientIds.length)
  if (patientIds.length === 0) return coreData

  const [diagnosisRows, mocaRows, hamdRows, mdsRows, epworthRows, smellRows, tmseRows, rbdRows, rome4Rows] =
    await Promise.all([
      fetchInChunks<Record<string, unknown>>(patientIds, (chunkIds, from, to) =>
        supabaseAdmin
          .schema("core")
          .from("patient_diagnosis_v2")
          .select(
            "patient_id,condition,hy_stage,disease_duration," +
              "rbd_suspected,hyposmia,constipation,depression,eds," +
              "ans_dysfunction,mild_parkinsonian_sign,family_history_pd," +
              "adl_score,scopa_aut_score,fdopa_pet_score"
          )
          .in("patient_id", chunkIds as number[])
          .range(from, to)
      ),
      fetchInChunks<Record<string, unknown>>(patientIds, (chunkIds, from, to) =>
        supabaseAdmin
          .schema("core")
          .from("moca_v2")
          .select("patient_id,total_score")
          .in("patient_id", chunkIds as number[])
          .range(from, to)
      ),
      fetchInChunks<Record<string, unknown>>(patientIds, (chunkIds, from, to) =>
        supabaseAdmin
          .schema("core")
          .from("hamd_v2")
          .select("patient_id,total_score")
          .in("patient_id", chunkIds as number[])
          .range(from, to)
      ),
      fetchInChunks<Record<string, unknown>>(patientIds, (chunkIds, from, to) =>
        supabaseAdmin
          .schema("core")
          .from("mds_updrs_v2")
          .select("patient_id,total_score,p3_total")
          .in("patient_id", chunkIds as number[])
          .range(from, to)
      ),
      fetchInChunks<Record<string, unknown>>(patientIds, (chunkIds, from, to) =>
        supabaseAdmin
          .schema("core")
          .from("epworth_v2")
          .select("patient_id,total_score")
          .in("patient_id", chunkIds as number[])
          .range(from, to)
      ),
      fetchInChunks<Record<string, unknown>>(patientIds, (chunkIds, from, to) =>
        supabaseAdmin
          .schema("core")
          .from("smell_test_v2")
          .select(
            params.includeDetail
              ? "patient_id,total_score,smell_01_answer,smell_02_answer,smell_03_answer,smell_04_answer,smell_05_answer,smell_06_answer,smell_07_answer,smell_08_answer,smell_09_answer,smell_10_answer,smell_11_answer,smell_12_answer,smell_13_answer,smell_14_answer,smell_15_answer,smell_16_answer"
              : "patient_id,total_score"
          )
          .in("patient_id", chunkIds as number[])
          .range(from, to)
      ),
      fetchInChunks<Record<string, unknown>>(patientIds, (chunkIds, from, to) =>
        supabaseAdmin
          .schema("core")
          .from("tmse_v2")
          .select("patient_id,total_score")
          .in("patient_id", chunkIds as number[])
          .range(from, to)
      ),
      fetchInChunks<Record<string, unknown>>(patientIds, (chunkIds, from, to) =>
        supabaseAdmin
          .schema("core")
          .from("rbd_questionnaire_v2")
          .select(
            params.includeDetail
              ? "patient_id,total_score,q01_score,q01_frequency,q02_score,q02_frequency,q03_score,q03_frequency,q04_score,q04_frequency,q05_score,q05_frequency,q06_score,q06_frequency,q07_score,q07_frequency,q08_score,q08_frequency,q09_score,q09_frequency,q10_score,q10_frequency,q11_score,q11_frequency,q12_score,q12_frequency,q13_score,q13_frequency"
              : "patient_id,total_score"
          )
          .in("patient_id", chunkIds as number[])
          .range(from, to)
      ),
      fetchInChunks<Record<string, unknown>>(patientIds, (chunkIds, from, to) =>
        supabaseAdmin
          .schema("core")
          .from("rome4_v2")
          .select("patient_id,total_score")
          .in("patient_id", chunkIds as number[])
          .range(from, to)
      ),
    ])

  coreData.diagnosisMap = indexBy(diagnosisRows, "patient_id") as ScoreMap
  coreData.mocaMap = indexBy(mocaRows, "patient_id") as ScoreMap
  coreData.hamdMap = indexBy(hamdRows, "patient_id") as ScoreMap
  coreData.mdsMap = indexBy(mdsRows, "patient_id") as ScoreMap
  coreData.epworthMap = indexBy(epworthRows, "patient_id") as ScoreMap
  coreData.smellMap = indexBy(smellRows, "patient_id") as ScoreMap
  coreData.tmseMap = indexBy(tmseRows, "patient_id") as ScoreMap
  coreData.rbdMap = indexBy(rbdRows, "patient_id") as ScoreMap
  coreData.rome4Map = indexBy(rome4Rows, "patient_id") as ScoreMap

  return coreData
}

async function fetchPatientRows(thaiids: string[]) {
  const patientsRows = await fetchInChunks<Record<string, unknown>>(thaiids, (chunkIds, from, to) =>
    supabaseAdmin
      .schema("core")
      .from("patients_v2")
      .select("id,thaiid")
      .in("thaiid", chunkIds as string[])
      .order("submission_timestamp", { ascending: false, nullsFirst: false })
      .order("id", { ascending: false })
      .range(from, to)
  )

  if (patientsRows.length > 0) return patientsRows

  const normalizedWanted = new Set(thaiids.map(normalizeThaiId).filter(Boolean))
  const scannedRows = await fetchPatientsByNormalizedThaiId(normalizedWanted)
  console.info("[export/users-csv] fallback normalized matches:", scannedRows.length)
  return scannedRows
}

function emptyCoreData() {
  return {
    patientMap: {} as Record<string, number>,
    diagnosisMap: {} as ScoreMap,
    mocaMap: {} as ScoreMap,
    hamdMap: {} as ScoreMap,
    mdsMap: {} as ScoreMap,
    epworthMap: {} as ScoreMap,
    smellMap: {} as ScoreMap,
    tmseMap: {} as ScoreMap,
    rbdMap: {} as ScoreMap,
    rome4Map: {} as ScoreMap,
  }
}

function deriveClinicalFlags(args: {
  diag: Record<string, unknown>
  hamd: Record<string, unknown>
  mds: Record<string, unknown>
  epworth: Record<string, unknown>
  smell: Record<string, unknown>
  rbd: Record<string, unknown>
  rome4: Record<string, unknown>
}) {
  const rbdTotal = toNumber(args.rbd.total_score)
  const smellTotal = toNumber(args.smell.total_score)
  const rome4Total = toNumber(args.rome4.total_score)
  const hamdTotal = toNumber(args.hamd.total_score)
  const epworthTotal = toNumber(args.epworth.total_score)
  const mdsTotal = toNumber(args.mds.total_score)
  const mdsP3Total = toNumber(args.mds.p3_total)

  return {
    rbd: toBool(args.diag.rbd_suspected) || (rbdTotal != null && rbdTotal >= 17),
    hyposmia: toBool(args.diag.hyposmia) || (smellTotal != null && smellTotal <= 9),
    constipation: toBool(args.diag.constipation) || (rome4Total != null && rome4Total >= 2),
    depression: toBool(args.diag.depression) || (hamdTotal != null && hamdTotal >= 13),
    eds: toBool(args.diag.eds) || (epworthTotal != null && epworthTotal >= 10),
    mildParkinsonianSign:
      toBool(args.diag.mild_parkinsonian_sign) ||
      (mdsP3Total != null && mdsP3Total > 3) ||
      (mdsTotal != null && mdsTotal > 6),
  }
}

async function buildZip(args: {
  csv: string
  date: string
  scope: ExportScope
  includesQuestionnaire: boolean
}) {
  const zip = new JSZip()
  zip.file(`checkpd_${args.scope}_${args.date}.csv`, BOM + args.csv)
  zip.file("readme.txt", BOM + buildReadme(args.scope, args.includesQuestionnaire))

  if (args.includesQuestionnaire) {
    const refPath = path.join(process.cwd(), "public", "references", "questionnaire_schema.csv")
    const refFile = await readFile(refPath)
    zip.file("questionnaire_schema.csv", ensureUtf8Bom(refFile))
  }

  return zip.generateAsync({ type: "nodebuffer" })
}

function buildReadme(scope: ExportScope, includesQuestionnaire: boolean) {
  const scopeDescriptions: Record<ExportScope, string> = {
    demo: "Demo only - demographics and risk-factor fields only.",
    demo_test: "Demo + Test - demographics plus in-clinic clinical scores.",
    demo_test_screening: "Demo + Test + Screening - adds mobile app screening, q01-q20, and prediction.",
    full: "Full - all export columns, including admin condition/other metadata.",
    full_detail: "Full + Detail - all full columns plus RBD item breakdown (rbd1-rbd13 score/frequency) and Smell encoding (s1-s16: 1=correct, 0=wrong).",
  }
  const files = [
    `1. checkpd_${scope}_<date>.csv - data for the selected export scope`,
    "2. readme.txt - this file",
  ]
  if (includesQuestionnaire) {
    files.push("3. questionnaire_schema.csv - question text and encoding reference for q01-q20")
  }

  return `CheckPD Export - README
========================

Files in this archive
---------------------
${files.join("\n")}

Selected scope
--------------
${scope} - ${scopeDescriptions[scope]}

Value encoding
--------------
The following columns are normalized to 0/1 for statistics:
smoking, alcohol, coffee, milk, exercise, insecticide, narcotic, severe_head_injury

1 = เคย (Yes)
0 = ไม่เคย (No)
blank = ไม่ระบุ / unknown / malformed value

Other Yes/No columns from core.patient_diagnosis_v2 keep the existing format:
Yes / No / blank

Data sources
------------
- Demographics: checkpd.users
- Event name (event_name_en / event_name_th): checkpd.events joined on event_id
- Timestamp and prediction_risk: public.user_record_summary_with_users
- Clinical scores: core.patients_v2 and score tables
- Screening questionnaire: checkpd.records + checkpd.questionnaire
- Admin metadata in full scope: public.user_record_summary

q01-q20
-------
See questionnaire_schema.csv for the questionnaire reference when included in this ZIP.

Contact
-------
CheckPD data team - checkpd@chulapd.org
Generated by checkpd export tool at ${new Date().toISOString()}
`
}

function indexSummaryRows(rows: Record<string, unknown>[], userKey: "id" | "user_id") {
  const byRecord: RowMap = {}
  const byUser: RowMap = {}

  for (const row of rows) {
    const uid = row[userKey] as string
    const rid = row.record_id as string | null
    if (rid) {
      const key = `${uid}||${rid}`
      if (!byRecord[key]) byRecord[key] = row
    }
    if (!byUser[uid]) byUser[uid] = row
  }

  return { byRecord, byUser }
}

async function fetchInChunks<T>(
  ids: (string | number)[],
  fn: (chunkIds: (string | number)[], from: number, to: number) => PromiseLike<{ data: unknown[] | null; error: unknown }>
): Promise<T[]> {
  if (ids.length === 0) return []

  const out: T[] = []
  await Promise.all(
    chunk(ids, IN_CHUNK_SIZE).map(async (chunkIds) => {
      let from = 0
      while (true) {
        const result = await fn(chunkIds, from, from + QUERY_PAGE_SIZE - 1)
        if (result.error) throw result.error
        const rows = result.data ?? []
        out.push(...(rows as T[]))
        if (rows.length < QUERY_PAGE_SIZE) break
        from += QUERY_PAGE_SIZE
      }
    })
  )
  return out
}

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = []
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size))
  return out
}

function parseScope(value: unknown): ExportScope | null {
  if (value === undefined || value === null || value === "") return "full"
  return exportScopes.includes(value as ExportScope) ? (value as ExportScope) : null
}

function ensureUtf8Bom(data: Buffer): Buffer {
  if (data.length >= 3 && data[0] === 0xef && data[1] === 0xbb && data[2] === 0xbf) return data
  return Buffer.concat([Buffer.from(BOM, "utf8"), data])
}

function indexBy(arr: unknown[], key: string): RowMap {
  const map: RowMap = {}
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

function normalizeYesNo(raw: unknown): string {
  if (raw === null || raw === undefined) return ""

  let value = String(raw).trim()
  if (!value || value.toLowerCase() === "null" || value === "ไม่ระบุ") return ""

  if (value.startsWith("[") && value.endsWith("]")) {
    value = value.slice(1, -1)
  }

  const firstToken = value
    .split(",")
    .map((part) => part.trim())
    .find((part) => part.length > 0)

  if (firstToken === "เคย") return "1"
  if (firstToken === "ไม่เคย") return "0"
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
