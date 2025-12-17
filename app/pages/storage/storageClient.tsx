'use client'

import { useEffect, useState } from 'react'
import SearchFilters from '@/app/component/storage/SearchFilters'
import { buildPatientQuery } from '@/app/component/storage/buildPatientQuery'
import { supabase } from '@/lib/supabase'

export default function StorageClient() {
  const [search, setSearch] = useState('')
  const [condition, setCondition] = useState('all')
  const [area, setArea] = useState('all')
  const [testStatus, setTestStatus] = useState('all')
  const [risk, setRisk] = useState('all')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [lastMigrated, setLastMigrated] = useState('')

  // 🔹 โหลดข้อมูลทุกครั้งที่ filter เปลี่ยน
  useEffect(() => {
    const fetchData = async () => {
      const { data, error } = await buildPatientQuery(supabase, {
        search,
        condition,
        area,
        testStatus,
        risk:
          risk === 'all'
            ? undefined
            : risk === 'true'
            ? true
            : risk === 'false'
            ? false
            : null,
        startDate: startDate || null,
        endDate: endDate || null,
        lastMigrated: lastMigrated || null
      })

      if (error) {
        console.error('Supabase error:', JSON.stringify(error, null, 2))
      } else {
        console.log('result:', data)
      }
    }

    fetchData()
  }, [
    search,
    condition,
    area,
    testStatus,
    risk,
    startDate,
    endDate,
    lastMigrated
  ])

  return (
    <SearchFilters
      search={search}
      setSearch={setSearch}
      condition={condition}
      setCondition={setCondition}
      area={area}
      setArea={setArea}
      testStatus={testStatus}
      setTestStatus={setTestStatus}
      risk={risk}
      setRisk={setRisk}
      startDate={startDate}
      setStartDate={setStartDate}
      endDate={endDate}
      setEndDate={setEndDate}
      lastMigrated={lastMigrated}
      setLastMigrated={setLastMigrated}
    />
  )
}
