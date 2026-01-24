"use client"

import { useState } from "react"

export default function Footer() {
  const [isImprintOpen, setIsImprintOpen] = useState(false)

  return (
    <footer className="bg-black text-white">
      <div className="mx-auto max-w-7xl px-6 py-12">
        <div className="grid gap-10 md:grid-cols-3">
          <section>
            <h3 className="text-lg font-bold mb-4 text-gold-500">
              Unlimited Goalkeeping
            </h3>
            <blockquote className="mt-2 rounded-lg bg-white px-4 py-3 text-base font-serif text-gray-900 leading-relaxed">
              "Wir stehen für Leidenschaft im Tor, zielgerichtete Entwicklung und
              ein Umfeld, das Werte wie Teamgeist, Mut und Spaß lebt.
              Unser Anspruch ist es, Torhüterinnen und Torhüter sportlich
              und menschlich zu stärken."
            </blockquote>
          </section>

          <section>
            <h3 className="text-lg font-bold mb-4 text-gold-500">Standorte</h3>
            <ul className="space-y-2 text-sm text-gray-300">
              <li>
                Amstetten
              </li>
            </ul>
          </section>

          <section>
            <h3 className="text-lg font-bold mb-4 text-gold-500">
              Informationen & Mehr
            </h3>
            <ul className="space-y-2 text-sm text-gray-300">
              <li>
                  Partner und Sponsoring
              </li>
              <li>
                  FAQ
              </li>
              <li>
                <a href="/agb" className="hover:text-white transition-colors">
                  AGB
                </a>
              </li>
              <li>
                <a href="/privacy" className="hover:text-white transition-colors">
                  Datenschutzerklärung
                </a>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => setIsImprintOpen(true)}
                  className="hover:text-white transition-colors"
                >
                  Impressum
                </button>
              </li>
            </ul>
          </section>
        </div>

        <div className="mt-10 border-t border-white/10 pt-6 text-xs text-gray-400">
          © {new Date().getFullYear()} Unlimited Goalkeeping
        </div>
      </div>

      {isImprintOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-6 py-10 backdrop-blur-[2px]"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setIsImprintOpen(false)
          }}
          role="presentation"
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="imprint-title"
            className="relative w-full max-w-2xl overflow-hidden rounded-3xl border border-gray-200 bg-white text-gray-900 shadow-2xl ring-1 ring-black/5"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-yellow-50 via-white to-white" />
            <div className="relative px-6 py-10 sm:px-8 sm:py-12">
              <button
                type="button"
                onClick={() => setIsImprintOpen(false)}
                className="absolute right-4 top-4 rounded-full p-2 text-gray-600 transition hover:bg-black/5 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-yellow-500"
                aria-label="Impressum schließen"
              >
                <span aria-hidden>✕</span>
              </button>
              <h2
                id="imprint-title"
                className="mt-1 text-2xl font-semibold text-gray-900"
              >
                Impressum
              </h2>
              <div className="mt-6 space-y-6 text-sm text-gray-700">
                <section>
                  <h3 className="text-base font-semibold text-gray-900">
                    Diensteanbieter
                  </h3>
                  <div className="mt-2 space-y-1">
                    <p>E&amp;H Unlimited Goalkeeping OG</p>
                    <p>Firmenbuchnummer: 635187z</p>
                  </div>
                </section>
                <section>
                  <h3 className="text-base font-semibold text-gray-900">
                    Anschrift
                  </h3>
                  <div className="mt-2 space-y-1">
                    <p>Holzschachen 18</p>
                    <p>3351 Weißtrach, Österreich</p>
                  </div>
                </section>
                <section>
                  <h3 className="text-base font-semibold text-gray-900">
                    Kontakt
                  </h3>
                  <div className="mt-2 space-y-1">
                    <p>Kontaktperson: Wolfgang Haunschmid</p>
                    <p>Telefon: +43 676 9066696</p>
                    <p>Kontaktperson: Johannes Eder</p>
                    <p>Telefon: +43 676 6300039</p>
                    <p>E-Mail: office@unlimited-goalkeeping.com</p>
                  </div>
                </section>
              </div>
            </div>
          </div>
        </div>
      ) : null}

    </footer>
  )
}
