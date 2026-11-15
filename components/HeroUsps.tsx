// Mehrwerte im Hero, direkt unter dem Button "Kostenloses Schnuppertraining".
// Desktop: eine Zeile mit feinen Trennlinien. Mobil: mittig untereinander, Icon über dem Text.

const iconProps = {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
}

function AwardIcon({ className }: { className?: string }) {
  return (
    <svg {...iconProps} className={className}>
      <circle cx="12" cy="9" r="6" />
      <path d="m9.5 9 1.8 1.8L14.8 7.3" />
      <path d="M8.2 13.8 7 22l5-3 5 3-1.2-8.2" />
    </svg>
  )
}

function MapPinIcon({ className }: { className?: string }) {
  return (
    <svg {...iconProps} className={className}>
      <path d="M12 21s-7-6.2-7-12a7 7 0 0 1 14 0c0 5.8-7 12-7 12z" />
      <circle cx="12" cy="9" r="2.5" />
    </svg>
  )
}

function UsersIcon({ className }: { className?: string }) {
  return (
    <svg {...iconProps} className={className}>
      <circle cx="9" cy="8" r="3.5" />
      <path d="M2.5 20a6.5 6.5 0 0 1 13 0" />
      <path d="M16 4.6a3.5 3.5 0 0 1 0 6.8" />
      <path d="M18.5 14.2A6.5 6.5 0 0 1 21.5 20" />
    </svg>
  )
}

const USPS = [
  { Icon: AwardIcon, title: 'Zertifizierte Torwarttrainer', text: '' },
  { Icon: MapPinIcon, title: 'Hauptstandort Amstetten', text: '' },
  { Icon: UsersIcon, title: '40+ aktive Mitglieder', text: '' },
]

export default function HeroUsps() {
  return (
    <ul className="mx-auto mt-14 flex max-w-4xl flex-col lg:max-w-5xl items-center gap-6 px-6 sm:flex-row sm:justify-center sm:gap-0">
      {USPS.map(({ Icon, title, text }, i) => (
        <li
          key={title}
          className={`flex flex-col items-center gap-2 text-center sm:flex-row sm:gap-3 sm:px-6 sm:text-left ${
            i > 0 ? 'sm:border-l sm:border-white/25' : ''
          }`}
        >
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-gold-500/70 text-gold-500">
            <Icon className="h-5 w-5" />
          </span>
          <span>
            <span className="block text-sm font-bold leading-tight md:text-base lg:whitespace-nowrap">{title}</span>
            <span className="block text-xs text-gray-300 md:text-sm">{text}</span>
          </span>
        </li>
      ))}
    </ul>
  )
}
