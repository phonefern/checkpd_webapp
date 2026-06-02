'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import UserTable from '@/app/component/users/UserTable'
import Pagination from '@/app/component/users/Pagination'
import SearchFilters from '@/app/component/users/SearchFilters'
import { User } from '@/app/types/user'
import SidebarLayout from '@/app/component/layout/SidebarLayout'
import { logActivity } from '@/lib/activityLog'
import UserEditModal from '@/app/component/users/UserEditModal'
import UserDetailModal from '@/app/component/users/UserDetailModal'

export default function UsersClientPage() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [searchId, setSearchId] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [searchCondition, setSearchCondition] = useState('')
  const [searchRisk, setSearchRisk] = useState('')
  const [searchOther, setSearchOther] = useState('')
  const [otherOptions, setOtherOptions] = useState<string[]>([])
  const [searchArea, setSearchArea] = useState('')
  const [areaOptions, setAreaOptions] = useState<string[]>([])
  const [searchSource, setSearchSource] = useState('')
  const [searchProvince, setSearchProvince] = useState('')
  const [viewingUser, setViewingUser] = useState<User | null>(null)
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [screeningThaiIds, setScreeningThaiIds] = useState<string[]>([])
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set())
  const [isExporting, setIsExporting] = useState(false)
  const [exportScope, setExportScope] = useState<'demo' | 'demo_test' | 'demo_test_screening' | 'full'>('full')
  const itemsPerPage = 50

  const buildFilterPayload = () => ({
    searchId,
    searchCondition,
    searchRisk,
    searchOther,
    searchArea,
    searchSource,
    searchProvince,
    startDate,
    endDate,
  })

  const selectedPairs = Array.from(selectedKeys).map((key) => {
    const [userId, recordIdRaw] = key.split('||')
    return {
      userId,
      recordId: recordIdRaw ? recordIdRaw : null,
    }
  })

  const handleResetFilters = () => {
    setSearchId('')
    setSearchCondition('')
    setSearchRisk('')
    setSearchOther('')
    setSearchArea('')
    setSearchSource('')
    setSearchProvince('')
    setStartDate('')
    setEndDate('')
    setCurrentPage(1)
  }

  const handleExport = async (mode: 'selected' | 'filtered') => {
    try {
      setIsExporting(true)
      const payload =
        mode === 'selected'
          ? { mode, pairs: selectedPairs, scope: exportScope }
          : {
              mode,
              scope: exportScope,
              filters: buildFilterPayload(),
            }

      const res = await fetch('/api/export/users-csv', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        let message = 'Export failed'
        try {
          const data = await res.json()
          if (data?.error) message = data.error
        } catch {
          message = `Export failed (${res.status})`
        }
        alert(message)
        return
      }

      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `checkpd_${exportScope}_${new Date().toISOString().slice(0, 10).replace(/-/g, '')}.zip`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Error exporting users:', error)
      alert('Failed to export users. Please try again.')
    } finally {
      setIsExporting(false)
    }
  }

  const fetchUsers = async () => {
    setLoading(true)
    const from = (currentPage - 1) * itemsPerPage
    const to = from + itemsPerPage - 1
    const likePattern = `%${searchId.trim()}%`
    let query = supabase
      .from('user_record_summary_with_users')
      .select('*', { count: 'exact' })
      .order('timestamp', { ascending: false })
      .range(from, to)

    if (searchId.trim()) {
      query = query.or(
        `id.ilike.${likePattern},record_id.ilike.${likePattern},firstname.ilike.${likePattern},lastname.ilike.${likePattern},recorder.ilike.${likePattern},thaiid.ilike.${likePattern}`
      )
    }

    if (startDate) query = query.gte('timestamp', startDate)
    if (endDate) {
      const nextDay = new Date(endDate)
      nextDay.setDate(nextDay.getDate() + 1)
      query = query.lt('timestamp', nextDay.toISOString())
    }

    if (searchCondition.trim()) query = query.eq('condition', searchCondition)
    if (searchRisk.trim()) {
      if (searchRisk === 'null') query = query.is('prediction_risk', null)
      else query = query.eq('prediction_risk', searchRisk === 'true')
    }
    if (searchOther.trim()) query = query.eq('other', searchOther)
    if (searchArea.trim()) query = query.eq('area', searchArea)
    if (searchSource.trim()) query = query.eq('source', searchSource)
    if (searchProvince.trim()) query = query.eq('province', searchProvince)

    const { data, error, count } = await query

    if (error) {
      console.error('Error loading users:', error)
    } else {
      setUsers((data ?? []) as User[])
      setTotalCount(count || 0)

      const thaiids = (data ?? []).map((u) => u.thaiid).filter((id): id is string => Boolean(id))
      if (thaiids.length > 0) {
        const { data: screeningData, error: screeningError } = await supabase
          .from('pd_screenings')
          .select('thaiid')
          .in('thaiid', thaiids)
        if (!screeningError) {
          setScreeningThaiIds(Array.from(new Set(screeningData?.map((row) => row.thaiid).filter(Boolean))))
        }
      } else {
        setScreeningThaiIds([])
      }
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchUsers()
  }, [currentPage, searchId, startDate, endDate, searchCondition, searchRisk, searchOther, searchArea, searchSource, searchProvince])

  useEffect(() => {
    const loadOtherOptions = async () => {
      const { data, error } = await supabase
        .from('user_record_summary_with_users')
        .select('other')
        .order('other', { ascending: true })
      if (error) return
      setOtherOptions(
        Array.from(new Set((data ?? []).map(({ other }) => (typeof other === 'string' ? other.trim() : '')).filter((v) => v.length > 0)))
      )
    }

    const loadAreaOptions = async () => {
      const areaSet = new Set<string>()
      const pageSize = 1000
      let from = 0
      while (true) {
        const { data, error } = await supabase
          .from('user_record_summary_with_users')
          .select('area')
          .not('area', 'is', null)
          .order('area', { ascending: true })
          .range(from, from + pageSize - 1)
        if (error || !data || data.length === 0) break
        for (const row of data) {
          if (typeof row.area === 'string' && row.area.trim()) areaSet.add(row.area.trim())
        }
        if (data.length < pageSize) break
        from += pageSize
      }
      setAreaOptions(Array.from(areaSet).sort((a, b) => a.localeCompare(b)))
    }

    loadOtherOptions()
    loadAreaOptions()
  }, [])

  const totalPages = Math.ceil(totalCount / itemsPerPage)

  return (
    <SidebarLayout activePath="/pages/users" mainClassName="bg-gray-50">
      <div className="mx-auto max-w-9xl p-6">
        <h1 className="mb-4 text-2xl font-semibold text-gray-900">Patient Data Management System</h1>

        <SearchFilters
          searchId={searchId}
          setSearchId={setSearchId}
          setCurrentPage={setCurrentPage}
          searchCondition={searchCondition}
          setSearchCondition={setSearchCondition}
          searchRisk={searchRisk}
          setSearchRisk={setSearchRisk}
          searchOther={searchOther}
          setSearchOther={setSearchOther}
          otherOptions={otherOptions}
          searchArea={searchArea}
          setSearchArea={setSearchArea}
          areaOptions={areaOptions}
          searchSource={searchSource}
          setSearchSource={setSearchSource}
          searchProvince={searchProvince}
          setSearchProvince={setSearchProvince}
          startDate={startDate}
          setStartDate={setStartDate}
          endDate={endDate}
          setEndDate={setEndDate}
          fetchUsers={fetchUsers}
          totalCount={totalCount}
          currentPage={currentPage}
          itemsPerPage={itemsPerPage}
          selectedCount={selectedKeys.size}
          isExporting={isExporting}
          exportScope={exportScope}
          setExportScope={setExportScope}
          onExportSelected={() => handleExport('selected')}
          onExportAll={() => handleExport('filtered')}
          onClearSelection={() => setSelectedKeys(new Set())}
          onResetFilters={handleResetFilters}
        />

        {loading ? (
          <div className="flex h-64 items-center justify-center">
            <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-t-2 border-blue-500" />
          </div>
        ) : (
          <>
            <UserTable
              users={users}
              currentPage={currentPage}
              itemsPerPage={itemsPerPage}
              onEdit={setEditingUser}
              onViewDetail={setViewingUser}
              selectedKeys={selectedKeys}
              onSelectionChange={setSelectedKeys}
            />
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalCount={totalCount}
              itemsPerPage={itemsPerPage}
              setCurrentPage={setCurrentPage}
            />
          </>
        )}

        <UserEditModal
          open={editingUser !== null}
          user={editingUser}
          onClose={() => setEditingUser(null)}
          onSaved={(u) => {
            logActivity({ action: 'UPDATE', page: 'users', description: `อัปเดตข้อมูลผู้ป่วย ID: ${u.id}` })
            fetchUsers()
          }}
        />

        <UserDetailModal
          open={viewingUser !== null}
          user={viewingUser}
          onClose={() => setViewingUser(null)}
          hasScreeningThaiId={(thaiid) => screeningThaiIds.includes(thaiid)}
        />
      </div>
    </SidebarLayout>
  )
}
