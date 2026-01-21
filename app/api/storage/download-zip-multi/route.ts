// app/api/storage/download-zip-multi/route.ts
import JSZip from "jszip"
import { supabaseServer } from "@/lib/supabase-server"
import { s3 } from "@/lib/s3"
import {
  ListObjectsV2Command,
  GetObjectCommand,
} from "@aws-sdk/client-s3"

/* ================= Types ================= */

type SortBy = "ID" | "TEST"

interface BulkDownloadPayload {
  select_all: boolean
  sort_by: SortBy
  selected_tests: string[]
  condition: string

  // when select_all = false
  items?: {
    user_id: string
    record_id: string
  }[]

  // when select_all = true
  filters?: {
    search?: string
    area?: string
    risk?: string
    testStatus?: string
    startDate?: string
    endDate?: string
    lastMigrated?: string
  }
}

/* ================= Handler ================= */

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const raw = searchParams.get("data")

  if (!raw) {
    return Response.json({ error: "missing data" }, { status: 400 })
  }

  let payload: BulkDownloadPayload
  try {
    payload = JSON.parse(raw)
  } catch {
    return Response.json({ error: "invalid payload" }, { status: 400 })
  }

  const {
    select_all,
    sort_by,
    selected_tests,
    condition,
    items = [],
    filters = {},
  } = payload

  /* ================= Fetch records ================= */

  let records: {
    id: string
    record_id: string
    condition: string
  }[] = []

  // ===== CASE 1: Select all (all pages) =====
  if (select_all) {
    let query = supabaseServer
      .from("user_record_with_users_and_storage")
      .select("id, record_id, condition")

    if (condition !== "all") {
      query = query.eq("condition", condition)
    }

    if (filters.area && filters.area !== "all") {
      query = query.eq("area", filters.area)
    }

    if (filters.risk && filters.risk !== "all") {
      query = query.eq("risk", filters.risk)
    }

    if (filters.search) {
      query = query.or(
        `firstname.ilike.%${filters.search}%,lastname.ilike.%${filters.search}%`
      )
    }

    const res = await query
    if (res.error) {
      return Response.json({ error: res.error.message }, { status: 500 })
    }

    records = res.data ?? []
  }

  // ===== CASE 2: Checkbox selected =====
  else {
    if (!items.length) {
      return Response.json({ error: "no items selected" }, { status: 400 })
    }

    const userIds = items.map(i => i.user_id)

    const res = await supabaseServer
      .from("user_record_with_users_and_storage")
      .select("id, record_id, condition")
      .in("id", userIds)

    if (res.error) {
      return Response.json({ error: res.error.message }, { status: 500 })
    }

    records =
      res.data?.filter(r =>
        items.some(
          i => i.user_id === r.id && i.record_id === r.record_id
        )
      ) ?? []
  }

  if (!records.length) {
    return Response.json({ error: "no records found" }, { status: 404 })
  }

  /* ================= ZIP Prepare ================= */

  const bucket = process.env.STORAGE_BUCKET ?? "checkpd"
  const zip = new JSZip()
  const today = new Date().toISOString().slice(0, 10)

  /* =========================================================
     MODE 1: SORT BY ID
     {date}/{condition}/{id}/{record_id}/{files}
  ========================================================= */

  if (sort_by === "ID") {
    for (const rec of records) {
      const conditionFolder = rec.condition ?? "unknown"
      const prefix = `${rec.id}/${rec.record_id}/`

      const objects = await listAllObjects({
        Bucket: bucket,
        Prefix: prefix,
      })

      for (const obj of objects) {
        if (!obj.Key) continue
        const relative = obj.Key.replace(prefix, "")
        if (!matchTest(relative, selected_tests)) continue

        const file = await getFile(bucket, obj.Key)

        zip
          .folder(today)!
          .folder(conditionFolder)!
          .folder(rec.id)!
          .folder(rec.record_id)!
          .file(relative, file)
      }
    }
  }

  /* =========================================================
     MODE 2: SORT BY TEST
     {date}/{test}/{condition}/{files}
  ========================================================= */

  if (sort_by === "TEST") {
    for (const rec of records) {
      const conditionFolder = rec.condition ?? "unknown"
      const prefix = `${rec.id}/${rec.record_id}/`

      const objects = await listAllObjects({
        Bucket: bucket,
        Prefix: prefix,
      })

      for (const obj of objects) {
        if (!obj.Key) continue
        const relative = obj.Key.replace(prefix, "")
        const testType = extractTestType(relative)

        if (!testType) continue
        if (selected_tests.length && !selected_tests.includes(testType)) continue

        const file = await getFile(bucket, obj.Key)

        zip
          .folder(today)!
          .folder(testType)!
          .folder(conditionFolder)!
          .file(`${rec.id}_${relative}`, file)
      }
    }
  }

  /* ================= Response ================= */

  const buffer = await zip.generateAsync({ type: "uint8array" })

  return new Response(Buffer.from(buffer), {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="By${sort_by}_${today}.zip"`,
    },
  })
}

/* ================= Helpers ================= */

async function listAllObjects(input: any) {
  const all: any[] = []
  let token: string | undefined

  do {
    const res = await s3.send(
      new ListObjectsV2Command({
        ...input,
        ContinuationToken: token,
      })
    )

    all.push(...(res.Contents ?? []))
    token = res.IsTruncated ? res.NextContinuationToken : undefined
  } while (token)

  return all
}

async function getFile(bucket: string, key: string): Promise<Buffer> {
  const res = await s3.send(
    new GetObjectCommand({
      Bucket: bucket,
      Key: key,
    })
  )

  const body = res.Body as any

  if (typeof body.arrayBuffer === "function") {
    return Buffer.from(await body.arrayBuffer())
  }

  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []
    body.on("data", (c: Buffer) => chunks.push(c))
    body.on("end", () => resolve(Buffer.concat(chunks)))
    body.on("error", reject)
  })
}

/* ================= Test helpers ================= */

function extractTestType(filename: string): string | null {
  const TESTS = [
    "voiceahh",
    "voiceypl",
    "tremorresting",
    "tremorpostural",
    "dualtapright",
    "dualtap",
    "pinchtosizeright",
    "pinchtosize",
    "gaitwalk",
    "balance",
    "questionnaire",
  ]

  for (const test of TESTS) {
    // match แบบ word boundary
    const regex = new RegExp(`(^|_|/)${test}(_|\\.|$)`)
    if (regex.test(filename)) {
      return test
    }
  }

  return null
}

function matchTest(filename: string, selected: string[]) {
  if (!selected.length) return true

  return selected.some(test => {
    const regex = new RegExp(`(^|_|/)${test}(_|\\.|$)`)
    return regex.test(filename)
  })
}
