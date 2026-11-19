'use client'

// "Angebote"-Section (Variante C – Kartenreihe):
// Desktop: 3 Karten nebeneinander + Pfeile. iPhone: eine Karte, wischen zur nächsten.
// Deep-Links wie /#camps oder /#keeperdays scrollen zur Section und springen zur passenden Karte.

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Swiper, SwiperSlide } from 'swiper/react'
import { A11y, Keyboard } from 'swiper/modules'
import type { Swiper as SwiperType } from 'swiper'
import 'swiper/css'
import { defaultTargetYears, formatTargetYears } from '@/lib/trainingGroup'

export type AngeboteEvent = {
  title: string
  start_date: string
  end_date?: string | null
  city?: string | null
  location_name?: string | null
  target_year_min?: number | null
  target_year_max?: number | null
}

type Offer = {
  id: string
  label: string
  tagline: string
  image: string
  badge: string
  facts: { icon: string; text: string }[]
  primary: { label: string; href: string }
}

const SECTION_ID = 'angebote'
const SHOW_KEEPERDAYS = true

const formatDate = (value: string) => new Date(value).toLocaleDateString('de-DE')
const formatPlace = (e: AngeboteEvent) => [e.location_name, e.city].filter(Boolean).join(' - ')

function buildOffers(nextCamp?: AngeboteEvent | null, nextKeeperday?: AngeboteEvent | null): Offer[] {
  const year = new Date().getFullYear()
  const youthYears = defaultTargetYears('youth', year)

  const campFacts = nextCamp
    ? [
        { icon: '🧤', text: `Nächstes Camp: ${nextCamp.title}` },
        ...(formatPlace(nextCamp) ? [{ icon: '📍', text: formatPlace(nextCamp) }] : []),
        {
          icon: '📆',
          text: nextCamp.end_date
            ? `${formatDate(nextCamp.start_date)} – ${formatDate(nextCamp.end_date)}`
            : formatDate(nextCamp.start_date),
        },
      ]
    : [
        { icon: '🧤', text: 'Neue Camps sind in Planung' },
        { icon: '👥', text: 'Für alle, die gerne Torwart sind' },
      ]

  const keeperdayYears = nextKeeperday
    ? formatTargetYears(nextKeeperday.target_year_min, nextKeeperday.target_year_max)
    : null
  const keeperdayFacts = nextKeeperday
    ? [
        { icon: '🧤', text: `Nächster Termin: ${nextKeeperday.title}` },
        ...(formatPlace(nextKeeperday) ? [{ icon: '📍', text: formatPlace(nextKeeperday) }] : []),
        { icon: '📆', text: formatDate(nextKeeperday.start_date) },
        ...(keeperdayYears ? [{ icon: '👥', text: `Jahrgänge ${keeperdayYears}` }] : []),
      ]
    : [
        { icon: '🚀', text: 'Training, Videoanalyse & Lernmaterial' },
        { icon: '📈', text: 'Nach Level: Anfänger bis Profi' },
      ]

  return [
    {
      // id bleibt 'kindertraining', damit bestehende Deep-Links (/#kindertraining) weiter funktionieren
      id: 'kindertraining',
      label: 'Gruppentraining',
      tagline: 'Spielerisch die Torwart-Basics lernen',
      image: '/images/homepage/Banner_Kindertraining.jpg',
      badge: 'Wöchentlich',
      facts: [
        { icon: '📆', text: 'Jeden Samstag, 9:00–10:00' },
        { icon: '👥', text: 'Für alle Jahrgänge offen' },
        { icon: '🎯', text: 'Spiel, Spaß & Bälle halten' },
      ],
      primary: { label: 'Kostenloses Schnuppertraining', href: '/trial_training/register' },
    },
    {
      id: 'jugendtraining',
      label: 'Jugendtraining',
      tagline: 'Leistungsorientiert aufs nächste Level',
      image: '/images/homepage/Banner_Jugendtraining.jpg',
      badge: 'Wöchentlich',
      facts: [
        // TODO: echte Trainingszeit Jugendtraining eintragen
        { icon: '📆', text: 'Je nach Verfügbarkeit' },
        { icon: '👥', text: `Jahrgänge ${formatTargetYears(youthYears.min, youthYears.max)}` },
        { icon: '🎯', text: 'Großes Tor und kleine Gruppe' },
      ],
      primary: { label: 'Kostenloses Schnuppertraining', href: '/trial_training/register' },
    },
    {
      id: 'camps',
      label: 'Camps',
      tagline: 'Mehrtägige Kinder- und Jugendcamps',
      image: '/images/homepage/Banner_Camp.jpg',
      badge: 'Ferien',
      facts: campFacts,
      primary: { label: 'Alle Camps anzeigen', href: '/camps' },
    },
    {
      id: 'keeperdays',
      label: 'Keeperdays',
      tagline: 'Intensive Tagesworkshops',
      image: '/images/keeperdays/default.jpg',
      badge: 'Tagesworkshop',
      facts: keeperdayFacts,
      primary: { label: 'Alle Keeperdays anzeigen', href: '/keeperdays' },
    },
  ]
}

