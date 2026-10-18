import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

export const supabase = createClient(
  supabaseUrl,
  supabaseAnonKey
)

// Fehlermeldung des Custom Access Token Hooks für noch nicht freigegebene Accounts
export const ACCOUNT_NOT_APPROVED = 'account_not_approved'

function getTokenRole(accessToken: string): string | null {
  try {
    const payload = accessToken.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')
    return JSON.parse(atob(payload))?.role ?? null
  } catch {
    return null
  }
}

export async function clearInvalidRefreshToken(): Promise<boolean> {
  const { data, error } = await supabase.auth.getSession()

  if (error?.message?.includes('Refresh Token')) {
    await supabase.auth.signOut()
    return true
  }

  // Nach Klick auf den Bestätigungslink bekommen nicht freigegebene Accounts
  // ein Token mit Rolle 'anon' (siehe custom_access_token_hook) -> verwerfen
  const accessToken = data?.session?.access_token
  if (accessToken && getTokenRole(accessToken) === 'anon') {
    await supabase.auth.signOut({ scope: 'local' })
    return true
  }

  return false
}

