'use client'

import Script from 'next/script'
import { useCallback, useEffect, useRef } from 'react'

const RECAPTCHA_ONLOAD_CALLBACK = '__ugkRecaptchaOnLoad'

type Grecaptcha = {
  ready: (callback: () => void) => void
  render: (
    container: HTMLElement,
    parameters: {
      sitekey: string
      callback?: (token: string) => void
      'expired-callback'?: () => void
      'error-callback'?: () => void
    }
  ) => number
  reset: (widgetId?: number) => void
}

declare global {
  interface Window {
    grecaptcha?: Grecaptcha
    __ugkRecaptchaOnLoad?: () => void
  }
}

type ReCaptchaCheckboxProps = {
  onVerify: (token: string | null) => void
  resetSignal?: number
}

export default function ReCaptchaCheckbox({ onVerify, resetSignal = 0 }: ReCaptchaCheckboxProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const widgetIdRef = useRef<number | null>(null)
  const onVerifyRef = useRef(onVerify)

  const siteKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY

  onVerifyRef.current = onVerify

  const renderWidget = useCallback(() => {
    if (!siteKey || !containerRef.current || widgetIdRef.current !== null) {
      return
    }

    window.grecaptcha?.ready(() => {
      if (!containerRef.current || widgetIdRef.current !== null) {
        return
      }

      widgetIdRef.current = window.grecaptcha!.render(containerRef.current, {
        sitekey: siteKey,
        callback: (token) => onVerifyRef.current(token),
        'expired-callback': () => onVerifyRef.current(null),
        'error-callback': () => onVerifyRef.current(null),
      })
    })
  }, [siteKey])

  // Must be defined before api.js loads (Google onload requirement).
  if (typeof window !== 'undefined') {
    window[RECAPTCHA_ONLOAD_CALLBACK] = renderWidget
  }

  useEffect(() => {
    if (window.grecaptcha) {
      renderWidget()
    }

    return () => {
      delete window[RECAPTCHA_ONLOAD_CALLBACK]
      widgetIdRef.current = null
      if (containerRef.current) {
        containerRef.current.innerHTML = ''
      }
    }
  }, [renderWidget])

  useEffect(() => {
    if (!resetSignal || widgetIdRef.current === null) {
      return
    }

    window.grecaptcha?.reset(widgetIdRef.current)
    onVerifyRef.current(null)
  }, [resetSignal])

  if (!siteKey) {
    return (
      <p className="text-xs text-red-600">
        reCAPTCHA ist nicht konfiguriert. Bitte kontaktiere den Support.
      </p>
    )
  }

  const scriptSrc = `https://www.google.com/recaptcha/api.js?onload=${RECAPTCHA_ONLOAD_CALLBACK}&render=explicit`

  return (
    <>
      <Script src={scriptSrc} strategy="afterInteractive" />
      <div ref={containerRef} />
    </>
  )
}
