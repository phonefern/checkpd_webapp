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

function must(name: string): string {
  const v = process.env[name]
  if (!v || v.trim() === "") {
    throw new Error(`Missing or empty env: ${name}`)
  }
  return v
}

export const s3 = new S3Client({
  region: "ap-southeast-1",
  endpoint: must("SUPABASE_S3_ENDPOINT"),
  forcePathStyle: true,
  credentials: {
    accessKeyId: must("SUPABASE_S3_KEY_ID"),
    secretAccessKey: must("SUPABASE_S3_KEY_SECRET"),
  },
})