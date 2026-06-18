export type OtherDiagnosisCategory = {
  category: string
  diagnosis: string[]
}

export type OtherDiagnosisTaxonomy = OtherDiagnosisCategory[]

export function parseOther(text: string | null | undefined): string[] {
  if (!text) return []

  return text
    .split(";")
    .map((item) => item.trim())
    .filter(Boolean)
}

export function serializeOther(items: string[]): string | null {
  const normalized = items
    .map((item) => item.trim())
    .filter(Boolean)

  if (normalized.length === 0) return null
  return normalized.join("; ")
}

export function flattenDiagnosisOptions(taxonomy: OtherDiagnosisTaxonomy): string[] {
  return taxonomy.flatMap((category) => category.diagnosis)
}

export function isCustom(item: string, taxonomy: OtherDiagnosisTaxonomy): boolean {
  const normalized = item.trim()
  if (!normalized) return false

  return !flattenDiagnosisOptions(taxonomy).includes(normalized)
}
