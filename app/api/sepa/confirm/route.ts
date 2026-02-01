import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const token = searchParams.get('token')

  if (!token) {
    return NextResponse.json({ error: 'Missing token' }, { status: 400 })
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    return NextResponse.json({ error: 'Missing configuration' }, { status: 500 })
  }

  const response = await fetch(
    `${supabaseUrl}/functions/v1/sepa-mandate-confirm?token=${encodeURIComponent(
      token
    )}`,
    {
      method: 'GET',
      headers: {
        apikey: supabaseAnonKey,
      },
    }
  )

  const ok = response.ok
  const html = `<!doctype html>
<html lang="de">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>SEPA-Mandat bestätigt</title>
    <style>
      body { font-family: system-ui, -apple-system, sans-serif; background: #f8fafc; color: #0f172a; }
      .card { max-width: 520px; margin: 64px auto; background: #fff; border-radius: 20px;
        padding: 32px; box-shadow: 0 20px 40px rgba(15,23,42,0.1); }
      h1 { font-size: 20px; margin: 0 0 8px; }
      p { font-size: 14px; line-height: 1.6; margin: 0 0 16px; color: #475569; }
      a { color: #111827; text-decoration: underline; }
      .badge { display: inline-block; margin-bottom: 12px; padding: 6px 10px; border-radius: 999px;
        background: ${ok ? '#dcfce7' : '#fee2e2'}; color: ${ok ? '#166534' : '#991b1b'}; font-size: 12px; }
    </style>
  </head>
  <body>
    <div class="card">
      <div class="badge">${ok ? 'Mandat bestätigt' : 'Bestätigung fehlgeschlagen'}</div>
      <h1>${ok ? 'Danke! Dein Mandat ist bestätigt.' : 'Leider gab es ein Problem.'}</h1>
      <p>
        ${ok
          ? 'Du kannst jetzt zu deinen Kontoeinstellungen zurückkehren.'
          : 'Bitte versuche es erneut oder erstelle ein neues Mandat.'}
      </p>
      <a href="/auth/signin?redirect=/parent">Zurück zu den Kontoeinstellungen</a>
    </div>
  </body>
</html>`

  return new NextResponse(html, {
    status: ok ? 200 : 500,
    headers: {
      'content-type': 'text/html; charset=utf-8',
    },
  })
}
