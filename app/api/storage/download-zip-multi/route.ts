// app/api/storage/download-zip-bulk/route.ts
import JSZip from "jszip"
import { supabaseServer } from "@/lib/supabase-server"
import { s3 } from "@/lib/s3"
import {
  ListObjectsV2Command,
  GetObjectCommand,
} from "@aws-sdk/client-s3"

interface BulkDownloadRequest {
  user_ids: string[]
  condition: string
}

// --- MAIN HANDLER ---
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  
  // ดึงข้อมูลจาก query parameters
  const dataParam = searchParams.get("data")
  if (!dataParam) {
    return Response.json({ error: "Missing data parameter" }, { status: 400 })
  }

  let requestData: BulkDownloadRequest
  try {
    requestData = JSON.parse(dataParam)
  } catch {
    return Response.json({ error: "Invalid data format" }, { status: 400 })
  }

  const { user_ids, condition } = requestData

  if (!user_ids || !Array.isArray(user_ids) || user_ids.length === 0) {
    return Response.json({ error: "Invalid user_ids" }, { status: 400 })
  }

  console.log("Download ZIP BULK for users:", user_ids.length, "condition:", condition)

  // 1) Fetch all records for all selected users
  const { data: records, error } = await supabaseServer
    .from("user_record_summary")
    .select("user_id, record_id, condition")
    .in("user_id", user_ids)

  if (error) return Response.json({ error: error.message }, { status: 500 })

  // 2) Apply condition filter
  const filtered = records.filter((r: any) =>
    condition === "all" ? true : r.condition === condition
  )

  if (filtered.length === 0) {
    return Response.json({ error: "No records match filter" }, { status: 404 })
  }

  // 3) Group records by user_id
  const recordsByUser: Record<string, any[]> = {}
  filtered.forEach((record: any) => {
    if (!recordsByUser[record.user_id]) {
      recordsByUser[record.user_id] = []
    }
    recordsByUser[record.user_id].push(record)
  })

  const bucket = process.env.STORAGE_BUCKET ?? "checkpd"
  const zip = new JSZip()

  // 4) Process each user
  for (const [userId, userRecords] of Object.entries(recordsByUser)) {
    // 5) Process each record for this user
    for (const rec of userRecords) {
      const userFolder = `user_${userId}`
      const recFolder = `record_${rec.record_id}`
      const prefix = `${userId}/${rec.record_id}/`

      const objects = await listAllObjects({ Bucket: bucket, Prefix: prefix })

      if (objects.length === 0) continue

      for (const obj of objects) {
        if (!obj.Key) continue

        const getCmd = new GetObjectCommand({
          Bucket: bucket,
          Key: obj.Key,
        })

        const fileRes = await s3.send(getCmd)
        const body = await streamToBuffer(fileRes.Body as any)
        const relative = obj.Key.replace(prefix, "")

        // Format JSON
        if (relative.endsWith(".json")) {
          try {
            const pretty = JSON.stringify(JSON.parse(body.toString("utf-8")), null, 2)
            zip.folder(userFolder)!.folder(recFolder)!.file(relative, pretty)
          } catch {
            zip.folder(userFolder)!.folder(recFolder)!.file(relative, body)
          }
        } else {
          zip.folder(userFolder)!.folder(recFolder)!.file(relative, body)
        }
      }
    }
  }

  const zipBytes = await zip.generateAsync({ type: "uint8array" })
  const buffer = Buffer.from(zipBytes)

  return new Response(buffer, {
    headers: {
      "Content-Type": "application/zip",
      "Content-Length": buffer.byteLength.toString(),
      "Content-Disposition": `attachment; filename="bulk_users_${condition}_${new Date().toISOString().slice(0,10)}.zip"`,
    },
  })
}

// --- Helpers ---
async function listAllObjects(baseInput: any) {
  const contents: any[] = []
  let continuationToken: string | undefined

  do {
    const listCmd = new ListObjectsV2Command({
      ...baseInput,
      ContinuationToken: continuationToken,
    })
    const res = await s3.send(listCmd)
    contents.push(...(res.Contents ?? []))
    continuationToken = res.IsTruncated ? res.NextContinuationToken : undefined
  } while (continuationToken)

  return contents
}

function streamToBuffer(stream: any): Promise<Buffer> {
  if (!stream) return Promise.resolve(Buffer.alloc(0))

  if (typeof stream.arrayBuffer === "function") {
    return stream.arrayBuffer().then((arr: ArrayBuffer) => Buffer.from(arr))
  }

  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []
    stream.on("data", (chunk: Buffer) => chunks.push(chunk))
    stream.on("error", reject)
    stream.on("end", () => resolve(Buffer.concat(chunks)))
  })
}