// /app/component/storage/SearchFilters.tsx

'use client'

import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Check, ChevronDown, ListChecks, Search, SlidersHorizontal } from 'lucide-react'
import {
  conditionOptions,
  testStatusOptions,
  riskOptions,
  TEST_OPTIONS,
  TestType,
} from '@/app/component/storage/types'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { cn } from '@/lib/utils'

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

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <label className="mb-1.5 block text-xs font-medium text-gray-600">
      {children}
    </label>
  )
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
  setLastMigrated,
}: SearchFiltersProps) {
  const [open, setOpen] = useState(true)

  const testLabel =
    selectedTest.length === 0
      ? 'Select tests'
      : selectedTest.length === TEST_OPTIONS.length
        ? 'All tests selected'
        : `${selectedTest.length} tests selected`

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
      {/* ===== Header (toggle) ===== */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-5 py-3.5 text-left transition-colors hover:bg-gray-50"
      >
        <span className="flex items-center gap-2 text-sm font-semibold text-gray-800">
          <SlidersHorizontal size={18} className="text-purple-700" />
          Filters
        </span>
        <motion.span animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.2 }}>
          <ChevronDown size={18} className="text-gray-500" />
        </motion.span>
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="filter-body"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="space-y-4 border-t border-gray-100 p-5">
              {/* ================= Search ================= */}
              <div>
                <FieldLabel>Search (ID / First Name / Last Name / Thai ID)</FieldLabel>
                <div className="relative">
                  <Search
                    size={16}
                    className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                  />
                  <Input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="ค้นหาผู้ป่วย..."
                    className="pl-9"
                  />
                </div>
              </div>

              {/* ================= Selects ================= */}
              <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                <div>
                  <FieldLabel>Diagnose</FieldLabel>
                  <Select value={condition} onValueChange={setCondition}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">ทั้งหมด (All)</SelectItem>
                      {conditionOptions.map((c) => (
                        <SelectItem key={c.value} value={c.value}>
                          {c.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <FieldLabel>Collecting Area</FieldLabel>
                  <Select value={area} onValueChange={setArea}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">ทั้งหมด (All)</SelectItem>
                      {areaOptions.map((a) => (
                        <SelectItem key={a} value={a}>
                          {a}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <FieldLabel>Risk</FieldLabel>
                  <Select value={risk} onValueChange={setRisk}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">ทั้งหมด (All)</SelectItem>
                      {riskOptions.map((r) => (
                        <SelectItem key={r.value} value={r.value}>
                          {r.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* ================= Test status + types ================= */}
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <div>
                  <FieldLabel>Test Status</FieldLabel>
                  <Select value={testStatus} onValueChange={setTestStatus}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">ทั้งหมด (All)</SelectItem>
                      {testStatusOptions.map((t) => (
                        <SelectItem key={t.value} value={t.value}>
                          {t.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <FieldLabel>Test Types</FieldLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className="w-full justify-between font-normal"
                      >
                        <span className="flex items-center gap-2">
                          <ListChecks size={16} className="text-purple-700" />
                          {testLabel}
                        </span>
                        <ChevronDown size={16} className="text-gray-400" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent
                      align="start"
                      className="w-[var(--radix-popover-trigger-width)] p-0"
                    >
                      <div className="flex items-center justify-between gap-2 border-b p-2">
                        <Button
                          type="button"
                          size="sm"
                          variant="secondary"
                          className="h-7 flex-1 text-xs"
                          onClick={onSelectAllTests}
                        >
                          Select all
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          className="h-7 flex-1 text-xs"
                          onClick={onClearTests}
                        >
                          Clear
                        </Button>
                      </div>
                      <div className="max-h-60 space-y-0.5 overflow-y-auto p-1.5">
                        {TEST_OPTIONS.map((t) => {
                          const checked = selectedTest.includes(t)
                          return (
                            <button
                              key={t}
                              type="button"
                              onClick={() => onToggleTest(t)}
                              className={cn(
                                'flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors',
                                checked
                                  ? 'bg-purple-50 text-purple-900'
                                  : 'text-gray-700 hover:bg-gray-50'
                              )}
                            >
                              <span
                                className={cn(
                                  'flex size-4 items-center justify-center rounded border',
                                  checked
                                    ? 'border-purple-600 bg-purple-600 text-white'
                                    : 'border-gray-300'
                                )}
                              >
                                {checked && <Check size={12} strokeWidth={3} />}
                              </span>
                              {t}
                            </button>
                          )
                        })}
                      </div>
                    </PopoverContent>
                  </Popover>

                  {/* Selected test chips */}
                  {selectedTest.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      <AnimatePresence initial={false}>
                        {selectedTest.map((t) => (
                          <motion.div
                            key={t}
                            initial={{ opacity: 0, scale: 0.85 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.85 }}
                            transition={{ duration: 0.15 }}
                          >
                            <Badge
                              variant="secondary"
                              className="cursor-pointer bg-purple-100 text-purple-800 hover:bg-purple-200"
                              onClick={() => onToggleTest(t)}
                            >
                              {t}
                              <span className="ml-0.5 text-purple-500">×</span>
                            </Badge>
                          </motion.div>
                        ))}
                      </AnimatePresence>
                    </div>
                  )}
                </div>
              </div>

              {/* ================= Date Filters ================= */}
              <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                <div>
                  <FieldLabel>Start Date</FieldLabel>
                  <Input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                </div>
                <div>
                  <FieldLabel>End Date</FieldLabel>
                  <Input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                  />
                </div>
                <div>
                  <FieldLabel>Last Migrated</FieldLabel>
                  <Input
                    type="date"
                    value={lastMigrated}
                    onChange={(e) => setLastMigrated(e.target.value)}
                  />
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
