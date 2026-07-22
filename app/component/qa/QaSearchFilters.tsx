'use client'

import { useState } from 'react'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Button } from '@/components/ui/button'
import { CalendarIcon, ChevronDown, ChevronUp, ScanLine, SlidersHorizontal } from 'lucide-react'
import { format } from 'date-fns'
import { cn } from '@/lib/utils'
import { provinceOptions } from '@/app/types/user'
import { QA_HY_OPTIONS, type QaConditionFilter } from './types'
import { OtherDiagnosisSelect } from '@/app/component/diagnosis/OtherDiagnosisSelect'
import QaQrScanner from './QaQrScanner'
import { parseQaFocus } from './visitIdentity'

const CONDITION_FILTER_OPTIONS = [
  { value: '', label: 'All Conditions' },
  { value: 'pd', label: 'PD' },
  { value: 'pdm', label: 'PDM' },
  { value: 'other', label: 'OTHER' },
  { value: 'ctrl', label: 'CTRL' },
]

const GP2_FILTER_OPTIONS = [
  { value: '', label: 'All Blood Tests' },
  { value: 'gp2', label: 'GP2' },
]

interface QaSearchFiltersProps {
  search: string
  setSearch: (v: string) => void
  thaiId: string
  setThaiId: (v: string) => void
  condition: QaConditionFilter
  setCondition: (v: QaConditionFilter) => void
  otherDiagnosis: string | null
  setOtherDiagnosis: (v: string | null) => void
  gp2: string
  setGp2: (v: string) => void
  hyStage: string
  setHyStage: (v: string) => void
  province: string
  setProvince: (v: string) => void
  startDate: string
  setStartDate: (v: string) => void
  endDate: string
  setEndDate: (v: string) => void
  setCurrentPage: (page: number) => void
  totalCount: number
  currentPage: number
  itemsPerPage: number
  onRefresh: () => void
  onScanFocus: (focus: { id?: string; uid?: string }) => void
}

