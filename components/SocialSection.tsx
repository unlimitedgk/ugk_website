// Abschluss-Section "Folge uns auf Social Media" auf der Homepage (direkt über dem Footer).

import {
  FACEBOOK_PROFILE_URL,
  INSTAGRAM_HANDLE,
  INSTAGRAM_PROFILE_URL,
} from '@/lib/socialLinks'

function InstagramIcon({ className = 'h-5 w-5' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className={className} aria-hidden="true">
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
    </svg>
  )
}

function FacebookIcon({ className = 'h-5 w-5' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M14 8h3V4h-3a5 5 0 0 0-5 5v2H7v4h2v9h4v-9h3l1-4h-4V9a1 1 0 0 1 1-1z" />
    </svg>
  )
}

// Markenfarben: Instagram-Verlauf bzw. Facebook-Blau.
const INSTAGRAM_GRADIENT =
  'radial-gradient(circle at 30% 107%, #FDF497 0%, #FDF497 5%, #FD5949 45%, #D6249F 60%, #285AEB 90%)'

function SocialButton({ network }: { network: 'instagram' | 'facebook' }) {
  const isInstagram = network === 'instagram'
  const Icon = isInstagram ? InstagramIcon : FacebookIcon
  const brandClasses = isInstagram
    ? 'hover:opacity-90 focus-visible:ring-[#D6249F]'
    : 'bg-[#0866FF] hover:bg-[#0052D6] focus-visible:ring-[#0866FF]'
  return (
    <a
      href={isInstagram ? INSTAGRAM_PROFILE_URL : FACEBOOK_PROFILE_URL}
      target="_blank"
      rel="noopener noreferrer"
      style={isInstagram ? { background: INSTAGRAM_GRADIENT } : undefined}
      className={`inline-flex items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold text-white transition focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ${brandClasses}`}
    >
      <Icon />
      {network === 'instagram' ? 'Instagram' : 'Facebook'}
    </a>
  )
}

// Überschrift links wie bei "Fragen, beantwortet.", Buttons rechts.
export default function SocialSection() {
  return (
    <section id="social" className="scroll-mt-[50px] bg-white py-24">
      <div className="mx-auto flex max-w-7xl flex-col gap-8 px-6 md:flex-row md:items-end md:justify-between">
        <div>
          <h2 className="text-4xl font-bold leading-[1.05] tracking-tight text-gray-900 sm:text-5xl">
            Folge uns
            <br />
            auf Social Media.
          </h2>
          <p className="mt-4 max-w-md text-base leading-relaxed text-gray-600">
            Einblicke ins Training, Camp-Highlights und Tipps für junge Torhüter:innen –
            regelmäßig neu auf{' '}
            <a
              href={INSTAGRAM_PROFILE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-gray-900 underline decoration-gold-500 decoration-2 underline-offset-4"
            >
              {INSTAGRAM_HANDLE}
            </a>
            .
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <SocialButton network="instagram" />
          <SocialButton network="facebook" />
        </div>
      </div>
    </section>
  )
}
