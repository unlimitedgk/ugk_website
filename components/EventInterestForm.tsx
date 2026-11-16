'use client'

// Interessenten-Formular für /camps und /keeperdays (Design: Prototyp-Variante A).
// Sendet an die Edge Function public-newsletter-interest -> newsletter_contacts -> Resend-Sync.
// Keine Bestätigungsmail: nach dem Absenden wird nur die Danke-Meldung angezeigt.

import { useCallback, useState, type FormEvent } from 'react'
import Link from 'next/link'
import ReCaptchaCheckbox from '@/components/ReCaptchaCheckbox'
import { Input } from '@/components/ui/input'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { supabase } from '@/lib/supabaseClient'

export type EventInterest = 'camp' | 'keeperday'

const LABELS: Record<EventInterest, { singular: string; plural: string; nextNominative: string }> = {
  camp: { singular: 'Camp', plural: 'Camps', nextNominative: 'das nächste Camp' },
  keeperday: { singular: 'Keeperday', plural: 'Keeperdays', nextNominative: 'der nächste Keeperday' },
}

type EventInterestFormProps = {
  interest: EventInterest
  /** Überschrift, Standard: „Aktuell ist kein Camp/Keeperday buchbar“ */
  title?: string
  /** Text unter der Überschrift */
  description?: string
  /** Danke-Text nach dem Absenden */
  successMessage?: string
  className?: string
}

type Status = 'idle' | 'submitting' | 'success'

export default function EventInterestForm({
  interest,
  title,
  description,
  successMessage,
  className = '',
}: EventInterestFormProps) {
  const { singular, plural, nextNominative } = LABELS[interest]

  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<Status>('idle')
  const [error, setError] = useState<string | null>(null)
  const [recaptchaToken, setRecaptchaToken] = useState<string | null>(null)
  const [recaptchaResetSignal, setRecaptchaResetSignal] = useState(0)

  const handleRecaptchaVerify = useCallback((token: string | null) => {
    setRecaptchaToken(token)
    if (token) setError(null)
  }, [])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (status === 'submitting') return

    if (!recaptchaToken) {
      setError('Bitte bestätige, dass du kein Roboter bist.')
      return
    }

    setStatus('submitting')
    setError(null)

    const { error: invokeError } = await supabase.functions.invoke('public-newsletter-interest', {
      body: {
        interest,
        first_name: firstName,
        last_name: lastName,
        email,
        recaptcha_token: recaptchaToken,
      },
    })

    if (invokeError) {
      // Token ist nur einmal gültig -> immer neu anfordern
      setRecaptchaToken(null)
      setRecaptchaResetSignal((n) => n + 1)
      setStatus('idle')
      setError('Das hat leider nicht geklappt. Bitte überprüfe deine Angaben und versuche es erneut.')
      return
    }

    setStatus('success')
  }

  return (
    <div
      className={`rounded-2xl border border-indigo-100/70 bg-gradient-to-br from-indigo-50 via-white to-amber-50 p-5 text-left shadow-[0_18px_40px_rgba(15,23,42,0.08)] md:p-8 ${className}`}
    >
      {status === 'success' ? (
        <div className="flex flex-col items-center py-6 text-center" role="status" aria-live="polite">
          <span
            aria-hidden="true"
            className="flex h-14 w-14 items-center justify-center rounded-2xl bg-green-100 text-2xl text-green-700"
          >
            ✓
          </span>
          <h3 className="mt-4 text-xl font-semibold text-slate-900">Danke für dein Interesse!</h3>
          <p className="mt-2 max-w-md text-slate-600">
            {successMessage ??
              `Wir melden uns bei dir mit den neuesten Informationen zum nächsten ${singular}.`}
          </p>
        </div>
      ) : (
        <>
          <div className="flex items-start gap-4">
            <span
              aria-hidden="true"
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-indigo-100 text-xl"
            >
              🔔
            </span>
            <div>
              <h3 className="text-lg font-semibold text-slate-900 md:text-xl">
                {title ?? `Aktuell ist kein ${singular} buchbar`}
              </h3>
              <p className="mt-1 text-sm text-slate-600">
                {description ??
                  `Hinterlass uns deine Kontaktdaten und wir informieren dich, sobald ${nextNominative} online ist.`}
              </p>
            </div>
          </div>

          <form
            onSubmit={handleSubmit}
            className="mt-6 space-y-4 rounded-2xl border border-white/70 bg-white/90 p-3 shadow-sm sm:p-4 md:p-5"
          >
            <div className="grid gap-3 md:grid-cols-3">
              <label className="block">
                <span className="mb-1 block text-xs font-semibold text-slate-700">Vorname</span>
                <Input
                  required
                  name="first_name"
                  autoComplete="given-name"
                  maxLength={100}
                  placeholder="Max"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-semibold text-slate-700">Nachname</span>
                <Input
                  required
                  name="last_name"
                  autoComplete="family-name"
                  maxLength={100}
                  placeholder="Mustermann"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-semibold text-slate-700">E-Mail</span>
                <Input
                  required
                  type="email"
                  name="email"
                  autoComplete="email"
                  maxLength={320}
                  placeholder="max@beispiel.at"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </label>
            </div>

            <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
              {/* reCAPTCHA ist fix 304x78 px -> auf kleinen Displays verkleinern */}
              <div className="h-[66px] w-[259px] sm:h-[78px] sm:w-[304px]">
                <div className="origin-top-left scale-[0.85] sm:scale-100">
                  <ReCaptchaCheckbox onVerify={handleRecaptchaVerify} resetSignal={recaptchaResetSignal} />
                </div>
              </div>
              <button
                type="submit"
                disabled={status === 'submitting'}
                className="inline-flex h-11 w-full items-center justify-center rounded-xl bg-indigo-600 px-6 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-2 disabled:opacity-60 md:w-auto"
              >
                {status === 'submitting' ? 'Wird gesendet…' : 'Informiert bleiben'}
              </button>
            </div>

            {error && (
              <Alert className="border-red-200 bg-red-50">
                <AlertDescription className="text-red-700">{error}</AlertDescription>
              </Alert>
            )}

            <p className="text-xs text-slate-500">
              Mit dem Absenden meldest du dich für unseren Newsletter an und erhältst Infos zu kommenden{' '}
              {plural}. Abmeldung jederzeit möglich.{' '}
              <Link href="/privacy" className="underline">
                Datenschutz
              </Link>
            </p>
          </form>
        </>
      )}
    </div>
  )
}
