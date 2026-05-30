"use client"

import { conditionOptions, riskOptions, sourceOptions, provinceOptions } from "@/app/types/user"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Button } from "@/components/ui/button"
import { CalendarIcon, Download, RefreshCw, X } from "lucide-react"
import { format } from "date-fns"
import { cn } from "@/lib/utils"

interface SearchFiltersProps {
  searchId: string
  setSearchId: (value: string) => void
  setCurrentPage: (page: number) => void
  searchCondition: string
  setSearchCondition: (value: string) => void
  searchRisk: string
  setSearchRisk: (value: string) => void
  searchOther: string
  setSearchOther: (value: string) => void
  otherOptions: string[]
  searchArea: string
  setSearchArea: (value: string) => void
  areaOptions: string[]
  searchSource: string
  setSearchSource: (value: string) => void
  searchProvince: string
  setSearchProvince: (value: string) => void
  startDate: string
  setStartDate: (value: string) => void
  endDate: string
  setEndDate: (value: string) => void
  fetchUsers: () => void
  totalCount: number
  currentPage: number
  itemsPerPage: number
  selectedCount: number
  isExporting: boolean
  onExportSelected: () => void
  onExportAll: () => void
  onClearSelection: () => void
}

export default function SearchFilters({
  searchId,
  setSearchId,
  setCurrentPage,
  searchCondition,
  setSearchCondition,
  searchRisk,
  setSearchRisk,
  searchOther,
  setSearchOther,
  otherOptions,
  searchArea,
  setSearchArea,
  areaOptions,
  searchSource,
  setSearchSource,
  searchProvince,
  setSearchProvince,
  startDate,
  setStartDate,
  endDate,
  setEndDate,
  fetchUsers,
  totalCount,
  currentPage,
  itemsPerPage,
  selectedCount,
  isExporting,
  onExportSelected,
  onExportAll,
  onClearSelection,
}: SearchFiltersProps) {
  const startDateObj = startDate ? new Date(startDate) : undefined
  const endDateObj   = endDate   ? new Date(endDate)   : undefined

  const showing = `Showing ${(currentPage - 1) * itemsPerPage + 1}–${Math.min(currentPage * itemsPerPage, totalCount)} of ${totalCount.toLocaleString()} records`

  return (
    <div className="mb-6 rounded-xl border border-border bg-card shadow-sm">
      {/* ── Filter grid ── */}
      <div className="p-5">
        <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Filters</p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
          {/* Search */}
          <div className="sm:col-span-2 lg:col-span-1">
            <label className="mb-1.5 block text-xs font-medium text-foreground">Search Patient</label>
            <input
              type="text"
              placeholder="ID / Record ID / Name / Thai ID"
              value={searchId}
              onChange={(e) => { setSearchId(e.target.value); setCurrentPage(1) }}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          {/* Source */}
          <div>
            <label className="mb-1.5 block text-xs font-medium text-foreground">Source</label>
            <select
              value={searchSource}
              onChange={(e) => { setSearchSource(e.target.value); setCurrentPage(1) }}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-ring cursor-pointer"
            >
              {sourceOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>

          {/* Province */}
          <div>
            <label className="mb-1.5 block text-xs font-medium text-foreground">Province</label>
            <select
              value={searchProvince}
              onChange={(e) => { setSearchProvince(e.target.value); setCurrentPage(1) }}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-ring cursor-pointer"
            >
              {provinceOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>

          {/* Condition */}
          <div>
            <label className="mb-1.5 block text-xs font-medium text-foreground">Condition</label>
            <select
              value={searchCondition}
              onChange={(e) => { setSearchCondition(e.target.value); setCurrentPage(1) }}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-ring cursor-pointer"
            >
              {conditionOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>

          {/* Risk */}
          <div>
            <label className="mb-1.5 block text-xs font-medium text-foreground">Risk Level</label>
            <select
              value={searchRisk}
              onChange={(e) => { setSearchRisk(e.target.value); setCurrentPage(1) }}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-ring cursor-pointer"
            >
              <option value="">All Risk Levels</option>
              {riskOptions.map((o) => (
                <option key={String(o.value)} value={o.value === null ? "null" : String(o.value)}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>

          {/* Other */}
          <div>
            <label className="mb-1.5 block text-xs font-medium text-foreground">Other</label>
            <select
              value={searchOther}
              onChange={(e) => { setSearchOther(e.target.value); setCurrentPage(1) }}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-ring cursor-pointer"
            >
              <option value="">All</option>
              {otherOptions.map((o) => <option key={o} value={o}>{o}</option>)}
            </select>
          </div>

          {/* Area */}
          <div>
            <label className="mb-1.5 block text-xs font-medium text-foreground">Area</label>
            <select
              value={searchArea}
              onChange={(e) => { setSearchArea(e.target.value); setCurrentPage(1) }}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-ring cursor-pointer"
            >
              <option value="">All Areas</option>
              {areaOptions.map((o) => <option key={o} value={o}>{o}</option>)}
            </select>
          </div>

          {/* From date */}
          <div>
            <label className="mb-1.5 block text-xs font-medium text-foreground">From Date</label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn("w-full justify-start text-left text-sm font-normal", !startDateObj && "text-muted-foreground")}
                >
                  <CalendarIcon className="mr-2 h-3.5 w-3.5" />
                  {startDateObj ? format(startDateObj, "d MMM yyyy") : "Pick a date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={startDateObj}
                  onSelect={(date) => { setStartDate(date ? format(date, "yyyy-MM-dd") : ""); setCurrentPage(1) }}
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
                  className={cn("w-full justify-start text-left text-sm font-normal", !endDateObj && "text-muted-foreground")}
                >
                  <CalendarIcon className="mr-2 h-3.5 w-3.5" />
                  {endDateObj ? format(endDateObj, "d MMM yyyy") : "Pick a date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={endDateObj}
                  onSelect={(date) => { setEndDate(date ? format(date, "yyyy-MM-dd") : ""); setCurrentPage(1) }}
                  initialFocus
                  disabled={(date) => (startDateObj ? date < startDateObj : false)}
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>
      </div>

      {/* ── Footer bar ── */}
      <div className="flex flex-col gap-3 border-t border-border bg-muted/30 px-5 py-3 sm:flex-row sm:items-center sm:justify-between rounded-b-xl">
        {/* Left: record count + selection badge */}
        <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          <span>{showing}</span>
          {selectedCount > 0 && (
            <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-semibold text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
              {selectedCount} selected
              <button
                onClick={onClearSelection}
                className="ml-0.5 rounded-full p-0.5 hover:bg-blue-200 dark:hover:bg-blue-800"
                title="Clear selection"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          )}
        </div>

        {/* Right: actions */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Refresh */}
          <button
            onClick={fetchUsers}
            className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-3 py-1.5 text-sm font-medium text-foreground shadow-sm hover:bg-muted transition-colors"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Refresh
          </button>

          {/* Export divider */}
          <span className="h-5 w-px bg-border hidden sm:block" />

          {/* Export Selected */}
          <button
            onClick={onExportSelected}
            disabled={selectedCount === 0 || isExporting}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium shadow-sm transition-colors",
              selectedCount > 0 && !isExporting
                ? "bg-emerald-600 text-white hover:bg-emerald-700"
                : "cursor-not-allowed bg-muted text-muted-foreground"
            )}
          >
            {isExporting ? (
              <RefreshCw className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Download className="h-3.5 w-3.5" />
            )}
            Export Selected{selectedCount > 0 ? ` (${selectedCount})` : ""}
          </button>

          {/* Export All Filtered */}
          <button
            onClick={onExportAll}
            disabled={isExporting}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium shadow-sm transition-colors",
              !isExporting
                ? "bg-indigo-600 text-white hover:bg-indigo-700"
                : "cursor-not-allowed bg-muted text-muted-foreground"
            )}
          >
            {isExporting ? (
              <RefreshCw className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Download className="h-3.5 w-3.5" />
            )}
            Export All Filtered
          </button>
        </div>
      </div>
    </div>
  )
}
