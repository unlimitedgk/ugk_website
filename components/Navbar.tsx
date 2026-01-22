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
        <Link href={logoHref} className="flex items-center" style={{ width: '50px', height: '50px'}}>
          <Image
            src="/images/brand/logo-black.png"
            alt="Unlimited Goalkeeping"
            width={50}
            height={50}
            priority
          />
        </Link>

        <div className="flex items-center gap-2">
          {secondaryLinkHref && secondaryLinkLabel ? (
            <Button
              as="a"
              href={secondaryLinkHref}
              size="default"
              className="w-auto bg-white text-slate-900 border border-slate-300"
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
              href="/login"
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
