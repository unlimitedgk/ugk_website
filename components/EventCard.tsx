import Image from 'next/image'
import Link from 'next/link'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { getStatusBadgeClass, getStatusLabel, type EventStatus } from '@/lib/eventStatus'
import { formatPrice, formatTime } from '@/lib/formatEvent'

export type EventCardEvent = {
  id: string
  title: string
  start_date: string
  end_date?: string | null
  start_time: string | null
  end_time: string | null
  city: string
  location_name: string
  price: number | string
  open_for_registration: boolean | null
  event_status?: EventStatus | null
  url_picture?: string | null
  description?: string | null
  capacity?: number | null
  target_year_min?: number | null
  target_year_max?: number | null
}

type EventCardProps = {
  event: EventCardEvent
  registerHref: string
  registerLabel: string
  imageAltPrefix?: string
}

export function EventCard({ event, registerHref, registerLabel, imageAltPrefix = 'Event' }: EventCardProps) {
  const statusLabel = getStatusLabel(event.event_status)
  const statusClass = getStatusBadgeClass(event.event_status)
  const canRegister = event.open_for_registration === true

  const dateDisplay = event.end_date
    ? `${event.start_date} – ${event.end_date}`
    : event.start_date

  return (
    <Card className="flex h-full flex-col overflow-hidden">
      <div className="relative h-32 w-full">
        {event.url_picture ? (
          <Image
            src={event.url_picture}
            alt={`${imageAltPrefix} ${event.title}`}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 33vw"
          />
        ) : null}
      </div>
      <CardHeader className="gap-1">
        <div className="text-xs uppercase tracking-[0.2em] text-slate-400">
          {event.city}
        </div>
        <CardTitle className="text-xl">{event.title}</CardTitle>
        {event.description ? (
          <p className="text-sm font-medium text-amber-600">{event.description}</p>
        ) : null}
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-sm text-slate-500">📍{event.location_name}</div>
        
        <div className="flex flex-wrap items-center gap-2 text-sm text-slate-600">
          <span className="rounded-full bg-slate-100 px-3 py-1">🗓️{dateDisplay}</span>
          <span className="rounded-full bg-slate-100 px-3 py-1">
            ⏱️{event.start_time && event.end_time
              ? `${formatTime(event.start_time)}–${formatTime(event.end_time)}`
              : '—'}
          </span>
          {event.target_year_min != null && event.target_year_max != null ? (
            <span className="rounded-full bg-slate-100 px-3 py-1">
              👥 Jahrgänge: {event.target_year_min} – {event.target_year_max}
            </span>
          ) : null}
        </div>
        
        
        {event.capacity != null ? (
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-rose-100 px-3 py-1 text-xs font-semibold text-rose-600">
              Limitierte Teilnehmeranzahl
            </span>
          </div>
        ) : null}
        <div className="flex items-baseline justify-between">
          <span className="text-sm font-medium text-slate-600">Preis</span>
          <span className="text-lg font-semibold text-slate-900">
            {formatPrice(event.price)}
          </span>
        </div>
      </CardContent>
      <CardFooter className="mt-auto">
        {canRegister ? (
          <Link
            href={registerHref}
            className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-indigo-500 to-rose-500 px-6 text-sm font-semibold text-white shadow-lg shadow-indigo-200/60 transition hover:opacity-90"
          >
            {registerLabel}
          </Link>
        ) : (
          <div
            className={`inline-flex w-fit rounded-full px-3 py-1 text-sm font-semibold ${statusClass}`}
          >
            {statusLabel}
          </div>
        )}
      </CardFooter>
    </Card>
  )
}
