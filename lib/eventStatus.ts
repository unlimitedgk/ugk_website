export type EventStatus = 'open' | 'closed' | 'preview' | 'cancelled' | 'full' | 'draft'

export const EVENT_STATUS_LABELS: Record<EventStatus, string> = {
  open: 'Registrierung geöffnet',
  closed: 'Registrierung geschlossen',
  full: 'Event ausgebucht',
  cancelled: 'Event abgesagt',
  preview: 'Registrierung noch nicht geöffnet',
  draft: 'Entwurf',
}

/** Heutiges Datum als YYYY-MM-DD in Europe/Vienna (unabhängig von der Server-Zeitzone). */
export function todayInVienna(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Vienna' }).format(new Date())
}

type BookableCheckEvent = {
  start_date: string | null
  open_for_registration: boolean | null
  event_status?: EventStatus | string | null
}

/** Gibt es mindestens einen Termin, der heute oder später stattfindet und für den man sich anmelden kann? */
export function hasBookableEvent(events: BookableCheckEvent[] | null | undefined): boolean {
  if (!events?.length) return false
  const today = todayInVienna()
  return events.some(
    (e) =>
      e.open_for_registration === true &&
      !['full', 'cancelled', 'closed'].includes(e.event_status ?? '') &&
      !!e.start_date &&
      e.start_date >= today
  )
}

/**
 * Status, deren Events in Anmeldeformularen/Elternportal angezeigt werden.
 * 'full' bleibt sichtbar (als "ausgebucht"), ist aber nicht buchbar.
 * Hinweis: events.open_for_registration ist eine generated Column (= status 'open').
 */
export const LISTED_REGISTRATION_STATUSES: EventStatus[] = ['open', 'full']

export function isEventFull(event: { event_status?: EventStatus | string | null }): boolean {
  return event.event_status === 'full'
}

/** Meldung, wenn ein Termin ausgebucht ist (Formulare + Elternportal). */
export const EVENT_FULL_MESSAGE =
  'Dieser Termin ist leider bereits ausgebucht. Bitte wähle einen anderen Termin.'

/**
 * Liest den Fehlercode aus einem supabase.functions.invoke-Fehler (FunctionsHttpError),
 * z.B. 'EVENT_FULL' aus public-register-for-event. Gibt null zurück, wenn keiner lesbar ist.
 */
export async function getFunctionErrorCode(error: unknown): Promise<string | null> {
  const context = (error as { context?: unknown } | null)?.context
  if (!(context instanceof Response)) return null
  try {
    const body = (await context.clone().json()) as { error?: unknown } | null
    return typeof body?.error === 'string' ? body.error : null
  } catch {
    return null
  }
}

export function getStatusLabel(status: EventStatus | null | undefined): string {
  if (!status || !(status in EVENT_STATUS_LABELS)) return '—'
  return EVENT_STATUS_LABELS[status as EventStatus]
}

export function getStatusBadgeClass(status: EventStatus | null | undefined): string {
  switch (status) {
    case 'open':
      return 'bg-emerald-100 text-emerald-600'
    case 'preview':
    case 'draft':
      return 'bg-blue-100 text-blue-600'
    case 'full':
    case 'closed':
    case 'cancelled':
      return 'bg-rose-100 text-rose-600'
    default:
      return 'bg-slate-100 text-slate-600'
  }
}
