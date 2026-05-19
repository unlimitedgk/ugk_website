export const DEFAULT_MAX_PER_GROUP = 5

export function groupLabelFromIndex(index: number): string {
  return `Gruppe ${String.fromCharCode(65 + index)}`
}

export function birthYearFromValue(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null
  const parsed = new Date(String(value))
  if (Number.isNaN(parsed.getTime())) return null
  return parsed.getFullYear()
}

export function birthDateMsFromValue(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null
  const parsed = new Date(String(value))
  if (Number.isNaN(parsed.getTime())) return null
  return parsed.getTime()
}

/** Oldest keepers first; missing birth dates go last. */
export function autoAssignGroupsByAge(
  rowIds: string[],
  birthDateMsByRowId: Map<string, number | null>,
  maxPerGroup: number
): Map<string, string> {
  const safeMax = Math.max(1, Math.floor(maxPerGroup) || DEFAULT_MAX_PER_GROUP)
  const sorted = [...rowIds].sort((a, b) => {
    const aMs = birthDateMsByRowId.get(a) ?? null
    const bMs = birthDateMsByRowId.get(b) ?? null
    if (aMs === null && bMs === null) return a.localeCompare(b)
    if (aMs === null) return 1
    if (bMs === null) return -1
    return aMs - bMs
  })

  const assignments = new Map<string, string>()
  sorted.forEach((rowId, index) => {
    const groupIndex = Math.floor(index / safeMax)
    assignments.set(rowId, groupLabelFromIndex(groupIndex))
  })
  return assignments
}

export function groupOptionsForCount(participantCount: number, maxPerGroup: number): string[] {
  const safeMax = Math.max(1, Math.floor(maxPerGroup) || DEFAULT_MAX_PER_GROUP)
  const groupCount = Math.max(1, Math.ceil(participantCount / safeMax))
  return Array.from({ length: groupCount }, (_, index) => groupLabelFromIndex(index))
}
