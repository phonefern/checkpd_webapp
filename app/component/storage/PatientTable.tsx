'use client'

import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { ChevronLeft, ChevronLeftCircle, ChevronRight, ChevronRightCircle, Inbox } from 'lucide-react'
import PatientRow from './PatientRow'
import PatientTableHeader from './PatientTableHeader'
import RecordDropdown from './RecordDropdown'
import {
  mapConditionUI,
  mapPredictionRiskLabel,
  formatToThaiDate_lastMigrated,
} from './utils'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

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
  const end = Math.min(total, start + window - 1)

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

  const totalPages = Math.max(1, Math.ceil(totalFiltered / pageSize))
  const pages = getPageNumbers(page, totalPages)

  const [recordMap, setRecordMap] = useState<Record<string, { open: boolean }>>({})

  const toggleRecord = (userId: string) => {
    setRecordMap((prev) => ({
      ...prev,
      [userId]: { open: !prev[userId]?.open },
    }))
  }

  const isRowSelected = (row: any) =>
    selectAll || selectedDatasets.some((d) => d.bucketPath === `checkpd/${row.id}/${row.record_id}`)

  const isEmpty = data.length === 0

  return (
    <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
      {/* ===== Header ===== */}
      <div className="border-b border-gray-100 p-4">
        <PatientTableHeader
          filteredCount={totalAfterFilter}
          totalCount={totalAll}
          activeFilters={activeFilters}
          onRemoveFilter={onRemoveFilter}
          onClearAllFilters={onClearAllFilters}
        />
      </div>

      {/* ===== Empty state ===== */}
      {isEmpty && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center justify-center gap-3 py-16 text-center"
        >
          <span className="flex size-14 items-center justify-center rounded-full bg-gray-100 text-gray-400">
            <Inbox size={28} />
          </span>
          <div>
            <p className="font-medium text-gray-700">ไม่พบข้อมูลผู้ป่วย</p>
            <p className="text-sm text-gray-400">ลองปรับตัวกรองหรือคำค้นหาใหม่</p>
          </div>
        </motion.div>
      )}

      {/* ===== Desktop Table (lg+) ===== */}
      {!isEmpty && (
        <div className="hidden overflow-x-auto lg:block">
          <table className="min-w-full">
            <thead className="border-b border-gray-100 bg-gray-50/80 text-xs font-medium uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-4 py-3 text-center">
                  <input
                    type="checkbox"
                    checked={selectAll}
                    onChange={onToggleSelectAll}
                    className="size-4 cursor-pointer accent-purple-700"
                  />
                </th>
                <th className="px-4 py-3 text-center">#</th>
                <th className="px-4 py-3 text-left">Patient Name</th>
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
                const isSaw = sawKeys.includes(key)

                return (
                  <React.Fragment key={key}>
                    <PatientRow
                      index={(page - 1) * pageSize + index}
                      rowIndex={index}
                      data={row}
                      isSelected={isRowSelected(row)}
                      isSaw={isSaw}
                      onToggleSelect={() => onToggleSelect(row.id, row.record_id)}
                      onSaw={() => onSaw(key)}
                      onRowClick={() => toggleRecord(row.id)}
                    />

                    {isSaw && (
                      <tr>
                        <td colSpan={10} className="bg-gray-50/70 px-4 py-2">
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            transition={{ duration: 0.2 }}
                            className="overflow-hidden"
                          >
                            <RecordDropdown
                              userId={row.id}
                              firstname={row.firstname}
                              lastname={row.lastname}
                              condition={row.condition}
                              open={recordMap[row.id]?.open ?? false}
                              onToggle={() => toggleRecord(row.id)}
                              selectedTests={selectedTests}
                            />
                          </motion.div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ===== Mobile card list (below lg) ===== */}
      {!isEmpty && (
        <div className="space-y-3 p-3 lg:hidden">
          <label className="flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm font-medium text-gray-700">
            <input
              type="checkbox"
              checked={selectAll}
              onChange={onToggleSelectAll}
              className="size-4 accent-purple-700"
            />
            เลือกทั้งหมด (ตามตัวกรอง)
          </label>

          {data.map((row, index) => {
            const checked = isRowSelected(row)
            const riskUI = mapPredictionRiskLabel(row.prediction_risk)
            const conditionUI = mapConditionUI(row.condition)
            return (
              <motion.div
                key={`${row.id}-${row.record_id}`}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2, delay: Math.min(index * 0.03, 0.3) }}
                className={cn(
                  'rounded-lg border bg-white p-3 shadow-sm transition-colors',
                  checked ? 'border-green-400 ring-1 ring-green-200' : 'border-gray-200'
                )}
              >
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => onToggleSelect(row.id, row.record_id)}
                    className="mt-1 size-4 accent-purple-700"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="truncate text-sm font-semibold text-gray-900">
                        {row.firstname} {row.lastname}
                      </h3>
                      <span className="shrink-0 text-xs text-gray-400">
                        #{(page - 1) * pageSize + index + 1}
                      </span>
                    </div>
                    <p className="truncate text-xs text-gray-500">ID: {row.id}</p>
                    <p className="truncate text-xs text-gray-500">
                      Thai ID: {row.thaiid ?? '-'} · {row.area ?? '-'}
                    </p>
                    <p className="text-xs text-gray-400">
                      Migrated: {formatToThaiDate_lastMigrated(row.last_migrate)}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      <span className={cn('inline-flex rounded-full px-2 py-0.5 text-xs font-medium', riskUI.color)}>
                        {riskUI.label}
                      </span>
                      <span className={cn('inline-flex rounded-full px-2 py-0.5 text-xs font-medium', conditionUI.color)}>
                        {conditionUI.label}
                      </span>
                    </div>
                  </div>
                </div>
              </motion.div>
            )
          })}
        </div>
      )}

      {/* ===== Pagination ===== */}
      <div className="flex flex-col items-center justify-between gap-3 border-t border-gray-100 px-4 py-3 sm:flex-row">
        <select
          value={pageSize}
          onChange={(e) => onPageSizeChange(Number(e.target.value))}
          className="rounded-md border border-gray-200 px-3 py-1.5 text-sm text-gray-700 outline-none focus:border-purple-400"
        >
          {pageSizeOptions.map((size) => (
            <option key={size} value={size}>
              {size} / page
            </option>
          ))}
        </select>

        <span className="text-sm text-gray-500">
          Page {page} / {totalPages}
        </span>

        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => onPageChange(1)}
            disabled={page === 1}
          >
            <ChevronLeftCircle size={18} />
          </Button>
          <Button
            variant="outline"
            size="icon-sm"
            onClick={() => onPageChange(page - 1)}
            disabled={page === 1}
          >
            <ChevronLeft size={18} />
          </Button>

          {pages.map((p) => (
            <Button
              key={p}
              variant={p === page ? 'default' : 'outline'}
              size="icon-sm"
              onClick={() => onPageChange(p)}
              className={cn(p === page && 'bg-purple-900 hover:bg-purple-800')}
            >
              {p}
            </Button>
          ))}

          <Button
            variant="outline"
            size="icon-sm"
            onClick={() => onPageChange(page + 1)}
            disabled={page >= totalPages}
          >
            <ChevronRight size={18} />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => onPageChange(totalPages)}
            disabled={page === totalPages}
          >
            <ChevronRightCircle size={18} />
          </Button>
        </div>
      </div>
    </div>
  )
}
