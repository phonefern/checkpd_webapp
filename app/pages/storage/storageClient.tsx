'use client'

import { useEffect, useMemo, useState } from 'react'
import JSZip from 'jszip'
import SearchFilters from '@/app/component/storage/SearchFilters'
import SummarySection from '@/app/component/storage/SummarySection'
import PatientTable from '@/app/component/storage/PatientTable'
import { TEST_OPTIONS, TestType } from '@/app/component/storage/types'

/* ================= Types ================= */

type SelectedDataset = {
  patientId: string
  recordId: string
  bucketPath: string
}

export default function StorageClient() {
  /* ================= Data ================= */

  const [data, setData] = useState<any[]>([])
  const [totalFilteredCount, setTotalFilteredCount] = useState(0)
  const [totalAllCount, setTotalAllCount] = useState(0)
  const [downloading, setDownloading] = useState(false)
  const [downloadProgress, setDownloadProgress] = useState({ current: 0, total: 0 })

  /* ================= Selection ================= */

  const [selectedDatasets, setSelectedDatasets] = useState<SelectedDataset[]>([])
  const [selectAllPages, setSelectAllPages] = useState(false)

  const selectedCount = selectAllPages
    ? totalFilteredCount
    : selectedDatasets.length

  const handleToggleSelect = (patientId: string, recordId: string) => {
    if (selectAllPages) return

    const bucketPath = `checkpd/${patientId}/${recordId}`

    setSelectedDatasets(prev => {
      const exists = prev.some(d => d.bucketPath === bucketPath)
      return exists
        ? prev.filter(d => d.bucketPath !== bucketPath)
        : [...prev, { patientId, recordId, bucketPath }]
    })
  }

  const onToggleSelectAll = () => {
    setSelectAllPages(prev => !prev)
    setSelectedDatasets([]) // clear manual selection
  }

  /* ================= Sort ================= */

  const [sortBy, setSortBy] = useState<'ID' | 'TEST'>('ID')

  /* ================= Download ================= */

  const handleDownload = async () => {
    if (!selectAllPages && selectedDatasets.length === 0) return
    if (downloading) return

    setDownloading(true)
    setDownloadProgress({ current: 0, total: 0 })

    try {
      // 1. Fetch metadata from server
      const payload = selectAllPages
        ? {
            select_all: true,
            sort_by: sortBy,
            selected_tests: selectedTest,
            condition,
            filters: {
              search,
              area,
              risk,
              testStatus,
              startDate,
              endDate,
              lastMigrated,
            },
          }
        : {
            select_all: false,
            sort_by: sortBy,
            selected_tests: selectedTest,
            condition,
            items: selectedDatasets.map(d => ({
              user_id: d.patientId,
              record_id: d.recordId,
            })),
          }

      const metadataUrl = `/api/storage/download-zip-multi?data=${encodeURIComponent(
        JSON.stringify(payload)
      )}`

      const metadataRes = await fetch(metadataUrl)
      if (!metadataRes.ok) {
        throw new Error(`Failed to fetch metadata: ${metadataRes.statusText}`)
      }

      const metadata = await metadataRes.json()
      
      if (!metadata.success) {
        throw new Error(metadata.error || 'Failed to fetch file metadata')
      }
      
      if (!metadata.files || metadata.files.length === 0) {
        throw new Error(metadata.error || 'No files to download')
      }

      const { files, sort_by: serverSortBy, date } = metadata
      setDownloadProgress({ current: 0, total: files.length })

      // 2. Initialize JSZip
      const zip = new JSZip()

      // 3. Download all files independently with Promise.allSettled
      const downloadPromises = files.map(async (fileInfo: any, index: number) => {
        try {
          const response = await fetch(fileInfo.downloadUrl)
          if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`)
          }

          const blob = await response.blob()
          
          // Create folder structure based on zipPath
          const pathParts = fileInfo.zipPath.split('/')
          let currentFolder = zip
          
          // Create all folders except the last part (filename)
          // JSZip's folder() method returns existing folder or creates new one
          for (let i = 0; i < pathParts.length - 1; i++) {
            const folderName = pathParts[i]
            const folder = currentFolder.folder(folderName)
            if (!folder) {
              throw new Error(`Failed to create folder: ${folderName}`)
            }
            currentFolder = folder
          }

          // Add file to the appropriate folder
          currentFolder.file(pathParts[pathParts.length - 1], blob)

          setDownloadProgress(prev => ({ ...prev, current: prev.current + 1 }))
          return { success: true, filename: fileInfo.filename }
        } catch (error: any) {
          console.error(`Failed to download ${fileInfo.filename}:`, error)
          setDownloadProgress(prev => ({ ...prev, current: prev.current + 1 }))
          return { success: false, filename: fileInfo.filename, error: error.message }
        }
      })

      const results = await Promise.allSettled(downloadPromises)
      
      // Log results
      const successful = results.filter(r => r.status === 'fulfilled' && r.value.success)
      const failed = results.filter(r => r.status === 'rejected' || (r.status === 'fulfilled' && !r.value.success))
      
      console.log(`✅ Successfully downloaded ${successful.length} files`)
      if (failed.length > 0) {
        console.warn(`⚠️ Failed to download ${failed.length} files`)
      }

      // 4. Generate ZIP file
      const zipBlob = await zip.generateAsync({ type: 'blob' })

      // 5. Download ZIP
      const url = URL.createObjectURL(zipBlob)
      const a = document.createElement('a')
      a.href = url
      a.download = `By${serverSortBy}_${date}.zip`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      if (failed.length > 0) {
        alert(`Downloaded ${successful.length} files. ${failed.length} files failed to download. Check console for details.`)
      }
    } catch (error: any) {
      console.error('Download error:', error)
      alert(`Failed to download: ${error.message}`)
    } finally {
      setDownloading(false)
      setDownloadProgress({ current: 0, total: 0 })
    }
  }

  /* ================= Saw (row expand) ================= */

  const [sawKeys, setSawKeys] = useState<string[]>([])

  const onSaw = (key: string) => {
    setSawKeys(prev => (prev.includes(key) ? prev : [...prev, key]))
  }

  /* ================= Filters ================= */

  const [search, setSearch] = useState('')
  const [condition, setCondition] = useState('all')
  const [area, setArea] = useState('all')
  const [testStatus, setTestStatus] = useState('all')
  const [risk, setRisk] = useState('all')
  const [selectedTest, setSelectedTest] = useState<TestType[]>([])
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [lastMigrated, setLastMigrated] = useState('')

  /* ================= Area Options ================= */

  const areaOptions = useMemo(() => {
    const set = new Set<string>()
    data.forEach(row => row.area && set.add(row.area))
    return Array.from(set).sort()
  }, [data])

  /* ================= Active Filters ================= */

  const activeFilters: string[] = []
  if (search) activeFilters.push(`Search: ${search}`)
  if (condition !== 'all') activeFilters.push(`Condition: ${condition}`)
  if (area !== 'all') activeFilters.push(`Area: ${area}`)
  if (testStatus !== 'all') activeFilters.push(`Status: ${testStatus}`)
  if (risk !== 'all') activeFilters.push(`Risk: ${risk}`)
  if (selectedTest.length) activeFilters.push(`Test: ${selectedTest.join(', ')}`)
  if (startDate) activeFilters.push(`From: ${startDate}`)
  if (endDate) activeFilters.push(`To: ${endDate}`)
  if (lastMigrated) activeFilters.push(`Migrated: ${lastMigrated}`)

  const onRemoveFilter = (filter: string) => {
    if (filter.startsWith('Search:')) setSearch('')
    if (filter.startsWith('Condition:')) setCondition('all')
    if (filter.startsWith('Area:')) setArea('all')
    if (filter.startsWith('Status:')) setTestStatus('all')
    if (filter.startsWith('Risk:')) setRisk('all')
    if (filter.startsWith('Test:')) setSelectedTest([])
    if (filter.startsWith('From:')) setStartDate('')
    if (filter.startsWith('To:')) setEndDate('')
    if (filter.startsWith('Migrated:')) setLastMigrated('')
  }

  const onClearAllFilters = () => {
    setSearch('')
    setCondition('all')
    setArea('all')
    setTestStatus('all')
    setRisk('all')
    setSelectedTest([])
    setStartDate('')
    setEndDate('')
    setLastMigrated('')
  }

  /* ================= Test Toggle ================= */

  const onToggleTest = (test: TestType) => {
    setSelectedTest(prev =>
      prev.includes(test) ? prev.filter(t => t !== test) : [...prev, test]
    )
  }

  const onSelectAllTests = () => setSelectedTest([...TEST_OPTIONS])
  const onClearTests = () => setSelectedTest([])

  /* ================= Pagination ================= */

  const PAGE_SIZE_OPTIONS = [10, 20, 30, 40, 50, 100]
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)

  /* ================= Fetch Counts ================= */

  useEffect(() => {
    fetch('/api/storage/list-users?page=1&pageSize=1')
      .then(res => res.json())
      .then(json => setTotalAllCount(json.count ?? 0))
  }, [])

  /* ================= Fetch Data ================= */

  useEffect(() => {
    const params = new URLSearchParams({
      page: String(page),
      pageSize: String(pageSize),
      search,
      condition,
      area,
      risk,
      testStatus,
      tests: selectedTest.join(','),
      startDate,
      endDate,
      lastMigrated,
    })

    fetch(`/api/storage/list-users?${params}`)
      .then(res => res.json())
      .then(json => {
        setData(json.data ?? [])
        setTotalFilteredCount(json.count ?? 0)
      })
  }, [
    page,
    pageSize,
    search,
    condition,
    area,
    risk,
    testStatus,
    selectedTest,
    startDate,
    endDate,
    lastMigrated,
  ])

  /* ================= Render ================= */

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
      <SearchFilters
        search={search}
        setSearch={setSearch}
        condition={condition}
        setCondition={setCondition}
        area={area}
        areaOptions={areaOptions}
        setArea={setArea}
        testStatus={testStatus}
        setTestStatus={setTestStatus}
        risk={risk}
        setRisk={setRisk}
        selectedTest={selectedTest}
        onToggleTest={onToggleTest}
        onSelectAllTests={onSelectAllTests}
        onClearTests={onClearTests}
        startDate={startDate}
        setStartDate={setStartDate}
        endDate={endDate}
        setEndDate={setEndDate}
        lastMigrated={lastMigrated}
        setLastMigrated={setLastMigrated}
      />

      <SummarySection
        selectedCount={selectedCount}
        filteredCount={totalFilteredCount}
        onDownload={handleDownload}
        sortBy={sortBy}
        setSortBy={setSortBy}
        downloading={downloading}
        downloadProgress={downloadProgress}
      />

      <PatientTable
        data={data}
        totalAfterFilter={totalFilteredCount}
        totalAll={totalAllCount}
        activeFilters={activeFilters}
        onRemoveFilter={onRemoveFilter}
        onClearAllFilters={onClearAllFilters}
        selectedDatasets={selectedDatasets}
        onToggleSelect={handleToggleSelect}
        selectAll={selectAllPages}
        onToggleSelectAll={onToggleSelectAll}
        selectedTests={selectedTest}
        sawKeys={sawKeys}
        onSaw={onSaw}
        page={page}
        pageSize={pageSize}
        totalFiltered={totalFilteredCount}
        pageSizeOptions={PAGE_SIZE_OPTIONS}
        onPageChange={setPage}
        onPageSizeChange={setPageSize}
      />
    </div>
  )
}
