'use client'

import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Button } from '@/components/ui/button'
import { CalendarIcon } from 'lucide-react'
import { format } from 'date-fns'
import { cn } from '@/lib/utils'
import { provinceOptions } from '@/app/types/user'
import { QA_CONDITION_OPTIONS, QA_HY_OPTIONS } from './types'

interface QaSearchFiltersProps {
  search: string
  setSearch: (v: string) => void
  thaiId: string
  setThaiId: (v: string) => void
  condition: string
  setCondition: (v: string) => void
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
}

export default function QaSearchFilters({
  search,
  setSearch,
  thaiId,
  setThaiId,
  condition,
  setCondition,
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
}: QaSearchFiltersProps) {
  const startDateObj = startDate ? new Date(startDate) : undefined
  const endDateObj = endDate ? new Date(endDate) : undefined

  const reset = () => {
    setSearch('')
    setThaiId('')
    setCondition('')
    setHyStage('')
    setProvince('')
    setStartDate('')
    setEndDate('')
    setCurrentPage(1)
  }

  const hasActiveFilter = search || thaiId || condition || hyStage || province || startDate || endDate

  return (
    <div className="mb-6 p-6 bg-card border border-border rounded-lg shadow-sm">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-8 gap-4">
        {/* Search */}
        <div className="xl:col-span-2">
          <label className="block text-sm font-medium text-foreground mb-2">Search Patient</label>
          <input
            type="text"
            placeholder="Name or HN"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setCurrentPage(1) }}
            className="w-full border border-gray-300 p-2 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        {/* Thai ID */}
        <div className="xl:col-span-2">
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
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">Condition</label>
          <select
            value={condition}
            onChange={(e) => { setCondition(e.target.value); setCurrentPage(1) }}
            className="w-full border border-gray-300 p-2 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 cursor-pointer"
          >
            {QA_CONDITION_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>

        {/* H&Y Stage */}
        <div>
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
        <div>
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
        <div>
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
        <div>
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
  )
}
