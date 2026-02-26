import { supabase } from '@/lib/supabaseClient'
import { getStatusBadgeClass, getStatusLabel, type EventStatus } from '@/lib/eventStatus'
import Link from 'next/link'
import Image from 'next/image'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import Navbar from '@/components/Navbar'

export const dynamic = 'force-dynamic'

type Camp = {
  id: string
  title: string
  start_date: string
  end_date: string
  start_time: string | null
  end_time: string | null
  city: string
  location_name: string
  price: number | string
  open_for_registration: boolean | null
  event_status?: EventStatus | null
  url_picture?: string | null
}

export default async function CampsPage() {
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

  const formatTime = (time: string | null) => {
    if (!time) {
      return '—'
    }

    return time.split(':').slice(0, 2).join(':')
  }

  const { data: camps } = await supabase
    .from('events')
    .select(
      'id, title, start_date, end_date, start_time, end_time, city, location_name, price, open_for_registration, event_status, url_picture'
    )
    .neq('event_status', 'draft')
    .eq('event_type', 'camp')
    .order('start_date', { ascending: true })

  return (
    <main id="top" className="bg-white text-slate-900">
      <Navbar showHome />

      <div className="mx-auto w-full max-w-6xl px-6 py-12 md:px-10">
        <div className="flex flex-col gap-3">
          <h1 className="text-3xl font-bold md:text-4xl">Bevorstehende Torwart-Camps</h1>
          <p className="text-base text-slate-600">
        Finde dein nächstes Camp und melde dich mit wenigen Klicks an.
          </p>
        </div>

        <section className="mt-8">
          <Card className="border-indigo-100/70 bg-gradient-to-br from-indigo-50 via-white to-amber-50 shadow-[0_18px_40px_rgba(15,23,42,0.08)]">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg md:text-xl">
                Was macht ein Camp besonders?
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {[
                {
                  icon: '🗓️',
                  title: 'Mehrtägiges Event',
                  description:
                    'Training und Fußball über mehrere Tage.',
                },
                {
                  icon: '🌍',
                  title: 'Leistungsunabhängig',
                  description: 'Für alle Altersklassen und Leistungsniveaus.',
                },
                {
                  icon: '🤝',
                  title: 'Gruppentrainings',
                  description: 'Unterschiedliche Gruppen für echte Teamdynamik.',
                },
                {
                  icon: '🎉',
                  title: 'Spaß',
                  description: 'Energie und gemeinsam besser werden.',
                },
              ].map((item) => (
                <div
                  key={item.title}
                  className="flex items-center gap-4 rounded-2xl border border-white/70 bg-white/90 p-4 shadow-sm"
                >
                  <span
                    aria-hidden="true"
                    className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-100 text-xl"
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

        {!camps || camps.length === 0 ? (
          <p className="mt-8 text-base text-slate-600">
            Aktuell sind keine Camps verfügbar.
          </p>
        ) : (
          <section className="mt-14">
            <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
              {camps.map((camp) => (
                <Card key={camp.id} className="flex h-full flex-col overflow-hidden">
                  <div className="relative h-32 w-full">
                    {camp.url_picture ? (
                      <Image
                        src={camp.url_picture}
                        alt={`Camp ${camp.title}`}
                        fill
                        className="object-cover"
                        sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 33vw"
                      />
                    ) : null}
                  </div>
                  <CardHeader className="gap-1">
                    <div className="text-xs uppercase tracking-[0.2em] text-slate-400">
                      {camp.city}
                    </div>
                    <CardTitle className="text-xl">{camp.title}</CardTitle>
                    <div className="text-sm text-slate-500">{camp.location_name}</div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {(() => {
                      const statusLabel = getStatusLabel(camp.event_status)
                      const statusClass = getStatusBadgeClass(camp.event_status)
                      return (
                        <div
                          className={`inline-flex w-fit rounded-full px-3 py-1 text-sm font-semibold ${statusClass}`}
                        >
                          {statusLabel}
                        </div>
                      )
                    })()}
                    <div className="flex flex-wrap items-center gap-2 text-sm text-slate-600">
                      <span className="rounded-full bg-slate-100 px-3 py-1">
                        {camp.start_date} – {camp.end_date}
                      </span>
                      <span className="rounded-full bg-slate-100 px-3 py-1">
                        {camp.start_time && camp.end_time
                          ? `${formatTime(camp.start_time)}–${formatTime(camp.end_time)}`
                          : '—'}
                      </span>
                    </div>
                    <div className="flex items-baseline justify-between">
                      <span className="text-sm font-medium text-slate-600">Preis</span>
                      <span className="text-lg font-semibold text-slate-900">
                        {formatPrice(camp.price)}
                      </span>
                    </div>
                  </CardContent>
                  <CardFooter className="mt-auto">
                    {camp.open_for_registration ? (
                      <Link
                        href="/camps/register"
                        className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-indigo-500 to-rose-500 px-6 text-sm font-semibold text-white shadow-lg shadow-indigo-200/60 transition hover:opacity-90"
                      >
                        Jetzt registrieren →
                      </Link>
                    ) : (
                      <span className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-2xl bg-slate-200 px-6 text-sm font-semibold text-slate-500">
                        Jetzt registrieren →
                      </span>
                    )}
                  </CardFooter>
                </Card>
              ))}
            </div>
          </section>
        )}
      </div>
    </main>
  )
}