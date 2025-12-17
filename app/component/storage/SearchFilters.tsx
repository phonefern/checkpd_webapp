'use client'

import {
  conditionOptions,
  areaOptions,
  testStatusOptions,
  riskOptions
} from '@/app/component/storage/types'


interface SearchFiltersProps {
  search: string
  setSearch: (value: string) => void

  condition: string
  setCondition: (value: string) => void

  area: string
  setArea: (value: string) => void

  testStatus: string
  setTestStatus: (value: string) => void

  risk: string
  setRisk: (value: string) => void

  startDate: string
  setStartDate: (value: string) => void

  endDate: string
  setEndDate: (value: string) => void

  lastMigrated: string
  setLastMigrated: (value: string) => void
}

export default function SearchFilters({
  search,
  setSearch,
  condition,
  setCondition,
  area,
  setArea,
  testStatus,
  setTestStatus,
  risk,
  setRisk,
  startDate,
  setStartDate,
  endDate,
  setEndDate,
  lastMigrated,
  setLastMigrated
}: SearchFiltersProps) {
  return (
    <div className="p-4 bg-gray-50 rounded-lg space-y-4">

      {/* ================= Search ================= */}
      <div>
        <label className="block text-sm font-medium mb-1">
          Search (ID / First Name / Last Name / Thai ID)
        </label>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search..."
          className="w-full border rounded-md p-2"
        />
      </div>

      {/* ================= Filters ================= */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">


        {/* Diagnose */}
        <div>
          <label className="block text-sm font-medium mb-1">
            Diagnose
          </label>
          <select
            value={condition}
            onChange={(e) => setCondition(e.target.value)}
            className="w-full border rounded-md p-2"
          >
            <option value="all">ทั้งหมด (All)</option>
            {conditionOptions.map((cond) => (
              <option key={cond.value} value={cond.value}>
                {cond.label}
              </option>
            ))}
          </select>
        </div>

        {/* Area */}
        <div>
          <label className="block text-sm font-medium mb-1">
            Collecting Area
          </label>
          <select
            value={area}
            onChange={(e) => setArea(e.target.value)}
            className="w-full border rounded-md p-2"
          >
            <option value="all">ทั้งหมด (All)</option>
            {areaOptions.map((a) => (
              <option key={a.value} value={a.value}>
                {a.label}
              </option>
            ))}
          </select>
        </div>

        {/* Test Status */}
        <div>
          <label className="block text-sm font-medium mb-1">
            Test Status
          </label>
          <select
            value={testStatus}
            onChange={(e) => setTestStatus(e.target.value)}
            className="w-full border rounded-md p-2"
          >
            <option value="all">ทั้งหมด (All)</option>
            {testStatusOptions.map((test) => (
              <option key={test.value} value={test.value}>
                {test.label}
              </option>
            ))}
          </select>
        </div>

        {/* Risk */}
        <div>
          <label className="block text-sm font-medium mb-1">
            Risk
          </label>
          <select
            value={risk}
            onChange={(e) => setRisk(e.target.value)}
            className="w-full border rounded-md p-2"
          >
            <option value="all">ทั้งหมด(All)</option>
            {testStatusOptions.map((test) => (
              <option key={test.value} value={test.value}>
                {test.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* ================= Date Filters ================= */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

        {/* Start Date */}
        <div>
          <label className="block text-sm font-medium mb-1">
            Start Date
          </label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-full border rounded-md p-2"
          />
        </div>

        {/* End Date */}
        <div>
          <label className="block text-sm font-medium mb-1">
            End Date
          </label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="w-full border rounded-md p-2"
          />
        </div>

        {/* Last Migrated */}
        <div>
          <label className="block text-sm font-medium mb-1">
            Last Migrated
          </label>
          <input
            type="date"
            value={lastMigrated}
            onChange={(e) => setLastMigrated(e.target.value)}
            className="w-full border rounded-md p-2"
          />
        </div>

      </div>
    </div>
  )
}
