'use client'

import { useState } from 'react'
import SidebarLayout from '@/app/component/layout/SidebarLayout'
import CsvUserIdImport from '@/app/component/export/CsvUserIdImport'
import ExportFilters from '@/app/component/export/ExportFilters'
import ExportProgressOverlay from '@/app/component/export/ExportProgressOverlay'
import ExportTable from '@/app/component/export/ExportTable'
import ExportToolbar from '@/app/component/export/ExportToolbar'
import ManualExportBox from '@/app/component/export/ManualExportBox'
import { useExportRecords } from '@/app/component/export/useExportRecords'
import { useSession } from '@/app/providers/SessionProvider'
import { logActivity } from '@/lib/activityLog'
import { exportRecordsToZip, getRecordKey, type ExportUser } from '@/lib/exportZip'
import { supabase } from '@/lib/supabase'

export default function ExportPage() {
  const { session, loading: sessionLoading } = useSession()
  const records = useExportRecords(!sessionLoading && Boolean(session))
  const [exportLoading, setExportLoading] = useState(false)
  const [exportCount, setExportCount] = useState(0)
  const [success, setSuccess] = useState('')
  const [manualUserId, setManualUserId] = useState('')
  const [manualRecordId, setManualRecordId] = useState('')
  const [manualExportLoading, setManualExportLoading] = useState(false)

  const runZipExport = async (exportRecords: ExportUser[], clearSelectionAfterExport = false) => {
    setExportCount(exportRecords.length)
    setExportLoading(true)
    records.setError('')
    setSuccess('')

    const result = await exportRecordsToZip(exportRecords)

    if (result.ok) {
      if (result.warning) records.setError(result.warning)
      setSuccess(`✅ Successfully exported ${result.successfulCount} patient records in ${result.folderName}.zip`)
      logActivity({
        action: 'EXPORT',
        page: 'export',
        description: `Raw data ZIP export: ${result.successfulCount} record(s)`,
        userEmail: session?.user?.email ?? 'admin@checkpd.local',
      })
      if (clearSelectionAfterExport) {
        records.setSelectedUsers(new Set())
        records.setSelectAll(false)
      }
    } else {
      records.setError(result.error)
    }

    setExportLoading(false)
  }

  const handleExport = async () => {
    if (records.selectedUsers.size === 0) {
      records.setError('Please select at least one record to export')
      return
    }

    const sourceRecords = records.selectAll && records.allSelectedRecords.length > 0
      ? records.allSelectedRecords
      : records.users
    const exportRecords = sourceRecords.filter((record) =>
      records.selectedUsers.has(getRecordKey(record))
    )

    await runZipExport(exportRecords, true)
  }

  // Resolve every record_id for the given user_ids (a user may have several), chunking
  // the .in() filter to stay under the PostgREST URL-length limit, then export them all.
  const handleCsvExport = async (userIds: string[]) => {
    if (userIds.length === 0) {
      records.setError('ไม่พบ user_id ในไฟล์ CSV')
      return
    }

    setExportLoading(true)
    records.setError('')
    setSuccess('')

    const CHUNK = 200
    const resolved: ExportUser[] = []
    try {
      for (let i = 0; i < userIds.length; i += CHUNK) {
        const chunk = userIds.slice(i, i + CHUNK)
        const { data, error } = await supabase
          .from('user_record_summary_with_users')
          .select('*')
          .in('id', chunk)
        if (error) throw error
        if (data) resolved.push(...(data as ExportUser[]))
      }
    } catch (err) {
      console.error('CSV resolve failed:', err)
      setExportLoading(false)
      records.setError('ดึงข้อมูลตาม CSV ไม่สำเร็จ')
      return
    }

    if (resolved.length === 0) {
      setExportLoading(false)
      records.setError('ไม่พบ record สำหรับ user_id ที่ระบุใน CSV')
      return
    }

    await runZipExport(resolved)
  }

  const handleManualExport = async () => {
    const userId = manualUserId.trim()
    const recordId = manualRecordId.trim()

    if (!userId || !recordId) {
      records.setError('Please enter both user_id and record_id')
      return
    }

    setManualExportLoading(true)

    try {
      const { data, error } = await supabase
        .from('user_record_summary_with_users')
        .select('*')
        .eq('id', userId)
        .eq('record_id', recordId)
        .maybeSingle()

      if (error) {
        console.warn('Manual export metadata lookup failed:', error)
      }

      const manualRecord: ExportUser = data || {
        id: userId,
        record_id: recordId,
        thaiid: '',
        firstname: 'manual',
        lastname: 'record',
        age: 0,
        prediction_risk: null,
        recorder: 'manual',
      }

      await runZipExport([manualRecord])
    } finally {
      setManualExportLoading(false)
    }
  }

  return (
    <SidebarLayout activePath="/pages/export" mainClassName="bg-gray-50">
      <div className="mx-auto max-w-9xl p-6">
        <div className="rounded-lg bg-white p-6 shadow-lg">
          <ExportToolbar error={records.error} success={success} />

          <ManualExportBox
            manualUserId={manualUserId}
            setManualUserId={setManualUserId}
            manualRecordId={manualRecordId}
            setManualRecordId={setManualRecordId}
            exportLoading={exportLoading}
            manualExportLoading={manualExportLoading}
            onManualExport={handleManualExport}
          />

          <CsvUserIdImport exportLoading={exportLoading} onExport={handleCsvExport} />

          <ExportFilters
            searchId={records.searchId}
            setSearchId={records.setSearchId}
            startDate={records.startDate}
            setStartDate={records.setStartDate}
            endDate={records.endDate}
            setEndDate={records.setEndDate}
            searchCondition={records.searchCondition}
            setSearchCondition={records.setSearchCondition}
            setCurrentPage={records.setCurrentPage}
            visibleStart={records.visibleStart}
            visibleEnd={records.visibleEnd}
            totalCount={records.totalCount}
            onRefresh={records.fetchUsers}
            selectedCount={records.selectedUsers.size}
            exportLoading={exportLoading}
            onExport={handleExport}
            onClearSelection={() => {
              records.setSelectedUsers(new Set())
              records.setSelectAll(false)
            }}
          />

          <ExportTable
            users={records.users}
            loading={records.loading}
            currentPage={records.currentPage}
            totalPages={records.totalPages}
            totalCount={records.totalCount}
            selectedUsers={records.selectedUsers}
            selectAll={records.selectAll}
            setSelectAll={records.setSelectAll}
            setCurrentPage={records.setCurrentPage}
            onUserSelect={records.handleUserSelect}
          />
        </div>
      </div>

      <ExportProgressOverlay open={exportLoading || manualExportLoading} count={exportCount} />
    </SidebarLayout>
  )
}
