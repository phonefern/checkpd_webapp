// app/api/storage/download-zip/route.ts

import JSZip from 'jszip'
import { s3 } from '@/lib/s3'
import { TestType } from '@/app/component/storage/types'
import {
  GetObjectCommand,
  ListObjectsV2Command
} from '@aws-sdk/client-s3'

/* ================= Helpers ================= */

function extractTestType(filename: string): TestType | null {
  const TESTS: TestType[] = [
    'voiceahh',
    'voiceypl',
    'tremorresting',
    'tremorpostural',
    'dualtap',
    'dualtapright',
    'pinchtosize',
    'pinchtosizeright',
    'gaitwalk',
    'balance',
    'questionnaire'
  ]

  return TESTS.find(t =>
    new RegExp(`(^|_)${t}(\\.|_|$)`).test(filename)
  ) ?? null
}

/* ================= Handler ================= */

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)

  const user_id = searchParams.get('user_id')
  const record_id = searchParams.get('record_id')

  if (!user_id || !record_id) {
    return Response.json({ error: 'missing params' }, { status: 400 })
  }

  const testsParam = searchParams.get('tests')
  const selectedTests: TestType[] = testsParam
    ? testsParam.split(',') as TestType[]
    : []

  const prefix = `${user_id}/${record_id}/`

  const list = await s3.send(
    new ListObjectsV2Command({
      Bucket: 'checkpd',
      Prefix: prefix
    })
  )

  const zip = new JSZip()

  for (const obj of list.Contents ?? []) {
    if (!obj.Key) continue

    const file = obj.Key.replace(prefix, '')

    const testType = extractTestType(file)

    /* ✅ STRICT FILTER */
    if (selectedTests.length > 0) {
      if (!testType) continue
      if (!selectedTests.includes(testType)) continue
    }

    const res = await s3.send(
      new GetObjectCommand({
        Bucket: 'checkpd',
        Key: obj.Key
      })
    )

    const buf = Buffer.from(await res.Body!.transformToByteArray())
    zip.file(file, buf)
  }

  const zipBytes = await zip.generateAsync({ type: 'uint8array' })
  const buffer = Buffer.from(zipBytes)

  return new Response(buffer, {
    headers: {
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="${user_id}_${record_id}.zip"`
    }
  })
}
