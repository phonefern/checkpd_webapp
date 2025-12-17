// app/component/storage/utils.ts

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
    return { label: 'High Risk', color: 'text-red-600 bg-red-100' }
  }

  if (risk === false) {
    return { label: 'Low Risk', color: 'text-green-600 bg-green-100' }
  }

  return { label: 'No Data', color: 'text-gray-600 bg-gray-100' }
}


/* =========================
   Condition (with color)
========================= */

export const mapConditionUI = (
  condition: 'pd' | 'ctrl' | 'pdm' | string
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

export const formatToThaiDate = (timestamp?: string | null) => {
  if (!timestamp) return '-'
  const date = new Date(timestamp)
  date.setHours(date.getHours() + 7)

  return date.toLocaleDateString('th-TH', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  })
}
