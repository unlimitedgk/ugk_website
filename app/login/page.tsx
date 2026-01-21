'use client'

import Image from 'next/image'
import { useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import Navbar from '@/components/Navbar'
import { Button } from '@/components/ui/button'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSuccess(false)

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      setError(error.message)
      return
    }

    // If we reach here, login worked
    // forwarding to dashboard
    window.location.href = '/dashboard'
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
                  src="/images/brand/logo-black.png"
                  alt="Unlimited Goalkeeping Logo"
                  width={80}
                  height={80}
                  priority
                />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-black/50">
                  Anmelden bei
                </p>
                <p className="text-lg font-semibold text-black">
                  Unlimited Goalkeeping
                </p>
              </div>
            </div>
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
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
            </div>

            <Button
              type="submit"
              className="group relative h-12 w-full overflow-hidden rounded-2xl bg-black text-sm font-semibold text-white shadow-lg shadow-black/20 transition hover:bg-black/90 hover:scale-[1.01] focus:outline-none focus:ring-2 focus:ring-black/30"
            >
              <span className="relative z-10">Anmelden</span>
              <span className="absolute inset-0 opacity-0 transition group-hover:opacity-100">
                <span className="absolute inset-0 bg-[radial-gradient(circle,_rgba(255,255,255,0.25),_transparent_60%)]" />
              </span>
            </Button>
            <p className="text-center text-xs text-black/50">
              Drücke Enter oder klicke auf Anmelden, um fortzufahren.
            </p>
          </form>

          {error && (
            <div className="mt-6 rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}
          {success && (
            <div className="mt-6 rounded-2xl border border-emerald-400/20 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-700">
              Anmeldung erfolgreich ✅
            </div>
          )}
        </div>
      </div>
    </main>
  )
}