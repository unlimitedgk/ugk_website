import { supabase } from '@/lib/supabaseClient'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import Navbar from '@/components/Navbar'
import { EventCard } from '@/components/EventCard'

export const dynamic = 'force-dynamic'

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
              {keeperdays.map((keeperday) => (
                <EventCard
                  key={keeperday.id}
                  event={keeperday}
                  registerHref="/keeperdays/register"
                  registerLabel="Details ansehen und registrieren →"
                  imageAltPrefix="Keeperday"
                />
              ))}
            </div>
          </section>
        )}
      </div>
    </main>
  )
}
