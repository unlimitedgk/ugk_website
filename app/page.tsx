import Link from 'next/link'
import { supabase } from '@/lib/supabaseClient'
import Image from "next/image"
import AboutSection from '@/components/AboutSection'
import { Button } from '@/components/ui/button'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'

export const dynamic = 'force-dynamic'

export default async function HomePage() {
  
  const { data: camps } = await supabase
    .from('camps')
    .select('*')
    .eq('open_for_registration', true)
    .gte('start_date', new Date().toISOString())
    .order('start_date', { ascending: true })
    .limit(1)
  const nextCamp = camps?.[0]
  const { data: keeperdays } = await supabase
    .from('keeperdays')
    .select('*')
    .eq('open_for_registration', true)
    .gte('date', new Date().toISOString())
    .order('date', { ascending: true })
    .limit(1)
  const nextKeeperday = keeperdays?.[0]
  const nextKeeperdayLevel = Array.isArray(nextKeeperday?.target_level)
    ? nextKeeperday?.target_level?.[0]
    : nextKeeperday?.target_level
  const keeperdayLevelClassName =
    nextKeeperdayLevel === 'Anfänger'
      ? 'bg-green-600'
      : nextKeeperdayLevel === 'Amateur'
      ? 'bg-blue-600'
      : nextKeeperdayLevel === 'Fortgeschritten'
      ? 'bg-orange-600'
      : nextKeeperdayLevel === 'Profi'
      ? 'bg-red-600'
      : 'bg-black'
  return (
    <main id="top" className="bg-white text-gray-900">
      {/* Navbar */}
      <Navbar showLogin />

      {/* Hero */}
      <section
        className="relative overflow-hidden py-32 text-center text-white"
        style={{
          backgroundImage: "url('/images/training/Training_01.jpg')",
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        <div className="absolute inset-0 bg-black/60" aria-hidden="true" />
        <div className="relative">
          <h1 className="text-5xl md:text-6xl font-extrabold mb-6">
            Unlimited Goalkeeping
            <span className="block text-gold-500 mt-2">Wir leben Torwart</span>
          </h1>

          <p className="text-2xl text-gray-200 mb-10">
            Greif nach deinem nächsten Level
          </p>

          <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row sm:gap-4">
            <Button
              as="a"
              href="/camps"
              size="lg"
              className="w-auto border border-white/70 bg-black/80 text-white text-lg"
            >
              Camps entdecken
            </Button>
            <Button
              as="a"
              href="/keeperdays"
              size="lg"
              className="w-auto border border-white/70 bg-black/80 text-white text-lg"
            >
              Keeperdays entdecken
            </Button>
          </div>
        </div>
      </section>

      {/* Camps Section */}
      <section id="camps" className="bg-gray-50 py-24">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <h2 className="text-3xl font-bold mb-4">Torwartcamps</h2>
          <p className="text-gray-600 mb-12">
            Nächstes verfügbares Camp
          </p>

          <div className="flex justify-center mb-12">
            {nextCamp ? (
              <div
                key={nextCamp.id}
                className="w-full max-w-md bg-white border rounded-xl p-6 text-left shadow-sm"
              >
                <Link href="/camps" className="block mb-4">
                  {nextCamp.url_camp_picture ? (
                    <Image
                      src={nextCamp.url_camp_picture}
                      alt={`Vorschau für ${nextCamp.title}`}
                      width={600}
                      height={400}
                      className="w-full h-40 object-cover rounded-lg"
                    />
                  ) : null}
                </Link>
                <h3 className="font-bold mb-1">🧤 {nextCamp.title}</h3>
                <p className="text-sm text-gray-500 mb-2">
                📍{nextCamp.location_name} -{' '} {nextCamp.city}
                </p>
                <p className="text-sm text-gray-600 mb-4">
                  📆 {new Date(nextCamp.start_date).toLocaleDateString('de-DE')} –{' '}
                  {new Date(nextCamp.end_date).toLocaleDateString('de-DE')}
                </p>

                <Link
                  href="/camps"
                  className="font-semibold underline"
                >
                  Mehr Infos →
                </Link>
              </div>
            ) : null}
          </div>

          <Button 
          as="a" 
          href="/camps" 
          size="slg"
          className="w-auto border border-black bg-black/80 text-white text-lg"
          >
            Alle Camps anzeigen
          </Button>
        </div>
      </section>

      {/* Keeperdays Section */}
      <section id="keeperdays" className="bg-white py-24">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <h2 className="text-3xl font-bold mb-4">Keeperdays</h2>
          <p className="text-gray-600 mb-12">
            Nächster verfügbarer Keeperday
          </p>

          <div className="flex justify-center mb-12">
            {nextKeeperday ? (
              <div
                key={nextKeeperday.id}
                className="w-full max-w-md bg-white border rounded-xl p-6 text-left shadow-sm"
              >
                <Link href="/keeperdays" className="block mb-4">
                  {nextKeeperday.url_keeperday_picture ? (
                    <Image
                      src={nextKeeperday.url_keeperday_picture}
                      alt={`Vorschau für ${nextKeeperday.title}`}
                      width={600}
                      height={400}
                      className="w-full h-40 object-cover rounded-lg"
                    />
                  ) : null}
                </Link>
                <h3 className="font-bold mb-1">🧤 {nextKeeperday.title}</h3>
                <p className="text-sm text-gray-500 mb-2">
                  📍{nextKeeperday.location_name} -{' '} {nextKeeperday.city}
                </p>
                <p className="text-sm text-gray-600 mb-2">
                📆 {new Date(nextKeeperday.date).toLocaleDateString('de-DE')}
                </p>
                {nextKeeperday.target_age_min != null || nextKeeperday.target_age_max != null ? (
                  <p className="text-sm text-gray-600 mb-2">
                    👥{' '}
                    {nextKeeperday.target_age_min != null
                      ? nextKeeperday.target_age_min
                      : '—'}
                    {' – '}
                    {nextKeeperday.target_age_max != null
                      ? nextKeeperday.target_age_max
                      : '—'}{' '}
                    Jahre
                  </p>
                ) : null}
                {nextKeeperdayLevel ? (
                  <span
                    className={`inline-block w-fit rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide text-white ${keeperdayLevelClassName}`}
                  >
                    Zielniveau: {nextKeeperdayLevel}
                  </span>
                ) : null}
                <Link
                  href="/keeperdays"
                  className="block px-1 py-2 font-semibold underline"
                >
                  Mehr Infos →
                </Link>
              </div>
            ) : null}
          </div>

          <Button
            as="a"
            href="/keeperdays"
            size="slg"
            className="w-auto border border-black bg-black/80 text-white text-lg"
          >
            Alle Keeperdays anzeigen
          </Button>
        </div>
      </section>

      {/* About Section */}
      <AboutSection />

      {/* Footer */}
      <Footer />
    </main>
  )
}