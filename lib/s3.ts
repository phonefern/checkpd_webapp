// lib/s3.ts
import { S3Client } from "@aws-sdk/client-s3"

export const s3 = new S3Client({
  region: "ap-southeast-1",
  endpoint: process.env.SUPABASE_S3_ENDPOINT, // https://xxxx.supabase.co/storage/v1/s3
  forcePathStyle: true,
  credentials: {
    accessKeyId: process.env.SUPABASE_S3_KEY_ID!,
    secretAccessKey: process.env.SUPABASE_S3_KEY_SECRET!,
  },
})