function Arrow({ dir, onClick, disabled }: { dir: 'prev' | 'next'; onClick: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={dir === 'prev' ? 'Vorheriges Angebot' : 'Nächstes Angebot'}
      className="flex h-11 w-11 items-center justify-center rounded-full border-2 border-slate-200 bg-white text-slate-800 shadow-md transition hover:bg-slate-50 disabled:opacity-30"
    >
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2.5}>
        {dir === 'prev' ? <path d="M15 18l-6-6 6-6" /> : <path d="M9 6l6 6-6 6" />}
      </svg>
    </button>
  )
}

export default function AngeboteSection({
  nextCamp,
  nextKeeperday,
}: {
  nextCamp?: AngeboteEvent | null
  nextKeeperday?: AngeboteEvent | null
}) {
  // Keeperdays vorerst ausgeblendet (noch keine Termine) – zum Einblenden SHOW_KEEPERDAYS auf true setzen
  const offers = buildOffers(nextCamp, nextKeeperday).filter((o) => SHOW_KEEPERDAYS || o.id !== 'keeperdays')
  const [swiper, setSwiper] = useState<SwiperType | null>(null)
  const [active, setActive] = useState(0)
  const [edges, setEdges] = useState({ start: true, end: false })

  // Deep-Links: /#kindertraining, /#jugendtraining, /#camps, /#keeperdays
  useEffect(() => {
    if (!swiper) return
    const apply = () => {
      const id = window.location.hash.replace('#', '')
      const idx = offers.findIndex((o) => o.id === id)
      if (idx < 0) return
      swiper.slideTo(idx)
      document.getElementById(SECTION_ID)?.scrollIntoView({ behavior: 'smooth' })
    }
    apply()
    window.addEventListener('hashchange', apply)
    return () => window.removeEventListener('hashchange', apply)
    // offers-IDs sind statisch – nur bei neuem Swiper neu binden
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [swiper])

  return (
    <section id={SECTION_ID} className="scroll-mt-[50px] overflow-x-hidden bg-white py-16 md:py-24">
      <div className="mx-auto max-w-7xl px-4 text-center sm:px-6">
        <h2 className="mb-3 text-3xl font-bold">Angebote</h2>
        <p className="mx-auto mb-10 max-w-2xl text-slate-600">
          Vom wöchentlichen Training bis zum Camp – finde das passende Angebot.
        </p>

        <div className="mx-auto max-w-6xl">
          {/* Pfeile nur zeigen, wenn es etwas zu blättern gibt */}
          <div className={`mb-4 justify-end gap-3 ${edges.start && edges.end ? 'hidden' : 'hidden md:flex'}`}>
            <Arrow dir="prev" onClick={() => swiper?.slidePrev()} disabled={edges.start} />
            <Arrow dir="next" onClick={() => swiper?.slideNext()} disabled={edges.end} />
          </div>
          <Swiper
            modules={[A11y, Keyboard]}
            keyboard={{ enabled: true, onlyInViewport: true }}
            grabCursor
            onSwiper={setSwiper}
            onSlideChange={(s) => setActive(s.activeIndex)}
            onProgress={(s) => setEdges({ start: s.isBeginning, end: s.isEnd })}
            slidesPerView={1.15}
            spaceBetween={14}
            breakpoints={{ 640: { slidesPerView: 2.1, spaceBetween: 18 }, 1024: { slidesPerView: 3, spaceBetween: 24 } }}
            className="!overflow-visible md:!overflow-hidden"
          >
            {offers.map((o) => (
              <SwiperSlide key={o.id} className="!h-auto">
                <article className="flex h-full flex-col overflow-hidden rounded-3xl border-2 border-slate-200 bg-white text-left shadow-[0_8px_24px_rgba(15,23,42,0.12)]">
                  <div className="relative aspect-[4/3]">
                    <Image
                      src={o.image}
                      alt={o.label}
                      fill
                      sizes="(min-width: 1024px) 380px, (min-width: 640px) 48vw, 88vw"
                      draggable={false}
                      className="select-none object-cover"
                    />
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-4 pt-12">
                      <h3 className="text-2xl font-extrabold text-white">{o.label}</h3>
                    </div>
                    <span className="absolute right-3 top-3 rounded-full bg-gold-500 px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-black">
                      {o.badge}
                    </span>
                  </div>
                  <div className="flex flex-1 flex-col p-5">
                    <p className="mb-3 font-semibold text-slate-800">{o.tagline}</p>
                    <ul className="mb-5 space-y-1.5 text-sm text-slate-700">
                      {o.facts.map((f) => (
                        <li key={f.text}>
                          {f.icon} {f.text}
                        </li>
                      ))}
                    </ul>
                    <Link
                      href={o.primary.href}
                      className="mt-auto inline-flex h-11 items-center justify-center rounded-2xl bg-black/85 px-5 text-sm font-semibold text-white transition hover:bg-black"
                    >
                      {o.primary.label}
                    </Link>
                  </div>
                </article>
              </SwiperSlide>
            ))}
          </Swiper>
          <div className="mt-6 flex items-center justify-center gap-2 md:hidden">
            {offers.map((o, i) => (
              <button
                key={o.id}
                type="button"
                onClick={() => swiper?.slideTo(i)}
                aria-label={`Zu ${o.label}`}
                className={`h-2 rounded-full transition-all ${i === active ? 'w-6 bg-slate-700' : 'w-2 bg-slate-300'}`}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
