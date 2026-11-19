/**
 * Auswahl-Optionen für die Spalten der Tabelle public.events.
 * Die Werte müssen exakt den DB-Enums entsprechen; Labels sind die deutsche Anzeige.
 */
import { EVENT_TYPE_LABELS } from '@/lib/analytics'

/** DB-Enum public.event_types */
export const EVENT_TYPE_OPTIONS = ['weekly_training', 'camp', 'keeperday'] as const
export type EventTypeOption = (typeof EVENT_TYPE_OPTIONS)[number]

export const isEventTypeOption = (value: unknown): value is EventTypeOption =>
  (EVENT_TYPE_OPTIONS as readonly string[]).includes(String(value ?? ''))

/** Deutsche Anzeige für events.event_type (Fallback: Rohwert). */
export const eventTypeLabel = (value: unknown) => {
  const raw = String(value ?? '').trim()
  return (EVENT_TYPE_LABELS as Record<string, string>)[raw] ?? (raw || '—')
}

/** DB-Enum public.event_status_types */
export const EVENT_STATUS_OPTIONS = [
  'open',
  'closed',
  'preview',
  'cancelled',
  'full',
  'draft',
  'archived',
] as const
export type EventStatusOption = (typeof EVENT_STATUS_OPTIONS)[number]

export const EVENT_STATUS_LABELS: Record<EventStatusOption, string> = {
  open: 'Geöffnet',
  closed: 'Geschlossen',
  preview: 'Vorschau',
  cancelled: 'Abgesagt',
  full: 'Ausgebucht',
  draft: 'Entwurf',
  archived: 'Archiviert',
}

export const isEventStatusOption = (value: unknown): value is EventStatusOption =>
  (EVENT_STATUS_OPTIONS as readonly string[]).includes(String(value ?? ''))

/** Unbekannte Werte werden unverändert angezeigt, leere als '—'. */
export const eventStatusLabel = (value: unknown) => {
  if (value === null || value === undefined || value === '') return '—'
  return isEventStatusOption(value) ? EVENT_STATUS_LABELS[value] : String(value)
}

/** DB-Enum public.cancellation_reasons */
export const CANCELLATION_REASON_OPTIONS = [
  'weather',
  'staff_unavailable',
  'facility_unavailable',
  'too_few_registrations',
  'other',
] as const
export type CancellationReasonOption = (typeof CANCELLATION_REASON_OPTIONS)[number]

export const CANCELLATION_REASON_LABELS: Record<CancellationReasonOption, string> = {
  weather: 'Wetter',
  staff_unavailable: 'Personal nicht verfügbar',
  facility_unavailable: 'Platz/Halle nicht verfügbar',
  too_few_registrations: 'Zu wenige Anmeldungen',
  other: 'Sonstiges',
}

/**
 * Vorbelegung, sobald ein Event auf 'cancelled' gestellt wird. Bewusst 'other':
 * das Select hat keine Leer-Option (NULL/'' darf bei 'cancelled' nie gesendet
 * werden), und 'Sonstiges' erfindet im Zweifel keine konkrete Ursache.
 */
export const DEFAULT_CANCELLATION_REASON: CancellationReasonOption = 'other'

export const isCancellationReason = (value: unknown): value is CancellationReasonOption =>
  (CANCELLATION_REASON_OPTIONS as readonly string[]).includes(String(value ?? ''))

export const cancellationReasonLabel = (value: unknown) =>
  isCancellationReason(value) ? CANCELLATION_REASON_LABELS[value] : '—'
