import Link from 'next/link'
import { supabase } from '@/lib/supabaseClient'
import { Camp } from '@/types/camp'
import Image from "next/image"
import AboutSection from '@/components/AboutSection'
import { Button } from '@/components/ui/button'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'

export default async function HomePage() {
  
  const { data: camps } = await supabase
    .from('camps')
    .select('*')
    .eq('open_for_registration', true)
    .gte('start_date', new Date().toISOString())
    .order('start_date', { ascending: true })
    .limit(1)
  const nextCamp = camps?.[0]
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
              href="#about"
              size="lg"
              className="w-auto border border-white/70 bg-black/80 text-white text-lg"
            >
              Wer wir sind
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
                  <Image
                    src="/images/training/Training_02.jpg"
                    alt={`Vorschau für ${nextCamp.title}`}
                    width={600}
                    height={400}
                    className="w-full h-40 object-cover rounded-lg"
                  />
                </Link>
                <h3 className="font-bold mb-1">{nextCamp.title}</h3>
                <p className="text-sm text-gray-500 mb-2">
                  {nextCamp.location}
                </p>
                <p className="text-sm text-gray-600 mb-4">
                  {new Date(nextCamp.start_date).toLocaleDateString('de-DE')} –{' '}
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
            Alle Camps ansehen
          </Button>
        </div>
      </section>

      {/* Keeperdays Section (hidden until ready)
      <section id="keeperdays" className="py-24">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <h2 className="text-3xl font-bold mb-4">Keeperdays</h2>
          <p className="text-gray-600 mb-12">
            Einzeltage mit Fokus auf Technik, Spielverständnis und Athletik
          </p>

          <Link
            href="/keeperdays"
            className="px-8 py-4 rounded-xl bg-black text-white text-lg font-semibold"
          >
            Mehr Infos
          </Link>
        </div>
      </section>
      */}

      {/* About Section */}
      <AboutSection />

      {/* Footer */}
      <Footer />
    </main>
  )
}