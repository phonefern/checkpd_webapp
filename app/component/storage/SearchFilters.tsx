// /app/component/storage/SearchFilters.tsx

'use client'

import {
  conditionOptions,
  testStatusOptions,
  riskOptions,
  TEST_OPTIONS,
  TestType
} from '@/app/component/storage/types'

interface SearchFiltersProps {
  search: string
  setSearch: (value: string) => void

  condition: string
  setCondition: (value: string) => void

  area: string
  areaOptions: string[]
  setArea: (value: string) => void

  testStatus: string
  setTestStatus: (value: string) => void

  risk: string
  setRisk: (value: string) => void

  selectedTest: TestType[]
  onToggleTest: (tests: TestType) => void
  onSelectAllTests: () => void
  onClearTests: () => void

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
  areaOptions,
  setArea,
  testStatus,
  setTestStatus,
  risk,
  setRisk,
  selectedTest,
  onToggleTest,
  onSelectAllTests,
  onClearTests,
  startDate,
  setStartDate,
  endDate,
  setEndDate,
  lastMigrated,
  setLastMigrated
}: SearchFiltersProps) {
  return (
    <div>
      <h1 style={{ fontSize: '30px' }} className="text-lg font-bold mb-2" >
        FILTERS
      </h1>

      <div className="p-4 bg-gray-100 rounded-lg space-y-4">

        {/* ================= Search ================= */}
        <div>
          <label className="block text-b font-medium mb-1">
            Search (ID / First Name / Last Name / Thai ID)
          </label>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search..."
            className="w-full border rounded-md p-2 bg-white text-gray-900"
          />
        </div>

        {/* ================= Filters ================= */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">


          {/* Diagnose */}
          <div>
            <label className="block text-b font-medium mb-1">
              Diagnose
            </label>
            <select
              value={condition}
              onChange={(e) => setCondition(e.target.value)}
              className="w-full border rounded-md p-2 bg-white text-gray-900"
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
            <label className="block text-b font-medium mb-1">
              Collecting Area
            </label>
            <select
              value={area}
              onChange={(e) => setArea(e.target.value)}
              className="w-full border rounded-md p-2 bg-white text-gray-900"
            >
              <option value="all">ทั้งหมด (All)</option>
              {areaOptions.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </select>
          </div>

          {/* Risk */}
          <div>
            <label className="block text-b font-medium mb-1">
              Risk
            </label>
            <select
              value={risk}
              onChange={(e) => setRisk(e.target.value)}
              className="w-full border rounded-md p-2 bg-white text-gray-900"
            >
              <option value="all">ทั้งหมด (All)</option>
              {riskOptions.map((risk) => (
                <option key={risk.value} value={risk.value}>
                  {risk.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">

          {/* Test Status */}
          <div>
            <label className="block text-b font-medium mb-1">
              Test Status
            </label>
            <select
              value={testStatus}
              onChange={(e) => setTestStatus(e.target.value)}
              className="w-full border rounded-md p-2 bg-white text-gray-900"
            >
              <option value="all">ทั้งหมด (All)</option>
              {testStatusOptions.map((test) => (
                <option key={test.value} value={test.value}>
                  {test.label}
                </option>
              ))}
            </select>
          </div>

          {/* Tests */}
          <div className="relative">
            <label className="block text-b font-medium mb-1">
              Test Types
            </label>

            <details className="border rounded-md bg-white">
              <summary className="cursor-pointer px-3 py-2 select-none">
                {selectedTest.length === 0
                  ? 'Select tests'
                  : selectedTest.length === TEST_OPTIONS.length
                    ? 'All tests selected'
                    : `${selectedTest.length} tests selected`}
              </summary>

              <div className="p-3 border-t space-y-2">

                {/* Action buttons */}
                <div className="flex gap-2 mb-2">
                  <button
                    type="button"
                    onClick={onSelectAllTests}
                    className="text-small px-2 py-1 bg-purple-900 text-white border rounded hover:bg-gray-100 text-gray-900"
                  >
                    Select all
                  </button>

                  <button
                    type="button"
                    onClick={onClearTests}
                    className="text-small px-2 py-1 border rounded hover:bg-gray-100"
                  >
                    Clear
                  </button>
                </div>

                {/* Test options */}
                {TEST_OPTIONS.map(t => (
                  <label key={t} className="flex items-center gap-2 text-small">
                    <input
                      type="checkbox"
                      checked={selectedTest.includes(t)}
                      onChange={() => onToggleTest(t)}
                    />
                    {t}
                  </label>
                ))}
              </div>
            </details>
          </div>
        </div>

        {/* ================= Date Filters ================= */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

          {/* Start Date */}
          <div>
            <label className="block text-b font-medium mb-1">
              Start Date
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full border rounded-md p-2 bg-white text-gray-900"
            />
          </div>

          {/* End Date */}
          <div>
            <label className="block text-b font-medium mb-1">
              End Date
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full border rounded-md p-2 bg-white text-gray-900"
            />
          </div>

          {/* Last Migrated */}
          <div>
            <label className="block text-b font-medium mb-1">
              Last Migrated
            </label>
            <input
              type="date"
              value={lastMigrated}
              onChange={(e) => setLastMigrated(e.target.value)}
              className="w-full border rounded-md p-2 bg-white text-gray-900"
            />
          </div>

        </div>
      </div>
    </div>
  )
}
