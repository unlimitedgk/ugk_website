'use client'

// PROTOTYP – drei Varianten der "Angebote"-Section, alle auf Basis von Swiper
// (bereits im Projekt installiert und in GruppentrainingsSection im Einsatz).

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Swiper, SwiperSlide } from 'swiper/react'
import { A11y, Keyboard } from 'swiper/modules'
import type { Swiper as SwiperType } from 'swiper'
import 'swiper/css'
import { OFFERS, type Offer } from './offers'

/* ---------- gemeinsame Bausteine ---------- */

function useOfferSwiper() {
  const [swiper, setSwiper] = useState<SwiperType | null>(null)
  const [active, setActive] = useState(0)

  // Deep-Links: /#camps, /#keeperdays … springen direkt zum passenden Banner
  useEffect(() => {
    if (!swiper) return
    const apply = () => {
      const id = window.location.hash.replace('#', '')
      const idx = OFFERS.findIndex((o) => o.id === id)
      if (idx >= 0) swiper.slideTo(idx)
    }
    apply()
    window.addEventListener('hashchange', apply)
    return () => window.removeEventListener('hashchange', apply)
  }, [swiper])

  const bind = {
    onSwiper: setSwiper,
    onSlideChange: (s: SwiperType) => setActive(s.activeIndex),
    modules: [A11y, Keyboard],
    keyboard: { enabled: true, onlyInViewport: true },
    grabCursor: true,
  }
  return { swiper, active, bind }
}

function Arrow({
  dir,
  onClick,
  disabled,
  className = '',
}: {
  dir: 'prev' | 'next'
  onClick: () => void
  disabled?: boolean
  className?: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={dir === 'prev' ? 'Vorheriges Angebot' : 'Nächstes Angebot'}
      className={`flex h-11 w-11 items-center justify-center rounded-full border-2 border-slate-200 bg-white text-slate-800 shadow-md transition hover:bg-slate-50 disabled:opacity-30 ${className}`}
    >
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2.5}>
        {dir === 'prev' ? <path d="M15 18l-6-6 6-6" /> : <path d="M9 6l6 6-6 6" />}
      </svg>
    </button>
  )
}

function Dots({ active, onSelect, dark = false }: { active: number; onSelect: (i: number) => void; dark?: boolean }) {
  return (
    <div className="flex items-center justify-center gap-2">
      {OFFERS.map((o, i) => (
        <button
          key={o.id}
          type="button"
          onClick={() => onSelect(i)}
          aria-label={`Zu ${o.label}`}
          className={`h-2 rounded-full transition-all ${
            i === active ? `w-6 ${dark ? 'bg-white' : 'bg-slate-700'}` : `w-2 ${dark ? 'bg-white/50' : 'bg-slate-300'}`
          }`}
        />
      ))}
    </div>
  )
}

