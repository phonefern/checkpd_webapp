// /app/api/storage/download-file/route.ts

import { s3 } from '@/lib/s3'
import { GetObjectCommand } from '@aws-sdk/client-s3'

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url)
    const userId = searchParams.get('user_id')
    const recordId = searchParams.get('record_id')
    const filename = searchParams.get('file')

    if (!userId || !recordId || !filename) {
        return Response.json({ error: 'missing params' }, { status: 400 })
    }

    const key = `${userId}/${recordId}/${filename}`

    const res = await s3.send(
        new GetObjectCommand({
            Bucket: 'checkpd',
            Key: key,
        })
    )

    const buffer = Buffer.from(await res.Body!.transformToByteArray())

    return new Response(buffer, {
        headers: {
            'Content-Type': 'application/octet-stream',
            'Content-Disposition': `attachment; filename="${userId}_${filename}"`,
        },
    })
}
