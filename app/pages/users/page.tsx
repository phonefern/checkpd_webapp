'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import UserTable, { type SortColumn, type SortDirection } from '@/app/component/users/UserTable'
import Pagination from '@/app/component/users/Pagination'
import SearchFilters from '@/app/component/users/SearchFilters'
import { User } from '@/app/types/user'
import SidebarLayout from '@/app/component/layout/SidebarLayout'
import { useSession } from '@/app/providers/SessionProvider'
import { logActivity } from '@/lib/activityLog'
import UserEditModal from '@/app/component/users/UserEditModal'
import UserDetailModal from '@/app/component/users/UserDetailModal'
import TqdmSpinner from '@/app/component/dashboard/TqdmSpinner'
import { parseOther } from '@/lib/otherDiagnosis'

export default function UsersClientPage() {
  const { session } = useSession()
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
  const [searchArea, setSearchArea] = useState('')
  const [areaOptions, setAreaOptions] = useState<string[]>([])
  const [searchDistrict, setSearchDistrict] = useState('')
  const [searchSource, setSearchSource] = useState('')
  const [searchProvince, setSearchProvince] = useState('')
  const [searchTestResult, setSearchTestResult] = useState('')
  const [viewingUser, setViewingUser] = useState<User | null>(null)
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [screeningThaiIds, setScreeningThaiIds] = useState<string[]>([])
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set())
  const [sortColumn, setSortColumn] = useState<SortColumn>('timestamp')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')
  const [isExporting, setIsExporting] = useState(false)
  const [syncingUserId, setSyncingUserId] = useState<string | null>(null)
  const [syncMessage, setSyncMessage] = useState<string | null>(null)
  const [exportScope, setExportScope] = useState<'demo' | 'demo_test' | 'demo_test_screening' | 'screening_basic' | 'full' | 'full_detail'>('full')
  const itemsPerPage = 50

  const buildFilterPayload = () => ({
    searchId,
    searchCondition,
    searchRisk,
    searchOther,
    searchArea,
    searchDistrict,
    searchSource,
    searchProvince,
    searchTestResult,
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

  const handleSort = (column: SortColumn) => {
    if (sortColumn === column) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortColumn(column)
      setSortDirection('desc')
    }
    setCurrentPage(1)
  }

  const handleResetFilters = () => {
    setSearchId('')
    setSearchCondition('')
    setSearchRisk('')
    setSearchOther('')
    setSearchArea('')
    setSearchDistrict('')
    setSearchSource('')
    setSearchProvince('')
    setSearchTestResult('')
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

  const handleSyncUser = async (user: User) => {
    const token = session?.access_token
    if (!token) {
      setSyncMessage('Sign in again to sync this person.')
      return
    }
    setSyncingUserId(user.id)
    setSyncMessage(null)
    try {
      const res = await fetch('/api/users/demographic-migration/migrate-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ userId: user.id }),
      })
      const data = await res.json()
      if (!res.ok || data?.status !== 'ok') {
        throw new Error(data?.error || data?.message || 'Sync failed')
      }
      const name = `${user.firstname ?? ''} ${user.lastname ?? ''}`.trim() || user.id
      setSyncMessage(`Synced ${name} (${data.summaries_updated ?? 0} record summaries)`)
      logActivity({ action: 'UPDATE', page: 'users', description: `Manual sync: ${user.id}`, userEmail: session?.user?.email })
      await fetchUsers()
    } catch (error) {
      setSyncMessage(error instanceof Error ? error.message : 'Sync failed')
    } finally {
      setSyncingUserId(null)
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
      .order(sortColumn, { ascending: sortDirection === 'asc', nullsFirst: false })
      .range(from, to)

    // Stable tiebreaker so rows with equal sort values keep a deterministic
    // order across paginated pages.
    if (sortColumn !== 'id') {
      query = query.order('id', { ascending: true })
    }

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
    for (const otherDiagnosis of parseOther(searchOther)) {
      query = query.ilike('other', `%${otherDiagnosis}%`)
    }
    if (searchArea.trim()) query = query.eq('area', searchArea)
    // District has no dedicated column — it's derived from Live Address (see
    // app/pages/users/provinceDistricts.ts), so filter with the same match.
    if (searchDistrict.trim()) query = query.ilike('liveaddress', `%${searchDistrict}%`)
    if (searchSource.trim()) query = query.eq('source', searchSource)
    if (searchProvince.trim()) query = query.eq('province', searchProvince)
    if (searchTestResult === 'complete') {
      query = query.eq('test_result', 'Complete')
    } else if (searchTestResult === 'partial') {
      query = query.in('test_result', ['Incomplete', 'Imcomplete', 'Partial'])
    } else if (searchTestResult === 'unattempt') {
      query = query.or('test_result.is.null,test_result.eq.Unattempt')
    }

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
  }, [currentPage, searchId, startDate, endDate, searchCondition, searchRisk, searchOther, searchArea, searchDistrict, searchSource, searchProvince, searchTestResult, sortColumn, sortDirection])

  useEffect(() => {
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
          searchArea={searchArea}
          setSearchArea={setSearchArea}
          areaOptions={areaOptions}
          searchDistrict={searchDistrict}
          setSearchDistrict={setSearchDistrict}
          searchSource={searchSource}
          setSearchSource={setSearchSource}
          searchProvince={searchProvince}
          setSearchProvince={setSearchProvince}
          searchTestResult={searchTestResult}
          setSearchTestResult={setSearchTestResult}
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

        {syncMessage ? (
          <div className="mb-4 rounded-md border border-teal-200 bg-teal-50 px-4 py-3 text-sm text-teal-900">
            {syncMessage}
          </div>
        ) : null}

        {loading ? (
          <div className="flex h-64 items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-t-2 border-teal-500" />
          </div>
        ) : (
          <>
            <UserTable
              users={users}
              currentPage={currentPage}
              itemsPerPage={itemsPerPage}
              onEdit={setEditingUser}
              onViewDetail={setViewingUser}
              onSync={handleSyncUser}
              syncingUserId={syncingUserId}
              selectedKeys={selectedKeys}
              onSelectionChange={setSelectedKeys}
              sortColumn={sortColumn}
              sortDirection={sortDirection}
              onSort={handleSort}
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

        {isExporting ? (
          <div className="fixed inset-0 z-50 flex items-start justify-center bg-slate-950/40 px-4 pt-16 backdrop-blur-sm">
            <TqdmSpinner
              label="กำลังเตรียมไฟล์ Export"
              detail={`กำลังรวมข้อมูล ${exportScope.replace(/_/g, " ")} และบีบอัดเป็น ZIP`}
            />
          </div>
        ) : null}
      </div>
    </SidebarLayout>
  )
}
