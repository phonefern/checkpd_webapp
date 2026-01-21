// app/component/storage/utils.ts

import { useEffect, useState } from 'react'

/* =========================
   test Status
========================= */

export const mapTestStatusUI = (
  testStatus: string | null | undefined
): {
  label: string
  color: string
} => {
  // 🔧 Normalize string (แก้ space / newline / invisible char)
  const normalized = (testStatus ?? '')
    .toString()
    .trim()
    .replace(/\s+/g, ' ')

  switch (normalized) {
    case 'ทำแบบทดสอบครบ':
      return {
        label: 'Completed',
        color: 'text-green-700 bg-green-100'
      }

    case 'ทำแบบทดสอบบางส่วน':
      return {
        label: 'Incomplete',
        color: 'text-yellow-700 bg-yellow-100'
      }

    case 'ไม่ได้ทำแบบทดสอบ':
      return {
        label: 'Unattempted',
        color: 'text-gray-700 bg-gray-100'
      }

    default:
      return {
        label: normalized || 'Unknown',
        color: 'text-white bg-gray-600'
      }
  }
}

/* =========================
   Prediction Risk
========================= */

export const mapPredictionRiskLabel = (
  risk: boolean | null
): {
  label: string
  color: string
} => {
  if (risk === true) {
    return { label: 'High Risk', color: 'text-red-700 bg-red-100' }
  }

  if (risk === false) {
    return { label: 'Low Risk', color: 'text-green-700 bg-green-100' }
  }

  return { label: 'Not Evaluate', color: 'text-gray-700 bg-gray-100' }
}


/* =========================
   Condition (with color)
========================= */

export const mapConditionUI = (
  condition: 'pd' | 'ctrl' | 'pdm' | 'other' | string
): {
  label: string
  color: string
} => {
  switch (condition) {
    case 'pd':
      return {
        label: 'PD',
        color: 'text-red-700 bg-red-100'
      }

    case 'ctrl':
      return {
        label: 'Control',
        color: 'text-green-700 bg-green-100'
      }

    case 'pdm':
      return {
        label: 'Prodromal',
        color: 'text-yellow-700 bg-yellow-100'
      }

    case 'other':
      return {
        label: 'Other Disease',
        color: 'text-yellow-700 bg-yellow-100'
      }

    default:
      return {
        label: condition || 'Unknown',
        color: 'text-gray-600 bg-gray-100'
      }
  }
}

/* =========================
   Thai Date Formatter
========================= */

export const formatToThaiDate_recorded = (timestamp?: string | null) => {
  if (!timestamp) return '-'
  const date = new Date(timestamp)

  return date.toLocaleDateString('th-TH', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  })
}

export const formatToThaiDate_lastMigrated = (timestamp?: string | null) => {
  if (!timestamp) return '-'
  const date = new Date(timestamp)
  date.setHours(date.getHours() - 7)

  return date.toLocaleDateString('th-TH', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  })
}

/* =========================
   ✅ Debounce Hook
========================= */

export function useDebounce<T>(value: T, delay = 400): T {
  const [debouncedValue, setDebouncedValue] = useState(value)

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)

    return () => clearTimeout(timer)
  }, [value, delay])

  return debouncedValue
}
