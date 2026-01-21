// lib/s3.ts
import { S3Client } from "@aws-sdk/client-s3"

// Validate required environment variables
if (!process.env.SUPABASE_S3_ENDPOINT) {
  console.error("⚠️ SUPABASE_S3_ENDPOINT is not set")
}
if (!process.env.SUPABASE_S3_KEY_ID) {
  console.error("⚠️ SUPABASE_S3_KEY_ID is not set")
}
if (!process.env.SUPABASE_S3_KEY_SECRET) {
  console.error("⚠️ SUPABASE_S3_KEY_SECRET is not set")
}

export const s3 = new S3Client({
  region: "ap-southeast-1",
  endpoint: process.env.SUPABASE_S3_ENDPOINT, // https://xxxx.supabase.co/storage/v1/s3
  forcePathStyle: true, // Required for Supabase Storage S3 API
  credentials: {
    accessKeyId: process.env.SUPABASE_S3_KEY_ID!,
    secretAccessKey: process.env.SUPABASE_S3_KEY_SECRET!,
  },
})
