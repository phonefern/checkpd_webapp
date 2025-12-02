// pages/api/storage/list-users/route.ts
import { supabaseServer } from "@/lib/supabase-server"

export async function GET() {
  const { data, error } = await supabaseServer
    .from("user_record_summary_with_users")
    .select("id, thaiid, firstname, lastname, condition, last_migrate, timestamp, prediction_risk")
    .not("last_migrate", "is", null)
    .order("last_migrate", { ascending: false })

  if (error) {
    return Response.json({ error }, { status: 500 })
  }

  // map ให้ frontend ใช้ user_id เพื่อให้ตรงกับ API อื่น ๆ
  const mapped = (data ?? []).map(row => ({
    user_id: row.id,
    thaiid: row.thaiid,
    firstname: row.firstname,
    lastname: row.lastname,
    condition: row.condition,
    last_migrate: row.last_migrate,
    timestamp: row.timestamp,
    prediction_risk: row.prediction_risk,
  }))

  return Response.json(mapped)
}
