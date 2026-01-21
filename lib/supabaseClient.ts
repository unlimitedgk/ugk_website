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

export async function clearInvalidRefreshToken(): Promise<boolean> {
  const { error } = await supabase.auth.getSession()

  if (error?.message?.includes('Refresh Token')) {
    await supabase.auth.signOut()
    return true
  }

  return false
}

