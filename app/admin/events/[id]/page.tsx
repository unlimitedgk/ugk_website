'use client'

import { useMemo, useState } from 'react'
import { useParams } from 'next/navigation'
import useSWR from 'swr'
import Navbar from '@/components/Navbar'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Separator } from '@/components/ui/separator'
import { supabase } from '@/lib/supabaseClient'

const RESERVED_KEYS = new Set(['id', 'created_at', 'created_by', 'updated_at'])
const inputClass =
  'w-full rounded-xl border border-slate-200 bg-white/90 px-3 py-2 text-sm text-slate-900 shadow-sm outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-200'

const formatHeader = (key: string) =>
  key
    .replace(/_/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/\b\w/g, (char) => char.toUpperCase())

const normalizeKey = (key: string) => key.toLowerCase().replace(/[^a-z0-9]/g, '')

const getKeyByHints = (keys: string[], hints: string[]) => {
  const normalizedHints = hints.map((hint) => hint.toLowerCase())
  const exact = keys.find((key) => normalizedHints.includes(key.toLowerCase()))
  if (exact) return exact
  const normalizedKeys = keys.map((key) => normalizeKey(key))
  const partialIndex = normalizedKeys.findIndex((key) =>
    normalizedHints.some((hint) => key.includes(normalizeKey(hint)))
  )
  return partialIndex >= 0 ? keys[partialIndex] : undefined
}

