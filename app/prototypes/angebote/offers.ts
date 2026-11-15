// PROTOTYP – Beispieldaten für die "Angebote"-Section.
// In der echten Umsetzung kommen Camp-/Keeperday-Termine aus Supabase (wie heute in app/page.tsx).
import { defaultTargetYears, formatTargetYears } from '@/lib/trainingGroup'

const year = new Date().getFullYear()
const kidsYears = defaultTargetYears('kids', year)
const youthYears = defaultTargetYears('youth', year)

export type Offer = {
  id: string // wird auch als Hash-Anker genutzt, z.B. /#camps
  label: string
  tagline: string
  image: string
  badge: string
  facts: { icon: string; text: string }[]
  highlights: string[]
  primary: { label: string; href: string }
  secondary?: { label: string; href: string }
}

export const OFFERS: Offer[] = [
  {
    id: 'kindertraining',
    label: 'Kindertraining',
    tagline: 'Spielerisch die Torwart-Basics lernen',
    image: '/images/training/01.jpg',
    badge: 'Wöchentlich',
    facts: [
      { icon: '📆', text: 'Jeden Samstag, 9:00–10:00' },
      { icon: '👥', text: `Jahrgänge ${formatTargetYears(kidsYears.min, kidsYears.max)}` },
      { icon: '🎯', text: 'Kleine Gruppen, altersgerecht' },
    ],
    highlights: ['Fangen, Fallen, Stellungsspiel', 'Koordination & Spaß im Vordergrund'],
    primary: { label: 'Kostenloses Schnuppertraining', href: '/trial_training/register' },
    secondary: { label: 'Mitglied werden', href: '/auth/signup' },
  },
  {
    id: 'jugendtraining',
    label: 'Jugendtraining',
    tagline: 'Leistungsorientiert aufs nächste Level',
    image: '/images/training/03.jpg',
    badge: 'Wöchentlich',
    facts: [
      { icon: '📆', text: 'Jeden Samstag, 10:00–11:00 (Platzhalter)' },
      { icon: '👥', text: `Jahrgänge ${formatTargetYears(youthYears.min, youthYears.max)}` },
      { icon: '🎯', text: 'Technik, Athletik, Spielverständnis' },
    ],
    highlights: ['Spielnahe Torwart-Situationen', 'Individuelles Feedback der Trainer'],
    primary: { label: 'Kostenloses Schnuppertraining', href: '/trial_training/register' },
    secondary: { label: 'Mitglied werden', href: '/auth/signup' },
  },
  {
    id: 'camps',
    label: 'Camps',
    tagline: 'Mehrtägige Kinder- und Jugendcamps',
    image: '/images/camps/sommercamp_2026.jpg',
    badge: 'Ferien',
    facts: [
      { icon: '🧤', text: 'Nächstes Camp: Herbstcamp 2026 (Beispiel)' },
      { icon: '📍', text: 'Ort & Datum kommen live aus der Datenbank' },
      { icon: '👥', text: 'Für alle, die gerne Torwart sind' },
    ],
    highlights: ['Mehrere Trainingseinheiten pro Tag', 'Teamgeist & jede Menge Spaß'],
    primary: { label: 'Alle Camps anzeigen', href: '/camps' },
  },
  {
    id: 'keeperdays',
    label: 'Keeperdays',
    tagline: 'Intensive Tagesworkshops',
    image: '/images/keeperdays/default.jpg',
    badge: 'Tagesworkshop',
    facts: [
      { icon: '🚀', text: 'Training, Videoanalyse & Lernmaterial' },
      { icon: '📍', text: 'Nächster Termin live aus der Datenbank' },
      { icon: '📈', text: 'Nach Level: Anfänger bis Profi' },
    ],
    highlights: ['Ein Tag voller Torwart-Input', 'Theorie + Praxis kombiniert'],
    primary: { label: 'Alle Keeperdays anzeigen', href: '/keeperdays' },
  },
]
