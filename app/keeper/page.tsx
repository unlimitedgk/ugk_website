import Navbar from '@/components/Navbar'

export default function KeeperLandingPage() {
  return (
    <main className="min-h-screen bg-slate-50 text-black">
      <Navbar showHome showLogout />
      <div className="mx-auto flex min-h-[70vh] max-w-4xl items-center justify-center px-6 py-16">
        <div className="w-full rounded-3xl border border-black/10 bg-white/80 p-10 text-center shadow-2xl">
          <h1 className="text-2xl font-semibold">Erfolgreich angemeldet</h1>
          <p className="mt-4 text-sm text-black/70">
            Willkommen im Torwartbereich. Du bist jetzt eingeloggt.
          </p>
        </div>
      </div>
    </main>
  )
}
