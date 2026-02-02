'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { clearInvalidRefreshToken, supabase } from '@/lib/supabaseClient'
import Navbar from '@/components/Navbar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Separator } from '@/components/ui/separator'

type CampForm = {
  title: string
  description: string
  start_date: string
  end_date: string
  daily_start_time: string
  daily_end_time: string
  location_name: string
  street: string
  postal_code: string
  city: string
  location_notes: string
  capacity: string
  age_min: string
  age_max: string
  price: string
  open_for_registration: boolean
  url_camp_picture: string
}

const emptyForm: CampForm = {
  title: '',
  description: '',
  start_date: '',
  end_date: '',
  daily_start_time: '',
  daily_end_time: '',
  location_name: '',
  street: '',
  postal_code: '',
  city: '',
  location_notes: '',
  capacity: '',
  age_min: '',
  age_max: '',
  price: '',
  open_for_registration: true,
  url_camp_picture: '',
}

export default function CreateCampPage() {
  const router = useRouter()
  const [form, setForm] = useState<CampForm>(emptyForm)
  const [loading, setLoading] = useState(false)
  const [feedback, setFeedback] = useState<{
    type: 'success' | 'error'
    text: string
  } | null>(null)
  const [summaryErrors, setSummaryErrors] = useState<string[]>([])
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  const inputClass =
    'w-full rounded-xl border border-slate-200 bg-white/90 px-3 py-2 text-sm text-slate-900 shadow-sm outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-200'

  const updateField = (key: keyof CampForm, value: string | boolean) => {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  const toNullableText = (value: string) => (value.trim() ? value.trim() : null)

  const toNullableNumber = (value: string) => {
    if (value === '') return null
    const numeric = Number(value)
    return Number.isNaN(numeric) ? null : numeric
  }

  function validateForm() {
    const nextFieldErrors: Record<string, string> = {}
    const summary: string[] = []
    const addError = (key: string, message: string) => {
      if (!nextFieldErrors[key]) nextFieldErrors[key] = message
      summary.push(message)
    }

    if (!form.title.trim()) addError('title', 'Titel ist erforderlich.')
    if (!form.description.trim()) addError('description', 'Beschreibung ist erforderlich.')
    if (!form.start_date) addError('start_date', 'Startdatum ist erforderlich.')
    if (!form.end_date) addError('end_date', 'Enddatum ist erforderlich.')
    if (!form.daily_start_time) addError('daily_start_time', 'Startzeit ist erforderlich.')
    if (!form.daily_end_time) addError('daily_end_time', 'Endzeit ist erforderlich.')
    if (!form.location_name.trim()) addError('location_name', 'Ort ist erforderlich.')
    if (!form.city.trim()) addError('city', 'Stadt ist erforderlich.')
    if (!form.price.trim()) addError('price', 'Preis ist erforderlich.')

    if (form.start_date && form.end_date && form.end_date < form.start_date) {
      addError('end_date', 'Enddatum muss nach dem Startdatum liegen.')
    }

    if (form.daily_start_time && form.daily_end_time) {
      if (form.daily_end_time <= form.daily_start_time) {
        addError('daily_end_time', 'Endzeit muss nach der Startzeit liegen.')
      }
    }

    if (form.price.trim()) {
      const numericPrice = Number(form.price)
      if (Number.isNaN(numericPrice) || numericPrice < 0) {
        addError('price', 'Preis muss eine gueltige Zahl sein.')
      }
    }

    if (form.capacity.trim()) {
      const numeric = Number(form.capacity)
      if (Number.isNaN(numeric) || numeric < 1) {
        addError('capacity', 'Kapazitaet muss eine positive Zahl sein.')
      }
    }

    if (form.age_min.trim()) {
      const numeric = Number(form.age_min)
      if (Number.isNaN(numeric) || numeric < 0) {
        addError('age_min', 'Mindestalter muss eine gueltige Zahl sein.')
      }
    }

    if (form.age_max.trim()) {
      const numeric = Number(form.age_max)
      if (Number.isNaN(numeric) || numeric < 0) {
        addError('age_max', 'Hoechstalter muss eine gueltige Zahl sein.')
      }
    }

    if (form.age_min.trim() && form.age_max.trim()) {
      const minAge = Number(form.age_min)
      const maxAge = Number(form.age_max)
      if (!Number.isNaN(minAge) && !Number.isNaN(maxAge) && maxAge < minAge) {
        addError('age_max', 'Hoechstalter muss groesser als Mindestalter sein.')
      }
    }

    return { fieldErrors: nextFieldErrors, summary }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
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

    const hadInvalidSession = await clearInvalidRefreshToken()
    if (hadInvalidSession) {
      setFeedback({ type: 'error', text: 'Nicht authentifiziert.' })
      setLoading(false)
      return
    }

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      setFeedback({ type: 'error', text: 'Nicht authentifiziert.' })
      setLoading(false)
      return
    }

    const payload = {
      title: form.title.trim(),
      description: form.description.trim(),
      start_date: form.start_date,
      end_date: form.end_date,
      daily_start_time: form.daily_start_time,
      daily_end_time: form.daily_end_time,
      location_name: form.location_name.trim(),
      street: toNullableText(form.street),
      postal_code: toNullableText(form.postal_code),
      city: form.city.trim(),
      location_notes: toNullableText(form.location_notes),
      capacity: toNullableNumber(form.capacity),
      age_min: toNullableNumber(form.age_min),
      age_max: toNullableNumber(form.age_max),
      price: Number(form.price),
      open_for_registration: form.open_for_registration,
      url_camp_picture: toNullableText(form.url_camp_picture),
      created_by: user.id,
    }

    const { error } = await supabase.from('camps').insert(payload)

    if (error) {
      setFeedback({ type: 'error', text: error.message })
      setLoading(false)
      return
    }

    setLoading(false)
    router.push('/admin/events')
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-gradient-to-b from-slate-50 via-white to-indigo-50">
      <Navbar showLogout rightLinkHref="/admin/events" rightLinkLabel="Zurück" />
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-32 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-indigo-200/40 blur-3xl" />
        <div className="absolute bottom-0 right-0 h-72 w-72 rounded-full bg-rose-200/40 blur-3xl" />
      </div>

      <div className="relative mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 py-10">
        <Card className="border-white/60 bg-white/80 shadow-[0_30px_60px_rgba(15,23,42,0.12)] backdrop-blur-xl">
          <CardHeader className="gap-4">
            <div className="flex flex-wrap items-center gap-3">
              <span className="rounded-full bg-indigo-100 px-3 py-1 text-xs font-semibold text-indigo-600">
                Adminbereich
              </span>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-500">
                Neues Camp
              </span>
            </div>
            <div>
              <CardTitle className="text-3xl md:text-4xl">Camp anlegen</CardTitle>
              <CardDescription>
                Gib alle wichtigsten Camp-Daten an, damit es sofort angezeigt werden kann.
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
                  <CardHeader className="pb-0">
                    <CardTitle className="text-base">Basisinformationen</CardTitle>
                    <CardDescription>Diese Informationen erscheinen auf der Camp-Seite.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-1">
                      <Label htmlFor="title">Camp-Titel</Label>
                      <Input
                        id="title"
                        value={form.title}
                        onChange={(e) => updateField('title', e.target.value)}
                        className={inputClass}
                        aria-invalid={Boolean(fieldErrors.title)}
                        aria-describedby={fieldErrors.title ? 'title-error' : undefined}
                        placeholder="z.B. Sommer-Camp Wien"
                        required
                      />
                      {fieldErrors.title && (
                        <p id="title-error" className="text-xs text-rose-600">
                          {fieldErrors.title}
                        </p>
                      )}
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="description">Beschreibung</Label>
                      <textarea
                        id="description"
                        value={form.description}
                        onChange={(e) => updateField('description', e.target.value)}
                        className={`${inputClass} min-h-[120px]`}
                        aria-invalid={Boolean(fieldErrors.description)}
                        aria-describedby={fieldErrors.description ? 'description-error' : undefined}
                        placeholder="Kurzbeschreibung, Highlights, Trainingsschwerpunkte"
                        required
                      />
                      {fieldErrors.description && (
                        <p id="description-error" className="text-xs text-rose-600">
                          {fieldErrors.description}
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-slate-200/70 bg-white/70 shadow-none">
                  <CardHeader className="pb-0">
                    <CardTitle className="text-base">Datum & Uhrzeit</CardTitle>
                    <CardDescription>Wann findet das Camp statt?</CardDescription>
                  </CardHeader>
                  <CardContent className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-1">
                      <Label htmlFor="start_date">Startdatum</Label>
                      <Input
                        id="start_date"
                        type="date"
                        value={form.start_date}
                        onChange={(e) => updateField('start_date', e.target.value)}
                        className={inputClass}
                        aria-invalid={Boolean(fieldErrors.start_date)}
                        aria-describedby={fieldErrors.start_date ? 'start_date-error' : undefined}
                        required
                      />
                      {fieldErrors.start_date && (
                        <p id="start_date-error" className="text-xs text-rose-600">
                          {fieldErrors.start_date}
                        </p>
                      )}
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="end_date">Enddatum</Label>
                      <Input
                        id="end_date"
                        type="date"
                        value={form.end_date}
                        onChange={(e) => updateField('end_date', e.target.value)}
                        className={inputClass}
                        aria-invalid={Boolean(fieldErrors.end_date)}
                        aria-describedby={fieldErrors.end_date ? 'end_date-error' : undefined}
                        required
                      />
                      {fieldErrors.end_date && (
                        <p id="end_date-error" className="text-xs text-rose-600">
                          {fieldErrors.end_date}
                        </p>
                      )}
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="daily_start_time">Startzeit</Label>
                      <Input
                        id="daily_start_time"
                        type="time"
                        value={form.daily_start_time}
                        onChange={(e) => updateField('daily_start_time', e.target.value)}
                        className={inputClass}
                        aria-invalid={Boolean(fieldErrors.daily_start_time)}
                        aria-describedby={
                          fieldErrors.daily_start_time ? 'daily_start_time-error' : undefined
                        }
                        required
                      />
                      {fieldErrors.daily_start_time && (
                        <p id="daily_start_time-error" className="text-xs text-rose-600">
                          {fieldErrors.daily_start_time}
                        </p>
                      )}
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="daily_end_time">Endzeit</Label>
                      <Input
                        id="daily_end_time"
                        type="time"
                        value={form.daily_end_time}
                        onChange={(e) => updateField('daily_end_time', e.target.value)}
                        className={inputClass}
                        aria-invalid={Boolean(fieldErrors.daily_end_time)}
                        aria-describedby={
                          fieldErrors.daily_end_time ? 'daily_end_time-error' : undefined
                        }
                        required
                      />
                      {fieldErrors.daily_end_time && (
                        <p id="daily_end_time-error" className="text-xs text-rose-600">
                          {fieldErrors.daily_end_time}
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-slate-200/70 bg-white/70 shadow-none">
                  <CardHeader className="pb-0">
                    <CardTitle className="text-base">Ort</CardTitle>
                    <CardDescription>Wo findet das Camp statt?</CardDescription>
                  </CardHeader>
                  <CardContent className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-1 md:col-span-2">
                      <Label htmlFor="location_name">Location-Name</Label>
                      <Input
                        id="location_name"
                        value={form.location_name}
                        onChange={(e) => updateField('location_name', e.target.value)}
                        className={inputClass}
                        aria-invalid={Boolean(fieldErrors.location_name)}
                        aria-describedby={fieldErrors.location_name ? 'location_name-error' : undefined}
                        placeholder="z.B. Sportanlage Musterstadt"
                        required
                      />
                      {fieldErrors.location_name && (
                        <p id="location_name-error" className="text-xs text-rose-600">
                          {fieldErrors.location_name}
                        </p>
                      )}
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="street">Strasse</Label>
                      <Input
                        id="street"
                        value={form.street}
                        onChange={(e) => updateField('street', e.target.value)}
                        className={inputClass}
                        placeholder="Straße und Hausnummer"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="postal_code">PLZ</Label>
                      <Input
                        id="postal_code"
                        value={form.postal_code}
                        onChange={(e) => updateField('postal_code', e.target.value)}
                        className={inputClass}
                        placeholder="1234"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="city">Stadt</Label>
                      <Input
                        id="city"
                        value={form.city}
                        onChange={(e) => updateField('city', e.target.value)}
                        className={inputClass}
                        aria-invalid={Boolean(fieldErrors.city)}
                        aria-describedby={fieldErrors.city ? 'city-error' : undefined}
                        placeholder="Wien"
                        required
                      />
                      {fieldErrors.city && (
                        <p id="city-error" className="text-xs text-rose-600">
                          {fieldErrors.city}
                        </p>
                      )}
                    </div>
                    <div className="space-y-1 md:col-span-2">
                      <Label htmlFor="location_notes">Hinweise zum Ort</Label>
                      <textarea
                        id="location_notes"
                        value={form.location_notes}
                        onChange={(e) => updateField('location_notes', e.target.value)}
                        className={`${inputClass} min-h-[90px]`}
                        placeholder="Parkmoeglichkeiten, Treffpunkt, etc."
                      />
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-slate-200/70 bg-white/70 shadow-none">
                  <CardHeader className="pb-0">
                    <CardTitle className="text-base">Preise & Kapazitaet</CardTitle>
                    <CardDescription>Steuere Preis und Buchungsstatus.</CardDescription>
                  </CardHeader>
                  <CardContent className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-1">
                      <Label htmlFor="price">Preis (EUR)</Label>
                      <Input
                        id="price"
                        type="number"
                        min="0"
                        step="0.01"
                        value={form.price}
                        onChange={(e) => updateField('price', e.target.value)}
                        className={inputClass}
                        aria-invalid={Boolean(fieldErrors.price)}
                        aria-describedby={fieldErrors.price ? 'price-error' : undefined}
                        placeholder="z.B. 199"
                        required
                      />
                      {fieldErrors.price && (
                        <p id="price-error" className="text-xs text-rose-600">
                          {fieldErrors.price}
                        </p>
                      )}
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="capacity">Kapazitaet (optional)</Label>
                      <Input
                        id="capacity"
                        type="number"
                        min="1"
                        value={form.capacity}
                        onChange={(e) => updateField('capacity', e.target.value)}
                        className={inputClass}
                        aria-invalid={Boolean(fieldErrors.capacity)}
                        aria-describedby={fieldErrors.capacity ? 'capacity-error' : undefined}
                        placeholder="z.B. 30"
                      />
                      {fieldErrors.capacity && (
                        <p id="capacity-error" className="text-xs text-rose-600">
                          {fieldErrors.capacity}
                        </p>
                      )}
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="age_min">Mindestalter (optional)</Label>
                      <Input
                        id="age_min"
                        type="number"
                        min="0"
                        value={form.age_min}
                        onChange={(e) => updateField('age_min', e.target.value)}
                        className={inputClass}
                        aria-invalid={Boolean(fieldErrors.age_min)}
                        aria-describedby={fieldErrors.age_min ? 'age_min-error' : undefined}
                        placeholder="z.B. 8"
                      />
                      {fieldErrors.age_min && (
                        <p id="age_min-error" className="text-xs text-rose-600">
                          {fieldErrors.age_min}
                        </p>
                      )}
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="age_max">Hoechstalter (optional)</Label>
                      <Input
                        id="age_max"
                        type="number"
                        min="0"
                        value={form.age_max}
                        onChange={(e) => updateField('age_max', e.target.value)}
                        className={inputClass}
                        aria-invalid={Boolean(fieldErrors.age_max)}
                        aria-describedby={fieldErrors.age_max ? 'age_max-error' : undefined}
                        placeholder="z.B. 16"
                      />
                      {fieldErrors.age_max && (
                        <p id="age_max-error" className="text-xs text-rose-600">
                          {fieldErrors.age_max}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-3 md:col-span-2">
                      <input
                        id="open_for_registration"
                        type="checkbox"
                        checked={form.open_for_registration}
                        onChange={(e) => updateField('open_for_registration', e.target.checked)}
                        className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                      />
                      <Label htmlFor="open_for_registration">Camp ist buchbar</Label>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-slate-200/70 bg-white/70 shadow-none">
                  <CardHeader className="pb-0">
                    <CardTitle className="text-base">Bild & Medien</CardTitle>
                    <CardDescription>Optionales Titelbild fuer das Camp.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-1">
                      <Label htmlFor="url_camp_picture">Bild-URL (optional)</Label>
                      <Input
                        id="url_camp_picture"
                        value={form.url_camp_picture}
                        onChange={(e) => updateField('url_camp_picture', e.target.value)}
                        className={inputClass}
                        placeholder="https://..."
                      />
                    </div>
                  </CardContent>
                </Card>
              </fieldset>

              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-xs text-slate-500">
                  Bitte alle Pflichtfelder ausfuellen, bevor du speicherst.
                </p>
                <Button type="submit" disabled={loading}>
                  {loading ? 'Erstelle Camp...' : 'Camp erstellen'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </main>
  )
}