export default function AdminEventDetailPage() {
  const params = useParams()
  const eventId = params.id as string

  const [statusError, setStatusError] = useState<string | null>(null)
  const [updatingParticipantId, setUpdatingParticipantId] = useState<string | null>(null)

  const {
    data: registrationsData,
    error: registrationsError,
  } = useSWR(['event-registrations', eventId], async () => {
    const { data, error } = await supabase
      .from('event_registrations')
      .select('*')
      .order('created_at', { ascending: true })
    if (error) throw error
    return data ?? []
  })

  const {
    data: participantsData,
    error: participantsError,
    mutate: mutateParticipants,
  } = useSWR(
    ['event-registration-participants', eventId],
    async () => {
      const { data, error } = await supabase
        .from('event_registration_participants')
        .select('*')
        .order('created_at', { ascending: true })
      if (error) throw error
      return data ?? []
    }
  )

  const registrations = registrationsData ?? []
  const participants = participantsData ?? []

  const registrationKeys = useMemo(
    () => (registrations[0] ? Object.keys(registrations[0]) : []),
    [registrations]
  )
  const participantKeys = useMemo(
    () => (participants[0] ? Object.keys(participants[0]) : []),
    [participants]
  )

  const registrationEventIdKey = getKeyByHints(registrationKeys, ['event_id', 'eventid'])
  const registrationStatusKey = getKeyByHints(registrationKeys, [
    'status',
    'registration_status',
  ])
  const registrationIdKey =
    getKeyByHints(registrationKeys, ['id', 'registration_id', 'event_registration_id']) || 'id'

  const participantIdKey =
    getKeyByHints(participantKeys, ['id', 'participant_id', 'event_registration_participant_id']) ||
    'id'
  const participantRegistrationIdKey = getKeyByHints(participantKeys, [
    'event_registration_id',
    'registration_id',
    'event_reg_id',
  ])
  const participantEventIdKey = getKeyByHints(participantKeys, ['event_id', 'eventid'])
  const participantStatusKey = getKeyByHints(participantKeys, ['status'])

  const filteredRegistrations = useMemo(() => {
    const base = registrationEventIdKey
      ? registrations.filter(
          (registration: any) =>
            String(registration[registrationEventIdKey]) === String(eventId)
        )
      : registrations

    if (!registrationStatusKey) return base
    return base.filter((registration: any) => {
      const status = String(registration[registrationStatusKey] ?? '').toLowerCase()
      return status === 'submitted' || status === 'accepted'
    })
  }, [registrations, registrationEventIdKey, registrationStatusKey, eventId])

  const registrationColumns = useMemo(() => {
    if (!registrationKeys.length) return []
    return registrationKeys.filter(
      (key) => !RESERVED_KEYS.has(key) && key !== registrationEventIdKey
    )
  }, [registrationKeys, registrationEventIdKey])

  const participantsByRegistration = useMemo(() => {
    const map = new Map<string, any[]>()
    if (!participantRegistrationIdKey) return map
    participants.forEach((participant: any) => {
      const registrationId = participant[participantRegistrationIdKey]
      if (registrationId === undefined || registrationId === null) return
      const key = String(registrationId)
      if (!map.has(key)) map.set(key, [])
      map.get(key)?.push(participant)
    })
    return map
  }, [participants, participantRegistrationIdKey])

  const eventOnlyParticipants = useMemo(() => {
    if (!participantEventIdKey || participantRegistrationIdKey) return []
    return participants.filter(
      (participant: any) => String(participant[participantEventIdKey]) === String(eventId)
    )
  }, [participants, participantEventIdKey, participantRegistrationIdKey, eventId])

  const participantColumns = useMemo(() => {
    if (!participantKeys.length) return []
    return participantKeys.filter(
      (key) =>
        !RESERVED_KEYS.has(key) &&
        key !== participantRegistrationIdKey &&
        key !== participantEventIdKey
    )
  }, [participantKeys, participantRegistrationIdKey, participantEventIdKey])

  if (registrationsError || participantsError) {
    console.error('[AdminEventDetail] Load error', registrationsError || participantsError)
    return <p className="p-6">Failed to load registrations.</p>
  }

  if (!registrationsData || !participantsData) {
    return <p className="p-6">Loading registrations…</p>
  }

  const handleParticipantStatusChange = async (participant: any, nextStatus: string) => {
    if (!participantStatusKey) return
    const participantId = participant?.[participantIdKey]
    if (!participantId) return
    setStatusError(null)
    setUpdatingParticipantId(String(participantId))

    const { error } = await supabase
      .from('event_registration_participants')
      .update({ [participantStatusKey]: nextStatus })
      .eq(participantIdKey, participantId)

    if (error) {
      console.error('[AdminEventDetail] Participant status update error', error)
      setStatusError(error.message ?? String(error))
      setUpdatingParticipantId(null)
      return
    }

    await mutateParticipants(
      (prev = []) =>
        prev.map((row: any) =>
          String(row[participantIdKey]) === String(participantId)
            ? {
                ...row,
                [participantStatusKey]: nextStatus,
              }
            : row
        ),
      false
    )
    setUpdatingParticipantId(null)
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-gradient-to-b from-slate-50 via-white to-indigo-50">
      <Navbar showLogout rightLinkHref="/admin/events" rightLinkLabel="Zurück" />
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-32 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-indigo-200/40 blur-3xl" />
        <div className="absolute bottom-0 right-0 h-72 w-72 rounded-full bg-rose-200/40 blur-3xl" />
      </div>

      <div className="relative mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-10">
        <Card className="border-white/60 bg-white/80 shadow-[0_30px_60px_rgba(15,23,42,0.12)] backdrop-blur-xl">
          <CardHeader className="gap-2">
            <CardTitle className="text-3xl md:text-4xl">Registrierungen</CardTitle>
            <CardDescription>
              Event-ID: <span className="font-semibold text-slate-700">{eventId}</span>
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <Separator />

            {!registrationEventIdKey && (
              <Alert className="border-amber-200 bg-amber-50 text-amber-700">
                <AlertTitle>Hinweis</AlertTitle>
                <AlertDescription>
                  Event-Spalte konnte nicht automatisch erkannt werden. Es werden alle
                  Registrierungen angezeigt.
                </AlertDescription>
              </Alert>
            )}

            {filteredRegistrations.length === 0 ? (
              <p className="text-sm text-slate-500">Noch keine Registrierungen vorhanden.</p>
            ) : (
              <div className="space-y-4">
                {filteredRegistrations.map((registration: any) => {
                  const registrationId = String(registration[registrationIdKey])
                  const linkedParticipants =
                    participantsByRegistration.get(registrationId) ?? []

                  return (
                    <Card
                      key={registrationId}
                      className="border-slate-200/70 bg-white/70 shadow-none"
                    >
                      <CardHeader className="gap-2">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <CardTitle className="text-lg">
                            Registrierung #{registrationId}
                          </CardTitle>
                          <div className="flex flex-wrap items-center gap-2">
                            {registrationStatusKey ? (
                              <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
                                {String(registration[registrationStatusKey] ?? '-')}
                              </span>
                            ) : null}
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-6">
                        {statusError ? (
                          <Alert className="border-rose-200 bg-rose-50 text-rose-700">
                            <AlertTitle>Fehler</AlertTitle>
                            <AlertDescription>{statusError}</AlertDescription>
                          </Alert>
                        ) : null}
                        <div className="grid gap-4 md:grid-cols-2">
                            {registrationColumns.map((key) => {
                            const value = registration[key]
                            const displayValue =
                              value === null || value === undefined || value === ''
                                ? '-'
                                : String(value)

                            return (
                              <div key={key} className="space-y-1">
                                <Label className="text-xs text-slate-500">
                                  {formatHeader(key)}
                                </Label>
                                {key === registrationStatusKey ? (
                                  <span
                                    className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${
                                      displayValue.toLowerCase() === 'accepted'
                                        ? 'bg-emerald-100 text-emerald-700'
                                        : displayValue.toLowerCase() === 'submitted'
                                          ? 'bg-slate-100 text-slate-600'
                                          : 'bg-rose-100 text-rose-600'
                                    }`}
                                  >
                                    {displayValue}
                                  </span>
                                ) : (
                                  <p className="text-sm font-medium text-slate-700">
                                    {displayValue}
                                  </p>
                                )}
                              </div>
                            )
                          })}
                        </div>

                        <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-4">
                          <div className="flex items-center justify-between">
                            <p className="text-sm font-semibold text-slate-700">
                              Teilnehmer ({linkedParticipants.length})
                            </p>
                          </div>
                          {linkedParticipants.length === 0 ? (
                            <p className="mt-2 text-xs text-slate-500">
                              Keine Teilnehmer hinterlegt.
                            </p>
                          ) : (
                            <div className="mt-3 grid gap-3 md:grid-cols-2">
                              {linkedParticipants.map((participant: any, index: number) => (
                                <div
                                  key={`${registrationId}-${index}`}
                                  className="rounded-lg border border-slate-200 bg-white/90 p-3"
                                >
                                  <div className="grid gap-2">
                                    {participantColumns.map((key) => {
                                      const value = participant[key]
                                      const displayValue =
                                        value === null || value === undefined || value === ''
                                          ? '-'
                                          : String(value)
                                      const isStatusField = key === participantStatusKey
                                      const isUpdating =
                                        updatingParticipantId ===
                                        String(participant?.[participantIdKey])

                                      return (
                                        <div key={key} className="flex flex-col">
                                          <span className="text-[11px] uppercase text-slate-400">
                                            {formatHeader(key)}
                                          </span>
                                          {isStatusField ? (
                                            <select
                                              className={inputClass}
                                              value={String(participant?.[key] ?? '')}
                                              onChange={(event) =>
                                                handleParticipantStatusChange(
                                                  participant,
                                                  event.target.value
                                                )
                                              }
                                              disabled={isUpdating}
                                            >
                                              <option value="">Bitte wählen</option>
                                              <option value="submitted">Submitted</option>
                                              <option value="accepted">Accepted</option>
                                              <option value="confirmed">Confirmed</option>
                                              <option value="missed">Missed</option>
                                              <option value="cancelled">Cancelled</option>
                                            </select>
                                          ) : (
                                            <span className="text-sm text-slate-700">
                                              {displayValue}
                                            </span>
                                          )}
                                        </div>
                                      )
                                    })}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            )}

            {participantEventIdKey && eventOnlyParticipants.length > 0 && (
              <Card className="border-slate-200/70 bg-white/70 shadow-none">
                <CardHeader className="gap-2">
                  <CardTitle className="text-base">Teilnehmer ohne Registrierung</CardTitle>
                  <CardDescription>
                    Diese Teilnehmer sind direkt dem Event zugeordnet.
                  </CardDescription>
                </CardHeader>
                <CardContent className="grid gap-3 md:grid-cols-2">
                  {eventOnlyParticipants.map((participant: any, index: number) => (
                    <div
                      key={`event-only-${index}`}
                      className="rounded-lg border border-slate-200 bg-white/90 p-3"
                    >
                      <div className="grid gap-2">
                        {participantColumns.map((key) => {
                          const value = participant[key]
                          const displayValue =
                            value === null || value === undefined || value === ''
                              ? '-'
                              : String(value)
                          const isStatusField = key === participantStatusKey
                          const isUpdating =
                            updatingParticipantId === String(participant?.[participantIdKey])

                          return (
                            <div key={key} className="flex flex-col">
                              <span className="text-[11px] uppercase text-slate-400">
                                {formatHeader(key)}
                              </span>
                              {isStatusField ? (
                                <select
                                  className={inputClass}
                                  value={String(participant?.[key] ?? '')}
                                  onChange={(event) =>
                                    handleParticipantStatusChange(participant, event.target.value)
                                  }
                                  disabled={isUpdating}
                                >
                                  <option value="">Bitte wählen</option>
                                  <option value="submitted">Submitted</option>
                                  <option value="accepted">Accepted</option>
                                  <option value="cancelled">Cancelled</option>
                                </select>
                              ) : (
                                <span className="text-sm text-slate-700">{displayValue}</span>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
          </CardContent>
        </Card>

      </div>
    </main>
  )
}
