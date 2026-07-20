export type OtherDiagnosisCategory = {
  category: string
  diagnosis: string[]
}

export type OtherDiagnosisTaxonomy = OtherDiagnosisCategory[]

export const SCA_DIAGNOSIS_LABEL = "Spinocerebellar ataxia (SCA)"

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

export function isSca(item: string): boolean {
  return item.trim() === SCA_DIAGNOSIS_LABEL || parseScaType(item) !== null
}

export function parseScaType(item: string): number | null {
  const match = item.trim().match(/^Spinocerebellar ataxia \(SCA\) type ([1-9]|[1-4][0-9]|50)$/i)
  return match ? Number(match[1]) : null
}

export function serializeSca(type?: number | null): string {
  return type ? `${SCA_DIAGNOSIS_LABEL} type ${type}` : SCA_DIAGNOSIS_LABEL
}

export function isCustom(item: string, taxonomy: OtherDiagnosisTaxonomy): boolean {
  const normalized = item.trim()
  if (!normalized) return false
  if (isSca(normalized)) return false

  return !flattenDiagnosisOptions(taxonomy).includes(normalized)
}