function Tabs({ active, onSelect }: { active: number; onSelect: (i: number) => void }) {
  return (
    <div className="-mx-4 mb-6 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:justify-center sm:px-0 [scrollbar-width:none]">
      {OFFERS.map((o, i) => (
        <button
          key={o.id}
          type="button"
          onClick={() => onSelect(i)}
          className={`shrink-0 rounded-full border-2 px-4 py-1.5 text-sm font-semibold transition ${
            i === active
              ? 'border-slate-900 bg-slate-900 text-white'
              : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

function Ctas({ offer, onDark = false }: { offer: Offer; onDark?: boolean }) {
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
      <Link
        href={offer.primary.href}
        className={`inline-flex h-11 items-center justify-center rounded-2xl px-5 text-sm font-semibold transition ${
          onDark ? 'bg-white text-slate-900 hover:bg-slate-100' : 'bg-black/85 text-white hover:bg-black'
        }`}
      >
        {offer.primary.label}
      </Link>
      {offer.secondary ? (
        <Link
          href={offer.secondary.href}
          className={`inline-flex h-11 items-center justify-center rounded-2xl border px-5 text-sm font-semibold transition ${
            onDark ? 'border-white/70 text-white hover:bg-white/10' : 'border-slate-300 text-slate-800 hover:bg-slate-50'
          }`}
        >
          {offer.secondary.label}
        </Link>
      ) : null}
    </div>
  )
}

/* ---------- Variante A: Bild-Banner mit Tabs ---------- */

export function VariantA() {
  const { swiper, active, bind } = useOfferSwiper()
  const go = (i: number) => swiper?.slideTo(i)

  return (
    <div className="mx-auto max-w-5xl">
      <Tabs active={active} onSelect={go} />
      <div className="relative">
        <Swiper {...bind} slidesPerView={1.06} spaceBetween={12} breakpoints={{ 768: { slidesPerView: 1, spaceBetween: 24 } }}>
          {OFFERS.map((o) => (
            <SwiperSlide key={o.id}>
              <article className="relative h-[540px] overflow-hidden rounded-3xl border-2 border-slate-200 shadow-[0_12px_30px_rgba(15,23,42,0.18)] md:h-[460px]">
                <img src={o.image} alt="" draggable={false} className="absolute inset-0 h-full w-full select-none object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/55 to-black/10 md:bg-gradient-to-r md:from-black/85 md:via-black/50 md:to-transparent" />
                <div className="relative flex h-full flex-col justify-end p-6 text-left text-white md:max-w-lg md:justify-center md:p-10">
                  <span className="mb-3 w-fit rounded-full bg-gold-500 px-3 py-1 text-xs font-bold uppercase tracking-wide text-black">
                    {o.badge}
                  </span>
                  <h3 className="text-3xl font-extrabold md:text-4xl">{o.label}</h3>
                  <p className="mb-4 mt-1 text-lg text-gray-200">{o.tagline}</p>
                  <ul className="mb-6 space-y-1.5 text-sm md:text-base">
                    {o.facts.map((f) => (
                      <li key={f.text}>
                        {f.icon} {f.text}
                      </li>
                    ))}
                  </ul>
                  <Ctas offer={o} onDark />
                </div>
              </article>
            </SwiperSlide>
          ))}
        </Swiper>
        <Arrow dir="prev" onClick={() => swiper?.slidePrev()} disabled={active === 0} className="absolute -left-5 top-1/2 z-10 hidden -translate-y-1/2 md:flex" />
        <Arrow dir="next" onClick={() => swiper?.slideNext()} disabled={active === OFFERS.length - 1} className="absolute -right-5 top-1/2 z-10 hidden -translate-y-1/2 md:flex" />
      </div>
      <div className="mt-5">
        <Dots active={active} onSelect={go} />
      </div>
    </div>
  )
}

/* ---------- Variante B: Split-Banner (Bild + Infos nebeneinander) ---------- */

export function VariantB() {
  const { swiper, active, bind } = useOfferSwiper()
  const go = (i: number) => swiper?.slideTo(i)

  return (
    <div className="mx-auto max-w-5xl">
      <Swiper {...bind} slidesPerView={1} spaceBetween={16} autoHeight>
        {OFFERS.map((o) => (
          <SwiperSlide key={o.id}>
            <article className="grid overflow-hidden rounded-3xl border-2 border-slate-200 bg-white text-left shadow-[0_12px_30px_rgba(15,23,42,0.12)] md:grid-cols-2">
              <div className="relative aspect-[16/10] md:aspect-auto md:min-h-[420px]">
                <img src={o.image} alt="" draggable={false} className="absolute inset-0 h-full w-full select-none object-cover" />
                <span className="absolute left-4 top-4 rounded-full bg-white/95 px-3 py-1 text-xs font-bold uppercase tracking-wide text-slate-900 shadow">
                  {o.badge}
                </span>
              </div>
              <div className="flex flex-col p-6 md:p-8">
                <h3 className="text-2xl font-extrabold md:text-3xl">{o.label}</h3>
                <p className="mb-5 mt-1 text-slate-600">{o.tagline}</p>
                <ul className="mb-5 space-y-2 text-sm text-slate-800 md:text-base">
                  {o.facts.map((f) => (
                    <li key={f.text} className="flex gap-2">
                      <span>{f.icon}</span>
                      <span>{f.text}</span>
                    </li>
                  ))}
                </ul>
                <ul className="mb-6 space-y-1 border-t border-slate-100 pt-4 text-sm text-slate-600">
                  {o.highlights.map((h) => (
                    <li key={h}>✓ {h}</li>
                  ))}
                </ul>
                <div className="mt-auto">
                  <Ctas offer={o} />
                </div>
              </div>
            </article>
          </SwiperSlide>
        ))}
      </Swiper>

      <div className="mt-6 flex items-center justify-center gap-4">
        <Arrow dir="prev" onClick={() => swiper?.slidePrev()} disabled={active === 0} className="hidden md:flex" />
        <div className="min-w-[10rem] text-center">
          <p className="mb-2 text-sm font-semibold text-slate-700">
            {OFFERS[active].label} · {active + 1}/{OFFERS.length}
          </p>
          <Dots active={active} onSelect={go} />
        </div>
        <Arrow dir="next" onClick={() => swiper?.slideNext()} disabled={active === OFFERS.length - 1} className="hidden md:flex" />
      </div>
    </div>
  )
}

/* ---------- Variante C: Kartenreihe (Desktop mehrere sichtbar, Handy wischen) ---------- */

export function VariantC() {
  const { swiper, active, bind } = useOfferSwiper()
  const [edges, setEdges] = useState({ start: true, end: false })

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-4 hidden justify-end gap-3 md:flex">
        <Arrow dir="prev" onClick={() => swiper?.slidePrev()} disabled={edges.start} />
        <Arrow dir="next" onClick={() => swiper?.slideNext()} disabled={edges.end} />
      </div>
      <Swiper
        {...bind}
        onProgress={(s) => setEdges({ start: s.isBeginning, end: s.isEnd })}
        slidesPerView={1.15}
        spaceBetween={14}
        breakpoints={{ 640: { slidesPerView: 2.1, spaceBetween: 18 }, 1024: { slidesPerView: 3, spaceBetween: 24 } }}
        className="!overflow-visible md:!overflow-hidden"
      >
        {OFFERS.map((o) => (
          <SwiperSlide key={o.id} className="!h-auto">
            <article className="flex h-full flex-col overflow-hidden rounded-3xl border-2 border-slate-200 bg-white text-left shadow-[0_8px_24px_rgba(15,23,42,0.12)]">
              <div className="relative aspect-[4/3]">
                <img src={o.image} alt="" draggable={false} className="absolute inset-0 h-full w-full select-none object-cover" />
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
      <div className="mt-6 md:hidden">
        <Dots active={active} onSelect={(i) => swiper?.slideTo(i)} />
      </div>
    </div>
  )
}
