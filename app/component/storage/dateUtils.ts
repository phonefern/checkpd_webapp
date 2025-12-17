// app/component/storage/dateUtils.ts

export const buddhistToISODate = (
  year?: number,
  month?: number,
  day?: number
): string | null => {
  if (!year || !month || !day) return null

  const gregorianYear = year - 543
  const date = new Date(gregorianYear, month - 1, day)
  return date.toISOString()
}
