import Link from 'next/link'
import Image from 'next/image'
import { Button } from '@/components/ui/button'

type NavbarProps = {
  showLogin?: boolean
  logoHref?: string
  showHome?: boolean
}

export default function Navbar({
  showLogin = false,
  showHome = false,
  logoHref = '/#top',
}: NavbarProps) {
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
        </div>
      </div>
    </header>
  )
}