export default function QaSearchFilters({
  search,
  setSearch,
  thaiId,
  setThaiId,
  condition,
  setCondition,
  otherDiagnosis,
  setOtherDiagnosis,
  gp2,
  setGp2,
  hyStage,
  setHyStage,
  province,
  setProvince,
  startDate,
  setStartDate,
  endDate,
  setEndDate,
  setCurrentPage,
  totalCount,
  currentPage,
  itemsPerPage,
  onRefresh,
  onScanFocus,
}: QaSearchFiltersProps) {
  const [scannerOpen, setScannerOpen] = useState(false)
  const [filtersOpen, setFiltersOpen] = useState(false)
  const startDateObj = startDate ? new Date(startDate) : undefined
  const endDateObj = endDate ? new Date(endDate) : undefined

  const reset = () => {
    setSearch('')
    setThaiId('')
    setCondition('')
    setOtherDiagnosis(null)
    setGp2('')
    setHyStage('')
    setProvince('')
    setStartDate('')
    setEndDate('')
    setCurrentPage(1)
  }

  const hasActiveFilter = search || thaiId || condition || otherDiagnosis || gp2 || hyStage || province || startDate || endDate
  const activeFilterCount = [search, thaiId, condition, otherDiagnosis, gp2, hyStage, province, startDate || endDate].filter(Boolean).length

  return (
    <div className="mb-6 bg-card border border-border rounded-lg shadow-sm">

      {/* ── MOBILE LAYOUT (< md) ── */}
      <div className="md:hidden p-3 space-y-2">
        {/* Row 1: search + QR */}
        <div className="flex gap-2">
          <input
            type="text"
            inputMode="text"
            placeholder="ชื่อ / HN / Visit No."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setCurrentPage(1) }}
            className="flex-1 h-12 px-4 text-base border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
          <button
            type="button"
            onClick={() => setScannerOpen(true)}
            aria-label="สแกน QR ผู้ป่วย"
            className="h-12 w-12 shrink-0 flex items-center justify-center rounded-xl border border-gray-300 bg-white text-gray-600 active:bg-gray-100 transition"
          >
            <ScanLine className="h-5 w-5" />
          </button>
        </div>

        {/* Row 2: filter toggle + refresh */}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setFiltersOpen((v) => !v)}
            className={cn(
              'flex-1 h-10 flex items-center gap-2 px-3 rounded-xl border text-sm font-medium transition',
              filtersOpen || activeFilterCount > 0
                ? 'border-blue-500 bg-blue-50 text-blue-700'
                : 'border-gray-300 bg-white text-gray-600 active:bg-gray-50'
            )}
          >
            <SlidersHorizontal className="h-4 w-4 shrink-0" />
            <span>กรองเพิ่มเติม</span>
            {activeFilterCount > 0 && (
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-600 text-[10px] font-bold text-white">
                {activeFilterCount}
              </span>
            )}
            <span className="ml-auto">
              {filtersOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </span>
          </button>
          <button
            onClick={onRefresh}
            className="h-10 px-4 rounded-xl bg-blue-600 text-white text-sm font-medium active:bg-blue-700 transition"
          >
            รีเฟรช
          </button>
        </div>

        {/* Collapsible filters */}
        {filtersOpen && (
          <div className="space-y-3 pt-2 border-t border-gray-100">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">บัตรประชาชน (Thai ID)</label>
              <input
                type="text"
                inputMode="numeric"
                placeholder="เลขบัตรประชาชน 13 หลัก"
                value={thaiId}
                maxLength={13}
                onChange={(e) => { setThaiId(e.target.value.replace(/\D/g, '')); setCurrentPage(1) }}
                className="w-full h-10 px-3 text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Condition</label>
                <select
                  value={condition}
                  onChange={(e) => { setCondition(e.target.value as QaConditionFilter); setCurrentPage(1) }}
                  className="w-full h-10 px-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 cursor-pointer"
                >
                  {CONDITION_FILTER_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">H&amp;Y Stage</label>
                <select
                  value={hyStage}
                  onChange={(e) => { setHyStage(e.target.value); setCurrentPage(1) }}
                  className="w-full h-10 px-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 cursor-pointer"
                >
                  {QA_HY_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">จังหวัด</label>
              <select
                value={province}
                onChange={(e) => { setProvince(e.target.value); setCurrentPage(1) }}
                className="w-full h-10 px-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 cursor-pointer"
              >
                <option value="">ทุกจังหวัด</option>
                {provinceOptions.filter((o) => o.value !== 'null').map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Blood Test</label>
                <select
                  value={gp2}
                  onChange={(e) => { setGp2(e.target.value); setCurrentPage(1) }}
                  className="w-full h-10 px-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 cursor-pointer"
                >
                  {GP2_FILTER_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">From Date</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn('w-full h-10 justify-start text-left font-normal text-xs cursor-pointer px-2', !startDateObj && 'text-muted-foreground')}
                    >
                      <CalendarIcon className="mr-1 h-3.5 w-3.5 shrink-0" />
                      {startDateObj ? format(startDateObj, 'dd/MM/yy') : 'วันที่เริ่ม'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={startDateObj}
                      onSelect={(date) => { setStartDate(date ? format(date, 'yyyy-MM-dd') : ''); setCurrentPage(1) }}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
            {hasActiveFilter && (
              <button
                onClick={reset}
                className="w-full h-10 rounded-lg border border-gray-300 text-sm text-gray-600 active:bg-gray-100 transition"
              >
                ล้างตัวกรองทั้งหมด
              </button>
            )}
          </div>
        )}

        <p className="text-xs text-gray-500 pt-1">
          แสดง {totalCount === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1}–{Math.min(currentPage * itemsPerPage, totalCount)} จาก {totalCount} รายการ
        </p>
      </div>

      {/* ── DESKTOP LAYOUT (≥ md) ── */}
      <div className="hidden md:block p-6">
        <div className="flex flex-wrap gap-4">
          {/* Search */}
          <div className="w-[320px] shrink-0">
            <label className="block text-sm font-medium text-foreground mb-2">Search Patient</label>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Name, HN, or ID"
                value={search}
                onChange={(e) => { setSearch(e.target.value); setCurrentPage(1) }}
                className="w-full border border-gray-300 p-2 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => setScannerOpen(true)}
                title="สแกน QR ผู้ป่วย"
                aria-label="สแกน QR ผู้ป่วย"
                className="h-11 w-11 shrink-0 cursor-pointer"
              >
                <ScanLine className="h-5 w-5" />
              </Button>
            </div>
          </div>

          {/* Thai ID */}
          <div className="w-[280px] shrink-0">
            <label className="block text-sm font-medium text-foreground mb-2">บัตรประชาชน (Thai ID)</label>
            <input
              type="text"
              placeholder="เลขบัตรประชาชน 13 หลัก"
              value={thaiId}
              maxLength={13}
              onChange={(e) => { setThaiId(e.target.value.replace(/\D/g, '')); setCurrentPage(1) }}
              className="w-full border border-gray-300 p-2 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono"
            />
          </div>

          {/* Condition */}
          <div className="w-[190px] shrink-0">
            <label className="block text-sm font-medium text-foreground mb-2">Condition</label>
            <select
              value={condition}
              onChange={(e) => { setCondition(e.target.value as QaConditionFilter); setCurrentPage(1) }}
              className="w-full border border-gray-300 p-2 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 cursor-pointer"
            >
              {CONDITION_FILTER_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>

          <div className="w-[190px] shrink-0">
            <label className="block text-sm font-medium text-foreground mb-2">Other Diagnosis</label>
            <OtherDiagnosisSelect
              value={otherDiagnosis}
              onChange={(next) => {
                setOtherDiagnosis(next)
                setCurrentPage(1)
              }}
              mode="filter"
            />
          </div>

          <div className="w-[190px] shrink-0">
            <label className="block text-sm font-medium text-foreground mb-2">Blood Test</label>
            <select
              value={gp2}
              onChange={(e) => { setGp2(e.target.value); setCurrentPage(1) }}
              className="w-full border border-gray-300 p-2 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 cursor-pointer"
            >
              {GP2_FILTER_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>

          {/* H&Y Stage */}
          <div className="w-[190px] shrink-0">
            <label className="block text-sm font-medium text-foreground mb-2">H&amp;Y Stage</label>
            <select
              value={hyStage}
              onChange={(e) => { setHyStage(e.target.value); setCurrentPage(1) }}
              className="w-full border border-gray-300 p-2 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 cursor-pointer"
            >
              {QA_HY_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>

          {/* Province */}
          <div className="w-[190px] shrink-0">
            <label className="block text-sm font-medium text-foreground mb-2">Province</label>
            <select
              value={province}
              onChange={(e) => { setProvince(e.target.value); setCurrentPage(1) }}
              className="w-full border border-gray-300 p-2 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 cursor-pointer"
            >
              <option value="">All Provinces</option>
              {provinceOptions.filter((o) => o.value !== 'null').map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>

          {/* From Date */}
          <div className="w-[190px] shrink-0">
            <label className="block text-sm font-medium text-foreground mb-2">From Date</label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn('w-full justify-start text-left font-normal cursor-pointer', !startDateObj && 'text-muted-foreground')}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {startDateObj ? format(startDateObj, 'dd/MM/yyyy') : <span>Pick a date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={startDateObj}
                  onSelect={(date) => { setStartDate(date ? format(date, 'yyyy-MM-dd') : ''); setCurrentPage(1) }}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* To Date */}
          <div className="w-[190px] shrink-0">
            <label className="block text-sm font-medium text-foreground mb-2">To Date</label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn('w-full justify-start text-left font-normal cursor-pointer', !endDateObj && 'text-muted-foreground')}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {endDateObj ? format(endDateObj, 'dd/MM/yyyy') : <span>Pick a date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={endDateObj}
                  onSelect={(date) => { setEndDate(date ? format(date, 'yyyy-MM-dd') : ''); setCurrentPage(1) }}
                  initialFocus
                  disabled={(date) => (startDateObj ? date < startDateObj : false)}
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>

        <div className="mt-4 flex flex-col gap-2 md:flex-row md:justify-between md:items-center">
          <p className="text-sm text-foreground">
            Showing{' '}
            <span className="font-medium">{totalCount === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1}</span>
            {' '}to{' '}
            <span className="font-medium">{Math.min(currentPage * itemsPerPage, totalCount)}</span>
            {' '}of{' '}
            <span className="font-medium">{totalCount}</span> records
          </p>
          <div className="flex gap-2">
            {hasActiveFilter && (
              <button
                onClick={reset}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 focus:outline-none cursor-pointer"
              >
                Clear Filters
              </button>
            )}
            <button
              onClick={onRefresh}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
            >
              Refresh Data
            </button>
          </div>
        </div>
      </div>

      <QaQrScanner
        open={scannerOpen}
        onClose={() => setScannerOpen(false)}
        onDecode={(text) => {
          const focus = parseQaFocus(text)
          if (!focus) return false
          onScanFocus(focus)
          return true
        }}
      />
    </div>
  )
}
