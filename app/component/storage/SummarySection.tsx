'use client'

import { FolderDown } from 'lucide-react'
import { SummaryProps } from './types'

export default function SummarySection({
  selectedCount,
  filteredCount,
  onDownload,
  sortBy,
  setSortBy,
  downloading = false,
  downloadProgress
}: SummaryProps) {
  return (
    <div className="mt-6 flex flex-col lg:flex-row gap-4 items-stretch">

      {/* ===== Left box : Summary ===== */}
      <div className="flex-1 p-6 bg-white rounded-lg border-2 border-purple-700 flex flex-col justify-center gap-3">

        <div className="text-base text-gray-800">
          เลือก{' '}
          <span className="font-semibold">{selectedCount}</span>{' '}
          จาก{' '}
          <span className="font-semibold">{filteredCount}</span>{' '}
          คน
        </div>
      </div>

      {/* ===== Sort By ===== */}
      <div className="flex flex-col gap-2 item-start">
        <span className="text-l font-medium text-gray-700">
          Sorted by:
        </span>

        <div className="flex flex-col gap-2">
          <button
            onClick={() => setSortBy('ID')}
            className={`
              min-w-[150px] px-3 py-1 rounded border text-sm font-medium
              ${sortBy === 'ID'
                ? 'bg-purple-900 text-white border-purple-700'
                : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-100'}
            `}
          >
            ID
          </button>

          <button
            onClick={() => setSortBy('TEST')}
            className={`
              min-w-[150px] px-3 py-1 rounded border text-sm font-medium
              ${sortBy === 'TEST'
                ? 'bg-purple-900 text-white border-purple-700'
                : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-100'}
            `}
          >
            TEST
          </button>
        </div>
      </div>

      {/* ===== Right box : Download ===== */}
      <button
        disabled={selectedCount === 0 || downloading}
        onClick={onDownload}
        className="
          p-4 min-w-[220px]
          bg-purple-900 rounded-lg border-4 border-purple-900
          flex flex-col items-center justify-center
          text-white
          hover:bg-purple-800 transition
          disabled:opacity-60 disabled:cursor-not-allowed
        "
      >
        <FolderDown size={36} strokeWidth={1.8} />
        <span className="text-sm mt-2 font-medium">
          {downloading
            ? downloadProgress && downloadProgress.total > 0
              ? `Downloading ${downloadProgress.current}/${downloadProgress.total}`
              : 'Preparing download...'
            : `Download ${selectedCount} Patients`}
        </span>
        {downloading && downloadProgress && downloadProgress.total > 0 && (
          <div className="w-full mt-2 bg-purple-700 rounded-full h-2">
            <div
              className="bg-white h-2 rounded-full transition-all duration-300"
              style={{ width: `${(downloadProgress.current / downloadProgress.total) * 100}%` }}
            />
          </div>
        )}
      </button>
    </div>
  )
}