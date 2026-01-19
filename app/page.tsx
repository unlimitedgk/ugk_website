import Link from 'next/link'
import { supabase } from '@/lib/supabaseClient'
import { Camp } from '@/types/camp'
import Image from "next/image"
import AboutSection from '@/components/AboutSection'

export default async function HomePage() {
  
  const { data: camps } = await supabase
    .from('camps')
    .select('*')
    .gte('start_date', new Date().toISOString())
    .order('start_date', { ascending: true })
    .limit(1)
  const nextCamp = camps?.[0]
  return (
    <main className="bg-white text-gray-900">
      {/* Navbar */}
      <header className="sticky top-0 z-50 bg-white">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center">
            <Image
              src="/images/brand/logo-black.png"
              alt="Unlimited Goalkeeping"
              width={80}
              height={20}
              className="h-8 w-auto md:h-10"
              priority
            />
          </Link>

          <nav className="hidden md:flex items-center gap-8 text-sm font-medium">
            <a href="#camps" className="hover:text-black">Camps</a>
            <a href="#keeperdays" className="hover:text-black">Keeperdays</a>
            <a href="#about" className="hover:text-black">Über Uns</a>
            <Link
              href="/login"
              className="ml-4 px-4 py-2 rounded-lg bg-black text-white hover:bg-gray-800"
            >
              Login
            </Link>
          </nav>
        </div>
      </header>

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
            <span className="block text-yellow-400 mt-2">Wir leben Torwart</span>
          </h1>

          <p className="text-2xl text-gray-200 mb-10">
            Greif nach deinem nächsten Level
          </p>

          <div className="flex justify-center gap-4">
            <a
              href="#camps"
              className="px-8 py-4 rounded-xl bg-black/80 text-white text-lg font-semibold"
            >
              Camps entdecken
            </a>
            <a
              href="#about"
              className="px-8 py-4 rounded-xl border border-white/70 text-lg font-semibold"
            >
              Wer wir sind
            </a>
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

          <Link
            href="/camps"
            className="inline-block px-8 py-4 rounded-xl bg-black text-white text-lg font-semibold"
          >
            Alle Camps ansehen
          </Link>
        </div>
      </section>

      {/* Keeperdays Section */}
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

      {/* About Section */}
      <AboutSection />

      {/* Footer */}
      <footer className="bg-black text-gray-400 py-10 text-center">
        © {new Date().getFullYear()} Unlimited Goalkeeping
      </footer>
    </main>
  )
}