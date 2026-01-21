// app/api/storage/list-records/route.ts
import { supabaseServer } from "@/lib/supabase-server"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const user_id = searchParams.get("user_id")

  if (!user_id) {
    return Response.json({ error: "Missing user_id" }, { status: 400 })
  }

  const { data, error } = await supabaseServer
    .from("user_record_with_users_and_storage")
    .select(`
      record_id,
      storage_base_path,
      last_migrate,
      condition,
      prediction_risk,
      test_result
    `)
    .eq("id", user_id)
    .order("last_migrate", { ascending: false })

  if (error) {
    return Response.json({ error: error.message }, { status: 500 })
  }

  return Response.json(data)
}
