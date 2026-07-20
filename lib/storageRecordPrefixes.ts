import { ListObjectsV2Command } from '@aws-sdk/client-s3'
import { s3 } from '@/lib/s3'

const CACHE_TTL_MS = 5 * 60 * 1000

let cachedPrefixes: { expiresAt: number; values: Set<string> } | null = null
let loadingPrefixes: Promise<Set<string>> | null = null

export const storageRecordKey = (userId: string, recordId: string) =>
  `${userId}/${recordId}`

async function loadStorageRecordPrefixes(): Promise<Set<string>> {
  const bucket = process.env.STORAGE_BUCKET ?? 'checkpd'
  const prefixes = new Set<string>()
  let continuationToken: string | undefined

  do {
    const response = await s3.send(
      new ListObjectsV2Command({
        Bucket: bucket,
        ContinuationToken: continuationToken,
        MaxKeys: 1000,
      })
    )

    for (const object of response.Contents ?? []) {
      if (!object.Key) continue

      const [userId, recordId, filename] = object.Key.split('/')
      if (!userId || !recordId || !filename) continue

      prefixes.add(storageRecordKey(userId, recordId))
    }

    continuationToken = response.IsTruncated
      ? response.NextContinuationToken
      : undefined
  } while (continuationToken)

  return prefixes
}

export async function getStorageRecordPrefixes(): Promise<Set<string>> {
  if (cachedPrefixes && cachedPrefixes.expiresAt > Date.now()) {
    return cachedPrefixes.values
  }

  if (!loadingPrefixes) {
    loadingPrefixes = loadStorageRecordPrefixes()
      .then(values => {
        cachedPrefixes = {
          expiresAt: Date.now() + CACHE_TTL_MS,
          values,
        }
        return values
      })
      .finally(() => {
        loadingPrefixes = null
      })
  }

  return loadingPrefixes
}
