// app/api/storage/list-files/route.ts

import { s3 } from '@/lib/s3'
import { ListObjectsV2Command } from '@aws-sdk/client-s3'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const userId = searchParams.get('user_id')
  const recordId = searchParams.get('record_id')

  if (!userId || !recordId) {
    return Response.json({ error: 'missing params' }, { status: 400 })
  }

  const prefix = `${userId}/${recordId}/`

  const res = await s3.send(
    new ListObjectsV2Command({
      Bucket: 'checkpd',
      Prefix: prefix,
    })
  )

  const files =
    res.Contents?.map(obj => ({
      name: obj.Key!.replace(prefix, ''),
      size: obj.Size ?? 0,
    })) ?? []

  return Response.json(files)
}
