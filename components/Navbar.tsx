'use client'

import Link from 'next/link'
import Image from 'next/image'
import { supabase } from '@/lib/supabaseClient'

type NavbarProps = {
  showLogin?: boolean
  logoHref?: string
  showHome?: boolean
  showLogout?: boolean
  showWebshop?: boolean
  rightLinkHref?: string
  rightLinkLabel?: string
  secondaryLinkHref?: string
  secondaryLinkLabel?: string
}

export default function Navbar({
  showLogin = false,
  showHome = false,
  logoHref = '/#top',
  showLogout = false,
  showWebshop = false,
  rightLinkHref,
  rightLinkLabel,
  secondaryLinkHref,
  secondaryLinkLabel,
}: NavbarProps) {
  const handleLogout = async () => {
    await supabase.auth.signOut()
    window.location.href = '/'
  }

  /** Matches Webshop link sizing (mobile h-9 px-3 text-xs, desktop md:h-11 md:px-6 md:text-sm). Plain links avoid Button + cn() conflicting with size defaults. */
  const navBlackLinkClass =
    'inline-flex h-9 shrink-0 items-center justify-center gap-2 rounded-2xl border border-black bg-black/80 px-3 text-xs font-semibold text-white transition hover:opacity-90 md:h-11 md:px-6 md:text-sm'

  /** Black bar + border like hero CTAs; mobile stays compact. From `md` up matches `navBlackLinkClass` (e.g. Zurück / showHome). */
  const navHeroCtaClass =
    'inline-flex w-auto h-9 shrink-0 items-center justify-center gap-2 rounded-2xl border border-black bg-black/80 px-3 text-xs font-semibold text-white transition hover:opacity-90 md:h-11 md:px-6 md:text-sm'

  return (
    <header className="sticky top-0 z-50 bg-white">
      <div className="flex h-[50px] items-center justify-between px-4 md:px-6">
        <div className="flex min-w-0 items-center gap-3 md:gap-2">
          <Link
            href={logoHref}
            className="flex h-10 w-10 shrink-0 items-center md:h-[50px] md:w-[50px]"
          >
            <Image
              src="/images/brand/logo.png"
              alt="Unlimited Goalkeeping"
              width={50}
              height={50}
              className="h-full w-full object-contain"
              priority
            />
          </Link>
          {showWebshop ? (
            <Link
              href="https://goalkeeping.ourwear.shop"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-9 shrink-0 items-center justify-center gap-2 rounded-2xl border border-black bg-gradient-to-r from-indigo-500 to-rose-500 px-3 text-xs font-semibold text-white shadow-md shadow-indigo-200/50 transition hover:opacity-90 md:h-11 md:px-6 md:text-sm md:shadow-lg md:shadow-indigo-200/60"
            >
              Webshop
            </Link>
          ) : null}
        </div>

        <div className="flex shrink-0 items-center gap-3 md:gap-2">
          {secondaryLinkHref && secondaryLinkLabel ? (
            <Link href={secondaryLinkHref} className={navHeroCtaClass}>
              {secondaryLinkLabel}
            </Link>
          ) : null}
          {rightLinkHref && rightLinkLabel ? (
            <Link href={rightLinkHref} className={navBlackLinkClass}>
              {rightLinkLabel}
            </Link>
          ) : null}
          {showHome ? (
            <Link href="/" className={navBlackLinkClass}>
              Zurück
            </Link>
          ) : null}
          {showLogin ? (
            <Link href="/auth/signin" className={navHeroCtaClass}>
              Login
            </Link>
          ) : null}
          {showLogout ? (
            <button
              type="button"
              className={navBlackLinkClass}
              onClick={handleLogout}
            >
              Log Out
            </button>
          ) : null}
        </div>
      </div>
    </header>
  )
}
