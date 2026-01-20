'use client'

import { CircleUser } from 'lucide-react'
import { PatientRecord } from './types'
import {
  mapPredictionRiskLabel,
  mapConditionUI,
  formatToThaiDate_recorded,
  formatToThaiDate_lastMigrated
} from './utils'

interface PatientRowProps {
  index: number
  data: PatientRecord
  isSelected: boolean
  isSaw: boolean
  onToggleSelect: () => void
  onSaw: () => void
  onRowClick: () => void
}

export default function PatientRow({
  index,
  data,
  isSelected,
  isSaw,
  onToggleSelect,
  onSaw,
  onRowClick
}: PatientRowProps) {
  const riskUI = mapPredictionRiskLabel(data.prediction_risk)
  const conditionUI = mapConditionUI(data.condition)
  const recordedDate = data.last_update ?? data.timestamp

  return (
    <tr
      onClick={onSaw}
      className={`
border-b cursor-pointer
        ${isSaw ? 'bg-purple-50' : ''}
        hover:bg-gray-50
      `}
    >
      {/* Checkbox */}
      <td className="px-4 py-3 text-center">
        <input
          type="checkbox"
          checked={isSelected}
          onChange={onToggleSelect}
          onClick={(e) => e.stopPropagation()}
          className="scale-200 accent-purple-700 cursor-pointer"
        />
      </td>

      {/* No */}
      <td className="px-4 py-3 text-center">
        {index + 1}
      </td>

      {/* Patient */}
      <td
        className="px-4 py-3 flex items-center gap-2"
        onClick={onRowClick}
      >
        <CircleUser className="text-gray-500" size={20} />
        <div>
          <div className="font-medium">
            {data.firstname} {data.lastname}
          </div>
          <div className="text-xs text-gray-500">
            ID : {data.id}
          </div>
        </div>
      </td>

      {/* Recorded */}
      <td className="px-4 py-3 text-center">
        {formatToThaiDate_recorded(recordedDate)}
      </td>

      {/* Thai ID */}
      <td className="px-4 py-3 text-center">
        {data.thaiid ?? '-'}
      </td>

      {/* Risk */}
      <td className="px-4 py-3 text-center">
        <span className={`px-2 py-1 rounded-full text-xs ${riskUI.color}`}>
          {riskUI.label}
        </span>
      </td>

      {/* Condition */}
      <td className="px-4 py-3 text-center">
        <span className={`px-2 py-1 rounded-full text-xs ${conditionUI.color}`}>
          {conditionUI.label}
        </span>
      </td>

      {/* Area */}
      <td className="px-4 py-3 text-center">
        {data.area ?? '-'}
      </td>

      {/* Last Migrated */}
      <td className="px-4 py-3 text-center">
        {formatToThaiDate_lastMigrated(data.last_migrate)}
      </td>

      {/* ✅ Action */}
      <td className="px-4 py-3 text-center">
        {isSelected ? (
          <span className="px-3 py-1 text-xs rounded-full bg-green-600 text-white">
            Selected
          </span>
        ) : isSaw ? (
          <span className="px-3 py-1 text-xs rounded-full border border-purple-600 text-purple-700">
            Saw
          </span>
        ) : (
          <span className="px-3 py-1 text-xs rounded-full bg-gray-100 text-gray-600">
            Choose
          </span>
        )}
      </td>
    </tr>
  )
}
