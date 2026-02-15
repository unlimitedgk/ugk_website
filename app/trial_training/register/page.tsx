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

type WeeklyTraining = {
  id: string
  title: string
  start_date: string
  start_time: string | null
  end_time: string | null
  city: string | null
  location_name: string | null
}

export default function TrialTrainingRegistrationPage() {
  const router = useRouter()
  const [trainings, setTrainings] = useState<WeeklyTraining[]>([])
  const [trainingId, setTrainingId] = useState('')

  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [birthDate, setBirthDate] = useState('')
  const [currentClub, setCurrentClub] = useState('')
  const [medicalNotes, setMedicalNotes] = useState('')
  const [diet, setDiet] = useState('')

  const [parentFirstName, setParentFirstName] = useState('')
  const [parentLastName, setParentLastName] = useState('')
  const [parentEmail, setParentEmail] = useState('')
  const [parentPhone, setParentPhone] = useState('')

  const [informedVia, setInformedVia] = useState('')
  const [newsletter, setNewsletter] = useState(false)
  const [termsAccepted, setTermsAccepted] = useState(false)
  const [mediaCreationAccepted, setMediaCreationAccepted] = useState(false)

  const [loading, setLoading] = useState(false)
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [summaryErrors, setSummaryErrors] = useState<string[]>([])
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  const inputClass =
    'w-full rounded-xl border border-slate-200 bg-white/90 px-3 py-2 text-sm text-slate-900 shadow-sm outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-200'

  useEffect(() => {
    supabase
      .from('events')
      .select('id, title, start_date, start_time, end_time, city, location_name')
      .eq('open_for_registration', true)
      .eq('event_type', 'weekly_training')
      .order('start_date')
      .then(({ data }) => {
        if (data) setTrainings(data as WeeklyTraining[])
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
      event_id: trainingId,
      agb_accepted: termsAccepted,
      media_creation_accepted: mediaCreationAccepted,
      newsletter_opt_in: newsletter,
      informed_via: informedVia || null,
      contact: {
        first_name: parentFirstName.trim(),
        last_name: parentLastName.trim(),
        email: parentEmail.trim(),
        phone: parentPhone.trim() || null,
      },
      participants: [
        {
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          birth_date: birthDate,
          email: null,
          phone: null,
          team: currentClub.trim() || null,
          glove_size: null,
          diet: diet || null,
          medication: medicalNotes.trim() || null,
        },
      ],
    }

    const { data, error } = await supabase.functions.invoke('public-register-for-event', {
      method: 'POST',
      body: payload,
    })

    if (error || !data) {
      setLoading(false)
      router.push('/trial_training/register/error')
      return
    }

    const selectedTraining = trainings.find((t) => t.id === trainingId)
    if (!selectedTraining) {
      setFeedback({ type: 'error', text: 'Ungültige Training-Auswahl.' })
      setLoading(false)
      return
    }

    try {
      await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/send-trial-training-confirmation`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
          },
          body: JSON.stringify({
            parentEmail: parentEmail.trim(),
            parentName: `${parentFirstName} ${parentLastName}`.trim(),
            campTitle: selectedTraining.title,
            children: [{ firstName: firstName.trim(), lastName: lastName.trim() }],
            start_date: selectedTraining.start_date,
            start_time: selectedTraining.start_time ?? '',
            end_time: selectedTraining.end_time ?? '',
            location_name: selectedTraining.location_name ?? '',
            registrationId: data.registrationId,
          }),
        }
      )
    } catch (err) {
      console.error('Email sending failed', err)
    }

    setLoading(false)
    router.push('/trial_training/register/success')
  }

  function validateForm() {
    const fieldErrors: Record<string, string> = {}
    const summary: string[] = []
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    const addError = (key: string, message: string) => {
      if (!fieldErrors[key]) fieldErrors[key] = message
      summary.push(message)
    }

    if (!trainingId) addError('trainingId', 'Bitte waehle ein Schnuppertraining aus.')
    if (!parentFirstName.trim()) addError('parentFirstName', 'Vorname der Eltern ist erforderlich.')
    if (!parentLastName.trim()) addError('parentLastName', 'Nachname der Eltern ist erforderlich.')
    if (!parentEmail.trim()) addError('parentEmail', 'E-Mail der Eltern ist erforderlich.')
    if (parentEmail.trim() && !emailPattern.test(parentEmail.trim())) {
      addError('parentEmail', 'E-Mail der Eltern muss gueltig sein.')
    }
    const parentPhoneDigits = parentPhone.replace(/\D/g, '')
    if (!parentPhone.trim()) addError('parentPhone', 'Telefonnummer der Eltern ist erforderlich.')
    if (parentPhone.trim() && parentPhoneDigits.length < 6) {
      addError('parentPhone', 'Telefonnummer der Eltern muss gueltig sein.')
    }
    if (!firstName.trim()) addError('firstName', 'Vorname ist erforderlich.')
    if (!lastName.trim()) addError('lastName', 'Nachname ist erforderlich.')
    if (!birthDate) addError('birthDate', 'Geburtsdatum ist erforderlich.')
    if (!informedVia.trim()) {
      addError('informedVia', 'Bitte gib an, wie du von uns erfahren hast.')
    }
    if (!termsAccepted) {
      addError('termsAccepted', 'Bitte akzeptiere die Allgemeinen Geschaeftsbedingungen.')
    }

    return { fieldErrors, summary }
  }

  const selectedTraining = useMemo(
    () => trainings.find((t) => t.id === trainingId),
    [trainings, trainingId]
  )

  const formatTime = (t: string | null) => {
    if (!t) return ''
    const [h, m] = t.split(':')
    return `${h}:${m ?? '00'}`
  }

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
              <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
                Kostenloses Schnuppertraining
              </span>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-500">
                Anmeldung
              </span>
            </div>
            <div>
              <CardTitle className="text-3xl md:text-4xl">Kostenloses Schnuppertraining</CardTitle>
              <CardDescription>
                Melde dich für ein unverbindliches Schnuppertraining an. Du erhaelst eine
                Bestaetigung per E-Mail.
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
                <AlertTitle>{feedback.type === 'success' ? 'Erfolg' : 'Bitte pruefen'}</AlertTitle>
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
                      <Label htmlFor="trainingId">Schnuppertraining auswählen</Label>
                      <p className="text-xs text-slate-400">
                        Wähle den Termin für dein kostenloses Schnuppertraining.
                      </p>
                    </div>
                    <select
                      id="trainingId"
                      value={trainingId}
                      onChange={(e) => setTrainingId(e.target.value)}
                      className={inputClass}
                      aria-invalid={Boolean(fieldErrors.trainingId)}
                      required
                    >
                      <option value="">Bitte auswählen</option>
                      {trainings.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.title} · {t.start_date}
                          {t.start_time && t.end_time
                            ? ` · ${formatTime(t.start_time)}–${formatTime(t.end_time)}`
                            : ''}
                          {t.location_name ? ` · ${t.location_name}` : ''}
                        </option>
                      ))}
                    </select>
                    {fieldErrors.trainingId && (
                      <p className="text-xs text-rose-600">{fieldErrors.trainingId}</p>
                    )}
                    {selectedTraining && (
                      <div className="rounded-xl bg-indigo-50/70 px-3 py-2 text-xs text-indigo-700">
                        {selectedTraining.title} · {selectedTraining.start_date}
                        {selectedTraining.start_time && selectedTraining.end_time
                          ? ` · ${formatTime(selectedTraining.start_time)}–${formatTime(selectedTraining.end_time)}`
                          : ''}{' '}
                        · {selectedTraining.location_name ?? selectedTraining.city ?? ''}
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card className="border-slate-200/70 bg-white/70 shadow-none">
                  <CardHeader className="pb-0">
                    <CardTitle className="text-base">Elternangaben</CardTitle>
                    <CardDescription>
                      Bitte gib die Kontaktdaten der Erziehungsberechtigten an.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="parentFirstName">Vorname *</Label>
                      <Input
                        id="parentFirstName"
                        placeholder="Vorname"
                        required
                        value={parentFirstName}
                        onChange={(e) => setParentFirstName(e.target.value)}
                        className={inputClass}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="parentLastName">Nachname *</Label>
                      <Input
                        id="parentLastName"
                        placeholder="Nachname"
                        required
                        value={parentLastName}
                        onChange={(e) => setParentLastName(e.target.value)}
                        className={inputClass}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="parentEmail">E-Mail *</Label>
                      <Input
                        id="parentEmail"
                        type="email"
                        placeholder="E-Mail"
                        required
                        value={parentEmail}
                        onChange={(e) => setParentEmail(e.target.value)}
                        className={inputClass}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="parentPhone">Telefon *</Label>
                      <Input
                        id="parentPhone"
                        placeholder="Telefon"
                        required
                        value={parentPhone}
                        onChange={(e) => setParentPhone(e.target.value)}
                        className={inputClass}
                      />
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-slate-200/70 bg-white/70 shadow-none">
                  <CardHeader className="pb-0">
                    <CardTitle className="text-base">Torwartangaben</CardTitle>
                    <CardDescription>Angaben zum Kind / Teilnehmer.</CardDescription>
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
                        className={inputClass}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="lastName">Nachname *</Label>
                      <Input
                        id="lastName"
                        placeholder="Nachname"
                        required
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        className={inputClass}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="birthDate">Geburtsdatum *</Label>
                      <Input
                        id="birthDate"
                        type="date"
                        required
                        value={birthDate}
                        onChange={(e) => setBirthDate(e.target.value)}
                        className={inputClass}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="currentClub">Verein</Label>
                      <Input
                        id="currentClub"
                        placeholder="Verein"
                        value={currentClub}
                        onChange={(e) => setCurrentClub(e.target.value)}
                        className={inputClass}
                      />
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

                <Card className="border-slate-200/70 bg-white/70 shadow-none">
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="informedVia">Wie hast du von uns erfahren? *</Label>
                      <select
                        id="informedVia"
                        value={informedVia}
                        onChange={(e) => setInformedVia(e.target.value)}
                        className={inputClass}
                        required
                      >
                        <option value="">Eine Option wählen</option>
                        <option value="website">Webseite</option>
                        <option value="friend">Freund/in</option>
                        <option value="social_media">Soziale Medien</option>
                        <option value="newspaper">Zeitung</option>
                        <option value="other">Sonstiges</option>
                      </select>
                    </div>
                    <Label className="flex items-center gap-3 text-sm">
                      <input
                        type="checkbox"
                        checked={newsletter}
                        onChange={(e) => setNewsletter(e.target.checked)}
                        className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-400"
                      />
                      Mit dem E-Mail Newsletter auf dem Laufenden bleiben.
                    </Label>
                    <Label className="flex items-center text-sm">
                      <input
                        type="checkbox"
                        required
                        checked={termsAccepted}
                        onChange={(e) => setTermsAccepted(e.target.checked)}
                        className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-400"
                      />
                      <span className="ml-3">
                        Ich akzeptiere die{' '}
                        <a href="/agb" className="text-indigo-700 underline decoration-indigo-300 underline-offset-2">
                          Allgemeinen Geschaeftsbedingungen
                        </a>
                      </span>
                    </Label>
                    <Label className="flex items-center gap-3 text-sm">
                      <input
                        type="checkbox"
                        checked={mediaCreationAccepted}
                        onChange={(e) => setMediaCreationAccepted(e.target.checked)}
                        className="mt-0.5 h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-400"
                      />
                      <span>
                        Die Anfertigung und Verwendung von Foto- und Videoaufnahmen zu Zwecken der
                        Öffentlichkeitsarbeit (z. B. Webseite, Social Media, Drucksorten) erfolgt
                        ausschließlich auf Grundlage einer gesonderten und freiwilligen Einwilligung.
                      </span>
                    </Label>
                  </CardContent>
                </Card>

                <Card className="border-white/60 bg-white/80 p-6 shadow-[0_20px_40px_rgba(15,23,42,0.08)] backdrop-blur">
                  <div className="grid gap-4 md:grid-cols-[1.2fr_1fr]">
                    <div>
                      <h3 className="text-base font-semibold text-slate-800">Deine Anmeldung</h3>
                      <p className="text-sm text-slate-500">
                        Das Schnuppertraining ist kostenlos. Du erhaeltst eine Bestaetigung per
                        E-Mail.
                      </p>
                    </div>
                    <div className="grid gap-3 text-sm text-slate-600">
                      <p>
                        <span className="font-semibold text-slate-800">Training:</span>{' '}
                        {selectedTraining?.title ?? 'Nicht ausgewaehlt'}
                      </p>
                      <p>
                        <span className="font-semibold text-slate-800">Datum:</span>{' '}
                        {selectedTraining?.start_date ?? '-'}
                      </p>
                      <p>
                        <span className="font-semibold text-slate-800">Uhrzeit:</span>{' '}
                        {selectedTraining?.start_time && selectedTraining?.end_time
                          ? `${formatTime(selectedTraining.start_time)}–${formatTime(selectedTraining.end_time)}`
                          : '-'}
                      </p>
                      <p>
                        <span className="font-semibold text-slate-800">Ort:</span>{' '}
                        {selectedTraining?.location_name ?? selectedTraining?.city ?? '-'}
                      </p>
                    </div>
                  </div>
                </Card>

                <div className="flex flex-wrap items-center justify-between gap-4">
                  <p className="text-xs text-slate-500">
                    Mit dem Absenden bestaetigst du, dass die Angaben korrekt sind.
                  </p>
                  <Button
                    className="w-auto border border-black bg-black/80 text-white text-lg"
                    type="submit"
                    disabled={loading}
                  >
                    {loading ? 'Wird gesendet...' : 'Kostenlos zum Schnuppertraining anmelden'}
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
