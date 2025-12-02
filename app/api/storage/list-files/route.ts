// app/api/storage/list-files/route.ts
import { s3 } from "@/lib/s3"
import { ListObjectsV2Command } from "@aws-sdk/client-s3"

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  let prefix = searchParams.get("base_path") || ""

  if (!prefix.endsWith("/")) prefix += "/"

  const cmd = new ListObjectsV2Command({
    Bucket: "checkpd",
    Prefix: prefix,
  })

  try {
    const res = await s3.send(cmd)
    return Response.json(res.Contents || [])
  } catch (err: any) {
    console.error(err)
    return Response.json({ error: err.message }, { status: 500 })
  }
}

