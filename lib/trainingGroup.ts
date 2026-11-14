/**
 * Kinder-/Jugendtraining: Zielgruppe eines weekly_training.
 * Muss exakt dem DB-Enum public.training_group_types entsprechen.
 *
 * Die eigentliche Altersprüfung läuft über events.target_year_min / target_year_max
 * (Jahrgänge) – training_group ist nur die Bezeichnung.
 */
export const TRAINING_GROUP_OPTIONS = ['kids', 'youth'] as const
export type TrainingGroup = (typeof TRAINING_GROUP_OPTIONS)[number]

export const TRAINING_GROUP_LABELS: Record<TrainingGroup, string> = {
  kids: 'Kindertraining',
  youth: 'Jugendtraining',
}

export const isTrainingGroup = (value: unknown): value is TrainingGroup =>
  (TRAINING_GROUP_OPTIONS as readonly string[]).includes(String(value ?? ''))

export const trainingGroupLabel = (value: unknown) =>
  isTrainingGroup(value) ? TRAINING_GROUP_LABELS[value] : 'Offen für alle'

/**
 * Standard-Jahrgänge relativ zum Jahr des Termins ("Jahrgang-Alter" = Jahr − Geburtsjahr):
 *   Kinder: Jahrgang-Alter < 14  -> ab (Jahr − 13), keine Untergrenze nach unten
 *   Jugend: Jahrgang-Alter 14–18 -> (Jahr − 18) bis (Jahr − 14)
 * min = ältester erlaubter Jahrgang, max = jüngster erlaubter Jahrgang.
 */
export function defaultTargetYears(
  group: TrainingGroup,
  referenceYear: number
): { min: number | null; max: number | null } {
  if (group === 'kids') return { min: referenceYear - 13, max: null }
  return { min: referenceYear - 18, max: referenceYear - 14 }
}

/** Jahr aus einem Datum (YYYY-MM-DD o.ä.), Fallback: aktuelles Jahr. */
export function referenceYearFromDate(value: unknown): number {
  if (value !== null && value !== undefined && value !== '') {
    const parsed = new Date(String(value))
    if (!Number.isNaN(parsed.getTime())) return parsed.getFullYear()
  }
  return new Date().getFullYear()
}

const toYearOrNull = (value: unknown): number | null => {
  if (value === null || value === undefined || value === '') return null
  const n = Number(value)
  return Number.isFinite(n) ? n : null
}

/** "2008–2012", "ab 2013", "bis 2012" oder null, wenn keine Grenze gesetzt ist. */
export function formatTargetYears(min: unknown, max: unknown): string | null {
  const a = toYearOrNull(min)
  const b = toYearOrNull(max)
  if (a !== null && b !== null) return `${a}–${b}`
  if (a !== null) return `ab ${a}`
  if (b !== null) return `bis ${b}`
  return null
}
