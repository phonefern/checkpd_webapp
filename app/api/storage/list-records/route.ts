// app/api/storage/list-records/route.ts
import { supabaseServer } from "@/lib/supabase-server"
import {
  getStorageRecordPrefixes,
  storageRecordKey,
} from "@/lib/storageRecordPrefixes"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const user_id = searchParams.get("user_id")

  if (!user_id) {
    return Response.json({ error: "Missing user_id" }, { status: 400 })
  }

  const { data, error } = await supabaseServer
    .schema("checkpd")
    .from("user_record_storage_list")
    .select(`
      record_id,
      last_migrate,
      condition,
      prediction_risk,
      test_result
    `)
    .eq("id", user_id)
    .not("condition", "is", null)
    .order("last_migrate", { ascending: false })

  if (error) {
    return Response.json({ error: error.message }, { status: 500 })
  }

  const storagePrefixes = await getStorageRecordPrefixes()
  const storedRecords = (data ?? []).filter(record =>
    record.record_id &&
    storagePrefixes.has(storageRecordKey(user_id, record.record_id))
  )

  return Response.json(storedRecords)
}
