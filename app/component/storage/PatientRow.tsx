'use client'

import { CircleUser } from 'lucide-react'
import { motion } from 'framer-motion'
import { PatientRecord } from './types'
import {
  mapPredictionRiskLabel,
  mapConditionUI,
  formatToThaiDate_recorded,
  formatToThaiDate_lastMigrated,
} from './utils'
import { cn } from '@/lib/utils'

interface PatientRowProps {
  index: number
  rowIndex?: number
  data: PatientRecord
  isSelected: boolean
  isSaw: boolean
  onToggleSelect: () => void
  onSaw: () => void
  onRowClick: () => void
}

export default function PatientRow({
  index,
  rowIndex = 0,
  data,
  isSelected,
  isSaw,
  onToggleSelect,
  onSaw,
  onRowClick,
}: PatientRowProps) {
  const riskUI = mapPredictionRiskLabel(data.prediction_risk)
  const conditionUI = mapConditionUI(data.condition)
  const recordedDate = data.last_update ?? data.timestamp

  return (
    <motion.tr
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22, delay: Math.min(rowIndex * 0.025, 0.3) }}
      onClick={onSaw}
      className={cn(
        'cursor-pointer border-b border-gray-100 transition-colors',
        isSelected ? 'bg-green-50/60' : isSaw ? 'bg-purple-50/60' : 'hover:bg-gray-50'
      )}
    >
      {/* Checkbox */}
      <td className="px-4 py-3 text-center">
        <input
          type="checkbox"
          checked={isSelected}
          onChange={onToggleSelect}
          onClick={(e) => e.stopPropagation()}
          className="size-4 cursor-pointer accent-purple-700"
        />
      </td>

      {/* No */}
      <td className="px-4 py-3 text-center text-sm text-gray-500">{index + 1}</td>

      {/* Patient */}
      <td className="px-4 py-3">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            onRowClick()
          }}
          className="flex items-center gap-2 text-left"
        >
          <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-gray-100 text-gray-500">
            <CircleUser size={20} />
          </span>
          <span>
            <span className="block font-medium text-gray-900">
              {data.firstname} {data.lastname}
            </span>
            <span className="block text-xs text-gray-500">ID : {data.id}</span>
          </span>
        </button>
      </td>

      {/* Recorded */}
      <td className="px-4 py-3 text-center text-sm text-gray-700">
        {formatToThaiDate_recorded(recordedDate)}
      </td>

      {/* Thai ID */}
      <td className="px-4 py-3 text-center text-sm text-gray-700">
        {data.thaiid ?? '-'}
      </td>

      {/* Risk */}
      <td className="px-4 py-3 text-center">
        <span className={cn('inline-flex rounded-full px-2 py-0.5 text-xs font-medium', riskUI.color)}>
          {riskUI.label}
        </span>
      </td>

      {/* Condition */}
      <td className="px-4 py-3 text-center">
        <span className={cn('inline-flex rounded-full px-2 py-0.5 text-xs font-medium', conditionUI.color)}>
          {conditionUI.label}
        </span>
      </td>

      {/* Area */}
      <td className="px-4 py-3 text-center text-sm text-gray-700">{data.area ?? '-'}</td>

      {/* Last Migrated */}
      <td className="px-4 py-3 text-center text-sm text-gray-700">
        {formatToThaiDate_lastMigrated(data.last_migrate)}
      </td>

      {/* Action */}
      <td className="px-4 py-3 text-center">
        {isSelected ? (
          <span className="inline-flex rounded-full bg-green-600 px-3 py-1 text-xs font-medium text-white">
            Selected
          </span>
        ) : isSaw ? (
          <span className="inline-flex rounded-full border border-purple-300 px-3 py-1 text-xs font-medium text-purple-700">
            Viewing
          </span>
        ) : (
          <span className="inline-flex rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-600">
            Choose
          </span>
        )}
      </td>
    </motion.tr>
  )
}
