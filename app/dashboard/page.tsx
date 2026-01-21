'use client'

import { useEffect, useState } from 'react'
import { clearInvalidRefreshToken, supabase } from '@/lib/supabaseClient'

export default function DashboardPage() {
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any>(null)

  useEffect(() => {
    async function loadUser() {
      const hadInvalidSession = await clearInvalidRefreshToken()

      if (hadInvalidSession) {
        setUser(null)
        setLoading(false)
        return
      }

      const {
        data: { user },
      } = await supabase.auth.getUser()

      setUser(user)
      setLoading(false)
    }

    loadUser()
  }, [])

  if (loading) {
    return <p style={{ padding: 40 }}>Loading...</p>
  }

  if (!user) {
    return (
      <main style={{ padding: 40 }}>
        <h1>Not logged in</h1>
        <p>Please log in to access the dashboard.</p>
      </main>
    )
  }

  return (
    <main style={{ padding: 40 }}>
      <h1>Dashboard</h1>
      <p>Welcome, {user.email}</p>
    </main>
  )
}