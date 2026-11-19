'use client'

import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  TRAINING_GROUP_LABELS,
  TRAINING_GROUP_OPTIONS,
  defaultTargetYears,
  formatTargetYears,
  isTrainingGroup,
  trainingGroupLabel,
} from '@/lib/trainingGroup'

export const adminInputClass =
  'w-full rounded-xl border border-slate-200 bg-white/90 px-3 py-2 text-sm text-slate-900 shadow-sm outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-200'

/** DB-Spalten für Zielgruppe/Jahrgänge (eigener UI-Block). */
export const TRAINING_GROUP_KEY = 'training_group'
export const TARGET_YEAR_MIN_KEY = 'target_year_min'
export const TARGET_YEAR_MAX_KEY = 'target_year_max'
export const TARGET_GROUP_KEYS = new Set([TRAINING_GROUP_KEY, TARGET_YEAR_MIN_KEY, TARGET_YEAR_MAX_KEY])

export const isWeeklyTrainingType = (value: unknown) => String(value ?? '') === 'weekly_training'

/**
 * Übernimmt Zielgruppe + Jahrgänge aus dem Draft in den Payload.
 * Nur bei weekly_training; bei anderen Typen wird training_group geleert und die
 * Jahrgänge bleiben unangetastet (Keeperdays pflegen sie separat).
 * Rückgabe: Fehlermeldung oder null.
 */
export const applyTargetGroupToPayload = (
  payload: Record<string, unknown>,
  draft: Record<string, unknown>,
  eventType: unknown
): string | null => {
  if (!isWeeklyTrainingType(eventType)) {
    payload[TRAINING_GROUP_KEY] = null
    return null
  }
  const parseYear = (value: unknown): number | null | 'invalid' => {
    if (value === null || value === undefined || value === '') return null
    const n = Number(value)
    if (!Number.isInteger(n) || n < 1900 || n > 2100) return 'invalid'
    return n
  }
  const min = parseYear(draft[TARGET_YEAR_MIN_KEY])
  const max = parseYear(draft[TARGET_YEAR_MAX_KEY])
  if (min === 'invalid' || max === 'invalid') {
    return 'Bitte gültige Jahrgänge (vierstellig) eingeben.'
  }
  if (min !== null && max !== null && min > max) {
    return 'Jahrgang von darf nicht größer als Jahrgang bis sein.'
  }
  payload[TRAINING_GROUP_KEY] = isTrainingGroup(draft[TRAINING_GROUP_KEY])
    ? draft[TRAINING_GROUP_KEY]
    : null
  payload[TARGET_YEAR_MIN_KEY] = min
  payload[TARGET_YEAR_MAX_KEY] = max
  return null
}

/** Badge "Jugendtraining · 2010–2014" für weekly_training mit Zielgruppe oder Jahrgängen. */
export function TargetGroupBadge({ eventRow }: { eventRow: Record<string, unknown> }) {
  const group = eventRow?.[TRAINING_GROUP_KEY]
  const years = formatTargetYears(eventRow?.[TARGET_YEAR_MIN_KEY], eventRow?.[TARGET_YEAR_MAX_KEY])
  if (!isTrainingGroup(group) && !years) return null
  const tone =
    group === 'youth'
      ? 'bg-sky-100 text-sky-700'
      : group === 'kids'
        ? 'bg-amber-100 text-amber-700'
        : 'bg-slate-100 text-slate-600'
  return (
    <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${tone}`}>
      {trainingGroupLabel(group)}
      {years ? ` · Jg. ${years}` : ''}
    </span>
  )
}

/** Zielgruppe-Select + Jahrgänge; die Auswahl belegt die Jahrgänge aus dem Termin-Jahr vor. */
export default function TargetGroupFields({
  draft,
  onChange,
  referenceYear,
  idPrefix,
}: {
  draft: Record<string, unknown>
  onChange: (patch: Record<string, unknown>) => void
  referenceYear: number
  idPrefix: string
}) {
  const group = isTrainingGroup(draft[TRAINING_GROUP_KEY]) ? draft[TRAINING_GROUP_KEY] : ''
  return (
    <div className="space-y-3 rounded-xl border border-indigo-100 bg-indigo-50/40 p-3 md:col-span-2">
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="space-y-1">
          <Label htmlFor={`${idPrefix}-training-group`}>Zielgruppe</Label>
          <select
            id={`${idPrefix}-training-group`}
            className={adminInputClass}
            value={group}
            onChange={(e) => {
              const next = e.target.value
              if (isTrainingGroup(next)) {
                const years = defaultTargetYears(next, referenceYear)
                onChange({
                  [TRAINING_GROUP_KEY]: next,
                  [TARGET_YEAR_MIN_KEY]: years.min ?? '',
                  [TARGET_YEAR_MAX_KEY]: years.max ?? '',
                })
              } else {
                onChange({
                  [TRAINING_GROUP_KEY]: '',
                  [TARGET_YEAR_MIN_KEY]: '',
                  [TARGET_YEAR_MAX_KEY]: '',
                })
              }
            }}
          >
            <option value="">Gruppentraining</option>
            {TRAINING_GROUP_OPTIONS.map((opt) => (
              <option key={opt} value={opt}>
                {TRAINING_GROUP_LABELS[opt]}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <Label htmlFor={`${idPrefix}-year-min`}>Jahrgang von (ältester)</Label>
          <Input
            id={`${idPrefix}-year-min`}
            type="number"
            placeholder="offen"
            value={String(draft[TARGET_YEAR_MIN_KEY] ?? '')}
            onChange={(e) => onChange({ [TARGET_YEAR_MIN_KEY]: e.target.value })}
            className={adminInputClass}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor={`${idPrefix}-year-max`}>Jahrgang bis (jüngster)</Label>
          <Input
            id={`${idPrefix}-year-max`}
            type="number"
            placeholder="offen"
            value={String(draft[TARGET_YEAR_MAX_KEY] ?? '')}
            onChange={(e) => onChange({ [TARGET_YEAR_MAX_KEY]: e.target.value })}
            className={adminInputClass}
          />
        </div>
      </div>
      <p className="text-xs text-slate-500">
        Die Auswahl belegt die Jahrgänge passend zum Termin-Jahr {referenceYear} vor (Kinder: ab{' '}
        {referenceYear - 13}, Jugend: {referenceYear - 16}–{referenceYear - 12}). Leeres Feld = keine
        Grenze. Nur Torhüter innerhalb der Jahrgänge (oder mit Freischaltung) können sich anmelden.
      </p>
    </div>
  )
}
