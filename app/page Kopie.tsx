import { supabase } from '@/lib/supabaseClient'

export default async function Home() {
  const { data, error } = await supabase.auth.getSession()

  return (
    <main style={{ padding: 40 }}>
      <h1>Unlimited Goalkeeping</h1>

      {error && <p>Error: {error.message}</p>}

      <pre>
        {JSON.stringify(data, null, 2)}
      </pre>
    </main>
  )
}
