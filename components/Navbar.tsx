'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { supabase } from '@/lib/supabaseClient'
import { Button } from '@/components/ui/button'

type NavbarProps = {
  showLogin?: boolean
  logoHref?: string
  showHome?: boolean
  showLogout?: boolean
  showWebshop?: boolean
  overHero?: boolean
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
  overHero = false,
  rightLinkHref,
  rightLinkLabel,
  secondaryLinkHref,
  secondaryLinkLabel,
}: NavbarProps) {
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    if (!overHero) return
    const onScroll = () => setScrolled(window.scrollY > 8)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [overHero])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    window.location.href = '/'
  }

  /** Matches Webshop link sizing (mobile h-9 px-3 text-xs, desktop md:h-11 md:px-6 md:text-sm). Plain links avoid Button + cn() conflicting with size defaults. */
  const navBlackLinkClass =
    'inline-flex h-9 shrink-0 items-center justify-center gap-2 rounded-2xl border border-black bg-black/80 px-3 text-xs font-semibold text-white transition hover:opacity-90 md:h-11 md:px-6 md:text-sm'

  const primaryCtaClass =
    'btn-grad-signup inline-flex h-9 shrink-0 items-center justify-center rounded-2xl px-3 text-xs font-semibold md:h-11 md:px-6 md:text-sm'

  const standardCtaClass =
    'btn-grad inline-flex h-9 shrink-0 items-center justify-center rounded-2xl px-3 text-xs font-semibold md:h-11 md:px-6 md:text-sm'

  const headerClassName = overHero
    ? `fixed top-0 z-50 w-full bg-transparent transition-colors duration-200${scrolled ? ' backdrop-blur-md bg-white/10' : ''}`
    : 'sticky top-0 z-50 bg-white'

  return (
    <header className={headerClassName}>
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
              className="inline-flex h-9 shrink-0 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-indigo-500 to-rose-500 px-3 text-xs font-semibold text-white transition hover:opacity-90 md:h-11 md:px-6 md:text-sm"
            >
              Webshop
            </Link>
          ) : null}
        </div>

        <div className="flex shrink-0 items-center gap-3 md:gap-2">
          {secondaryLinkHref && secondaryLinkLabel ? (
            <Link href={secondaryLinkHref} className={primaryCtaClass}>
              {secondaryLinkLabel}
            </Link>
          ) : null}
          {rightLinkHref && rightLinkLabel ? (
            <Link href={rightLinkHref} className={navBlackLinkClass}>
              {rightLinkLabel}
            </Link>
          ) : null}
          {showHome ? (
            <Link href="/" className={standardCtaClass}>
              Zurück
            </Link>
          ) : null}
          {showLogin ? (
            <Link href="/auth/signin" className={standardCtaClass}>
              Login
            </Link>
          ) : null}
          {showLogout ? (
            <Button
              type="button"
              variant="standardCta"
              onClick={handleLogout}
            >
              Log Out
            </Button>
          ) : null}
        </div>
      </div>
    </header>
  )
}
