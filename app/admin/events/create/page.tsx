'use client'

import { useState } from 'react'
import { mutate as mutateSwr } from 'swr'
import Link from 'next/link'
import Navbar from '@/components/Navbar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Separator } from '@/components/ui/separator'
import TargetGroupFields, {
  adminInputClass as inputClass,
  applyTargetGroupToPayload,
  isWeeklyTrainingType,
} from '@/components/admin/TargetGroupFields'
import { referenceYearFromDate } from '@/lib/trainingGroup'
import { supabase } from '@/lib/supabaseClient'
import {
  CANCELLATION_REASON_LABELS,
  CANCELLATION_REASON_OPTIONS,
  DEFAULT_CANCELLATION_REASON,
  EVENT_STATUS_LABELS,
  EVENT_STATUS_OPTIONS,
  EVENT_TYPE_OPTIONS,
  eventTypeLabel,
  isCancellationReason,
} from '@/lib/eventOptions'

/**
 * Alle beschreibbaren Spalten von public.events. Nicht enthalten:
 * id / created_at (DB-Default), created_by (wird beim Speichern gesetzt),
 * open_for_registration (generiert aus event_status), cancelled_at (Trigger).
 */
type EventForm = {
  title: string
  description: string
  event_type: string
  event_status: string
  cancellation_reason: string
  start_date: string
  start_time: string
  end_date: string
  end_time: string
  location_name: string
  street: string
  postal_code: string
  city: string
  location_notes: string
  capacity: string
  price: string
  url_picture: string
  training_group: string
  target_year_min: string
  target_year_max: string
}

/** Standard-Vorbelegung = übliches Gruppentraining. */
const DEFAULT_FORM: EventForm = {
  title: 'Gruppentraining',
  description: 'Wöchentliches Gruppentraining',
  event_type: 'weekly_training',
  event_status: 'open',
  cancellation_reason: '',
  start_date: '',
  start_time: '09:00',
  end_date: '',
  end_time: '10:00',
  location_name: 'SKU Ertl Glas Amstetten Stadion',
  street: '',
  postal_code: '3300',
  city: 'Amstetten',
  location_notes: '',
  capacity: '',
  price: '25',
  url_picture: '',
  training_group: '',
  target_year_min: '',
  target_year_max: '',
}

const pad = (n: number) => String(n).padStart(2, '0')

