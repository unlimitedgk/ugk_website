import Navbar from "@/components/Navbar"

export default function DatenschutzPage() {
  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar showHome />
      <main className="mx-auto max-w-4xl px-6 py-10 sm:py-14">
        <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-lg pb-6">
          <div className="px-6 py-8 sm:px-10">
            <div className="space-y-2">
              <h1 className="mt-4 text-3xl font-semibold text-slate-900 sm:mt-6 sm:text-4xl">
                Datenschutzerklärung
              </h1>
            </div>

            <div className="mt-8 space-y-4 text-sm leading-relaxed text-slate-700 [&>section]:pt-4 [&>section]:pb-2 [&>section:first-child]:pt-0 [&>section:last-child]:pb-0">
              <section className="space-y-3 pb-4">
                <h2 className="text-lg font-semibold text-slate-900">
                  1. Allgemeine Hinweise
                </h2>
                <p>
                  Der Schutz Ihrer persönlichen Daten ist uns ein besonderes
                  Anliegen. Wir verarbeiten Ihre Daten daher ausschließlich auf
                  Grundlage der geltenden gesetzlichen Bestimmungen, insbesondere
                  der Datenschutz-Grundverordnung (DSGVO) sowie des
                  österreichischen Datenschutzgesetzes (DSG).
                </p>
                <p>
                  In dieser Datenschutzerklärung informieren wir Sie über die
                  wichtigsten Aspekte der Datenverarbeitung im Rahmen unserer
                  Webseite und unserer angebotenen Dienstleistungen.
                </p>
              </section>

              <section className="space-y-3 pb-4 border-t border-slate-200 pt-6">
                <h2 className="text-lg font-semibold text-slate-900">
                  2. Verantwortlicher
                </h2>
                <p>
                  E&amp;H Unlimited Goalkeeping OG
                  <br />
                  Holzschachen 18, 3351 Weißtrach, Österreich
                  <br />
                  Firmenbuchnummer: 635187z
                  <br />
                  E-Mail: office@unlimited-goalkeeping.com
                </p>
                <p>(im Folgenden „Unlimited Goalkeeping“)</p>
              </section>

              <section className="space-y-3 pb-4 border-t border-slate-200 pt-6">
                <h2 className="text-lg font-semibold text-slate-900">
                  3. Verarbeitung personenbezogener Daten
                </h2>
                <p>
                  Wir verarbeiten personenbezogene Daten nur, wenn dies rechtlich
                  zulässig ist. Dies ist insbesondere der Fall, wenn:
                </p>
                <ul className="list-disc space-y-1 pl-5">
                  <li>Sie unsere Webseite besuchen</li>
                  <li>Sie sich zu Trainings, Camps oder Veranstaltungen anmelden</li>
                  <li>Sie mit uns Kontakt aufnehmen</li>
                  <li>
                    Sie uns freiwillig eine Einwilligung erteilen (z. B. Foto- und
                    Videoaufnahmen)
                  </li>
                </ul>
              </section>

              <section className="space-y-3 pb-4 border-t border-slate-200 pt-6">
                <h2 className="text-lg font-semibold text-slate-900">
                  4. Datenverarbeitung bei Kontaktaufnahme
                </h2>
                <p>
                  Wenn Sie per Formular, E-Mail, Telefon oder über
                  Messenger-Dienste (z. B. WhatsApp) Kontakt mit uns aufnehmen,
                  werden Ihre angegebenen Daten (z. B. Name, E-Mail-Adresse,
                  Telefonnummer, Inhalt der Anfrage) zur Bearbeitung Ihrer Anfrage
                  und für den Fall von Anschlussfragen verarbeitet.
                </p>
                <p>
                  Rechtsgrundlage: Art. 6 Abs. 1 lit. b DSGVO (vorvertragliche
                  Maßnahmen bzw. Vertragserfüllung) oder Art. 6 Abs. 1 lit. f DSGVO
                  (berechtigtes Interesse an effizienter Kommunikation).
                </p>
              </section>

              <section className="space-y-3 pb-4 border-t border-slate-200 pt-6">
                <h2 className="text-lg font-semibold text-slate-900">
                  5. Anmeldung zu Trainings, Camps und Veranstaltungen
                </h2>
                <p>Im Rahmen von Anmeldungen verarbeiten wir insbesondere folgende Daten:</p>
                <ul className="list-disc space-y-1 pl-5">
                  <li>Name des Teilnehmers / der Teilnehmerin</li>
                  <li>
                    Name der Eltern bzw. gesetzlichen Vertreter:innen (bei
                    Minderjährigen)
                  </li>
                  <li>Kontaktdaten (E-Mail, Telefonnummer)</li>
                  <li>Geburtsdatum (sofern erforderlich)</li>
                  <li>
                    Gesundheitsrelevante Angaben (z. B. Allergien,
                    Unverträglichkeiten, Medikamente – freiwillig)
                  </li>
                  <li>
                    Größenangaben für Bekleidung oder Goodies (sofern relevant)
                  </li>
                </ul>
                <p>
                  Diese Daten werden ausschließlich zur Organisation, Durchführung,
                  Abrechnung und rechtlichen Absicherung der Trainings, Camps und
                  Veranstaltungen verarbeitet.
                </p>
                <p>Rechtsgrundlage: Art. 6 Abs. 1 lit. b DSGVO (Vertragserfüllung).</p>
                <p>
                  Gesundheitsbezogene Angaben erfolgen freiwillig und werden
                  ausschließlich zum Schutz der Teilnehmer:innen verwendet.
                </p>
              </section>

              <section className="space-y-3 pb-4 border-t border-slate-200 pt-6">
                <h2 className="text-lg font-semibold text-slate-900">
                  6. Foto- und Videoaufnahmen
                </h2>
                <p>
                  Im Rahmen von Trainings, Camps und Veranstaltungen können Foto-
                  und Videoaufnahmen angefertigt werden.
                </p>
                <p>
                  Die Verarbeitung und Veröffentlichung dieser Aufnahmen (z. B. auf
                  unserer Webseite, in sozialen Medien oder in Drucksorten) erfolgt
                  ausschließlich auf Grundlage einer gesonderten, freiwilligen
                  Einwilligung der betroffenen Personen bzw. der Eltern oder
                  gesetzlichen Vertreter:innen.
                </p>
                <p>
                  Die Einwilligung kann jederzeit mit Wirkung für die Zukunft
                  widerrufen werden.
                </p>
                <p>Rechtsgrundlage: Art. 6 Abs. 1 lit. a DSGVO (Einwilligung).</p>
              </section>

              <section className="space-y-3 pb-4 border-t border-slate-200 pt-6">
                <h2 className="text-lg font-semibold text-slate-900">
                  7. Datenweitergabe an Dritte
                </h2>
                <p>Eine Weitergabe personenbezogener Daten an Dritte erfolgt nur, wenn:</p>
                <ul className="list-disc space-y-1 pl-5">
                  <li>dies zur Vertragserfüllung erforderlich ist (z. B. Steuerberater)</li>
                  <li>eine gesetzliche Verpflichtung besteht</li>
                  <li>eine ausdrückliche Einwilligung vorliegt</li>
                </ul>
                <p>Eine Übermittlung von Daten in Drittstaaten erfolgt grundsätzlich nicht.</p>
              </section>

              <section className="space-y-3 pb-4 border-t border-slate-200 pt-6">
                <h2 className="text-lg font-semibold text-slate-900">
                  8. Speicherdauer
                </h2>
                <p>
                  Personenbezogene Daten werden nur so lange gespeichert, wie dies
                  für die jeweiligen Zwecke erforderlich ist bzw. wie es gesetzliche
                  Aufbewahrungspflichten vorsehen.
                </p>
                <p>
                  Daten aus Vertragsverhältnissen werden entsprechend den steuer-
                  und unternehmensrechtlichen Aufbewahrungspflichten gespeichert.
                </p>
                <p>
                  Einwilligungsbasierte Daten (z. B. Foto-/Videoaufnahmen) werden bis
                  zum Widerruf der Einwilligung oder Wegfall des Zwecks gespeichert.
                </p>
              </section>

              <section className="space-y-3 pb-4 border-t border-slate-200 pt-6">
                <h2 className="text-lg font-semibold text-slate-900">
                  9. Ihre Rechte
                </h2>
                <p>Ihnen stehen gemäß DSGVO grundsätzlich folgende Rechte zu:</p>
                <ul className="list-disc space-y-1 pl-5">
                  <li>Recht auf Auskunft (Art. 15 DSGVO)</li>
                  <li>Recht auf Berichtigung (Art. 16 DSGVO)</li>
                  <li>Recht auf Löschung (Art. 17 DSGVO)</li>
                  <li>Recht auf Einschränkung der Verarbeitung (Art. 18 DSGVO)</li>
                  <li>Recht auf Datenübertragbarkeit (Art. 20 DSGVO)</li>
                  <li>Recht auf Widerspruch (Art. 21 DSGVO)</li>
                </ul>
                <p>
                  Wenn die Verarbeitung auf einer Einwilligung beruht, können Sie
                  diese jederzeit widerrufen.
                </p>
              </section>

              <section className="space-y-3 pb-4 border-t border-slate-200 pt-6">
                <h2 className="text-lg font-semibold text-slate-900">
                  10. Beschwerderecht
                </h2>
                <p>
                  Wenn Sie der Ansicht sind, dass die Verarbeitung Ihrer
                  personenbezogenen Daten gegen das Datenschutzrecht verstößt, haben
                  Sie das Recht, Beschwerde bei der zuständigen Aufsichtsbehörde
                  einzulegen:
                </p>
                <p>
                  Österreichische Datenschutzbehörde
                  <br />
                  Barichgasse 40–42
                  <br />
                  1030 Wien
                  <br />
                  www.dsb.gv.at
                </p>
              </section>

              <section className="space-y-3 pb-4 border-t border-slate-200 pt-6">
                <h2 className="text-lg font-semibold text-slate-900">
                  11. Datensicherheit
                </h2>
                <p>
                  Wir treffen angemessene technische und organisatorische Maßnahmen,
                  um Ihre personenbezogenen Daten vor Verlust, Missbrauch oder
                  unbefugtem Zugriff zu schützen.
                </p>
              </section>

              <section className="space-y-3 pb-4 border-t border-slate-200 pt-6">
                <h2 className="text-lg font-semibold text-slate-900">
                  12. Änderungen dieser Datenschutzerklärung
                </h2>
                <p>
                  Wir behalten uns vor, diese Datenschutzerklärung bei Bedarf
                  anzupassen, um sie an geänderte rechtliche oder technische
                  Rahmenbedingungen anzupassen.
                </p>
                <p>
                  Es gilt die jeweils aktuelle Version auf unserer Webseite.
                </p>
              </section>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
