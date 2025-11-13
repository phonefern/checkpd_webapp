'use client'

import { conditionOptions, riskOptions } from '@/app/types/user'

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
  startDate,
  setStartDate,
  endDate,
  setEndDate,
  fetchUsers,
  totalCount,
  currentPage,
  itemsPerPage
}: SearchFiltersProps) {
  return (
    <div className="mb-6 p-4 bg-gray-50 rounded-lg">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Search Patient</label>
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
          <label className="block text-sm font-medium text-gray-700 mb-1">Condition</label>
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
          <label className="block text-sm font-medium text-gray-700 mb-1">Risk Level</label>
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
              <option
                key={String(option.value)}
                value={option.value === null ? 'null' : String(option.value)}
              >
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Other</label>
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
          <label className="block text-sm font-medium text-gray-700 mb-1">From Date</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => {
              setStartDate(e.target.value)
              setCurrentPage(1)
            }}
            className="w-full border border-gray-300 p-2 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">To Date</label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => {
              setEndDate(e.target.value)
              setCurrentPage(1)
            }}
            className="w-full border border-gray-300 p-2 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
      </div>

      <div className="mt-4 flex flex-col gap-2 md:flex-row md:justify-between md:items-center">
        <p className="text-sm text-gray-600">
          Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, totalCount)} of {totalCount} records
        </p>
        <div className="flex gap-2">
          <a href="/pages/records">
            <button
              className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500"
            >
              View All Records
            </button>
          </a>
          <a href="/pages/export">
            <button
              className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500"
            >
              Export Data
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