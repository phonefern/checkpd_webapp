import { NextResponse } from 'next/server'
import { Pool } from 'pg'

const pool = new Pool({
  host: process.env.PGHOST,
  port: parseInt(process.env.PGPORT || '5432', 10),
  database: process.env.PGDATABASE,
  user: process.env.PGUSER,
  password: process.env.PGPASSWORD,
})

export async function POST(req: Request) {
  try {
    const { id, condition } = await req.json()

    const result = await pool.query(
      `UPDATE user_record_summary SET condition = $1 WHERE user_id = $2`,
      [condition, id]
    )

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('❌ Update failed:', error)
    return NextResponse.json({ error: 'Update failed' }, { status: 500 })
  }
}
