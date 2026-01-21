'use client'

import Image from 'next/image'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

type CoachId = 'eder' | 'haunschmid'

type Coach = {
  id: CoachId
  name: string
  role: string
  imageSrc: string
  imageAlt: string
  oefbProfileUrl: string
  bio: string[]
}

export default function AboutSection() {
  const coaches: Coach[] = useMemo(
    () => [
      {
        id: 'eder',
        name: 'Johannes Eder',
        role: 'UEFA-zertifizierter Torwarttrainer',
        imageSrc: '/images/coaches/Eder.jpg',
        imageAlt: 'Portrait von Johannes Eder, Torwarttrainer',
        oefbProfileUrl: 'https://www.oefb.at/Profile/Trainer/1213362?Johannes-Eder',
        bio: [
          'Johannes Eder ist aktiver Torwart und Torwarttrainer aus Niederösterreich. Als aktiver Spieler steht er aktuell beim Landesligisten St. Peter in der Au im Tor.',
          'Als aktiver Torwarttainer beim NWZ/AFW Waidhofen gestaltet er aktiv die Förderung von Nachwuchstorwarttalenten mit.',
          'Johannes besitzt die zweithöchste Zertifizierung UEFA Torwarttrainer B-Lizenz',
        ],
      },
      {
        id: 'haunschmid',
        name: 'Wolfgang Haunschmid',
        role: 'UEFA-zertifizierter Torwarttrainer',
        imageSrc: '/images/coaches/Haunschmid.png',
        imageAlt: 'Portrait von Wolfgang Haunschmid, Torwarttrainer',
        oefbProfileUrl: 'https://www.oefb.at/Profile/Trainer/887134?Wolfgang-Haunschmid',
        bio: [
          'Wolfgang Haunschmid ist ehemaliger Torwart und erfahrener Torwarttrainer aus Niederösterreich. Als aktiver Spieler stand er viele Jahre für regionale Vereine selbst im Tor.',
          'Als Head of Goalkeeping beim NWZ/AFW Waidhofen an der Ybbs steuert er die Trainingseinteilung.',
          'Seit 2021 ist er Torwarttrainer beim SKU Ertl Glas Amstetten in der österreichischen 2. Liga.',
          'Wolfgang besitzt die höchstmögliche Zertifizierung UEFA Torwarttrainer A-Lizenz',
        ],
      },
    ],
    []
  )

  const [activeCoachId, setActiveCoachId] = useState<CoachId | null>(null)
  const activeCoach = useMemo(
    () => coaches.find((c) => c.id === activeCoachId) ?? null,
    [activeCoachId, coaches]
  )

  const dialogRef = useRef<HTMLDivElement | null>(null)

  const close = useCallback(() => setActiveCoachId(null), [])
  const open = useCallback((id: CoachId) => setActiveCoachId(id), [])

  // Close on ESC
  useEffect(() => {
    if (!activeCoachId) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [activeCoachId, close])

  // Lock body scroll while modal is open
  useEffect(() => {
    if (!activeCoachId) return
    const original = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = original
    }
  }, [activeCoachId])

  // Focus dialog when opened
  useEffect(() => {
    if (activeCoachId) {
      requestAnimationFrame(() => dialogRef.current?.focus())
    }
  }, [activeCoachId])

  return (
    <section id="about" className="relative overflow-hidden bg-white py-24">
      {/* subtle background decor */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-24 left-1/2 h-72 w-[42rem] -translate-x-1/2 rounded-full bg-yellow-200/30 blur-3xl" />
        <div className="absolute -bottom-24 right-0 h-72 w-[36rem] rounded-full bg-gray-200/40 blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-7xl px-6">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="mt-3 text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
            Über Uns
          </h2>
          <p className="mt-4 text-base leading-relaxed text-gray-600">
            Zwei Trainer, eine Mission: Torhüter:innen individuell entwickeln – technisch,
            taktisch und mental. Klar strukturiert, modern und praxisnah.
          </p>
        </div>

        <div className="mt-14 grid grid-cols-1 gap-10 md:grid-cols-2">
          {coaches.map((coach) => (
            <article
              key={coach.id}
              className="group relative overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-yellow-50/60 via-transparent to-transparent opacity-0 transition group-hover:opacity-100" />

              <div className="relative p-6 sm:p-7">
                <button
                  type="button"
                  onClick={() => open(coach.id)}
                  className="block w-full text-left focus:outline-none"
                  aria-haspopup="dialog"
                  aria-controls="coach-dialog"
                  aria-label={`${coach.name} – Details öffnen`}
                >
                  <div className="flex items-center gap-6">
                    <div className="relative h-28 w-24 shrink-0 overflow-hidden rounded-2xl ring-1 ring-gray-200">
                      <Image
                        src={coach.imageSrc}
                        alt={coach.imageAlt}
                        width={100}
                        height={150}
                        sizes="(min-width: 768px) 160px, 120px"
                        className="object-cover transition duration-300 group-hover:scale-[1.03]"
                        priority={coach.id === 'eder'}
                      />
                    </div>

                    <div className="min-w-0">
                      <h3 className="text-lg font-semibold text-gray-900">
                        {coach.name}
                      </h3>
                      <p className="mt-1 text-sm font-medium text-yellow-700">
                        {coach.role}
                      </p>
                      <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-gray-600">
                        {coach.bio[0]}
                      </p>

                      <div className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-gray-900">
                        <span className="rounded-full bg-gray-900 px-3 py-1 text-xs font-semibold text-white transition group-hover:bg-yellow-600">
                          Mehr erfahren
                        </span>
                        <span className="text-gray-400 group-hover:text-gray-500">
                          →
                        </span>
                      </div>
                    </div>
                  </div>
                </button>
              </div>
            </article>
          ))}
        </div>
      </div>

      {/* Modal */}
      {activeCoach && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 py-10 backdrop-blur-[2px]"
          onMouseDown={(e) => {
            // click outside to close
            if (e.target === e.currentTarget) close()
          }}
          role="presentation"
        >
          <div
            id="coach-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="coach-dialog-title"
            tabIndex={-1}
            ref={dialogRef}
            className="relative w-full max-w-xl overflow-hidden rounded-3xl bg-white shadow-2xl ring-1 ring-black/5 focus:outline-none"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-yellow-50 via-white to-white" />

            <div className="relative p-6 sm:p-8">
              <button
                type="button"
                onClick={close}
                className="absolute right-4 top-4 rounded-full p-2 text-gray-600 transition hover:bg-black/5 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-yellow-500"
                aria-label="Modal schließen"
              >
                <span aria-hidden>✕</span>
              </button>

              <div className="flex items-start gap-5">
                <div className="relative h-24 w-20 shrink-0 overflow-hidden rounded-2xl ring-1 ring-gray-200">
                  <Image
                    src={activeCoach.imageSrc}
                    alt={activeCoach.imageAlt}
                    fill
                    sizes="120px"
                    className="object-cover"
                  />
                </div>

                <div className="min-w-0">
                  <h3
                    id="coach-dialog-title"
                    className="text-2xl font-bold tracking-tight text-gray-900"
                  >
                    {activeCoach.name}
                  </h3>
                  <p className="mt-1 text-sm font-semibold text-yellow-700">
                    {activeCoach.role}
                  </p>
                </div>
              </div>

              <div className="mt-6 space-y-3 text-sm leading-relaxed text-gray-700">
                {activeCoach.bio.map((line, idx) => (
                  <p key={idx}>{line}</p>
                ))}
              </div>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={close}
                  className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-900 shadow-sm transition hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-yellow-500"
                >
                  Schließen
                </button>
                <a
                  href={activeCoach.oefbProfileUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center justify-center rounded-xl bg-gray-900 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-yellow-600 focus:outline-none focus:ring-2 focus:ring-yellow-500"
                >
                  ÖFB Profil
                </a>
                <a
                  href="mailto:office@unlimited-goalkeeping.com"
                  onClick={close}
                  className="inline-flex items-center justify-center rounded-xl bg-gray-900 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-yellow-600 focus:outline-none focus:ring-2 focus:ring-yellow-500"
                >
                  Kontakt aufnehmen
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}