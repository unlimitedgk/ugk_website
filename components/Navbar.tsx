'use client'

import Link from 'next/link'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
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

  return (
    <header className="sticky top-0 z-50 bg-white">
      <div className="px-6 h-[50px] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Link href={logoHref} className="flex shrink-0 items-center" style={{ width: '50px', height: '50px'}}>
            <Image
              src="/images/brand/logo.png"
              alt="Unlimited Goalkeeping"
              width={50}
              height={50}
              priority
            />
          </Link>
          {showWebshop ? (
            <Link
              href="https://goalkeeping.ourwear.shop"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-2xl border border-black bg-gradient-to-r from-indigo-500 to-rose-500 px-6 text-sm font-semibold text-white shadow-lg shadow-indigo-200/60 transition hover:opacity-90"
            >
              Webshop
            </Link>
          ) : null}
        </div>

        <div className="flex items-center gap-2">
          {secondaryLinkHref && secondaryLinkLabel ? (
            <Button
              as="a"
              href={secondaryLinkHref}
              size="default"
              className="w-auto bg-black/80 text-white border border-black"
            >
              {secondaryLinkLabel}
            </Button>
          ) : null}
          {rightLinkHref && rightLinkLabel ? (
            <Button
              as="a"
              href={rightLinkHref}
              size="default"
              className="w-auto bg-black/80 text-white border border-black"
            >
              {rightLinkLabel}
            </Button>
          ) : null}
          {showHome ? (
            <Button
              as="a"
              href="/"
              size="default"
              className="w-auto bg-black/80 text-white border border-black"
            >
              Zurück
            </Button>
          ) : null}
          {showLogin ? (
            <Button
              as="a"
              href="/auth/signin"
              size="default"
              className="w-auto bg-black/80 text-white border border-black"
            >
              Login
            </Button>
          ) : null}
          {showLogout ? (
            <Button
              type="button"
              size="default"
              className="w-auto bg-black/80 text-white border border-black"
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
