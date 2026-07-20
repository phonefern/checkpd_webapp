'use client'

import { Filter, X } from 'lucide-react'
import { AnimatePresence, motion } from 'framer-motion'

interface Props {
  filteredCount: number
  totalCount: number
  activeFilters: string[]
  onRemoveFilter: (filter: string) => void
  onClearAllFilters: () => void
}

export default function PatientTableHeader({
  filteredCount,
  totalCount,
  activeFilters,
  onRemoveFilter,
  onClearAllFilters,
}: Props) {
  return (
    <div className="space-y-2">
      {/* Title */}
      <div className="flex items-baseline gap-2">
        <h2 className="text-lg font-semibold text-gray-900">รายการผู้ป่วย</h2>
        <span className="text-sm text-gray-500">
          {filteredCount.toLocaleString()} จากทั้งหมด {totalCount.toLocaleString()} คน
        </span>
      </div>

      {/* Active filters */}
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className="flex items-center gap-1.5 text-gray-600">
          <Filter size={15} className="text-purple-700" />
          Filter:
        </span>

        <div className="flex flex-wrap gap-1.5">
          <AnimatePresence initial={false} mode="popLayout">
            {activeFilters.length === 0 ? (
              <motion.span
                key="none"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="text-gray-400"
              >
                None
              </motion.span>
            ) : (
              activeFilters.map((f) => (
                <motion.button
                  key={f}
                  layout
                  initial={{ opacity: 0, scale: 0.85 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.85 }}
                  transition={{ duration: 0.15 }}
                  onClick={() => onRemoveFilter(f)}
                  className="flex items-center gap-1 rounded-full border border-purple-200 bg-purple-50 px-2.5 py-0.5 text-xs font-medium text-purple-800 transition-colors hover:bg-purple-100"
                >
                  {f}
                  <X size={12} />
                </motion.button>
              ))
            )}
          </AnimatePresence>
        </div>

        {activeFilters.length > 0 && (
          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            onClick={onClearAllFilters}
            className="rounded-full bg-purple-900 px-2.5 py-0.5 text-xs font-medium text-white transition-colors hover:bg-purple-800"
          >
            CLEAR ALL
          </motion.button>
        )}
      </div>
    </div>
  )
}
