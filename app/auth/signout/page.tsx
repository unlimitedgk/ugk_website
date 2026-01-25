'use client'

import { supabase } from '@/lib/supabaseClient'

export default function LogoutPage() {
  async function handleLogout() {
    await supabase.auth.signOut()
    window.location.href = '/auth/signin'
  }

  return (
    <main style={{ padding: 40 }}>
      <h1>Logout</h1>
      <button onClick={handleLogout}>Log out</button>
    </main>
  )
}