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
import { getStatusBadgeClass, getStatusLabel, type EventStatus } from '@/lib/eventStatus'

export const dynamic = 'force-dynamic'

type Camp = {
  id: string
  title: string
  start_date: string
  price: number | string
  event_status?: EventStatus | null
}

type ChildForm = {
  firstName: string
  lastName: string
  birthDate: string
  homeClub: string
  insurance: string
  allergies: string
  medication: string
  diet: 'none' | 'vegetarian' | 'vegan'
  gloveSize: number | ''
}

export default function CampRegistrationPage() {
  const router = useRouter()
  const [camps, setCamps] = useState<Camp[]>([])
  const [campId, setCampId] = useState('')

  const [childrenCount, setChildrenCount] = useState(1)
  const [children, setChildren] = useState<ChildForm[]>([
    emptyChild(),
  ])

  // Parent data
  const [parentFirstName, setParentFirstName] = useState('')
  const [parentLastName, setParentLastName] = useState('')
  const [parentEmail, setParentEmail] = useState('')
  const [parentPhone, setParentPhone] = useState('')

  // Global selections
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

  /* -------------------------------------------
     Load camps
  --------------------------------------------*/
  useEffect(() => {
    supabase
      .from('events')
      .select('id, title, start_date, price, event_status')
      .eq('event_type', 'camp')
      .eq('open_for_registration', 'true')
      .order('start_date')
      .then(({ data }) => {
        if (data) setCamps(data)
      })
  }, [])

  /* -------------------------------------------
     Adjust children forms
  --------------------------------------------*/
  useEffect(() => {
    setChildren((prev) => {
      const updated = [...prev]
      while (updated.length < childrenCount) updated.push(emptyChild())
      while (updated.length > childrenCount) updated.pop()
      return updated
    })
  }, [childrenCount])

  function updateChild(index: number, field: keyof ChildForm, value: any) {
    setChildren((prev) =>
      prev.map((child, i) =>
        i === index ? { ...child, [field]: value } : child
      )
    )
  }

  /* -------------------------------------------
     Submit
  --------------------------------------------*/
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
        text: 'Bitte prüfe die markierten Felder und versuche es erneut.',
      })
      return
    }

    setLoading(true)

    const rows = children.map((child) => ({
      camp_id: campId,

      parent_first_name: parentFirstName,
      parent_last_name: parentLastName,
      parent_email: parentEmail,
      parent_phone: parentPhone,

      child_first_name: child.firstName,
      child_last_name: child.lastName,
      child_birth_date: child.birthDate,
      child_home_club: child.homeClub,

      health_insurance_number: child.insurance,
      allergies: child.allergies,
      medication: child.medication,

      diet: child.diet,
      glove_size: child.gloveSize === '' ? null : child.gloveSize,
      informed_via: informedVia,

      newsletter_opt_in: newsletter,
      agb_accepted: termsAccepted,
      dsgvo_accepted: dsgvoAccepted,
    }))

    const { data, error } = await supabase
      .from('camp_registrations')
      .insert(rows)
      .select('id')

    const insertedRows: { id: string }[] = Array.isArray(data) ? data : data ? [data] : []
    const registrationIds = insertedRows.map((row) => row.id)

    if (error || registrationIds.length === 0) {
      setLoading(false)
      router.push('/camps/register/error')
      console.log(error)
      return
    }
    
    /* ----------------------------------------
        👇 EMAIL CONFIRMATION GOES HERE
    -----------------------------------------*/
    
    const selectedCamp = camps.find(c => c.id === campId)

    if (!selectedCamp) {
      setFeedback({ type: 'error', text: 'Ungültige Camp-Auswahl.' })
      setLoading(false)
      return
    }
  
    try {
        await fetch(
          `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/send-camp-confirmation`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
              apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            },
            body: JSON.stringify({
              parentEmail,
              parentName: `${parentFirstName} ${parentLastName}`,
              campTitle: selectedCamp.title,
              children: children.map(c => ({
                firstName: c.firstName,
                lastName: c.lastName,
              })),
              registrationIds: registrationIds,
            }),
          }
        )
      } catch (err) {
        console.error('Email sending failed', err)
    } 
    
    /* ---------------------------------------- */
    
    setLoading(false)
    router.push('/camps/register/success')
  }

  function validateForm() {
    const fieldErrors: Record<string, string> = {}
    const summary: string[] = []
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    const phoneDigits = parentPhone.replace(/\D/g, '')
    const addError = (key: string, message: string) => {
      if (!fieldErrors[key]) fieldErrors[key] = message
      summary.push(message)
    }

    if (!campId) addError('campId', 'Bitte wähle ein Camp aus.')
    if (!parentFirstName.trim()) addError('parentFirstName', 'Vorname ist erforderlich.')
    if (!parentLastName.trim()) addError('parentLastName', 'Nachname ist erforderlich.')
    if (!parentEmail.trim()) addError('parentEmail', 'E-Mail ist erforderlich.')
    if (parentEmail.trim() && !emailPattern.test(parentEmail.trim())) {
      addError('parentEmail', 'E-Mail muss gültig sein.')
    }
    if (!parentPhone.trim()) addError('parentPhone', 'Telefonnummer ist erforderlich.')
    if (parentPhone.trim() && phoneDigits.length < 6) {
      addError('parentPhone', 'Telefonnummer muss gültig sein.')
    }
    if (!informedVia) addError('informedVia', 'Bitte sag uns, wie du von uns erfahren hast.')
    if (!termsAccepted) addError('termsAccepted', 'Bitte akzeptiere die Allgemeinen Geschäftsbedingungen.')


    children.forEach((child, index) => {
      if (!child.firstName.trim()) {
        addError(`child.${index}.firstName`, 'Vorname ist erforderlich.')
      }
      if (!child.lastName.trim()) {
        addError(`child.${index}.lastName`, 'Nachname ist erforderlich.')
      }
      if (!child.birthDate) {
        addError(`child.${index}.birthDate`, 'Geburtsdatum ist erforderlich.')
      }
      if (child.gloveSize === '') {
        addError(`child.${index}.gloveSize`, 'Handschuhgröße ist erforderlich.')
      } else if (Number(child.gloveSize) < 4 || Number(child.gloveSize) > 10) {
        addError(`child.${index}.gloveSize`, 'Handschuhgröße muss 4-10 sein.')
      }
      if (!child.diet) {
        addError(`child.${index}.diet`, 'Ernährungswahl ist erforderlich.')
      }
    })

    return { fieldErrors, summary }
  }

  /* -------------------------------------------
     Render
  --------------------------------------------*/
  const selectedCampForUi = camps.find((camp) => camp.id === campId)
  const selectedCampPrice = selectedCampForUi ? Number(selectedCampForUi.price) : NaN
  const totalPrice =
    Number.isNaN(selectedCampPrice) ? NaN : selectedCampPrice * childrenCount

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
                Torwart-Camps
              </span>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-500">
                Anmeldung
              </span>
            </div>
            <div>
              <CardTitle className="text-3xl md:text-4xl">Camp-Anmeldung</CardTitle>
              <CardDescription>
                Sichere dir deinen Platz in wenigen Minuten. Du erhälst direkt nach dem
                Absenden eine Bestätigungs-E-Mail.
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
                  {feedback.type === 'success' ? 'Erfolg' : 'Bitte prüfen'}
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
                {/* Camp selection */}
                <Card className="border-slate-200/70 bg-white/70 shadow-none">
                  <CardContent className="space-y-3">
                    <div className="space-y-1">
                      <Label htmlFor="campId">Camp auswählen</Label>
                      <p className="text-xs text-slate-400">
                        Wähle das Camp, für das du dich anmelden möchtest.
                      </p>
                    </div>
                    <select
                      id="campId"
                      value={campId}
                      onChange={(e) => setCampId(e.target.value)}
                      className={inputClass}
                      aria-invalid={Boolean(fieldErrors.campId)}
                      aria-describedby={fieldErrors.campId ? 'campId-error' : undefined}
                      required
                    >
                      <option value="">Bitte auswählen</option>
                      {camps.map((camp) => (
                        <option key={camp.id} value={camp.id}>
                          {camp.title} ({camp.start_date}) – {getStatusLabel(camp.event_status)}
                        </option>
                      ))}
                    </select>
                    {fieldErrors.campId && (
                      <p id="campId-error" className="text-xs text-rose-600">
                        {fieldErrors.campId}
                      </p>
                    )}
                    {selectedCampForUi && (
                      <div className="flex flex-wrap items-center gap-2">
                        <div className="rounded-xl bg-indigo-50/70 px-3 py-2 text-xs text-indigo-700">
                          {selectedCampForUi.title} · {selectedCampForUi.start_date}
                        </div>
                        <span
                          className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${getStatusBadgeClass(selectedCampForUi.event_status)}`}
                        >
                          {getStatusLabel(selectedCampForUi.event_status)}
                        </span>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Number of children */}
                <Card className="border-slate-200/70 bg-white/70 shadow-none">
                  <CardContent className="space-y-3">
                    <div className="space-y-1">
                      <Label htmlFor="childrenCount">Anzahl der Kinder</Label>
                      <p className="text-xs text-slate-400">
                        Füge bis zu vier Kinder in einer Anmeldung hinzu.
                      </p>
                    </div>
                    <select
                      id="childrenCount"
                      value={childrenCount}
                      onChange={(e) => setChildrenCount(Number(e.target.value))}
                      className={inputClass}
                    >
                      {[1, 2, 3, 4].map((n) => (
                        <option key={n} value={n}>
                          {n}
                        </option>
                      ))}
                    </select>
                  </CardContent>
                </Card>

                {/* Parent data */}
                <Card className="border-slate-200/70 bg-white/70 shadow-none">
                  <CardHeader className="pb-0">
                    <CardTitle className="text-base">Elternangaben</CardTitle>
                    <CardDescription>Wir senden Updates an diesen Kontakt.</CardDescription>
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
                        aria-describedby={fieldErrors.parentEmail ? 'parentEmail-error' : undefined}
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
                        aria-describedby={fieldErrors.parentPhone ? 'parentPhone-error' : undefined}
                      />
                      {fieldErrors.parentPhone && (
                        <p id="parentPhone-error" className="text-xs text-rose-600">
                          {fieldErrors.parentPhone}
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Children */}
                {children.map((child, index) => (
                  <Card key={index} className="border-slate-200/70 bg-white/70 shadow-none">
                    <CardHeader className="pb-0">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <CardTitle className="text-base">Kind {index + 1}</CardTitle>
                        <span className="rounded-full bg-rose-100 px-3 py-1 text-xs font-semibold text-rose-600">
                          Pflichtfelder *
                        </span>
                      </div>
                    </CardHeader>
                    <CardContent className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor={`child-${index}-firstName`}>Vorname</Label>
                        <Input
                          id={`child-${index}-firstName`}
                          placeholder="Vorname"
                          required
                          value={child.firstName}
                          onChange={(e) => updateChild(index, 'firstName', e.target.value)}
                          aria-invalid={Boolean(fieldErrors[`child.${index}.firstName`])}
                          aria-describedby={`child-${index}-firstName-error`}
                        />
                        {fieldErrors[`child.${index}.firstName`] && (
                          <p id={`child-${index}-firstName-error`} className="text-xs text-rose-600">
                            {fieldErrors[`child.${index}.firstName`]}
                          </p>
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor={`child-${index}-lastName`}>Nachname</Label>
                        <Input
                          id={`child-${index}-lastName`}
                          placeholder="Nachname"
                          required
                          value={child.lastName}
                          onChange={(e) => updateChild(index, 'lastName', e.target.value)}
                          aria-invalid={Boolean(fieldErrors[`child.${index}.lastName`])}
                          aria-describedby={`child-${index}-lastName-error`}
                        />
                        {fieldErrors[`child.${index}.lastName`] && (
                          <p id={`child-${index}-lastName-error`} className="text-xs text-rose-600">
                            {fieldErrors[`child.${index}.lastName`]}
                          </p>
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor={`child-${index}-birthDate`}>Geburtsdatum</Label>
                        <Input
                          id={`child-${index}-birthDate`}
                          type="date"
                          required
                          value={child.birthDate}
                          onChange={(e) => updateChild(index, 'birthDate', e.target.value)}
                          aria-invalid={Boolean(fieldErrors[`child.${index}.birthDate`])}
                          aria-describedby={`child-${index}-birthDate-error`}
                        />
                        {fieldErrors[`child.${index}.birthDate`] && (
                          <p id={`child-${index}-birthDate-error`} className="text-xs text-rose-600">
                            {fieldErrors[`child.${index}.birthDate`]}
                          </p>
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor={`child-${index}-homeClub`}>Verein</Label>
                        <Input
                          id={`child-${index}-homeClub`}
                          placeholder="Verein"
                          value={child.homeClub}
                          onChange={(e) => updateChild(index, 'homeClub', e.target.value)}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor={`child-${index}-insurance`}>Krankenversicherungsnummer</Label>
                        <Input
                          id={`child-${index}-insurance`}
                          placeholder="Krankenversicherungsnummer"
                          value={child.insurance}
                          onChange={(e) => updateChild(index, 'insurance', e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor={`child-${index}-gloveSize`}>Handschuhgröße</Label>
                        <select
                          id={`child-${index}-gloveSize`}
                          required
                          value={child.gloveSize}
                          onChange={(e) =>
                            updateChild(
                              index,
                              'gloveSize',
                              e.target.value === '' ? '' : Number(e.target.value)
                            )
                          }
                          className={inputClass}
                          aria-invalid={Boolean(fieldErrors[`child.${index}.gloveSize`])}
                          aria-describedby={`child-${index}-gloveSize-error`}
                        >
                          <option value="">Bitte auswählen</option>
                          {[4, 5, 6, 7, 8, 9, 10].map((size) => (
                            <option key={size} value={size}>
                              {size}
                            </option>
                          ))}
                        </select>
                        {fieldErrors[`child.${index}.gloveSize`] && (
                          <p id={`child-${index}-gloveSize-error`} className="text-xs text-rose-600">
                            {fieldErrors[`child.${index}.gloveSize`]}
                          </p>
                        )}
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor={`child-${index}-diet`}>Ernährung</Label>
                        <select
                          id={`child-${index}-diet`}
                          required
                          value={child.diet}
                          onChange={(e) => updateChild(index, 'diet', e.target.value)}
                          className={inputClass}
                          aria-invalid={Boolean(fieldErrors[`child.${index}.diet`])}
                          aria-describedby={`child-${index}-diet-error`}
                        >
                          <option value="none">Keine besondere Ernährung</option>
                          <option value="vegetarian">Vegetarisch</option>
                          <option value="vegan">Vegan</option>
                        </select>
                        {fieldErrors[`child.${index}.diet`] && (
                          <p id={`child-${index}-diet-error`} className="text-xs text-rose-600">
                            {fieldErrors[`child.${index}.diet`]}
                          </p>
                        )}
                      </div>

                      <div className="space-y-2 md:col-span-2">
                        <Label htmlFor={`child-${index}-allergies`}>Allergien</Label>
                        <textarea
                          id={`child-${index}-allergies`}
                          placeholder="Allergien"
                          value={child.allergies}
                          onChange={(e) => updateChild(index, 'allergies', e.target.value)}
                          className={`${inputClass} min-h-[96px]`}
                        />
                      </div>
                      <div className="space-y-2 md:col-span-2">
                        <Label htmlFor={`child-${index}-medication`}>Medikamente</Label>
                        <textarea
                          id={`child-${index}-medication`}
                          placeholder="Medikamente"
                          value={child.medication}
                          onChange={(e) => updateChild(index, 'medication', e.target.value)}
                          className={`${inputClass} min-h-[96px]`}
                        />
                      </div>
                    </CardContent>
                  </Card>
                ))}

                {/* Marketing + terms */}
                <Card className="border-slate-200/70 bg-white/70 shadow-none">
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="informedVia">Wie hast du von uns erfahren?</Label>
                      <select
                        id="informedVia"
                        required
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
                      <Label className="flex items-center text-sm">
                        <input
                          type="checkbox"
                          required
                          checked={termsAccepted}
                          onChange={(e) => setTermsAccepted(e.target.checked)}
                          className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-400"
                          aria-invalid={Boolean(fieldErrors.termsAccepted)}
                          aria-describedby={fieldErrors.termsAccepted ? 'termsAccepted-error' : undefined}
                        />
                        <span className="ml-3">
                          Ich akzeptiere die{' '}
                          <a
                            href="/agb"
                            className="text-indigo-700 underline decoration-indigo-300 underline-offset-2"
                          >
                            Allgemeinen Geschäftsbedingungen
                          </a>
                        </span>
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
                    <div className="flex flex-wrap items-center gap-x-1 gap-y-2 rounded-xl border border-indigo-100 bg-indigo-50/60 px-4 py-3 text-xs text-indigo-700">
                      Hinweis: Weitere Informationen findest du in unserer&nbsp;
                      <a
                        href="/privacy"
                        className="font-semibold underline decoration-indigo-300 underline-offset-2"
                      >
                        Datenschutzerklärung
                      </a>
                      .
                    </div>
                  </CardContent>
                </Card>

                <Separator />


                <Card className="border-white/60 bg-white/80 p-6 shadow-[0_20px_40px_rgba(15,23,42,0.08)] backdrop-blur">
                  <div className="grid gap-4 md:grid-cols-[1.2fr_1fr]">
                    <div>
                      <h3 className="text-base font-semibold text-slate-800">Deine Anmeldung</h3>
                      <p className="text-sm text-slate-500">
                      Du erhältst eine Rechnung, sobald deine Anmeldung bestätigt wurde.
                      </p>
                    </div>
                    <div className="grid gap-3 text-sm text-slate-600">
                      <p>
                        <span className="font-semibold text-slate-800">Camp:</span>{' '}
                        {selectedCampForUi?.title ?? 'Nicht ausgewählt'}
                      </p>
                      <p>
                        <span className="font-semibold text-slate-800">Start:</span>{' '}
                        {selectedCampForUi?.start_date ?? '-'}
                      </p>
                      <p>
                        <span className="font-semibold text-slate-800">Kinder:</span>{' '}
                        {childrenCount}
                      </p>
                      <p>
                        <span className="font-semibold text-slate-800">Preis pro Kind:</span>{' '}
                        {selectedCampForUi ? formatPrice(selectedCampForUi.price) : '-'}
                      </p>
                      <p>
                        <span className="font-semibold text-slate-800">Gesamtbetrag:</span>{' '}
                        {Number.isNaN(totalPrice) ? '-' : formatPrice(totalPrice)}
                      </p>
                    </div>
                  </div>
                </Card>

                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="text-xs text-slate-500">
                    Mit dem Absenden bestätigst du, dass die Angaben oben korrekt sind.
                <p> Diese Anmeldung gilt ausschließlich für das oben genannte Camp im angegebenen Zeitraum.</p>
                  </div>
                  
                  <Button className="w-auto border border-black bg-black/80 text-white text-lg" type="submit" disabled={loading}>
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

/* -------------------------------------------
   Helpers
--------------------------------------------*/
function emptyChild(): ChildForm {
  return {
    firstName: '',
    lastName: '',
    birthDate: '',
    homeClub: '',
    insurance: '',
    allergies: '',
    medication: '',
    diet: 'none',
    gloveSize: '',
  }
}
