'use client'

import { FolderDown, Loader2, Users } from 'lucide-react'
import { AnimatePresence, motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { SummaryProps } from './types'

const SORT_OPTIONS: { value: 'ID' | 'TEST'; label: string; hint: string }[] = [
  { value: 'ID', label: 'By ID', hint: 'จัดกลุ่มตามผู้ป่วย' },
  { value: 'TEST', label: 'By Test', hint: 'จัดกลุ่มตามชนิดการทดสอบ' },
]

export default function SummarySection({
  selectedCount,
  filteredCount,
  onDownload,
  sortBy,
  setSortBy,
  downloading = false,
  downloadProgress,
}: SummaryProps) {
  const hasProgress = Boolean(downloadProgress && downloadProgress.total > 0)
  const pct = hasProgress
    ? Math.round((downloadProgress!.current / downloadProgress!.total) * 100)
    : 0
  const canDownload = selectedCount > 0 && !downloading

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_auto_auto] lg:items-stretch">
      {/* ===== Summary ===== */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        className="flex items-center gap-4 rounded-xl border border-purple-200 bg-gradient-to-br from-purple-50 to-white px-6 py-5 shadow-sm"
      >
        <div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-purple-100 text-purple-700">
          <Users size={22} />
        </div>
        <div className="leading-tight">
          <div className="flex items-baseline gap-1.5">
            <AnimatePresence mode="popLayout">
              <motion.span
                key={selectedCount}
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 6 }}
                transition={{ duration: 0.18 }}
                className="text-2xl font-bold tabular-nums text-purple-900"
              >
                {selectedCount.toLocaleString()}
              </motion.span>
            </AnimatePresence>
            <span className="text-sm text-gray-500">
              / {filteredCount.toLocaleString()} คน
            </span>
          </div>
          <p className="text-xs text-gray-500">เลือกเพื่อเตรียมดาวน์โหลด</p>
        </div>
      </motion.div>

      {/* ===== Sort segmented control ===== */}
      <div className="flex flex-col justify-center gap-1.5">
        <span className="text-xs font-medium uppercase tracking-wide text-gray-500">
          Sort by
        </span>
        <div className="inline-flex rounded-lg border border-gray-200 bg-gray-50 p-1">
          {SORT_OPTIONS.map((opt) => {
            const active = sortBy === opt.value
            return (
              <button
                key={opt.value}
                type="button"
                title={opt.hint}
                onClick={() => setSortBy(opt.value)}
                className={cn(
                  'relative rounded-md px-4 py-1.5 text-sm font-medium transition-colors',
                  active ? 'text-white' : 'text-gray-600 hover:text-gray-900'
                )}
              >
                {active && (
                  <motion.span
                    layoutId="storage-sort-pill"
                    className="absolute inset-0 rounded-md bg-purple-900"
                    transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                  />
                )}
                <span className="relative z-10">{opt.label}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* ===== Download ===== */}
      <Button
        type="button"
        disabled={!canDownload}
        onClick={onDownload}
        className="relative h-auto min-w-[230px] flex-col gap-2 overflow-hidden rounded-xl bg-purple-900 px-6 py-4 text-white shadow-md hover:bg-purple-800 disabled:opacity-60"
      >
        {downloading ? (
          <Loader2 size={30} className="animate-spin" strokeWidth={1.8} />
        ) : (
          <motion.span
            whileHover={{ y: -2 }}
            transition={{ type: 'spring', stiffness: 400, damping: 18 }}
          >
            <FolderDown size={30} strokeWidth={1.8} />
          </motion.span>
        )}

        <span className="text-sm font-medium">
          {downloading
            ? hasProgress
              ? `Downloading ${downloadProgress!.current}/${downloadProgress!.total}`
              : 'Preparing download…'
            : `Download ${selectedCount.toLocaleString()} Patients`}
        </span>

        {downloading && hasProgress && (
          <div className="absolute inset-x-0 bottom-0 h-1.5 bg-purple-700/60">
            <motion.div
              className="h-full bg-white"
              initial={{ width: 0 }}
              animate={{ width: `${pct}%` }}
              transition={{ ease: 'easeOut', duration: 0.3 }}
            />
          </div>
        )}
      </Button>
    </div>
  )
}
