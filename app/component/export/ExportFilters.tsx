'use client'

import { format } from 'date-fns'
import { CalendarIcon, Download, RefreshCw, RotateCcw, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'
import { conditionOptions } from './useExportRecords'

type Props = {
  searchId: string
  setSearchId: (value: string) => void
  startDate: string
  setStartDate: (value: string) => void
  endDate: string
  setEndDate: (value: string) => void
  searchCondition: string
  setSearchCondition: (value: string) => void
  setCurrentPage: (page: number) => void
  visibleStart: number
  visibleEnd: number
  totalCount: number
  onRefresh: () => void
  selectedCount: number
  exportLoading: boolean
  onExport: () => void
  onClearSelection: () => void
}

export default function ExportFilters({
  searchId,
  setSearchId,
  startDate,
  setStartDate,
  endDate,
  setEndDate,
  searchCondition,
  setSearchCondition,
  setCurrentPage,
  visibleStart,
  visibleEnd,
  totalCount,
  onRefresh,
  selectedCount,
  exportLoading,
  onExport,
  onClearSelection,
}: Props) {
  const startDateObj = startDate ? new Date(startDate) : undefined
  const endDateObj = endDate ? new Date(endDate) : undefined

  const activeFilters = [searchId.trim(), searchCondition, startDate, endDate].filter(Boolean).length

  const onReset = () => {
    setSearchId('')
    setSearchCondition('')
    setStartDate('')
    setEndDate('')
    setCurrentPage(1)
  }

  return (
    <div className="mb-6 rounded-xl border border-border bg-card shadow-sm">
      {/* ── Filter grid ── */}
      <div className="p-5">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Filters</p>
            {activeFilters > 0 && (
              <span className="inline-flex h-5 items-center rounded-full bg-blue-100 px-2 text-[10px] font-semibold text-blue-700">
                {activeFilters} active
              </span>
            )}
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onReset}
            disabled={activeFilters === 0}
            title={activeFilters === 0 ? 'No active filters' : 'Clear all filters'}
            className={cn(
              'h-8 gap-1.5 text-xs font-medium transition-colors',
              activeFilters > 0 ? 'text-rose-600 hover:bg-rose-50 hover:text-rose-700' : 'text-muted-foreground',
            )}
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Reset Filters
          </Button>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {/* Search */}
          <div className="sm:col-span-2 lg:col-span-1">
            <label className="mb-1.5 block text-xs font-medium text-foreground">Search Patient</label>
            <input
              type="text"
              placeholder="ID / Record ID / Name / Thai ID"
              value={searchId}
              onChange={(e) => {
                setSearchId(e.target.value)
                setCurrentPage(1)
              }}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          {/* Condition */}
          <div>
            <label className="mb-1.5 block text-xs font-medium text-foreground">Condition</label>
            <select
              value={searchCondition}
              onChange={(e) => {
                setSearchCondition(e.target.value)
                setCurrentPage(1)
              }}
              className="w-full cursor-pointer rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-ring"
            >
              {conditionOptions.map(({ value, label }) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>

          {/* From date */}
          <div>
            <label className="mb-1.5 block text-xs font-medium text-foreground">From Date</label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn('w-full justify-start text-left text-sm font-normal', !startDateObj && 'text-muted-foreground')}
                >
                  <CalendarIcon className="mr-2 h-3.5 w-3.5" />
                  {startDateObj ? format(startDateObj, 'd MMM yyyy') : 'Pick a date'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={startDateObj}
                  onSelect={(date) => {
                    setStartDate(date ? format(date, 'yyyy-MM-dd') : '')
                    setCurrentPage(1)
                  }}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* To date */}
          <div>
            <label className="mb-1.5 block text-xs font-medium text-foreground">To Date</label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn('w-full justify-start text-left text-sm font-normal', !endDateObj && 'text-muted-foreground')}
                >
                  <CalendarIcon className="mr-2 h-3.5 w-3.5" />
                  {endDateObj ? format(endDateObj, 'd MMM yyyy') : 'Pick a date'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={endDateObj}
                  onSelect={(date) => {
                    setEndDate(date ? format(date, 'yyyy-MM-dd') : '')
                    setCurrentPage(1)
                  }}
                  initialFocus
                  disabled={(date) => (startDateObj ? date < startDateObj : false)}
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>
      </div>

      {/* ── Footer bar ── */}
      <div className="flex flex-col gap-3 rounded-b-xl border-t border-border bg-muted/30 px-5 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          <span>Showing {visibleStart} to {visibleEnd} of {totalCount.toLocaleString()} records</span>
          {selectedCount > 0 && (
            <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-semibold text-blue-700">
              {selectedCount} selected
              <button
                onClick={onClearSelection}
                className="ml-0.5 rounded-full p-0.5 hover:bg-blue-200"
                title="Clear selection"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={onRefresh}
            className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-3 py-1.5 text-sm font-medium text-foreground shadow-sm transition-colors hover:bg-muted"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Refresh
          </button>

          <span className="hidden h-5 w-px bg-border sm:block" />

          <button
            onClick={onExport}
            disabled={selectedCount === 0 || exportLoading}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium shadow-sm transition-colors',
              selectedCount > 0 && !exportLoading
                ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                : 'cursor-not-allowed bg-muted text-muted-foreground',
            )}
          >
            {exportLoading ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
            Export Selected{selectedCount > 0 ? ` (${selectedCount})` : ''}
          </button>
        </div>
      </div>
    </div>
  )
}
