'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Separator } from '@/components/ui/separator'

export const dynamic = 'force-dynamic'

type Keeperday = {
  id: string
  title: string
  date: string
  city: string
  location_name: string
  price: number | string
}

export default function KeeperdayRegistrationPage() {
  const router = useRouter()
  const [keeperdays, setKeeperdays] = useState<Keeperday[]>([])
  const [keeperdayId, setKeeperdayId] = useState('')

  const [isOfLegalAge, setIsOfLegalAge] = useState(false)

  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [birthDate, setBirthDate] = useState('')
  const [currentClub, setCurrentClub] = useState('')
  const [medicalNotes, setMedicalNotes] = useState('')
  const [diet, setDiet] = useState('')
  const [gloveSize, setGloveSize] = useState<number | ''>('')

  const [parentFirstName, setParentFirstName] = useState('')
  const [parentLastName, setParentLastName] = useState('')
  const [parentEmail, setParentEmail] = useState('')
  const [parentPhone, setParentPhone] = useState('')

  const [informedVia, setInformedVia] = useState('')
  const [newsletter, setNewsletter] = useState(false)
  const [termsAccepted, setTermsAccepted] = useState(false)
  const [dsgvoAccepted, setDsgvoAccepted] = useState(false)

  const [loading, setLoading] = useState(false)
  const [feedback, setFeedback] = useState<{
    type: 'success' | 'error'
    text: string
  } | null>(null)
  const [summaryErrors, setSummaryErrors] = useState<string[]>([])
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  const inputClass =
    'w-full rounded-xl border border-slate-200 bg-white/90 px-3 py-2 text-sm text-slate-900 shadow-sm outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-200'

  const formatPrice = (price: number | string) => {
    const numericPrice = Number(price)
    if (Number.isNaN(numericPrice)) {
      return '-'
    }

    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR',
    }).format(numericPrice)
  }

  useEffect(() => {
    supabase
      .from('keeperdays')
      .select('id, title, date, city, location_name, price')
      .eq('open_for_registration', true)
      .order('date')
      .then(({ data }) => {
        if (data) setKeeperdays(data)
      })
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setFeedback(null)
    setSummaryErrors([])
    setFieldErrors({})

    const { fieldErrors: nextFieldErrors, summary } = validateForm()
    if (summary.length > 0) {
      setFieldErrors(nextFieldErrors)
      setSummaryErrors(summary)
      setFeedback({
        type: 'error',
        text: 'Bitte pruefe die markierten Felder und versuche es erneut.',
      })
      return
    }

    setLoading(true)

    const payload = {
      keeperday_id: keeperdayId,
      is_of_legal_age: isOfLegalAge,
      first_name: firstName.trim(),
      last_name: lastName.trim(),
      email: email.trim() || null,
      phone: phone.trim() || null,
      birth_date: birthDate,
      current_club: currentClub.trim() || null,
      medical_notes: medicalNotes.trim() || null,
      diet: diet || null,
      glove_size: gloveSize === '' ? null : gloveSize,
      informed_via: informedVia || null,
      newsletter_opt_in: newsletter,
      terms_accepted: termsAccepted,
      dsgvo_accepted: dsgvoAccepted,
      parent_first_name: isOfLegalAge ? null : parentFirstName.trim(),
      parent_last_name: isOfLegalAge ? null : parentLastName.trim(),
      parent_email: isOfLegalAge ? null : parentEmail.trim(),
      parent_phone: isOfLegalAge ? null : parentPhone.trim(),
    }

    const { data, error } = await supabase
      .from('keeperday_registrations')
      .insert(payload)
      .select('id')
      .single()

    if (error || !data) {
      setLoading(false)
      router.push('/keeperdays/register/error')
      console.log(error)
      return
    }

    setLoading(false)
    router.push('/keeperdays/register/success')
  }

  function validateForm() {
    const fieldErrors: Record<string, string> = {}
    const summary: string[] = []
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    const addError = (key: string, message: string) => {
      if (!fieldErrors[key]) fieldErrors[key] = message
      summary.push(message)
    }

    if (!keeperdayId) addError('keeperdayId', 'Bitte waehle einen Keeperday aus.')
    if (!firstName.trim()) addError('firstName', 'Vorname ist erforderlich.')
    if (!lastName.trim()) addError('lastName', 'Nachname ist erforderlich.')
    if (!birthDate) addError('birthDate', 'Geburtsdatum ist erforderlich.')

    if (isOfLegalAge) {
      const phoneDigits = phone.replace(/\D/g, '')
      if (!email.trim()) addError('email', 'E-Mail ist erforderlich.')
      if (email.trim() && !emailPattern.test(email.trim())) {
        addError('email', 'E-Mail muss gültig sein.')
      }
      if (!phone.trim()) addError('phone', 'Telefonnummer ist erforderlich.')
      if (phone.trim() && phoneDigits.length < 6) {
        addError('phone', 'Telefonnummer muss gueltig sein.')
      }
    } else {
      const parentPhoneDigits = parentPhone.replace(/\D/g, '')
      if (!parentFirstName.trim()) {
        addError('parentFirstName', 'Vorname der Eltern ist erforderlich.')
      }
      if (!parentLastName.trim()) {
        addError('parentLastName', 'Nachname der Eltern ist erforderlich.')
      }
      if (!parentEmail.trim()) addError('parentEmail', 'E-Mail der Eltern ist erforderlich.')
      if (parentEmail.trim() && !emailPattern.test(parentEmail.trim())) {
        addError('parentEmail', 'E-Mail der Eltern muss gueltig sein.')
      }
      if (!parentPhone.trim()) {
        addError('parentPhone', 'Telefonnummer der Eltern ist erforderlich.')
      }
      if (parentPhone.trim() && parentPhoneDigits.length < 6) {
        addError('parentPhone', 'Telefonnummer der Eltern muss gueltig sein.')
      }
    }

    if (!termsAccepted) {
      addError('termsAccepted', 'Bitte akzeptiere die Allgemeinen Geschaeftsbedingungen.')
    }

    return { fieldErrors, summary }
  }

  const selectedKeeperday = useMemo(
    () => keeperdays.find((keeperday) => keeperday.id === keeperdayId),
    [keeperdays, keeperdayId]
  )

  return (
    <main className="relative min-h-screen overflow-hidden bg-gradient-to-b from-slate-50 via-white to-indigo-50">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-32 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-indigo-200/40 blur-3xl" />
        <div className="absolute bottom-0 right-0 h-72 w-72 rounded-full bg-rose-200/40 blur-3xl" />
      </div>

      <div className="relative mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 py-10">
        <Card className="border-white/60 bg-white/80 shadow-[0_30px_60px_rgba(15,23,42,0.12)] backdrop-blur-xl">
          <CardHeader className="gap-4">
            <div className="flex flex-wrap items-center gap-3">
              <span className="rounded-full bg-indigo-100 px-3 py-1 text-xs font-semibold text-indigo-600">
                Keeperdays
              </span>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-500">
                Anmeldung
              </span>
            </div>
            <div>
              <CardTitle className="text-3xl md:text-4xl">Keeperday-Anmeldung</CardTitle>
              <CardDescription>
                Sichere dir deinen Platz in wenigen Minuten. Du erhaelst direkt nach dem
                Absenden eine Bestaetigungs-E-Mail.
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <Separator />

            {feedback && (
              <Alert
                className={
                  feedback.type === 'success'
                    ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                    : 'border-rose-200 bg-rose-50 text-rose-700'
                }
              >
                <AlertTitle>
                  {feedback.type === 'success' ? 'Erfolg' : 'Bitte pruefen'}
                </AlertTitle>
                <AlertDescription>{feedback.text}</AlertDescription>
              </Alert>
            )}

            {summaryErrors.length > 0 && (
              <Alert className="border-rose-200 bg-rose-50 text-rose-700">
                <AlertTitle>Bitte behebe Folgendes:</AlertTitle>
                <AlertDescription>
                  <ul className="list-disc space-y-1 pl-5">
                    {summaryErrors.map((error) => (
                      <li key={error}>{error}</li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              <fieldset disabled={loading} className="space-y-6">
                <Card className="border-slate-200/70 bg-white/70 shadow-none">
                  <CardContent className="space-y-3">
                    <div className="space-y-1">
                      <Label htmlFor="keeperdayId">Keeperday auswählen</Label>
                      <p className="text-xs text-slate-400">
                        Wähle den Keeperday, fuer den du dich anmelden moechtest.
                      </p>
                    </div>
                    <select
                      id="keeperdayId"
                      value={keeperdayId}
                      onChange={(e) => setKeeperdayId(e.target.value)}
                      className={inputClass}
                      aria-invalid={Boolean(fieldErrors.keeperdayId)}
                      aria-describedby={fieldErrors.keeperdayId ? 'keeperdayId-error' : undefined}
                      required
                    >
                      <option value="">Bitte auswählen</option>
                      {keeperdays.map((keeperday) => (
                        <option key={keeperday.id} value={keeperday.id}>
                          {keeperday.title} · {keeperday.date} · {keeperday.city}
                        </option>
                      ))}
                    </select>
                    {fieldErrors.keeperdayId && (
                      <p id="keeperdayId-error" className="text-xs text-rose-600">
                        {fieldErrors.keeperdayId}
                      </p>
                    )}
                    {selectedKeeperday && (
                      <div className="rounded-xl bg-indigo-50/70 px-3 py-2 text-xs text-indigo-700">
                        {selectedKeeperday.title} · {selectedKeeperday.date} ·{' '}
                        {selectedKeeperday.location_name}
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card className="border-slate-200/70 bg-white/70 shadow-none">
                  <CardContent className="space-y-4">
                    <div className="space-y-1">
                      <Label className="flex items-center gap-3 text-sm">
                        <input
                          type="checkbox"
                          checked={isOfLegalAge}
                          onChange={(e) => setIsOfLegalAge(e.target.checked)}
                          className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-400"
                        />
                        Ich bin volljaehrig
                      </Label>
                      <p className="text-xs text-slate-400">
                        Minderjaehrige brauchen die Kontaktdaten der Eltern.
                      </p>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-slate-200/70 bg-white/70 shadow-none">
                  <CardHeader className="pb-0">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <CardTitle className="text-base">Persoenliche Angaben</CardTitle>
                      <span className="rounded-full bg-rose-100 px-3 py-1 text-xs font-semibold text-rose-600">
                        Pflichtfelder *
                      </span>
                    </div>
                  </CardHeader>
                  <CardContent className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="firstName">Vorname *</Label>
                      <Input
                        id="firstName"
                        placeholder="Vorname"
                        required
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        aria-invalid={Boolean(fieldErrors.firstName)}
                        aria-describedby={fieldErrors.firstName ? 'firstName-error' : undefined}
                      />
                      {fieldErrors.firstName && (
                        <p id="firstName-error" className="text-xs text-rose-600">
                          {fieldErrors.firstName}
                        </p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="lastName">Nachname *</Label>
                      <Input
                        id="lastName"
                        placeholder="Nachname"
                        required
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        aria-invalid={Boolean(fieldErrors.lastName)}
                        aria-describedby={fieldErrors.lastName ? 'lastName-error' : undefined}
                      />
                      {fieldErrors.lastName && (
                        <p id="lastName-error" className="text-xs text-rose-600">
                          {fieldErrors.lastName}
                        </p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="birthDate">Geburtsdatum *</Label>
                      <Input
                        id="birthDate"
                        type="date"
                        required
                        value={birthDate}
                        onChange={(e) => setBirthDate(e.target.value)}
                        aria-invalid={Boolean(fieldErrors.birthDate)}
                        aria-describedby={fieldErrors.birthDate ? 'birthDate-error' : undefined}
                      />
                      {fieldErrors.birthDate && (
                        <p id="birthDate-error" className="text-xs text-rose-600">
                          {fieldErrors.birthDate}
                        </p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="currentClub">Aktueller Verein</Label>
                      <Input
                        id="currentClub"
                        placeholder="Verein"
                        value={currentClub}
                        onChange={(e) => setCurrentClub(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">
                        E-Mail{isOfLegalAge ? ' *' : ''}
                      </Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="E-Mail"
                        required={isOfLegalAge}
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        aria-invalid={Boolean(fieldErrors.email)}
                        aria-describedby={fieldErrors.email ? 'email-error' : undefined}
                      />
                      {fieldErrors.email && (
                        <p id="email-error" className="text-xs text-rose-600">
                          {fieldErrors.email}
                        </p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="phone">
                        Telefon{isOfLegalAge ? ' *' : ''}
                      </Label>
                      <Input
                        id="phone"
                        placeholder="Telefon"
                        required={isOfLegalAge}
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        aria-invalid={Boolean(fieldErrors.phone)}
                        aria-describedby={fieldErrors.phone ? 'phone-error' : undefined}
                      />
                      {fieldErrors.phone && (
                        <p id="phone-error" className="text-xs text-rose-600">
                          {fieldErrors.phone}
                        </p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="gloveSize">Handschuhgröße</Label>
                      <select
                        id="gloveSize"
                        value={gloveSize}
                        onChange={(e) =>
                          setGloveSize(
                            e.target.value === '' ? '' : Number(e.target.value)
                          )
                        }
                        className={inputClass}
                      >
                        <option value="">Bitte auswählen</option>
                        {[4, 5, 6, 7, 8, 9, 10].map((size) => (
                          <option key={size} value={size}>
                            {size}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="diet">Ernaehrung</Label>
                      <select
                        id="diet"
                        value={diet}
                        onChange={(e) => setDiet(e.target.value)}
                        className={inputClass}
                      >
                        <option value="">Keine besondere Ernaehrung</option>
                        <option value="vegetarian">Vegetarisch</option>
                        <option value="vegan">Vegan</option>
                      </select>
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <Label htmlFor="medicalNotes">Medizinische Hinweise</Label>
                      <textarea
                        id="medicalNotes"
                        placeholder="Allergien, Medikamente, wichtige Hinweise"
                        value={medicalNotes}
                        onChange={(e) => setMedicalNotes(e.target.value)}
                        className={`${inputClass} min-h-[96px]`}
                      />
                    </div>
                  </CardContent>
                </Card>

                {!isOfLegalAge && (
                  <Card className="border-slate-200/70 bg-white/70 shadow-none">
                    <CardHeader className="pb-0">
                      <CardTitle className="text-base">Elternangaben</CardTitle>
                      <CardDescription>
                        Bitte gib die Kontaktdaten der Erziehungsberechtigten an.
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="parentFirstName">Vorname</Label>
                        <Input
                          id="parentFirstName"
                          placeholder="Vorname"
                          required
                          value={parentFirstName}
                          onChange={(e) => setParentFirstName(e.target.value)}
                          aria-invalid={Boolean(fieldErrors.parentFirstName)}
                          aria-describedby={
                            fieldErrors.parentFirstName ? 'parentFirstName-error' : undefined
                          }
                        />
                        {fieldErrors.parentFirstName && (
                          <p id="parentFirstName-error" className="text-xs text-rose-600">
                            {fieldErrors.parentFirstName}
                          </p>
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="parentLastName">Nachname</Label>
                        <Input
                          id="parentLastName"
                          placeholder="Nachname"
                          required
                          value={parentLastName}
                          onChange={(e) => setParentLastName(e.target.value)}
                          aria-invalid={Boolean(fieldErrors.parentLastName)}
                          aria-describedby={
                            fieldErrors.parentLastName ? 'parentLastName-error' : undefined
                          }
                        />
                        {fieldErrors.parentLastName && (
                          <p id="parentLastName-error" className="text-xs text-rose-600">
                            {fieldErrors.parentLastName}
                          </p>
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="parentEmail">E-Mail</Label>
                        <Input
                          id="parentEmail"
                          type="email"
                          placeholder="E-Mail"
                          required
                          value={parentEmail}
                          onChange={(e) => setParentEmail(e.target.value)}
                          aria-invalid={Boolean(fieldErrors.parentEmail)}
                          aria-describedby={
                            fieldErrors.parentEmail ? 'parentEmail-error' : undefined
                          }
                        />
                        {fieldErrors.parentEmail && (
                          <p id="parentEmail-error" className="text-xs text-rose-600">
                            {fieldErrors.parentEmail}
                          </p>
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="parentPhone">Telefon</Label>
                        <Input
                          id="parentPhone"
                          placeholder="Telefon"
                          required
                          value={parentPhone}
                          onChange={(e) => setParentPhone(e.target.value)}
                          aria-invalid={Boolean(fieldErrors.parentPhone)}
                          aria-describedby={
                            fieldErrors.parentPhone ? 'parentPhone-error' : undefined
                          }
                        />
                        {fieldErrors.parentPhone && (
                          <p id="parentPhone-error" className="text-xs text-rose-600">
                            {fieldErrors.parentPhone}
                          </p>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )}

                <Card className="border-slate-200/70 bg-white/70 shadow-none">
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="informedVia">Wie hast du von uns erfahren?</Label>
                      <select
                        id="informedVia"
                        value={informedVia}
                        onChange={(e) => setInformedVia(e.target.value)}
                        className={inputClass}
                        aria-invalid={Boolean(fieldErrors.informedVia)}
                        aria-describedby={fieldErrors.informedVia ? 'informedVia-error' : undefined}
                      >
                        <option value="">Eine Option wählen</option>
                        <option value="website">Webseite</option>
                        <option value="friend">Freund/in</option>
                        <option value="social_media">Soziale Medien</option>
                        <option value="newspaper">Zeitung</option>
                        <option value="other">Sonstiges</option>
                      </select>
                      {fieldErrors.informedVia && (
                        <p id="informedVia-error" className="text-xs text-rose-600">
                          {fieldErrors.informedVia}
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label className="flex items-center gap-3 text-sm">
                        <input
                          type="checkbox"
                          checked={newsletter}
                          onChange={(e) => setNewsletter(e.target.checked)}
                          className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-400"
                        />
                        Bitte halte mich auf dem Laufenden
                      </Label>
                    </div>

                    <div className="space-y-2">
                      <Label className="flex items-center gap-3 text-sm">
                        <input
                          type="checkbox"
                          required
                          checked={termsAccepted}
                          onChange={(e) => setTermsAccepted(e.target.checked)}
                          className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-400"
                          aria-invalid={Boolean(fieldErrors.termsAccepted)}
                          aria-describedby={
                            fieldErrors.termsAccepted ? 'termsAccepted-error' : undefined
                          }
                        />
                        Ich akzeptiere die Allgemeinen Geschaeftsbedingungen
                      </Label>
                      {fieldErrors.termsAccepted && (
                        <p id="termsAccepted-error" className="text-xs text-rose-600">
                          {fieldErrors.termsAccepted}
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label className="flex items-center gap-3 text-sm">
                        <input
                          type="checkbox"
                          required
                          checked={dsgvoAccepted}
                          onChange={(e) => setDsgvoAccepted(e.target.checked)}
                          className="mt-0.5 h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-400"
                          aria-invalid={Boolean(fieldErrors.dsgvoAccepted)}
                          aria-describedby={
                            fieldErrors.dsgvoAccepted ? 'dsgvoAccepted-error' : undefined
                          }
                        />
                        <span>
                          Die Anfertigung und Verwendung von Foto- und Videoaufnahmen
                          zu Zwecken der Öffentlichkeitsarbeit (z. B. Webseite, Social
                          Media, Drucksorten) erfolgt ausschließlich auf Grundlage einer
                          gesonderten und freiwilligen Einwilligung der betroffenen
                          Personen bzw. der Eltern oder gesetzlichen Vertreter:innen.
                        </span>
                      </Label>
                      {fieldErrors.dsgvoAccepted && (
                        <p id="dsgvoAccepted-error" className="text-xs text-rose-600">
                          {fieldErrors.dsgvoAccepted}
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>

                <Separator />

                <Card className="border-white/60 bg-white/80 p-6 shadow-[0_20px_40px_rgba(15,23,42,0.08)] backdrop-blur">
                  <div className="grid gap-4 md:grid-cols-[1.2fr_1fr]">
                    <div>
                      <h3 className="text-base font-semibold text-slate-800">Deine Anmeldung</h3>
                      <p className="text-sm text-slate-500">
                        Bitte pruefe deine Auswahl, bevor du das Formular absendest.
                      </p>
                    </div>
                    <div className="grid gap-3 text-sm text-slate-600">
                      <p>
                        <span className="font-semibold text-slate-800">Keeperday:</span>{' '}
                        {selectedKeeperday?.title ?? 'Nicht ausgewaehlt'}
                      </p>
                      <p>
                        <span className="font-semibold text-slate-800">Datum:</span>{' '}
                        {selectedKeeperday?.date ?? '-'}
                      </p>
                      <p>
                        <span className="font-semibold text-slate-800">Ort:</span>{' '}
                        {selectedKeeperday
                          ? `${selectedKeeperday.location_name} · ${selectedKeeperday.city}`
                          : '-'}
                      </p>
                      <p>
                        <span className="font-semibold text-slate-800">Preis:</span>{' '}
                        {selectedKeeperday ? formatPrice(selectedKeeperday.price) : '-'}
                      </p>
                    </div>
                  </div>
                </Card>

                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="text-xs text-slate-500">
                    Mit dem Absenden bestaetigst du, dass die Angaben oben korrekt sind.
                  </div>

                  <Button
                    className="w-auto border border-black bg-black/80 text-white text-lg"
                    type="submit"
                    disabled={loading}
                  >
                    {loading ? 'Wird gesendet...' : 'Kostenpflichtig anmelden'}
                  </Button>
                </div>
              </fieldset>
            </form>
          </CardContent>
        </Card>
      </div>
    </main>
  )
}
