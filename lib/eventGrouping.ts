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

/** Lower sort key = earlier in list (Gruppe A before B; unassigned last). */
export function groupLabelSortKey(label: string): number {
  const trimmed = label.trim()
  if (!trimmed) return Number.MAX_SAFE_INTEGER

  const match = trimmed.match(/^Gruppe\s+([A-Z]+)$/i)
  if (!match) return Number.MAX_SAFE_INTEGER - 1

  const letters = match[1].toUpperCase()
  let value = 0
  for (let i = 0; i < letters.length; i++) {
    value = value * 26 + (letters.charCodeAt(i) - 64)
  }
  return value
}

export type GroupingRowSortable = {
  rowKey: string
  eventId: string
  eventStartDateMs: number
  birthYear: number | null
  birthDateMs: number | null
  keeperName: string
}

export function sortGroupingRowsByGroupAndBirthYear<T extends GroupingRowSortable>(
  rows: T[],
  groupAssignments: Record<string, string>
): T[] {
  return [...rows].sort((a, b) => {
    if (a.eventStartDateMs !== b.eventStartDateMs) {
      return a.eventStartDateMs - b.eventStartDateMs
    }
    if (a.eventId !== b.eventId) {
      return a.eventId.localeCompare(b.eventId)
    }

    const groupA = groupAssignments[a.rowKey] ?? ''
    const groupB = groupAssignments[b.rowKey] ?? ''
    const groupOrder = groupLabelSortKey(groupA) - groupLabelSortKey(groupB)
    if (groupOrder !== 0) return groupOrder
    if (groupA !== groupB) return groupA.localeCompare(groupB, 'de')

    if (a.birthYear !== null && b.birthYear !== null && a.birthYear !== b.birthYear) {
      return a.birthYear - b.birthYear
    }

    if (a.birthDateMs === null && b.birthDateMs === null) {
      return a.keeperName.localeCompare(b.keeperName, 'de')
    }
    if (a.birthDateMs === null) return 1
    if (b.birthDateMs === null) return -1
    if (a.birthDateMs !== b.birthDateMs) return a.birthDateMs - b.birthDateMs

    return a.keeperName.localeCompare(b.keeperName, 'de')
  })
}
