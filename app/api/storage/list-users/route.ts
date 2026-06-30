// app/api/storage/list-users/route.ts
import { NextRequest } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'
import { buildPatientQuery } from '@/app/component/storage/buildPatientQuery'
import {
  getStorageRecordPrefixes,
  storageRecordKey,
} from '@/lib/storageRecordPrefixes'

const DATABASE_PAGE_SIZE = 1000

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

    /* ================= Fetch all filtered DB rows ================= */
    const databaseRows: any[] = []
    let databasePage = 1

    while (true) {
      const { data, error } = await buildPatientQuery(supabaseServer, {
        search,
        condition,
        area,
        testStatus,
        risk,
        startDate,
        endDate,
        lastMigrated,
        page: databasePage,
        pageSize: DATABASE_PAGE_SIZE,
      })

      if (error) {
        console.error('LIST USERS ERROR:', error)
        return Response.json(
          { error: error.message },
          { status: 500 }
        )
      }

      databaseRows.push(...(data ?? []))

      if (!data || data.length < DATABASE_PAGE_SIZE) break
      databasePage += 1
    }

    /* ================= Keep only rows backed by S3 objects ================= */
    const storagePrefixes = await getStorageRecordPrefixes()
    const storedRows = databaseRows.filter(row =>
      row.id &&
      row.record_id &&
      storagePrefixes.has(storageRecordKey(row.id, row.record_id))
    )

    const from = (page - 1) * pageSize
    const to = from + pageSize

    return Response.json({
      data: storedRows.slice(from, to),
      count: storedRows.length,
    })
  } catch (err: any) {
    console.error('LIST USERS FATAL ERROR:', err)
    return Response.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
