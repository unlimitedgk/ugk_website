import { NextResponse } from 'next/server'

type RecaptchaVerifyResponse = {
  success: boolean
  'error-codes'?: string[]
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { token?: string } | null
  const token = body?.token

  if (!token) {
    return NextResponse.json({ error: 'Missing reCAPTCHA token' }, { status: 400 })
  }

  const secret = process.env.RECAPTCHA_SECRET_KEY
  if (!secret) {
    return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 })
  }

  const verifyResponse = await fetch('https://www.google.com/recaptcha/api/siteverify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ secret, response: token }),
  })

  const result = (await verifyResponse.json()) as RecaptchaVerifyResponse

  if (!result.success) {
    return NextResponse.json({ error: 'reCAPTCHA verification failed' }, { status: 400 })
  }

  return NextResponse.json({ success: true })
}
