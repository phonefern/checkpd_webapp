// app/api/storage/download-file/route.ts
// Serves individual files from S3 storage

import { s3 } from "@/lib/s3"
import { GetObjectCommand } from "@aws-sdk/client-s3"

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const key = searchParams.get("key")

  if (!key) {
    return Response.json({ error: "missing key parameter" }, { status: 400 })
  }

  const bucket = process.env.STORAGE_BUCKET ?? "checkpd"

  try {
    const res = await s3.send(
      new GetObjectCommand({
        Bucket: bucket,
        Key: key,
      })
    )

    const body = res.Body as any

    let arrayBuffer: ArrayBuffer
    if (typeof body.arrayBuffer === "function") {
      arrayBuffer = await body.arrayBuffer()
    } else {
      // Fallback for stream-based body
      const chunks: Uint8Array[] = []
      for await (const chunk of body) {
        chunks.push(chunk)
      }
      const totalLength = chunks.reduce((acc, chunk) => acc + chunk.length, 0)
      arrayBuffer = new ArrayBuffer(totalLength)
      const view = new Uint8Array(arrayBuffer)
      let offset = 0
      for (const chunk of chunks) {
        view.set(chunk, offset)
        offset += chunk.length
      }
    }

    // Extract filename from key
    const filename = key.split("/").pop() ?? "file"

    // Determine content type based on file extension
    let contentType = "application/octet-stream"
    if (filename.endsWith(".wav")) {
      contentType = "audio/wav"
    } else if (filename.endsWith(".json")) {
      contentType = "application/json"
    } else if (filename.endsWith(".csv")) {
      contentType = "text/csv"
    }

    return new Response(arrayBuffer, {
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "public, max-age=3600",
      },
    })
  } catch (error: any) {
    console.error("Error downloading file:", error)
    return Response.json(
      { error: error.message || "Failed to download file" },
      { status: 500 }
    )
  }
}
