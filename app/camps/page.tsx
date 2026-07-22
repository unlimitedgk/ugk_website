import { supabase } from '@/lib/supabaseClient'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import Navbar from '@/components/Navbar'
import { EventCard } from '@/components/EventCard'

export const dynamic = 'force-dynamic'

export default async function CampsPage() {
  const { data: camps } = await supabase
    .from('events')
    .select(
      'id, title, description,start_date, end_date, start_time, end_time, city, location_name, price, open_for_registration, event_status, url_picture'
    )
    .neq('event_status', 'draft')
    .neq('event_status', 'archived')
    .eq('event_type', 'camp')
    .order('start_date', { ascending: false })

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
                <EventCard
                  key={camp.id}
                  event={camp}
                  registerHref="/camps/register"
                  registerLabel="Details ansehen und registrieren →"
                  imageAltPrefix="Camp"
                />
              ))}
            </div>
          </section>
        )}
      </div>
    </main>
  )
}