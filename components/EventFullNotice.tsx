import { EVENT_FULL_MESSAGE } from '@/lib/eventStatus'

/** Gut sichtbarer Hinweis direkt bei der Terminauswahl, wenn ein Termin ausgebucht ist. */
export function EventFullNotice() {
  return (
    <div
      role="alert"
      className="flex items-start gap-3 rounded-xl border border-rose-200 border-l-4 border-l-rose-500 bg-rose-50 px-4 py-3 text-rose-800 shadow-sm"
    >
      <span aria-hidden className="text-lg leading-6">
        🚫
      </span>
      <div className="space-y-0.5">
        <p className="text-sm font-bold uppercase tracking-wide">Termin ausgebucht</p>
        <p className="text-sm">{EVENT_FULL_MESSAGE}</p>
      </div>
    </div>
  )
}
