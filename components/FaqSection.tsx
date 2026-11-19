'use client'

import { useId, useState } from 'react'

type FaqItem = {
  question: string
  // A string renders as a paragraph, an array as a numbered list.
  answer: string | string[]
}

const FAQ_ITEMS: FaqItem[] = [
  {
    question: 'Wie kann mein Kind starten?',
    answer:
      'Wir empfehlen eine Anmeldung zu einem kostenlosen Schnuppertraining. Hier kann dein Kind Erfahrungen sammeln und ihr entscheidet gemeinsam, ob das Training euren Vorstellungen entspricht.',
  },
  {
    question: 'Muss mein Kind jede Woche zum Training kommen?',
    answer:
      'Nein, ihr entscheidet jede Woche neu. Du kannst dein Kind selbst bis zum Vortag des Trainings über die Website an- oder abmelden. Du zahlst nur für die Trainings, an denen dein Kind wirklich teilgenommen hat. Unser Tipp: Wer regelmäßig kommt, macht die schnellsten Fortschritte.',
  },
  {
    question:
      'Was passiert, wenn mein Kind kurzfristig nicht teilnehmen kann (Krankheit)?',
    answer:
      'Prinzipiell sind auch kurzfristige, krankheitsbedingt Abmeldungen am Trainingstag kein Problem und es fallen keine Kosten für dich an.',
  },
  {
    question:
      'Was ist der Unterschied zwischen einem Gruppen- und Jugendtraining?',
    answer:
      'Gruppentrainings fokussieren sich auf Spaß und das Erlernen der Torwart-Basics für alle Jahrgänge in dynamischen Gruppen. Mit Jugendtrainings bieten wir eine Unterstützung beim Übergang vom kleinen auf das große Tor – ausgewählte Jahrgänge & kleine Gruppe.',
  },
  {
    question: 'Welche Vorteile hat eine Mitgliedschaft?',
    answer: [
      'Selbstständiges an- und abmelden zu den Trainings über die Webseite',
      '20 % Rabatt auf alle Camps',
      'Einfaches Pflegen deiner Daten',
    ],
  },
]

export default function FaqSection() {
  // Only one answer open at a time; all start closed.
  const [openIndex, setOpenIndex] = useState<number | null>(null)
  const baseId = useId()

  return (
    <section id="faq" className="scroll-mt-[50px] bg-white py-24">
      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-10 px-6 md:grid-cols-[minmax(0,1fr)_minmax(0,2fr)] md:gap-16">
        <h2 className="text-4xl font-bold leading-[1.05] tracking-tight text-gray-900 sm:text-5xl">
          Fragen,
          <br />
          beantwortet.
        </h2>

        <div className="border-t border-gray-200 md:border-t-0">
          {FAQ_ITEMS.map((item, index) => {
            const isOpen = openIndex === index
            const buttonId = `${baseId}-q-${index}`
            const panelId = `${baseId}-a-${index}`

            return (
              <div key={item.question} className="border-b border-gray-200">
                <h3>
                  <button
                    id={buttonId}
                    type="button"
                    aria-expanded={isOpen}
                    aria-controls={panelId}
                    onClick={() => setOpenIndex(isOpen ? null : index)}
                    className="group flex w-full items-center justify-between gap-6 py-6 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-gold-500 focus-visible:ring-offset-4"
                  >
                    <span className="text-lg font-semibold text-gray-900 transition group-hover:text-gold-500 sm:text-xl">
                      {item.question}
                    </span>
                    {/* Plus that turns into a minus */}
                    <span className="relative h-4 w-4 shrink-0" aria-hidden="true">
                      <span className="absolute left-0 top-1/2 h-0.5 w-4 -translate-y-1/2 bg-gray-900" />
                      <span
                        className={`absolute left-1/2 top-0 h-4 w-0.5 -translate-x-1/2 bg-gray-900 transition-transform duration-300 ${
                          isOpen ? 'scale-y-0' : 'scale-y-100'
                        }`}
                      />
                    </span>
                  </button>
                </h3>

                {/* grid-rows trick animates height smoothly */}
                <div
                  id={panelId}
                  role="region"
                  aria-labelledby={buttonId}
                  className={`grid transition-[grid-template-rows,opacity] duration-300 ease-out ${
                    isOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
                  }`}
                >
                  <div className="overflow-hidden">
                    {Array.isArray(item.answer) ? (
                      <ol className="max-w-3xl list-decimal space-y-1 pb-6 pl-8 pr-10 text-base leading-relaxed text-gray-600 marker:font-semibold marker:text-gray-900">
                        {item.answer.map((point) => (
                          <li key={point}>{point}</li>
                        ))}
                      </ol>
                    ) : (
                      <p className="max-w-3xl pb-6 pr-10 text-base leading-relaxed text-gray-600">
                        {item.answer}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
