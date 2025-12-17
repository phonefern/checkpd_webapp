// app/api/storage/download-zip/route.ts
import JSZip from "jszip"
import { s3 } from "@/lib/s3"
import {
  ListObjectsV2Command,
  GetObjectCommand,
  ListObjectsV2CommandInput,
  ListObjectsV2CommandOutput,
} from "@aws-sdk/client-s3"

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const user_id = searchParams.get("user_id")?.trim()
  const record_id = searchParams.get("record_id")?.trim()

  if (!user_id || !record_id) {
    return Response.json({ error: "Missing user_id or record_id" }, { status: 400 })
  }

  if (!isSafeSegment(user_id) || !isSafeSegment(record_id)) {
    return Response.json({ error: "Invalid identifiers" }, { status: 400 })
  }

  const bucket = process.env.STORAGE_BUCKET ?? "checkpd"
  const prefix = `${user_id}/${record_id}/`

  const objects = await listAllObjects({ Bucket: bucket, Prefix: prefix })

  if (objects.length === 0) {
    return Response.json({ error: "No files found" }, { status: 404 })
  }

  const zip = new JSZip()

  for (const obj of objects) {
    if (!obj.Key) continue

    const getCmd = new GetObjectCommand({
      Bucket: bucket,
      Key: obj.Key,
    })

    const fileRes = await s3.send(getCmd)
    const body = await streamToBuffer(fileRes.Body as any)

    const relativePath = obj.Key.replace(prefix, "")

    if (relativePath) {
      // Format JSON before putting into ZIP
      if (relativePath.endsWith(".json")) {
        try {
          const pretty = JSON.stringify(JSON.parse(body.toString("utf-8")), null, 2)
          zip.file(relativePath, pretty)
        } catch {
          zip.file(relativePath, body)
        }
      } else {
        zip.file(relativePath, body)
      }

    }
  }

  const zipBytes = await zip.generateAsync({ type: "uint8array" })
  const buffer = Buffer.from(zipBytes)

  return new Response(buffer, {
    headers: {
      "Content-Type": "application/zip",
      "Content-Length": buffer.byteLength.toString(),
      "Content-Disposition": `attachment; filename="${user_id}_${record_id}.zip"`,
    },
  })
}

async function listAllObjects(baseInput: Pick<ListObjectsV2CommandInput, "Bucket" | "Prefix">) {
  const contents: NonNullable<ListObjectsV2CommandOutput["Contents"]>[number][] = []
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

function isSafeSegment(value: string) {
  return /^[a-zA-Z0-9_-]+$/.test(value)
}

function streamToBuffer(stream: any): Promise<Buffer> {
  if (!stream) {
    return Promise.resolve(Buffer.alloc(0))
  }

  if (typeof stream.arrayBuffer === "function") {
    return stream.arrayBuffer().then((arrayBuffer: ArrayBuffer) => Buffer.from(arrayBuffer))
  }

  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []
    stream.on("data", (chunk: Buffer) => chunks.push(chunk))
    stream.on("error", reject)
    stream.on("end", () => resolve(Buffer.concat(chunks)))
  })
}
