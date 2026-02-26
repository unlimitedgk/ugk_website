import { supabase } from '@/lib/supabaseClient'
import { getStatusBadgeClass, getStatusLabel, type EventStatus } from '@/lib/eventStatus'
import Link from 'next/link'
import Image from 'next/image'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import Navbar from '@/components/Navbar'

export const dynamic = 'force-dynamic'

type Keeperday = {
  id: string
  title: string
  start_date: string
  start_time: string | null
  end_time: string | null
  capacity?: number | null
  target_year_min?: number | null
  target_year_max?: number | null
  city: string
  location_name: string
  price: number | string
  open_for_registration: boolean | null
  event_status?: EventStatus | null
  url_picture?: string | null
  description?: string | null
}

const formatTime = (value?: string | null) => {
  if (!value) return '—'
  const [hours, minutes] = value.split(':')
  if (!hours || !minutes) return value
  return `${hours}:${minutes}`
}

const formatPrice = (price: number | string) => {
  const numericPrice = Number(price)
  if (Number.isNaN(numericPrice)) {
    return '—'
  }

  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR',
  }).format(numericPrice)
}

export default async function KeeperdaysPage() {
  const { data: keeperdays } = await supabase
    .from('events')
    .select(
      'id, title, start_date, start_time, end_time, capacity, target_year_min, target_year_max, city, location_name, price, open_for_registration, event_status, url_picture, description'
    )
    .neq('event_status', 'draft')
    .eq('event_type', 'keeperday')
    .order('start_date', { ascending: true })

  return (
    <main id="top" className="bg-white text-slate-900">
      <Navbar showHome />

      <div className="mx-auto w-full max-w-6xl px-6 py-12 md:px-10">
        <div className="flex flex-col gap-3">
          <h1 className="text-3xl font-bold md:text-4xl">Bevorstehende Keeperdays</h1>
          <p className="text-base text-slate-600">
            Intensive Einzeltermine mit Fokus auf Technik, Präsenz und Entwicklung.
          </p>
        </div>

        <section className="mt-8">
          <Card className="border-indigo-100/70 bg-gradient-to-br from-indigo-50 via-white to-amber-50 shadow-[0_18px_40px_rgba(15,23,42,0.08)]">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg md:text-xl">
                Was ein Keeperday für dich bringt
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2 lg:grid-cols-2">
              {[
                {
                  icon: '⚡',
                  title: 'Eintägiger Workshop',
                  description: 'In Kleingruppen mit maximal 4 Torhütern arbeiten wir einen ganzen Tag intensiv an deiner Entwicklung.',
                },
                {
                  icon: '🎯',
                  title: 'Theorie und Praxis',
                  description: 'Durch kurze Impulsvortäge lernst du die Theorie und wendest sie sofort im Training an.',
                },
                {
                  icon: '📸',
                  title: 'Videoanalyse',
                  description: 'Wir filmen dich im Training in verschiedenen Situationen und analysieren gemeinsam deine Technik.',
                },
                {
                  icon: '📚',
                  title: 'Lernmaterial',
                  description: 'Videos und Unterlagen zu den Themen, stellen wir nach dem Workshop gratis zur Verfügung.',
                },
                {
                  icon: '💪',
                  title: 'Trainingsqualität',
                  description: 'Um die bestmögliche Trainingsqualität zu erreichen, arbeiten wir in Gruppen mit ähnlichem Niveau zusammen.',
                },
                {
                  icon: '🍽️',
                  title: 'Essen und Trinken',
                  description: 'Um die Energie den gesamten Tag hochhalten zu können, versorgen wir dich mit gesundem Essen, Snacks und Getränken.',
                },
              ].map((item) => (
                <div
                  key={item.title}
                  className="flex items-center gap-4 rounded-2xl border border-white/70 bg-white/90 p-4 shadow-sm"
                >
                  <span
                    aria-hidden="true"
                    className="flex h-10 w-12 items-center justify-center rounded-2xl bg-indigo-100 text-xl"
                  >
                    {item.icon}
                  </span>
                  <div>
                    <div className="text-sm font-semibold text-slate-900">
                      {item.title}
                    </div>
                    <div className="text-sm text-slate-600">{item.description}</div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </section>

        {!keeperdays || keeperdays.length === 0 ? (
          <p className="mt-8 text-base text-slate-600">
            Aktuell sind keine Keeperdays verfügbar.
          </p>
        ) : (
          <section className="mt-14">
            <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
              {keeperdays.map((keeperday) => {
                const canRegister = keeperday.open_for_registration === true
                const statusLabel = getStatusLabel(keeperday.event_status)
                const statusBadgeClass = getStatusBadgeClass(keeperday.event_status)
                return (
                  <div
                    key={keeperday.id}
                    className="w-full bg-white border rounded-xl p-6 text-left shadow-sm"
                  >
                    <Link href="/keeperdays" className="block mb-4">
                      {keeperday.url_picture ? (
                        <Image
                          src={keeperday.url_picture}
                          alt={`Vorschau für ${keeperday.title}`}
                          width={600}
                          height={400}
                          className="w-full h-40 object-cover rounded-lg"
                        />
                      ) : null}
                    </Link>
                    <h3 className="font-bold mb-1">🧤 {keeperday.title}</h3>
                    {keeperday.description ? (
                      <p className="text-sm font-bold text-amber-600 mb-2">
                        {keeperday.description}
                      </p>
                    ) : null}
                    <p className="text-sm text-gray-500 mb-2">
                      📍{keeperday.location_name} - {keeperday.city}
                    </p>
                    
                    <p className="text-sm text-gray-600 mb-2">
                      📆 {new Date(keeperday.start_date).toLocaleDateString('de-DE')}
                    </p>
                    <p className="text-sm text-gray-600 mb-2">
                      ⏰{' '}
                      {keeperday.start_time && keeperday.end_time
                        ? `${formatTime(keeperday.start_time)}–${formatTime(
                            keeperday.end_time
                          )}`
                        : '—'}
                    </p>
                    <p className="text-sm text-gray-600 mb-2">
                      🧤 Maximale Teilnehmer:{' '}
                      {keeperday.capacity != null ? keeperday.capacity : '—'}
                    </p>
                    {keeperday.target_year_min != null || keeperday.target_year_max != null ? (
                      <p className="text-sm text-gray-600 mb-2">
                        👥{' Jahrgänge: '}
                        {keeperday.target_year_min != null
                          ? keeperday.target_year_min
                          : '—'}
                        {' – '}
                        {keeperday.target_year_max != null
                          ? keeperday.target_year_max
                          : '—'}{' '}
                      </p>
                    ) : null}
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                    <span className="rounded-full bg-rose-100 px-3 py-1 text-xs font-semibold text-rose-600">
                      ‼️Limitierte Teilnehmeranzahl‼️
                    </span>
                    <p
                      className={`mb-2 inline-flex w-fit rounded-full px-3 py-1 text-sm font-semibold ${statusBadgeClass}`}
                    >
                      {statusLabel}
                    </p>
                  </div>
                    <div className="flex items-baseline justify-between mb-2">
                      <span className="text-sm font-medium text-gray-600">Preis</span>
                      <span className="text-lg font-semibold text-gray-900">
                        {formatPrice(keeperday.price)}
                      </span>
                    </div>
                    {canRegister ? (
                      <Link
                        href="/keeperdays/register"
                        className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-indigo-500 to-rose-500 px-6 text-sm font-semibold text-white shadow-lg shadow-indigo-200/60 transition hover:opacity-90"
                      >
                        Details ansehen und registrieren →
                      </Link>
                    ) : (
                      <span
                        className="inline-flex h-11 w-full cursor-not-allowed items-center justify-center gap-2 rounded-2xl bg-slate-200 px-6 text-sm font-semibold text-slate-500"
                        aria-disabled="true"
                      >
                        Details ansehen und registrieren →
                      </span>
                    )}
                  </div>
                )
              })}
            </div>
          </section>
        )}
      </div>
    </main>
  )
}
