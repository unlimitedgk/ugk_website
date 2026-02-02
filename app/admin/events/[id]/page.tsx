'use client'

import { useMemo, useState } from 'react'
import { useParams } from 'next/navigation'
import useSWR from 'swr'
import Navbar from '@/components/Navbar'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Separator } from '@/components/ui/separator'
import { supabase } from '@/lib/supabaseClient'

const inputClass =
  'w-full rounded-xl border border-slate-200 bg-white/90 px-3 py-2 text-sm text-slate-900 shadow-sm outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-200'

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

  const { data: eventData, error: eventError } = useSWR(['admin-event', eventId], async () => {
    if (!eventId) return null
    const { data, error } = await supabase.from('events').select('*').eq('id', eventId).single()
    if (error) throw error
    return data
  })

  const registrations = registrationsData ?? []
  const participants = participantsData ?? []
  const eventRow = eventData ?? null

  const registrationKeys = useMemo(
    () => (registrations[0] ? Object.keys(registrations[0]) : []),
    [registrations]
  )
  const participantKeys = useMemo(
    () => (participants[0] ? Object.keys(participants[0]) : []),
    [participants]
  )

  const registrationEventIdKey = getKeyByHints(registrationKeys, ['event_id', 'eventid'])
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
  const participantFirstNameKey = getKeyByHints(participantKeys, ['first_name', 'firstname', 'first'])
  const participantLastNameKey = getKeyByHints(participantKeys, ['last_name', 'lastname', 'last'])
  const participantBirthdateKey = getKeyByHints(participantKeys, [
    'birth_date',
    'birthdate',
    'date_of_birth',
    'dob',
  ])
  const participantTeamKey = getKeyByHints(participantKeys, ['team', 'club'])

  const eventKeys = useMemo(() => (eventRow ? Object.keys(eventRow) : []), [eventRow])
  const eventNameKey = getKeyByHints(eventKeys, ['title', 'name', 'event_name'])
  const eventStartDateKey = getKeyByHints(eventKeys, ['start_date', 'startdate', 'start'])
  const eventEndDateKey = getKeyByHints(eventKeys, ['end_date', 'enddate', 'end'])
  const eventLocationNameKey = getKeyByHints(eventKeys, ['location_name', 'location', 'venue'])

  const eventName = eventNameKey ? eventRow?.[eventNameKey] : null
  const eventStartDate = eventStartDateKey ? eventRow?.[eventStartDateKey] : null
  const eventEndDate = eventEndDateKey ? eventRow?.[eventEndDateKey] : null
  const eventLocationName = eventLocationNameKey ? eventRow?.[eventLocationNameKey] : null

  const statusCounts = useMemo(() => {
    const counts = { submitted: 0, accepted: 0, confirmed: 0 }
    if (!participantStatusKey) return counts

    const registrationIdToEventId = new Map<string, string>()
    if (registrations.length && registrationEventIdKey) {
      registrations.forEach((registration: any) => {
        const registrationId = registration[registrationIdKey]
        const mappedEventId = registration[registrationEventIdKey]
        if (registrationId !== undefined && mappedEventId !== undefined) {
          registrationIdToEventId.set(String(registrationId), String(mappedEventId))
        }
      })
    }

    participants.forEach((participant: any) => {
      const status = String(participant[participantStatusKey] ?? '').toLowerCase()
      if (status !== 'submitted' && status !== 'accepted' && status !== 'confirmed') return

      let participantEventId: unknown = participantEventIdKey
        ? participant[participantEventIdKey]
        : undefined
      if (!participantEventId && participantRegistrationIdKey) {
        const regId = participant[participantRegistrationIdKey]
        participantEventId = registrationIdToEventId.get(String(regId))
      }
      if (!participantEventId || String(participantEventId) !== String(eventId)) return

      if (status === 'submitted') counts.submitted += 1
      if (status === 'accepted') counts.accepted += 1
      if (status === 'confirmed') counts.confirmed += 1
    })

    return counts
  }, [
    participants,
    registrations,
    participantStatusKey,
    participantEventIdKey,
    participantRegistrationIdKey,
    registrationEventIdKey,
    registrationIdKey,
    eventId,
  ])

  const registrationsById = useMemo(() => {
    const map = new Map<string, any>()
    registrations.forEach((registration: any) => {
      const registrationId = registration?.[registrationIdKey]
      if (registrationId === undefined || registrationId === null) return
      map.set(String(registrationId), registration)
    })
    return map
  }, [registrations, registrationIdKey])

  const participantsForEvent = useMemo(() => {
    if (!participants.length) return []
    return participants.filter((participant: any) => {
      let participantEventId: unknown = participantEventIdKey
        ? participant[participantEventIdKey]
        : undefined

      if (!participantEventId && participantRegistrationIdKey) {
        const registrationId = participant[participantRegistrationIdKey]
        const registration =
          registrationId === undefined || registrationId === null
            ? undefined
            : registrationsById.get(String(registrationId))
        if (registration && registrationEventIdKey) {
          participantEventId = registration[registrationEventIdKey]
        }
      }

      if (participantEventIdKey || registrationEventIdKey) {
        if (!participantEventId) return false
        return String(participantEventId) === String(eventId)
      }

      return true
    })
  }, [
    participants,
    participantEventIdKey,
    participantRegistrationIdKey,
    registrationsById,
    registrationEventIdKey,
    eventId,
  ])

  const participantsSorted = useMemo(() => {
    const getTimestamp = (participant: any) => {
      if (!participantBirthdateKey) return Number.POSITIVE_INFINITY
      const rawValue = participant?.[participantBirthdateKey]
      if (!rawValue) return Number.POSITIVE_INFINITY
      const parsed = new Date(rawValue)
      return Number.isNaN(parsed.getTime()) ? Number.POSITIVE_INFINITY : parsed.getTime()
    }

    return [...participantsForEvent].sort(
      (a, b) => getTimestamp(a) - getTimestamp(b)
    )
  }, [participantsForEvent, participantBirthdateKey])

  if (registrationsError || participantsError || eventError) {
    console.error(
      '[AdminEventDetail] Load error',
      registrationsError || participantsError || eventError
    )
    return <p className="p-6">Failed to load registrations.</p>
  }

  if (!registrationsData || !participantsData || !eventData) {
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
            <div className="flex flex-wrap items-center justify-between gap-4">
              <CardTitle className="text-3xl md:text-4xl">Teilnehmer</CardTitle>
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                  Submitted: {statusCounts.submitted}
                </span>
                <span className="inline-flex items-center rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-600">
                  Accepted: {statusCounts.accepted}
                </span>
                <span className="inline-flex items-center rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-600">
                  Confirmed: {statusCounts.confirmed}
                </span>
              </div>
            </div>
            <CardDescription>
              <span className="grid gap-1 text-sm text-slate-600 sm:grid-cols-2">
                <span>
                  Name:{' '}
                  <span className="font-semibold text-slate-700">
                    {eventName ? String(eventName) : '-'}
                  </span>
                </span>
                <span>
                  Ort:{' '}
                  <span className="font-semibold text-slate-700">
                    {eventLocationName ? String(eventLocationName) : '-'}
                  </span>
                </span>
                <span>
                  Start:{' '}
                  <span className="font-semibold text-slate-700">
                    {eventStartDate ? String(eventStartDate) : '-'}
                  </span>
                </span>
                <span>
                  Ende:{' '}
                  <span className="font-semibold text-slate-700">
                    {eventEndDate ? String(eventEndDate) : '-'}
                  </span>
                </span>
              </span>
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-8">
            <Separator />

            {!registrationEventIdKey && !participantEventIdKey && (
              <Alert className="border-amber-200 bg-amber-50 text-amber-700">
                <AlertTitle>Hinweis</AlertTitle>
                <AlertDescription>
                  Event-Spalte konnte nicht automatisch erkannt werden. Es werden alle
                  Teilnehmer angezeigt.
                </AlertDescription>
              </Alert>
            )}

            <div className="space-y-4">
              <div className="flex flex-wrap items-end justify-between gap-2">
                <div>
                  <h3 className="text-lg font-semibold text-slate-900">Teilnehmerübersicht</h3>
                  <p className="text-sm text-slate-500">Tabellarische Übersicht nach Teilnehmer.</p>
                </div>
                <span className="text-xs font-medium text-slate-500">
                  Gesamt: {participantsSorted.length}
                </span>
              </div>

              {participantsSorted.length === 0 ? (
                <p className="text-sm text-slate-500">Noch keine Teilnehmer vorhanden.</p>
              ) : (
                <div className="overflow-x-auto rounded-2xl border border-slate-200/70 bg-white/90">
                  <table className="min-w-[640px] w-full border-collapse text-left text-sm">
                    <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                      <tr>
                        <th className="px-4 py-3 font-semibold">Name</th>
                        <th className="px-4 py-3 font-semibold">Geburtsdatum</th>
                        <th className="px-4 py-3 font-semibold">Team</th>
                        <th className="px-4 py-3 font-semibold">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {participantsSorted.map((participant: any, index: number) => {
                        const participantId = participant?.[participantIdKey]
                        const firstName = participantFirstNameKey
                          ? String(participant?.[participantFirstNameKey] ?? '').trim()
                          : ''
                        const lastName = participantLastNameKey
                          ? String(participant?.[participantLastNameKey] ?? '').trim()
                          : ''
                        const fullName = `${firstName} ${lastName}`.trim() || '-'
                        const birthdateValue = participantBirthdateKey
                          ? participant?.[participantBirthdateKey]
                          : null
                        const birthdateDisplay =
                          birthdateValue === null || birthdateValue === undefined || birthdateValue === ''
                            ? '-'
                            : String(birthdateValue)
                        const teamValue = participantTeamKey ? participant?.[participantTeamKey] : null
                        const teamDisplay =
                          teamValue === null || teamValue === undefined || teamValue === ''
                            ? '-'
                            : String(teamValue)
                        const isUpdating =
                          updatingParticipantId === String(participant?.[participantIdKey])

                        return (
                          <tr key={String(participantId ?? index)} className="hover:bg-slate-50/70">
                            <td className="px-4 py-3 font-medium text-slate-800">{fullName}</td>
                            <td className="px-4 py-3 text-slate-600">{birthdateDisplay}</td>
                            <td className="px-4 py-3 text-slate-600">{teamDisplay}</td>
                            <td className="px-4 py-3">
                              {participantStatusKey ? (
                                <select
                                  className={inputClass}
                                  value={String(participant?.[participantStatusKey] ?? '')}
                                  onChange={(event) =>
                                    handleParticipantStatusChange(participant, event.target.value)
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
                                <span className="text-slate-500">-</span>
                              )}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

      </div>
    </main>
  )
}
