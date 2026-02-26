export type EventStatus = 'open' | 'closed' | 'preview' | 'cancelled' | 'full' | 'draft'

export const EVENT_STATUS_LABELS: Record<EventStatus, string> = {
  open: 'Registrierung geöffnet',
  closed: 'Registrierung geschlossen',
  full: 'Event ausgebucht',
  cancelled: 'Event abgesagt',
  preview: 'Registrierung noch nicht geöffnet',
  draft: 'Entwurf',
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
