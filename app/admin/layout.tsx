'use client'

import { useEffect, useRef, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { clearInvalidRefreshToken, supabase } from '@/lib/supabaseClient'

/**
 * Sperrt den gesamten Adminbereich für Nicht-Admins ab.
 *
 * Die Prüfung läuft im Browser: Der Bundle-Code der Adminseiten wird weiterhin
 * ausgeliefert, die Oberfläche und ihre Daten werden aber erst gerendert, wenn
 * die Rolle bestätigt ist. Die eigentliche Datenabsicherung bleibt RLS.
 */
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const [allowed, setAllowed] = useState(false)

  // Einstiegs-Pfad als Redirect-Ziel festhalten. Über eine Ref, damit `pathname`
  // nicht in die Effect-Dependencies muss: sonst liefe die Prüfung bei jedem
  // Seitenwechsel innerhalb von /admin erneut und ein kurzer Netzwerkfehler
  // würde eine laufende Admin-Session hinauswerfen.
  const entryPathnameRef = useRef(pathname)

  useEffect(() => {
    let isMounted = true

    async function checkAdminAccess() {
      await clearInvalidRefreshToken()

      if (!isMounted) {
        return
      }

      const { data, error } = await supabase.auth.getUser()

      if (!isMounted) {
        return
      }

      const userId = data?.user?.id

      if (error || !userId) {
        router.replace(`/auth/signin?redirect=${encodeURIComponent(entryPathnameRef.current)}`)
        return
      }

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', userId)
        .single()

      if (!isMounted) {
        return
      }

      if (profileError || profile?.role !== 'admin') {
        router.replace('/')
        return
      }

      setAllowed(true)
    }

    checkAdminAccess()

    return () => {
      isMounted = false
    }
  }, [router])

  if (!allowed) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50">
        <p className="text-sm text-slate-500">Wird geladen…</p>
      </main>
    )
  }

  return <>{children}</>
}
