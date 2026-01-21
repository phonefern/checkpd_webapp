// app/api/storage/list-users/route.ts
import { NextRequest } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'
import { buildPatientQuery } from '@/app/component/storage/buildPatientQuery'
import { TestType } from '@/app/component/storage/types'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)

    /* ================= Pagination ================= */
    const page = Number(searchParams.get('page') || 1)
    const pageSize = Number(searchParams.get('pageSize') || 20)

    /* ================= Filters ================= */
    const search = searchParams.get('search') || undefined
    const condition = searchParams.get('condition') || 'all'
    const area = searchParams.get('area') || 'all'
    const testStatus = searchParams.get('testStatus') || 'all'

    const riskParam = searchParams.get('risk')
    const risk =
      riskParam === 'true'
        ? true
        : riskParam === 'false'
          ? false
          : riskParam === 'null'
            ? null
            : undefined

    const startDate = searchParams.get('startDate') || null
    const endDate = searchParams.get('endDate') || null
    const lastMigrated = searchParams.get('lastMigrated') || null

    /* ================= Build query ================= */
    const query = buildPatientQuery(supabaseServer, {
      search,
      condition,
      area,
      testStatus,
      risk,
      startDate,
      endDate,
      lastMigrated,
      page,
      pageSize,
    })

    /* ================= Execute ================= */
    const { data, error, count } = await query

    if (error) {
      console.error('LIST USERS ERROR:', error)
      return Response.json(
        { error: error.message },
        { status: 500 }
      )
    }

    return Response.json({
      data: data ?? [],
      count: count ?? 0,
    })
  } catch (err: any) {
    console.error('LIST USERS FATAL ERROR:', err)
    return Response.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}