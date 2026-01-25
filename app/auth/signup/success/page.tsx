'use client'

import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function SignupSuccessPage() {
  const router = useRouter()

  return (
    <main className="relative min-h-screen overflow-hidden bg-gradient-to-b from-slate-50 via-white to-indigo-50">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-32 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-indigo-200/40 blur-3xl" />
        <div className="absolute bottom-0 right-0 h-72 w-72 rounded-full bg-emerald-200/40 blur-3xl" />
      </div>

      <div className="relative mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 py-16">
        <Card className="border-white/60 bg-white/85 shadow-[0_30px_60px_rgba(15,23,42,0.12)] backdrop-blur-xl">
          <CardHeader className="gap-3 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
              ✓
            </div>
            <CardTitle className="text-2xl md:text-3xl">
              Registrierung erfolgreich
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6 text-center">
            <p className="text-sm text-slate-600 md:text-base">
              Dein Account wurde erstellt. Wir haben eine E-Mail zur Bestaetigung
              gesendet. Bitte pruefe deinen Posteingang (auch Spam-Ordner).
            </p>
            <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Button type="button" onClick={() => router.push('/auth/signin')}>
                Zum Login
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push('/')}
              >
                Zur Startseite
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  )
}
