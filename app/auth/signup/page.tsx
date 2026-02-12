'use client'

import Image from 'next/image'
import { useMemo, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import Navbar from '@/components/Navbar'
import { Button } from '@/components/ui/button'

const passwordHint =
  'Passwort muss mind. 5 Zeichen, Gross-/Kleinbuchstaben und eine Zahl enthalten.'

function isPasswordStrong(password: string) {
  const hasMinLength = password.length >= 5
  const hasUpper = /[A-Z]/.test(password)
  const hasLower = /[a-z]/.test(password)
  const hasNumber = /\d/.test(password)

  return hasMinLength && hasUpper && hasLower && hasNumber
}

export default function SignupPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [passwordConfirm, setPasswordConfirm] = useState('')
  const [roleSelection, setRoleSelection] = useState('')
  const [agbAccepted, setAgbAccepted] = useState(false)
  const [privacyAccepted, setPrivacyAccepted] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const roleValue = useMemo(() => {
    switch (roleSelection) {
      case 'Eltern':
        return 'parent'
      case 'Torwart':
        return 'keeper'
      default:
        return ''
    }
  }, [roleSelection])

  const showPasswordHint = useMemo(() => {
    if (!password) {
      return false
    }

    return !isPasswordStrong(password)
  }, [password])

  const showConfirmHint = useMemo(() => {
    if (!passwordConfirm) {
      return false
    }

    return password !== passwordConfirm
  }, [password, passwordConfirm])

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault()

    if (
      !isPasswordStrong(password) ||
      password !== passwordConfirm ||
      !roleValue ||
      !agbAccepted ||
      !privacyAccepted
    ) {
      return
    }

    try {
      setIsSubmitting(true)
      const acceptedAt = new Date().toISOString()
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            role: roleValue,
            privacy_accepted_at: acceptedAt,
            agb_accepted_at: acceptedAt,
          },
        },
      })

      if (error) {
        window.location.href = '/auth/signup/error'
        return
      }

      window.location.href = '/auth/signup/success'
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main id="top" className="relative min-h-screen overflow-hidden bg-slate-50 text-black">
      <Navbar showHome />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(99,102,241,0.12),_transparent_55%),radial-gradient(circle_at_bottom,_rgba(14,165,233,0.12),_transparent_50%)]" />
      <div className="relative mx-auto flex min-h-screen max-w-6xl items-center justify-center px-6 py-16">
        <div className="w-full max-w-md rounded-3xl border border-black/10 bg-white/80 p-8 shadow-2xl backdrop-blur">
          <div className="mb-8 flex flex-col items-center gap-4 text-center">
            <div className="flex flex-col items-center gap-4">
              <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-black/5 ring-1 ring-black/10">
                <Image
                  src="/images/brand/logo.png"
                  alt="Unlimited Goalkeeping Logo"
                  width={80}
                  height={80}
                  priority
                />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-black/50">
                  Account erstellen bei
                </p>
                <p className="text-lg font-semibold text-black">
                  Unlimited Goalkeeping
                </p>
              </div>
            </div>
          </div>

          <form onSubmit={handleSignup} className="space-y-6">
            <div className="space-y-2">
              <label
                htmlFor="email"
                className="text-xs font-semibold uppercase tracking-wide text-black/70"
              >
                E-Mail-Adresse
              </label>
              <input
                id="email"
                type="email"
                placeholder="Gib deine E-Mail-Adresse ein"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-12 w-full rounded-2xl border border-black/10 bg-white px-4 text-sm text-black placeholder:text-black/40 shadow-lg shadow-black/10 transition focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-400/30"
                required
              />
            </div>

            <div className="space-y-2">
              <label
                htmlFor="password"
                className="text-xs font-semibold uppercase tracking-wide text-black/70"
              >
                Passwort
              </label>
              <input
                id="password"
                type="password"
                placeholder="Gib dein Passwort ein"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-12 w-full rounded-2xl border border-black/10 bg-white px-4 text-sm text-black placeholder:text-black/40 shadow-lg shadow-black/10 transition focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-400/30"
                required
              />
              {showPasswordHint && (
                <p className="text-xs text-red-600">{passwordHint}</p>
              )}
            </div>

            <div className="space-y-2">
              <label
                htmlFor="passwordConfirm"
                className="text-xs font-semibold uppercase tracking-wide text-black/70"
              >
                Passwort bestaetigen
              </label>
              <input
                id="passwordConfirm"
                type="password"
                placeholder="Wiederhole dein Passwort"
                value={passwordConfirm}
                onChange={(e) => setPasswordConfirm(e.target.value)}
                className="h-12 w-full rounded-2xl border border-black/10 bg-white px-4 text-sm text-black placeholder:text-black/40 shadow-lg shadow-black/10 transition focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-400/30"
                required
              />
              {showConfirmHint && (
                <p className="text-xs text-red-600">
                  Passwoerter stimmen nicht ueberein.
                </p>
              )}
            </div>

            <div className="space-y-2">
              <label
                htmlFor="role"
                className="text-xs font-semibold uppercase tracking-wide text-black/70"
              >
                Rolle
              </label>
              <select
                id="role"
                value={roleSelection}
                onChange={(e) => setRoleSelection(e.target.value)}
                className="h-12 w-full rounded-2xl border border-black/10 bg-white px-4 text-sm text-black shadow-lg shadow-black/10 transition focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-400/30"
                required
              >
                <option value="" disabled>
                  Bitte waehlen
                </option>
                <option value="Eltern">Eltern</option>
                <option value="Torwart">Torwart</option>
              </select>
            </div>

            <div className="space-y-3 text-sm text-black/70">
              <label className="flex items-start gap-3">
                <input
                  type="checkbox"
                  className="mt-1 h-4 w-4 rounded border border-black/20 text-black focus:ring-2 focus:ring-black/30"
                  checked={agbAccepted}
                  onChange={(e) => setAgbAccepted(e.target.checked)}
                  required
                />
                <span>
                  Ich akzeptiere die{' '}
                  <a href="/agb" className="font-semibold text-black underline">
                    AGB
                  </a>
                </span>
              </label>
              <label className="flex items-start gap-3">
                <input
                  type="checkbox"
                  className="mt-1 h-4 w-4 rounded border border-black/20 text-black focus:ring-2 focus:ring-black/30"
                  checked={privacyAccepted}
                  onChange={(e) => setPrivacyAccepted(e.target.checked)}
                  required
                />
                <span>
                  Ich habe die{' '}
                  <a href="/privacy" className="font-semibold text-black underline">
                    Datenschutzerklaerung
                  </a>{' '}
                  gelesen
                </span>
              </label>
            </div>

            <Button
              type="submit"
              className="group relative h-12 w-full overflow-hidden rounded-2xl bg-black text-sm font-semibold text-white shadow-lg shadow-black/20 transition hover:bg-black/90 hover:scale-[1.01] focus:outline-none focus:ring-2 focus:ring-black/30 border border-black"
              disabled={isSubmitting || !agbAccepted || !privacyAccepted}
            >
              <span className="relative z-10">
                {isSubmitting ? 'Wird erstellt...' : 'Account erstellen'}
              </span>
              <span className="absolute inset-0 opacity-0 transition group-hover:opacity-100">
                <span className="absolute inset-0 bg-[radial-gradient(circle,_rgba(255,255,255,0.25),_transparent_60%)]" />
              </span>
            </Button>
            <p className="text-center text-xs text-black/50">
              Druecke Enter oder klicke auf Account erstellen, um fortzufahren.
            </p>
          </form>
        </div>
      </div>
    </main>
  )
}
