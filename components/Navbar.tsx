'use client'

import { useEffect, useRef, useState, type MouseEvent as ReactMouseEvent } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { supabase } from '@/lib/supabaseClient'
import { Button } from '@/components/ui/button'

export type NavbarSectionLink = { label: string; targetId: string }

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
  /** In-page links that smooth-scroll to a section id (homepage only). */
  sectionLinks?: NavbarSectionLink[]
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
  sectionLinks = [],
}: NavbarProps) {
  const [scrolled, setScrolled] = useState(false)
  const [pastHero, setPastHero] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const headerRef = useRef<HTMLElement>(null)

  useEffect(() => {
    if (!overHero) return
    const onScroll = () => {
      setScrolled(window.scrollY > 8)
      // The hero is the element with id="hero"; once its bottom passes under the navbar, we're "past" it.
      const hero = document.getElementById('hero')
      const navHeight = headerRef.current?.offsetHeight ?? 50
      setPastHero(hero ? hero.getBoundingClientRect().bottom <= navHeight : window.scrollY > 8)
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [overHero])

  // Close the mobile menu on outside tap or Escape.
  useEffect(() => {
    if (!menuOpen) return
    const onPointerDown = (e: MouseEvent | TouchEvent) => {
      if (headerRef.current && !headerRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuOpen(false)
    }
    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('touchstart', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('touchstart', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [menuOpen])

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

  const webshopClass =
    'inline-flex h-9 shrink-0 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-indigo-500 to-rose-500 px-3 text-xs font-semibold text-white transition hover:opacity-90 md:h-11 md:px-6 md:text-sm'

  const headerClassName = overHero
    ? `fixed top-0 z-50 w-full bg-transparent transition-colors duration-200${scrolled ? ' backdrop-blur-md bg-white/10' : ''}`
    : 'sticky top-0 z-50 bg-white'

  const hasMenuItems =
    sectionLinks.length > 0 ||
    showWebshop ||
    Boolean(secondaryLinkHref && secondaryLinkLabel) ||
    Boolean(rightLinkHref && rightLinkLabel) ||
    showHome ||
    showLogin ||
    showLogout

  const closeMenu = () => setMenuOpen(false)

  const scrollToSection = (e: ReactMouseEvent<HTMLAnchorElement>, targetId: string) => {
    const target = document.getElementById(targetId)
    if (!target) return
    e.preventDefault()
    target.scrollIntoView({ behavior: 'smooth' })
    window.history.replaceState(null, '', `#${targetId}`)
    closeMenu()
  }

  const webshopLink = (extraClass = '', onClick?: () => void) => (
    <Link
      href="https://goalkeeping.ourwear.shop"
      target="_blank"
      rel="noopener noreferrer"
      className={`${webshopClass} ${extraClass}`}
      onClick={onClick}
    >
      Webshop
    </Link>
  )

  /** Right-hand buttons; shared by the desktop row and the mobile dropdown. */
  const renderRightLinks = (mobile: boolean) => {
    const extra = mobile ? 'w-full' : ''
    const onClick = mobile ? closeMenu : undefined
    return (
      <>
        {secondaryLinkHref && secondaryLinkLabel ? (
          <Link href={secondaryLinkHref} className={`${primaryCtaClass} ${extra}`} onClick={onClick}>
            {secondaryLinkLabel}
          </Link>
        ) : null}
        {rightLinkHref && rightLinkLabel ? (
          <Link href={rightLinkHref} className={`${navBlackLinkClass} ${extra}`} onClick={onClick}>
            {rightLinkLabel}
          </Link>
        ) : null}
        {showHome ? (
          <Link href="/" className={`${standardCtaClass} ${extra}`} onClick={onClick}>
            Zurück
          </Link>
        ) : null}
        {showLogin ? (
          <Link href="/auth/signin" className={`${standardCtaClass} ${extra}`} onClick={onClick}>
            Login
          </Link>
        ) : null}
        {showLogout ? (
          <Button
            type="button"
            variant="standardCta"
            className={extra}
            onClick={handleLogout}
          >
            Log Out
          </Button>
        ) : null}
      </>
    )
  }

  return (
    <header ref={headerRef} className={headerClassName}>
      <div className="relative flex h-[50px] items-center justify-between px-4 md:px-6">
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
          {showWebshop ? <div className="hidden lg:flex">{webshopLink()}</div> : null}
        </div>

        {/* Desktop section links (centered) */}
        {sectionLinks.length > 0 ? (
          <nav className="absolute left-1/2 hidden -translate-x-1/2 items-center gap-8 lg:flex">
            {sectionLinks.map((link) => (
              <a
                key={link.targetId}
                href={`#${link.targetId}`}
                onClick={(e) => scrollToSection(e, link.targetId)}
                className={`text-sm font-medium transition-colors ${
                  overHero && !pastHero ? 'text-white hover:text-white/70' : 'text-black hover:text-gray-500'
                }`}
              >
                {link.label}
              </a>
            ))}
          </nav>
        ) : null}

        {/* Desktop buttons */}
        <div className="hidden shrink-0 items-center gap-2 lg:flex">
          {renderRightLinks(false)}
        </div>

        {/* Mobile burger */}
        {hasMenuItems ? (
          <button
            type="button"
            aria-label={menuOpen ? 'Menü schließen' : 'Menü öffnen'}
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((open) => !open)}
            className={`flex h-10 w-10 items-center justify-center rounded-xl transition lg:hidden ${
              overHero && !scrolled ? 'text-white hover:bg-white/10' : 'text-gray-900 hover:bg-black/5'
            }`}
          >
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              aria-hidden="true"
            >
              {menuOpen ? (
                <>
                  <line x1="6" y1="6" x2="18" y2="18" />
                  <line x1="18" y1="6" x2="6" y2="18" />
                </>
              ) : (
                <>
                  <line x1="4" y1="7" x2="20" y2="7" />
                  <line x1="4" y1="12" x2="20" y2="12" />
                  <line x1="4" y1="17" x2="20" y2="17" />
                </>
              )}
            </svg>
          </button>
        ) : null}

        {/* Mobile dropdown */}
        {menuOpen ? (
          <div className="absolute right-4 top-[50px] flex w-56 flex-col gap-2 rounded-2xl bg-white p-3 shadow-lg ring-1 ring-black/5 lg:hidden">
            {sectionLinks.length > 0 ? (
              <>
                {sectionLinks.map((link) => (
                  <a
                    key={link.targetId}
                    href={`#${link.targetId}`}
                    onClick={(e) => scrollToSection(e, link.targetId)}
                    className="rounded-xl px-3 py-2 text-sm font-medium text-gray-800 transition hover:bg-gray-100"
                  >
                    {link.label}
                  </a>
                ))}
                <hr className="my-1 border-gray-200" />
              </>
            ) : null}
            {showWebshop ? webshopLink('w-full', closeMenu) : null}
            {renderRightLinks(true)}
          </div>
        ) : null}
      </div>
    </header>
  )
}
