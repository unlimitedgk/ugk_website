export default function Footer() {
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
                <a href="#" className="hover:text-white transition-colors">
                  Amstetten
                </a>
              </li>
            </ul>
          </section>

          <section>
            <h3 className="text-lg font-bold mb-4 text-gold-500">
              Informationen & Mehr
            </h3>
            <ul className="space-y-2 text-sm text-gray-300">
              <li>
                <a href="#" className="hover:text-white transition-colors">
                  Partner und Sponsoring
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-white transition-colors">
                  AGB
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-white transition-colors">
                  FAQ
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-white transition-colors">
                  Kontakt
                </a>
              </li>
            </ul>
          </section>
        </div>

        <div className="mt-10 border-t border-white/10 pt-6 text-xs text-gray-400">
          © {new Date().getFullYear()} Unlimited Goalkeeping
        </div>
      </div>
    </footer>
  )
}
