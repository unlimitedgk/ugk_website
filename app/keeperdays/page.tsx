import { supabase } from '@/lib/supabaseClient'
import Link from 'next/link'
import Image from 'next/image'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import Navbar from '@/components/Navbar'

export const dynamic = 'force-dynamic'

type Keeperday = {
  id: string
  title: string
  date: string
  start_time: string | null
  end_time: string | null
  target_age_min?: number | null
  target_age_max?: number | null
  city: string
  location_name: string
  price: number | string
  open_for_registration: boolean
  url_keeperday_picture?: string | null
  target_level?: string[] | string | null
}

const getFirstTargetLevel = (level?: string[] | string | null) => {
  if (!level) return undefined
  return Array.isArray(level) ? level[0] : level
}

const getTargetLevelClassName = (level?: string) => {
  if (level === 'Anfänger') return 'bg-green-600'
  if (level === 'Amateur') return 'bg-blue-600'
  if (level === 'Fortgeschritten') return 'bg-orange-600'
  if (level === 'Profi') return 'bg-red-600'
  return 'bg-slate-600'
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
    .from('keeperdays')
    .select(
      'id, title, date, start_time, end_time, target_age_min, target_age_max, city, location_name, price, open_for_registration, url_keeperday_picture, target_level'
    )
    .order('date', { ascending: true })

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
            <CardContent className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {[
                {
                  icon: '⚡',
                  title: 'Eintägiges Event',
                  description: 'Klarer Fokus, kompakt und intensiv an einem Tag.',
                },
                {
                  icon: '🎯',
                  title: 'Spezifischer Schwerpunkt',
                  description: 'Gezieltes Training für deine aktuelle Entwicklungsstufe.',
                },
                {
                  icon: '🤝',
                  title: 'Gleiches Niveau',
                  description: 'Training mit Keepern, die auf deinem Level sind.',
                },
                {
                  icon: '📈',
                  title: 'Echte Weiterentwicklung',
                  description: 'Konkrete Impulse, die sofort Wirkung zeigen.',
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

        {!keeperdays || keeperdays.length === 0 ? (
          <p className="mt-8 text-base text-slate-600">
            Aktuell sind keine Keeperdays verfügbar.
          </p>
        ) : (
          <section className="mt-14">
            <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
              {keeperdays.map((keeperday) => {
                const level = getFirstTargetLevel(keeperday.target_level)
                return (
                  <div
                    key={keeperday.id}
                    className="w-full bg-white border rounded-xl p-6 text-left shadow-sm"
                  >
                    <Link href="/keeperdays" className="block mb-4">
                      {keeperday.url_keeperday_picture ? (
                        <Image
                          src={keeperday.url_keeperday_picture}
                          alt={`Vorschau für ${keeperday.title}`}
                          width={600}
                          height={400}
                          className="w-full h-40 object-cover rounded-lg"
                        />
                      ) : null}
                    </Link>
                    <h3 className="font-bold mb-1">🧤 {keeperday.title}</h3>
                    <p className="text-sm text-gray-500 mb-2">
                      📍{keeperday.location_name} - {keeperday.city}
                    </p>
                    <p
                      className={`text-sm font-semibold mb-2 ${
                        keeperday.open_for_registration
                          ? 'text-emerald-600'
                          : 'text-rose-600'
                      }`}
                    >
                      {keeperday.open_for_registration
                        ? 'Registrierung möglich'
                        : 'Keeperday ausgebucht'}
                    </p>
                    <p className="text-sm text-gray-600 mb-2">
                      📆 {new Date(keeperday.date).toLocaleDateString('de-DE')}
                    </p>
                    <p className="text-sm text-gray-600 mb-2">
                      ⏰{' '}
                      {keeperday.start_time && keeperday.end_time
                        ? `${formatTime(keeperday.start_time)}–${formatTime(
                            keeperday.end_time
                          )}`
                        : '—'}
                    </p>
                    {keeperday.target_age_min != null || keeperday.target_age_max != null ? (
                      <p className="text-sm text-gray-600 mb-2">
                        👥{' '}
                        {keeperday.target_age_min != null
                          ? keeperday.target_age_min
                          : '—'}
                        {' – '}
                        {keeperday.target_age_max != null
                          ? keeperday.target_age_max
                          : '—'}{' '}
                        Jahre
                      </p>
                    ) : null}
                    {level ? (
                      <span
                        className={`mb-5 inline-block w-fit rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide text-white ${getTargetLevelClassName(
                          level
                        )}`}
                      >
                        Zielniveau: {level}
                      </span>
                    ) : null}
                    <div className="flex items-baseline justify-between mb-2">
                      <span className="text-sm font-medium text-gray-600">Preis</span>
                      <span className="text-lg font-semibold text-gray-900">
                        {formatPrice(keeperday.price)}
                      </span>
                    </div>
                    {keeperday.open_for_registration ? (
                      <Link
                        href="/keeperdays/register"
                        className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-indigo-500 to-rose-500 px-6 text-sm font-semibold text-white shadow-lg shadow-indigo-200/60 transition hover:opacity-90"
                      >
                        Details ansehen und registrieren →
                      </Link>
                    ) : (
                      <span className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-2xl bg-slate-200 px-6 text-sm font-semibold text-slate-500">
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
