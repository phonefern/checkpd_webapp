// app/api/users/route.ts
import { NextResponse } from 'next/server'
import { Pool } from 'pg'

const pool = new Pool({
  host: process.env.PGHOST,
  port: parseInt(process.env.PGPORT || '5432', 10),
  database: process.env.PGDATABASE,
  user: process.env.PGUSER,
  password: process.env.PGPASSWORD,
})



export async function GET() {
  console.log("👉 API /api/users called")

  try {
    const result = await pool.query(`
      SELECT 
        u.id,
        rs.recorder,
        u.source,
        u.firstname,
        u.lastname,
        u.gender,
        u.province,
        u.region,
        u.age,
        u.timestamp,
        rs.last_update,
        rs.prediction_risk,
        rs.condition
      FROM users u
      LEFT JOIN user_record_summary rs ON u.id = rs.user_id
    `)

    return NextResponse.json(result.rows)
  } catch (error) {
    console.error("❌ DB error:", error)
    return NextResponse.json({ error: 'Database error' }, { status: 500 })
  }
}
