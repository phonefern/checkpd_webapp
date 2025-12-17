"use client"

import { conditionOptions, riskOptions, sourceOptions, provinceOptions } from "@/app/types/user"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Button } from "@/components/ui/button"
import { CalendarIcon } from "lucide-react"
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
}: SearchFiltersProps) {
  const startDateObj = startDate ? new Date(startDate) : undefined
  const endDateObj = endDate ? new Date(endDate) : undefined

  return (
    <div className="mb-6 p-6 bg-card border border-border rounded-lg shadow-sm">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">Search Patient</label>
          <input
            type="text"
            placeholder="ID, Name, or Thai ID"
            value={searchId}
            onChange={(e) => {
              setSearchId(e.target.value)
              setCurrentPage(1)
            }}
            className="w-full border border-gray-300 p-2 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground mb-2">Source</label>
          <select
            value={searchSource}
            onChange={(e) => {
              setSearchSource(e.target.value)
              setCurrentPage(1)
            }}
            className="w-full border border-gray-300 p-2 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 cursor-pointer"
          >
            {sourceOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground mb-2">Province</label>
          <select
            value={searchProvince}
            onChange={(e) => {
              setSearchProvince(e.target.value)
              setCurrentPage(1)
            }}
            className="w-full border border-gray-300 p-2 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            {provinceOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground mb-2">Condition</label>
          <select
            value={searchCondition}
            onChange={(e) => {
              setSearchCondition(e.target.value)
              setCurrentPage(1)
            }}
            className="w-full border border-gray-300 p-2 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            {conditionOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground mb-2">Risk Level</label>
          <select
            value={searchRisk}
            onChange={(e) => {
              setSearchRisk(e.target.value)
              setCurrentPage(1)
            }}
            className="w-full border border-gray-300 p-2 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">All Risk Levels</option>
            {riskOptions.map((option) => (
              <option key={String(option.value)} value={option.value === null ? "null" : String(option.value)}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground mb-2">Other</label>
          <select
            value={searchOther}
            onChange={(e) => {
              setSearchOther(e.target.value)
              setCurrentPage(1)
            }}
            className="w-full border border-gray-300 p-2 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">All Others</option>
            {otherOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground mb-2">Area</label>
          <select
            value={searchArea}
            onChange={(e) => {
              setSearchArea(e.target.value)
              setCurrentPage(1)
            }}
            className="w-full border border-gray-300 p-2 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">All Areas</option>
            {areaOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground mb-2">From Date</label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn("w-full justify-start text-left font-normal", !startDateObj && "text-muted-foreground")}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {startDateObj ? format(startDateObj, "PPP") : <span>Pick a date</span>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={startDateObj}
                onSelect={(date) => {
                  setStartDate(date ? format(date, "yyyy-MM-dd") : "")
                  setCurrentPage(1)
                }}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground mb-2">To Date</label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn("w-full justify-start text-left font-normal", !endDateObj && "text-muted-foreground")}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {endDateObj ? format(endDateObj, "PPP") : <span>Pick a date</span>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={endDateObj}
                onSelect={(date) => {
                  setEndDate(date ? format(date, "yyyy-MM-dd") : "")
                  setCurrentPage(1)
                }}
                initialFocus
                disabled={(date) => (startDateObj ? date < startDateObj : false)}
              />
            </PopoverContent>
          </Popover>
        </div>
      </div>

      <div className="mt-4 flex flex-col gap-2 md:flex-row md:justify-between md:items-center">
        <p className="text-sm text-foreground">
          Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, totalCount)} of{" "}
          {totalCount} records
        </p>
        <div className="flex gap-2">
          <a href="/pages/records">
            <button className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500">
              View All Records
            </button>
          </a>
          <a href="/pages/export">
            <button className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500">
              Export Data
            </button>
          </a>
          <a href="/pages/storage">
            <button className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500">
              Storage
            </button>
          </a>
          <button
            onClick={fetchUsers}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            Refresh Data
          </button>
        </div>
      </div>
    </div>
  )
}