/** Ende = Start + 1 Stunde (inkl. Tageswechsel). null, wenn Datum oder Zeit fehlt. */
const endFromStart = (date: string, time: string) => {
  if (!date || !time) return null
  const [h, m] = time.split(':').map(Number)
  const d = new Date(`${date}T00:00:00`)
  if (Number.isNaN(d.getTime()) || Number.isNaN(h) || Number.isNaN(m)) return null
  d.setHours(h + 1, m, 0, 0)
  return {
    end_date: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`,
    end_time: `${pad(d.getHours())}:${pad(d.getMinutes())}`,
  }
}

const textOrNull = (value: string) => (value.trim() === '' ? null : value.trim())

export default function AdminCreateEventPage() {
  const [form, setForm] = useState<EventForm>(DEFAULT_FORM)
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const set = (patch: Partial<EventForm>) => setForm((prev) => ({ ...prev, ...patch }))

  /** Startdatum/-zeit ändern setzt das Ende automatisch auf Start + 1 Stunde. */
  const setStart = (patch: Partial<Pick<EventForm, 'start_date' | 'start_time'>>) =>
    setForm((prev) => {
      const next = { ...prev, ...patch }
      const end = endFromStart(next.start_date, next.start_time)
      return end ? { ...next, ...end } : next
    })

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)
    setSuccess(null)

    if (!form.title.trim()) return setError('Bitte einen Titel eingeben.')
    if (!form.start_date || !form.start_time || !form.end_date || !form.end_time) {
      return setError('Bitte Start- und Enddatum inkl. Uhrzeit angeben.')
    }
    if (`${form.end_date}T${form.end_time}` <= `${form.start_date}T${form.start_time}`) {
      return setError('Das Ende muss nach dem Start liegen.')
    }
    const price = Number(form.price.replace(',', '.'))
    if (form.price.trim() === '' || Number.isNaN(price) || price < 0) {
      return setError('Bitte einen gültigen Preis eingeben.')
    }
    let capacity: number | null = null
    if (form.capacity.trim() !== '') {
      capacity = Number(form.capacity)
      if (!Number.isInteger(capacity) || capacity < 1) {
        return setError('Kapazität muss eine ganze Zahl ≥ 1 sein (oder leer = unbegrenzt).')
      }
    }

    const payload: Record<string, unknown> = {
      title: form.title.trim(),
      description: textOrNull(form.description),
      event_type: form.event_type,
      event_status: form.event_status,
      start_date: form.start_date,
      start_time: form.start_time,
      end_date: form.end_date,
      end_time: form.end_time,
      location_name: textOrNull(form.location_name),
      street: textOrNull(form.street),
      postal_code: textOrNull(form.postal_code),
      city: textOrNull(form.city),
      location_notes: textOrNull(form.location_notes),
      capacity,
      price,
      url_picture: textOrNull(form.url_picture),
    }

    // 'cancelled' nie ohne gültigen Grund, sonst Grund immer leeren.
    if (form.event_status === 'cancelled') {
      if (!isCancellationReason(form.cancellation_reason)) {
        return setError('Bitte einen Absagegrund auswählen.')
      }
      payload.cancellation_reason = form.cancellation_reason
    } else {
      payload.cancellation_reason = null
    }

    const targetGroupError = applyTargetGroupToPayload(payload, form, form.event_type)
    if (targetGroupError) return setError(targetGroupError)

    setCreating(true)
    const { data: userData } = await supabase.auth.getUser()
    if (userData?.user?.id) payload.created_by = userData.user.id

    const { error: insertError } = await supabase.from('events').insert(payload)
    setCreating(false)
    if (insertError) {
      console.error('[AdminCreateEvent] Insert error', insertError)
      return setError(insertError.message ?? String(insertError))
    }

    // Event-Übersicht beim Zurückgehen neu laden.
    await mutateSwr('admin-events')
    setSuccess(
      `Event „${payload.title}“ am ${form.start_date.split('-').reverse().join('.')} wurde erstellt.`
    )
    // Vorbelegung bleibt, nur der Termin wird geleert – praktisch für mehrere Trainings hintereinander.
    setForm((prev) => ({ ...prev, start_date: '', end_date: '' }))
  }

  const isCancelled = form.event_status === 'cancelled'

  return (
    <main className="relative min-h-screen overflow-hidden bg-gradient-to-b from-slate-50 via-white to-indigo-50">
      <Navbar rightLinkHref="/admin/events" rightLinkLabel="Zurück" />
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
                Neues Event
              </span>
              <Link
                href="/admin/events"
                className="rounded-full border border-indigo-200 bg-white px-3 py-1 text-xs font-semibold text-indigo-600 transition hover:bg-indigo-50"
              >
                ← Event-Übersicht
              </Link>
            </div>
            <div className="space-y-2">
              <CardTitle className="text-3xl md:text-4xl">Neues Event erstellen</CardTitle>
              <CardDescription>
                Vorbelegt mit den Standardwerten für ein Gruppentraining. Das Ende wird beim Ändern
                des Starts automatisch auf Start + 1 Stunde gesetzt.
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <Separator />

            {error && (
              <Alert className="border-rose-200 bg-rose-50 text-rose-700">
                <AlertTitle>Fehler</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            {success && (
              <Alert className="border-emerald-200 bg-emerald-50 text-emerald-700">
                <AlertTitle>Erfolg</AlertTitle>
                <AlertDescription>{success}</AlertDescription>
              </Alert>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              <fieldset disabled={creating} className="space-y-6">
                {/* --- Allgemein --- */}
                <section className="grid gap-4 md:grid-cols-2">
                  <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500 md:col-span-2">
                    Allgemein
                  </h3>
                  <div className="space-y-1">
                    <Label htmlFor="title">Titel *</Label>
                    <Input
                      id="title"
                      required
                      value={form.title}
                      onChange={(e) => set({ title: e.target.value })}
                      className={inputClass}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="event_type">Event-Typ *</Label>
                    <select
                      id="event_type"
                      className={inputClass}
                      value={form.event_type}
                      onChange={(e) => set({ event_type: e.target.value })}
                    >
                      {EVENT_TYPE_OPTIONS.map((opt) => (
                        <option key={opt} value={opt}>
                          {eventTypeLabel(opt)}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="event_status">Status *</Label>
                    <select
                      id="event_status"
                      className={inputClass}
                      value={form.event_status}
                      onChange={(e) => {
                        const next = e.target.value
                        set({
                          event_status: next,
                          cancellation_reason:
                            next === 'cancelled'
                              ? isCancellationReason(form.cancellation_reason)
                                ? form.cancellation_reason
                                : DEFAULT_CANCELLATION_REASON
                              : '',
                        })
                      }}
                    >
                      {EVENT_STATUS_OPTIONS.map((opt) => (
                        <option key={opt} value={opt}>
                          {EVENT_STATUS_LABELS[opt]}
                        </option>
                      ))}
                    </select>
                  </div>
                  {isCancelled ? (
                    <div className="space-y-1">
                      <Label htmlFor="cancellation_reason">Absagegrund *</Label>
                      <select
                        id="cancellation_reason"
                        className={inputClass}
                        value={
                          isCancellationReason(form.cancellation_reason)
                            ? form.cancellation_reason
                            : DEFAULT_CANCELLATION_REASON
                        }
                        onChange={(e) => set({ cancellation_reason: e.target.value })}
                      >
                        {CANCELLATION_REASON_OPTIONS.map((opt) => (
                          <option key={opt} value={opt}>
                            {CANCELLATION_REASON_LABELS[opt]}
                          </option>
                        ))}
                      </select>
                    </div>
                  ) : (
                    <div className="hidden md:block" />
                  )}
                  <div className="space-y-1 md:col-span-2">
                    <Label htmlFor="description">Beschreibung</Label>
                    <textarea
                      id="description"
                      className={`${inputClass} min-h-[100px]`}
                      value={form.description}
                      onChange={(e) => set({ description: e.target.value })}
                    />
                  </div>
                </section>

                <Separator />

                {/* --- Termin --- */}
                <section className="grid gap-4 md:grid-cols-2">
                  <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500 md:col-span-2">
                    Termin
                  </h3>
                  <div className="space-y-1">
                    <Label htmlFor="start_date">Startdatum *</Label>
                    <Input
                      id="start_date"
                      type="date"
                      required
                      value={form.start_date}
                      onChange={(e) => setStart({ start_date: e.target.value })}
                      className={inputClass}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="start_time">Startzeit *</Label>
                    <Input
                      id="start_time"
                      type="time"
                      required
                      value={form.start_time}
                      onChange={(e) => setStart({ start_time: e.target.value })}
                      className={inputClass}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="end_date">Enddatum *</Label>
                    <Input
                      id="end_date"
                      type="date"
                      required
                      value={form.end_date}
                      onChange={(e) => set({ end_date: e.target.value })}
                      className={inputClass}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="end_time">Endzeit *</Label>
                    <Input
                      id="end_time"
                      type="time"
                      required
                      value={form.end_time}
                      onChange={(e) => set({ end_time: e.target.value })}
                      className={inputClass}
                    />
                  </div>
                </section>

                <Separator />

                {/* --- Ort --- */}
                <section className="grid gap-4 md:grid-cols-2">
                  <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500 md:col-span-2">
                    Ort
                  </h3>
                  <div className="space-y-1 md:col-span-2">
                    <Label htmlFor="location_name">Standort</Label>
                    <Input
                      id="location_name"
                      value={form.location_name}
                      onChange={(e) => set({ location_name: e.target.value })}
                      className={inputClass}
                    />
                  </div>
                  <div className="space-y-1 md:col-span-2">
                    <Label htmlFor="street">Straße</Label>
                    <Input
                      id="street"
                      value={form.street}
                      onChange={(e) => set({ street: e.target.value })}
                      className={inputClass}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="postal_code">PLZ</Label>
                    <Input
                      id="postal_code"
                      inputMode="numeric"
                      value={form.postal_code}
                      onChange={(e) => set({ postal_code: e.target.value })}
                      className={inputClass}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="city">Ort</Label>
                    <Input
                      id="city"
                      value={form.city}
                      onChange={(e) => set({ city: e.target.value })}
                      className={inputClass}
                    />
                  </div>
                  <div className="space-y-1 md:col-span-2">
                    <Label htmlFor="location_notes">Standort-Hinweise</Label>
                    <textarea
                      id="location_notes"
                      className={`${inputClass} min-h-[80px]`}
                      placeholder="z. B. Parkmöglichkeiten, Treffpunkt"
                      value={form.location_notes}
                      onChange={(e) => set({ location_notes: e.target.value })}
                    />
                  </div>
                </section>

                <Separator />

                {/* --- Teilnahme & Preis --- */}
                <section className="grid gap-4 md:grid-cols-2">
                  <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500 md:col-span-2">
                    Teilnahme &amp; Preis
                  </h3>
                  <div className="space-y-1">
                    <Label htmlFor="capacity">Kapazität</Label>
                    <Input
                      id="capacity"
                      type="number"
                      min={1}
                      step={1}
                      placeholder="leer = unbegrenzt"
                      value={form.capacity}
                      onChange={(e) => set({ capacity: e.target.value })}
                      className={inputClass}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="price">Preis (€) *</Label>
                    <Input
                      id="price"
                      type="number"
                      min={0}
                      step="0.01"
                      required
                      value={form.price}
                      onChange={(e) => set({ price: e.target.value })}
                      className={inputClass}
                    />
                  </div>
                  {isWeeklyTrainingType(form.event_type) ? (
                    <TargetGroupFields
                      idPrefix="create"
                      draft={form}
                      referenceYear={referenceYearFromDate(form.start_date)}
                      onChange={(patch) => set(patch as Partial<EventForm>)}
                    />
                  ) : null}
                  <div className="space-y-1 md:col-span-2">
                    <Label htmlFor="url_picture">Bild-URL</Label>
                    <Input
                      id="url_picture"
                      type="url"
                      placeholder="https://…"
                      value={form.url_picture}
                      onChange={(e) => set({ url_picture: e.target.value })}
                      className={inputClass}
                    />
                  </div>
                </section>
              </fieldset>

              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-xs text-slate-500">* Pflichtfeld</p>
                <div className="flex gap-3">
                  <Button type="button" variant="outline" onClick={() => setForm(DEFAULT_FORM)}>
                    Zurücksetzen
                  </Button>
                  <Button type="submit" disabled={creating}>
                    {creating ? 'Erstelle Event...' : 'Event erstellen'}
                  </Button>
                </div>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </main>
  )
}
