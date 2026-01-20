'use client'

import React, { useState } from 'react'
import PatientRow from './PatientRow'
import PatientTableHeader from './PatientTableHeader'
import RecordDropdown from './RecordDropdown'

type SelectedDataset = {
  patientId: string
  recordId: string
  bucketPath: string
}

type Props = {
  data: any[]
  totalAfterFilter: number
  totalAll: number

  activeFilters: string[]
  onRemoveFilter: (filter: string) => void
  onClearAllFilters: () => void

  selectedDatasets: SelectedDataset[]
  onToggleSelect: (patientId: string, recordId: string) => void

  selectAll: boolean
  onToggleSelectAll: () => void

  selectedTests: string[]

  sawKeys: string[]
  onSaw: (key: string) => void

  // pagination
  page: number
  pageSize: number
  totalFiltered: number
  pageSizeOptions: number[]
  onPageChange: (page: number) => void
  onPageSizeChange: (size: number) => void
}

const getPageNumbers = (current: number, total: number, window = 5) => {
  const half = Math.floor(window / 2)
  let start = Math.max(1, current - half)
  let end = Math.min(total, start + window - 1)

  if (end - start < window - 1) {
    start = Math.max(1, end - window + 1)
  }

  return Array.from({ length: end - start + 1 }, (_, i) => start + i)
}

export default function PatientTable(props: Props) {
  const {
    data,
    totalAfterFilter,
    totalAll,
    activeFilters,
    onRemoveFilter,
    onClearAllFilters,
    selectedDatasets,
    onToggleSelect,
    selectAll,
    onToggleSelectAll,
    selectedTests,
    sawKeys,
    onSaw,
    page,
    pageSize,
    totalFiltered,
    pageSizeOptions,
    onPageChange,
    onPageSizeChange,
  } = props

  const totalPages = Math.ceil(totalFiltered / pageSize)
  const pages = getPageNumbers(page, totalPages)

  const [recordMap, setRecordMap] = useState<Record<string, { open: boolean }>>({})

  const toggleRecord = (userId: string) => {
    setRecordMap(prev => ({
      ...prev,
      [userId]: {
        open: !prev[userId]?.open,
      },
    }))
  }

  return (
    <div className="bg-white rounded-lg border">

      {/* ===== Header ===== */}
      <div className="p-4 border-b">
        <PatientTableHeader
          filteredCount={totalAfterFilter}
          totalCount={totalAll}
          activeFilters={activeFilters}
          onRemoveFilter={onRemoveFilter}
          onClearAllFilters={onClearAllFilters}
        />
      </div>

      {/* ===== Desktop Table (lg+) ===== */}
      <div className="hidden lg:block overflow-x-auto">
        <table className="min-w-full text-b">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="scale-200 accent-purple-700">
                <input
                  type="checkbox"
                  checked={selectAll}
                  onChange={onToggleSelectAll}
                />
              </th>
              <th className="px-4 py-3 text-center">#</th>
              <th className="px-4 py-3 text-left">Patients Name</th>
              <th className="px-4 py-3 text-center">Recorded</th>
              <th className="px-4 py-3 text-center">Thai ID</th>
              <th className="px-4 py-3 text-center">Risk</th>
              <th className="px-4 py-3 text-center">Condition</th>
              <th className="px-4 py-3 text-center">Area</th>
              <th className="px-4 py-3 text-center">Last Migrated</th>
              <th className="px-4 py-3 text-center">Action</th>
            </tr>
          </thead>

          <tbody>
            {data.map((row, index) => {
              const key = `${row.id}-${row.record_id}`
              const bucketPath = `checkpd/${row.id}/${row.record_id}`

              const isSelected = selectedDatasets.some(
                d => d.bucketPath === bucketPath
              )

              const isSaw = sawKeys.includes(key)

              return (
                <React.Fragment key={key}>
                  <PatientRow
                    index={(page - 1) * pageSize + index}
                    data={row}
                    isSelected={selectAll || isSelected}
                    isSaw={isSaw}
                    onToggleSelect={() =>
                      onToggleSelect(row.id, row.record_id)
                    }
                    onSaw={() => onSaw(key)}
                    onRowClick={() => toggleRecord(row.id)}
                  />

                  {isSaw && (
                    <tr>
                      <td colSpan={10} className="bg-gray-50 px-4 py-2">
                        <RecordDropdown
                          userId={row.id}
                          firstname={row.firstname}
                          lastname={row.lastname}
                          condition={row.condition}
                          open={recordMap[row.id]?.open ?? false}
                          onToggle={() => toggleRecord(row.id)}
                          selectedTests={selectedTests}
                        />
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* ===== Pagination ===== */}
      <div className="flex items-center justify-between px-6 py-4 border-t">
        <select
          value={pageSize}
          onChange={e => onPageSizeChange(Number(e.target.value))}
          className="border px-4 py-1 rounded"
        >
          {pageSizeOptions.map(size => (
            <option key={size} value={size}>
              {size} / page
            </option>
          ))}
        </select>

        <span className="text-sm text-gray-600">
          Page {page} / {totalPages}
        </span>

        <div className="flex gap-2">
          <button
            onClick={() => onPageChange(1)}
            disabled={page === 1}
            className="px-2 py-1 bg-purple-900 text-white rounded disabled:opacity-40"
          >
            First
          </button>

          <button
            onClick={() => onPageChange(page - 1)}
            disabled={page === 1}
            className="px-3 py-1 border rounded disabled:opacity-50"
          >
            Prev
          </button>

          {pages.map(p => (
            <button
              key={p}
              onClick={() => onPageChange(p)}
              className={`px-3 py-1 border rounded ${p === page
                ? 'bg-purple-900 text-white'
                : 'hover:bg-gray-100'
                }`}
            >
              {p}
            </button>
          ))}

          <button
            onClick={() => onPageChange(page + 1)}
            disabled={page * pageSize >= totalFiltered}
            className="px-3 py-1 border rounded disabled:opacity-50"
          >
            Next
          </button>

          <button
            onClick={() => onPageChange(totalPages)}
            disabled={page === totalPages}
            className="px-2 py-1 bg-purple-900 text-white rounded disabled:opacity-40"
          >
            Last
          </button>
        </div>
      </div>
    </div>
  )
}
