// PROTOTYP-Seite (nicht verlinkt, nicht indexiert) zum Vergleichen der Angebote-Varianten.
import type { Metadata } from 'next'
import { VariantA, VariantB, VariantC } from './AngeboteVariants'

export const metadata: Metadata = {
  title: 'Prototyp: Angebote',
  robots: { index: false, follow: false },
}

const VARIANTS = [
  { key: 'a', title: 'Variante A – Bild-Banner mit Tabs', note: 'Großes Titelbild als Hintergrund, Text darüber. Tabs oben zum Direkt-Springen.', C: VariantA, bg: 'bg-white' },
  { key: 'b', title: 'Variante B – Split-Banner', note: 'Desktop: Bild links, Details rechts. iPhone: Bild oben, Details darunter.', C: VariantB, bg: 'bg-gray-50' },
  { key: 'c', title: 'Variante C – Kartenreihe', note: 'Desktop: 3 Karten nebeneinander. iPhone: eine Karte, die nächste lugt hervor.', C: VariantC, bg: 'bg-white' },
]

export default function AngebotePrototypePage() {
  return (
    <main className="overflow-x-hidden bg-white text-gray-900">
      <div className="sticky top-0 z-20 border-b bg-white/90 px-4 py-3 text-sm backdrop-blur">
        <strong>Prototypen „Angebote“</strong>
        <span className="ml-3 inline-flex gap-3">
          {VARIANTS.map((v) => (
            <a key={v.key} href={`#variante-${v.key}`} className="underline">
              {v.key.toUpperCase()}
            </a>
          ))}
        </span>
      </div>

      {VARIANTS.map(({ key, title, note, C, bg }) => (
        <section key={key} id={`variante-${key}`} className={`scroll-mt-12 py-16 md:py-24 ${bg}`}>
          <div className="mx-auto max-w-7xl px-4 text-center sm:px-6">
            <p className="mb-2 text-xs font-bold uppercase tracking-widest text-slate-400">{title}</p>
            <h2 className="mb-3 text-3xl font-bold">Angebote</h2>
            <p className="mx-auto mb-10 max-w-2xl text-slate-600">{note}</p>
            <C />
          </div>
        </section>
      ))}
    </main>
  )
}
