'use client'

import { Fragment, useCallback, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import useSWR from 'swr'
import Navbar from '@/components/Navbar'
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
import { supabase } from '@/lib/supabaseClient'
import {
  DEFAULT_MAX_PER_GROUP,
  autoAssignGroupsByAge,
  birthDateMsFromValue,
  birthYearFromValue,
  groupLabelFromIndex,
  groupOptionsForCount,
  sortGroupingRowsByGroupAndBirthYear,
} from '@/lib/eventGrouping'
import { exportGroupingPdf, type GroupingPdfRow } from '@/lib/exportGroupingPdf'

export const dynamic = 'force-dynamic'

const inputClass =
  'w-full rounded-xl border border-slate-200 bg-white/90 px-3 py-2 text-sm text-slate-900 shadow-sm outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-200'

const groupSelectClass =
  'min-w-[9.5rem] w-auto max-w-none shrink-0 rounded-xl border border-slate-200 bg-white/90 px-3 py-2 text-sm text-slate-900 shadow-sm outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-200'

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

const formatTimeNoSeconds = (value: unknown): string => {
  if (value === null || value === undefined || value === '') return ''
  const s = String(value).trim()
  if (!s) return ''
  const parts = s.split(':')
  if (parts.length >= 2) {
    return `${parts[0].padStart(2, '0')}:${parts[1].padStart(2, '0')}`
  }
  return s
}

const formatEventDateLabel = (value: unknown): string => {
  if (!value) return ''
  const parsed = new Date(String(value))
  if (Number.isNaN(parsed.getTime())) return String(value)
  return parsed.toLocaleDateString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

const resolveParticipantEventId = (
  participant: Record<string, unknown>,
  participantEventIdKey: string | undefined,
  participantRegistrationIdKey: string | undefined,
  registrationIdToEventId: Map<string, string>
): string | null => {
  let eventId: unknown = participantEventIdKey ? participant[participantEventIdKey] : undefined
  if (!eventId && participantRegistrationIdKey) {
    const regId = participant[participantRegistrationIdKey]
    if (regId !== undefined && regId !== null) {
      eventId = registrationIdToEventId.get(String(regId))
    }
  }
  if (eventId === undefined || eventId === null || eventId === '') return null
  return String(eventId)
}

const isUpcomingEvent = (
  eventRow: Record<string, unknown>,
  endDateKey?: string,
  startDateKey?: string
) => {
  const endRaw = endDateKey ? eventRow[endDateKey] : eventRow.end_date
  const startRaw = startDateKey ? eventRow[startDateKey] : eventRow.start_date
  const reference = endRaw ?? startRaw
  if (!reference) return true
  const parsed = new Date(String(reference))
  if (Number.isNaN(parsed.getTime())) return true
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  parsed.setHours(23, 59, 59, 999)
  return parsed.getTime() >= today.getTime()
}

type GroupingRow = {
  rowKey: string
  eventId: string
  keeperName: string
  birthYear: number | null
  birthDateMs: number | null
  locationName: string
  timeRange: string
  eventTitle: string
  eventStartDateMs: number
}

export default function EventGroupingPage() {
  const searchParams = useSearchParams()
  const preselectedEventId = searchParams.get('eventId')

  const [selectedEventIds, setSelectedEventIds] = useState<Set<string>>(new Set())
  const [maxPerGroupInput, setMaxPerGroupInput] = useState(String(DEFAULT_MAX_PER_GROUP))
  const [groupAssignments, setGroupAssignments] = useState<Record<string, string>>({})
  const [hasAppliedPreselect, setHasAppliedPreselect] = useState(false)
  const [exportingPdf, setExportingPdf] = useState(false)

  const maxPerGroup = useMemo(() => {
    const trimmed = maxPerGroupInput.trim()
    if (!trimmed) return null
    const parsed = Number(trimmed)
    if (!Number.isInteger(parsed) || parsed <= 0) return null
    return parsed
  }, [maxPerGroupInput])

  const isMaxPerGroupValid = maxPerGroup !== null
  const effectiveMaxPerGroup = maxPerGroup ?? DEFAULT_MAX_PER_GROUP

  const { data: eventsData, error: eventsError } = useSWR('admin-events-grouping', async () => {
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .order('start_date', { ascending: true })
    if (error) throw error
    return data ?? []
  })

  const { data: registrationsData, error: registrationsError } = useSWR(
    'event-registrations-grouping',
    async () => {
      const { data, error } = await supabase.from('event_registrations').select('*')
      if (error) throw error
      return data ?? []
    }
  )

  const { data: participantsData, error: participantsError } = useSWR(
    'event-registration-participants-grouping',
    async () => {
      const { data, error } = await supabase.from('event_registration_participants').select('*')
      if (error) throw error
      return data ?? []
    }
  )

  const { data: keepersData, error: keepersError } = useSWR('admin-keepers-grouping', async () => {
    const { data, error } = await supabase
      .from('keepers')
      .select('id, first_name, last_name, birth_date')
      .is('deleted_at', null)
    if (error) throw error
    return data ?? []
  })

  const events = eventsData ?? []
  const registrations = registrationsData ?? []
  const participants = participantsData ?? []
  const keepers = keepersData ?? []

  const eventKeys = events[0] ? Object.keys(events[0]) : []
  const eventTitleKey = getKeyByHints(eventKeys, ['title', 'name', 'event_name'])
  const eventStartDateKey = getKeyByHints(eventKeys, ['start_date', 'startdate', 'start'])
  const eventEndDateKey = getKeyByHints(eventKeys, ['end_date', 'enddate', 'end'])
  const eventStartTimeKey = getKeyByHints(eventKeys, ['start_time', 'starttime'])
  const eventEndTimeKey = getKeyByHints(eventKeys, ['end_time', 'endtime'])
  const eventLocationNameKey = getKeyByHints(eventKeys, ['location_name', 'location', 'venue'])

  const registrationKeys = registrations[0] ? Object.keys(registrations[0]) : []
  const participantKeys = participants[0] ? Object.keys(participants[0]) : []

  const registrationEventIdKey = getKeyByHints(registrationKeys, ['event_id', 'eventid'])
  const registrationIdKey =
    getKeyByHints(registrationKeys, ['id', 'registration_id', 'event_registration_id']) || 'id'
  const registrationIsTrialTrainingKey = getKeyByHints(registrationKeys, ['is_trial_training'])

  const participantIdKey =
    getKeyByHints(participantKeys, ['id', 'participant_id', 'event_registration_participant_id']) ||
    'id'
  const participantRegistrationIdKey = getKeyByHints(participantKeys, [
    'event_registration_id',
    'registration_id',
    'event_reg_id',
  ])
  const participantKeeperIdKey = getKeyByHints(participantKeys, ['keeper_id', 'keeperid', 'child_id'])
  const participantEventIdKey = getKeyByHints(participantKeys, ['event_id', 'eventid'])
  const participantStatusKey = getKeyByHints(participantKeys, ['status'])
  const participantBirthdateKey = getKeyByHints(participantKeys, [
    'birth_date',
    'birthdate',
    'date_of_birth',
    'dob',
    'geburtsdatum',
  ])
  const participantFirstNameKey = getKeyByHints(participantKeys, ['first_name', 'firstname', 'first'])
  const participantLastNameKey = getKeyByHints(participantKeys, ['last_name', 'lastname', 'last'])

  const keepersById = useMemo(() => {
    const map = new Map<string, (typeof keepers)[number]>()
    keepers.forEach((keeper) => {
      if (keeper?.id) map.set(String(keeper.id), keeper)
    })
    return map
  }, [keepers])

  const registrationIdToEventId = useMemo(() => {
    const map = new Map<string, string>()
    if (!registrationEventIdKey) return map
    registrations.forEach((registration: Record<string, unknown>) => {
      const registrationId = registration[registrationIdKey]
      const eventId = registration[registrationEventIdKey]
      if (registrationId !== undefined && eventId !== undefined) {
        map.set(String(registrationId), String(eventId))
      }
    })
    return map
  }, [registrations, registrationEventIdKey, registrationIdKey])

  const registrationsById = useMemo(() => {
    const map = new Map<string, Record<string, unknown>>()
    registrations.forEach((registration: Record<string, unknown>) => {
      const registrationId = registration[registrationIdKey]
      if (registrationId !== undefined && registrationId !== null) {
        map.set(String(registrationId), registration)
      }
    })
    return map
  }, [registrations, registrationIdKey])

  const isTrialTrainingRegistration = useCallback(
    (participant: Record<string, unknown>) => {
      if (!registrationIsTrialTrainingKey || !participantRegistrationIdKey) return false
      const regId = participant[participantRegistrationIdKey]
      if (regId === undefined || regId === null) return false
      const registration = registrationsById.get(String(regId))
      if (!registration) return false
      return Boolean(registration[registrationIsTrialTrainingKey])
    },
    [registrationIsTrialTrainingKey, participantRegistrationIdKey, registrationsById]
  )

  const shouldIncludeParticipant = useCallback(
    (participant: Record<string, unknown>) => {
      if (!participantStatusKey) return false
      const status = String(participant[participantStatusKey] ?? '').toLowerCase()
      if (status === 'cancelled' || status === 'missed') return false
      if (status === 'submitted') return true
      if (isTrialTrainingRegistration(participant)) {
        return status === 'accepted' || status === 'confirmed'
      }
      return false
    },
    [participantStatusKey, isTrialTrainingRegistration]
  )

  const upcomingEvents = useMemo(() => {
    return events.filter((eventRow: Record<string, unknown>) =>
      isUpcomingEvent(eventRow, eventEndDateKey, eventStartDateKey)
    )
  }, [events, eventEndDateKey, eventStartDateKey])

  const submittedCountByEventId = useMemo(() => {
    const map = new Map<string, number>()
    if (!participantStatusKey) return map

    participants.forEach((participant: Record<string, unknown>) => {
      if (!shouldIncludeParticipant(participant)) return

      const eventId = resolveParticipantEventId(
        participant,
        participantEventIdKey,
        participantRegistrationIdKey,
        registrationIdToEventId
      )
      if (!eventId) return

      map.set(eventId, (map.get(eventId) ?? 0) + 1)
    })

    return map
  }, [
    participants,
    shouldIncludeParticipant,
    participantEventIdKey,
    participantRegistrationIdKey,
    registrationIdToEventId,
  ])

  useEffect(() => {
    if (hasAppliedPreselect || !preselectedEventId || !upcomingEvents.length) return
    const exists = upcomingEvents.some(
      (eventRow: Record<string, unknown>) => String(eventRow.id) === preselectedEventId
    )
    if (exists) {
      setSelectedEventIds(new Set([preselectedEventId]))
    }
    setHasAppliedPreselect(true)
  }, [hasAppliedPreselect, preselectedEventId, upcomingEvents])

  const groupingRows = useMemo(() => {
    if (!participantStatusKey || !selectedEventIds.size) return []

    const eventsById = new Map<string, Record<string, unknown>>()
    events.forEach((eventRow: Record<string, unknown>) => {
      if (eventRow?.id != null) eventsById.set(String(eventRow.id), eventRow)
    })

    const rows: GroupingRow[] = []

    participants.forEach((participant: Record<string, unknown>, index) => {
      if (!shouldIncludeParticipant(participant)) return

      const eventId = resolveParticipantEventId(
        participant,
        participantEventIdKey,
        participantRegistrationIdKey,
        registrationIdToEventId
      )
      if (!eventId || !selectedEventIds.has(eventId)) return

      const eventRow = eventsById.get(eventId)
      if (!eventRow) return

      const participantFirst = participantFirstNameKey
        ? String(participant[participantFirstNameKey] ?? '').trim()
        : ''
      const participantLast = participantLastNameKey
        ? String(participant[participantLastNameKey] ?? '').trim()
        : ''

      const keeperId = participantKeeperIdKey ? participant[participantKeeperIdKey] : undefined
      const keeper = keeperId ? keepersById.get(String(keeperId)) : undefined
      const keeperFirst = String(keeper?.first_name ?? '').trim()
      const keeperLast = String(keeper?.last_name ?? '').trim()
      const keeperName =
        `${keeperFirst || participantFirst} ${keeperLast || participantLast}`.trim() || '—'

      const birthRaw =
        (participantBirthdateKey ? participant[participantBirthdateKey] : undefined) ??
        keeper?.birth_date
      const birthDateMs = birthDateMsFromValue(birthRaw)
      const birthYear = birthYearFromValue(birthRaw)

      const startTime = eventStartTimeKey ? formatTimeNoSeconds(eventRow[eventStartTimeKey]) : ''
      const endTime = eventEndTimeKey ? formatTimeNoSeconds(eventRow[eventEndTimeKey]) : ''
      const timeRange =
        startTime && endTime ? `${startTime} – ${endTime}` : startTime || endTime || '—'

      const locationName = eventLocationNameKey
        ? String(eventRow[eventLocationNameKey] ?? '').trim() || '—'
        : '—'

      const eventTitle = eventTitleKey
        ? String(eventRow[eventTitleKey] ?? '').trim() || `Event #${eventId}`
        : `Event #${eventId}`

      const startDateRaw = eventStartDateKey ? eventRow[eventStartDateKey] : null
      const eventStartDateMs = birthDateMsFromValue(startDateRaw) ?? 0

      const participantId = participant[participantIdKey]
      const rowKey =
        participantId !== undefined && participantId !== null
          ? `${eventId}-${participantId}`
          : `${eventId}-row-${index}-${participantFirst}-${participantLast}`

      rows.push({
        rowKey,
        eventId,
        keeperName,
        birthYear,
        birthDateMs,
        locationName,
        timeRange,
        eventTitle,
        eventStartDateMs,
      })
    })

    return rows
  }, [
    participants,
    events,
    selectedEventIds,
    keepersById,
    registrationIdToEventId,
    shouldIncludeParticipant,
    participantEventIdKey,
    participantRegistrationIdKey,
    participantKeeperIdKey,
    participantBirthdateKey,
    participantFirstNameKey,
    participantLastNameKey,
    participantIdKey,
    eventTitleKey,
    eventStartDateKey,
    eventStartTimeKey,
    eventEndTimeKey,
    eventLocationNameKey,
  ])

  const displayedGroupingRows = useMemo(
    () => sortGroupingRowsByGroupAndBirthYear(groupingRows, groupAssignments),
    [groupingRows, groupAssignments]
  )

  const groupOptionsByEventId = useMemo(() => {
    const map = new Map<string, string[]>()
    const rowsByEvent = new Map<string, number>()
    groupingRows.forEach((row) => {
      rowsByEvent.set(row.eventId, (rowsByEvent.get(row.eventId) ?? 0) + 1)
    })
    rowsByEvent.forEach((count, eventId) => {
      map.set(eventId, groupOptionsForCount(count, effectiveMaxPerGroup))
    })
    return map
  }, [groupingRows, effectiveMaxPerGroup])

  const applyAutoGrouping = useCallback(() => {
    if (maxPerGroup === null) return

    const rowsByEvent = new Map<string, GroupingRow[]>()
    groupingRows.forEach((row) => {
      const list = rowsByEvent.get(row.eventId) ?? []
      list.push(row)
      rowsByEvent.set(row.eventId, list)
    })

    const nextAssignments: Record<string, string> = {}

    rowsByEvent.forEach((rows) => {
      const birthDateMsByRowId = new Map(
        rows.map((row) => [row.rowKey, row.birthDateMs] as const)
      )
      const auto = autoAssignGroupsByAge(
        rows.map((row) => row.rowKey),
        birthDateMsByRowId,
        maxPerGroup
      )
      auto.forEach((group, rowKey) => {
        nextAssignments[rowKey] = group
      })
    })

    setGroupAssignments(nextAssignments)
  }, [groupingRows, maxPerGroup])

  const loadError =
    eventsError || registrationsError || participantsError || keepersError
      ? 'Daten konnten nicht geladen werden.'
      : null

  const selectAllUpcoming = () => {
    setSelectedEventIds(new Set(upcomingEvents.map((e: Record<string, unknown>) => String(e.id))))
  }

  const clearSelection = () => {
    setSelectedEventIds(new Set())
  }

  const handleExportPdf = async () => {
    if (!displayedGroupingRows.length) return
    setExportingPdf(true)
    try {
      const pdfRows: GroupingPdfRow[] = displayedGroupingRows.map((row) => ({
        rowKey: row.rowKey,
        eventId: row.eventId,
        eventTitle: row.eventTitle,
        keeperName: row.keeperName,
        birthYear: row.birthYear,
        locationName: row.locationName,
        timeRange: row.timeRange,
        group: groupAssignments[row.rowKey] ?? '—',
      }))
      await exportGroupingPdf(pdfRows)
    } catch (error) {
      console.error('[EventGrouping] PDF export failed', error)
    } finally {
      setExportingPdf(false)
    }
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-gradient-to-b from-slate-50 via-white to-indigo-50">
      <Navbar showLogout rightLinkHref="/admin/events" rightLinkLabel="Zurück zu Events" />
      <div className="pointer-events-none absolute inset-0">
          <div className="absolute -top-32 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-indigo-200/40 blur-3xl" />
        <div className="absolute bottom-0 right-0 h-72 w-72 rounded-full bg-rose-200/40 blur-3xl" />
      </div>

      <div className="relative mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-10">
        <Card className="border-white/60 bg-white/80 shadow-[0_30px_60px_rgba(15,23,42,0.12)] backdrop-blur-xl">
          <CardHeader className="gap-4">
            <div className="flex flex-wrap items-center gap-3">
              <span className="rounded-full bg-indigo-100 px-3 py-1 text-xs font-semibold text-indigo-600">
                Adminbereich
              </span>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-500">
                Events
              </span>
            </div>
            <div className="space-y-2">
              <CardTitle className="text-3xl md:text-4xl">Gruppeneinteilung</CardTitle>
              <CardDescription>
                Wähle kommende Events und ordne eingereichte Anmeldungen alphabetischen
                Trainingsgruppen zu. Ältere Torhüter werden zuerst in Gruppe A eingeteilt.
              </CardDescription>
            </div>
          </CardHeader>

          <CardContent className="space-y-6">
            {loadError ? (
              <Alert className="border-rose-200 bg-rose-50 text-rose-700">
                <AlertTitle>Fehler</AlertTitle>
                <AlertDescription>{loadError}</AlertDescription>
              </Alert>
            ) : null}

            <Separator />

            <div className="grid gap-6 lg:grid-cols-[1fr_220px]">
              <div className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <Label className="text-sm font-semibold text-slate-800">Kommende Events</Label>
                  <div className="flex flex-wrap gap-2">
                    <Button type="button" size="sm" variant="outline" onClick={selectAllUpcoming}>
                      Alle auswählen
                    </Button>
                    <Button type="button" size="sm" variant="ghost" onClick={clearSelection}>
                      Auswahl leeren
                    </Button>
                  </div>
                </div>
                {upcomingEvents.length === 0 ? (
                  <p className="text-sm text-slate-500">Keine kommenden Events vorhanden.</p>
                ) : (
                  <ul className="max-h-64 space-y-2 overflow-y-auto rounded-2xl border border-slate-200/80 bg-white/90 p-3">
                    {upcomingEvents.map((eventRow: Record<string, unknown>) => {
                      const eventId = String(eventRow.id)
                      const title = eventTitleKey
                        ? String(eventRow[eventTitleKey] ?? '').trim() || `Event #${eventId}`
                        : `Event #${eventId}`
                      const dateLabel = eventStartDateKey
                        ? formatEventDateLabel(eventRow[eventStartDateKey])
                        : ''
                      const submittedCount = submittedCountByEventId.get(eventId) ?? 0
                      const checked = selectedEventIds.has(eventId)

                      return (
                        <li key={eventId}>
                          <label className="flex cursor-pointer items-start gap-3 rounded-xl px-2 py-2 hover:bg-slate-50">
                            <input
                              type="checkbox"
                              className="mt-1 h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-400"
                              checked={checked}
                              onChange={() => {
                                setSelectedEventIds((prev) => {
                                  const next = new Set(prev)
                                  if (next.has(eventId)) next.delete(eventId)
                                  else next.add(eventId)
                                  return next
                                })
                              }}
                            />
                            <span className="min-w-0 flex-1">
                              <span className="block text-sm font-medium text-slate-900">
                                {title}
                              </span>
                              <span className="block text-xs text-slate-500">
                                {dateLabel ? `${dateLabel} · ` : ''}
                                {submittedCount} für Gruppeneinteilung
                              </span>
                            </span>
                          </label>
                        </li>
                      )
                    })}
                  </ul>
                )}
              </div>

              <div className="space-y-4 rounded-2xl border border-slate-200/80 bg-slate-50/50 p-4">
                <div className="space-y-1">
                  <Label htmlFor="max-per-group" className="text-xs text-slate-500">
                    Max. Torhüter pro Gruppe
                  </Label>
                  <Input
                    id="max-per-group"
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={maxPerGroupInput}
                    onChange={(e) => {
                      const next = e.target.value
                      if (next === '' || /^\d+$/.test(next)) {
                        setMaxPerGroupInput(next)
                      }
                    }}
                    aria-invalid={!isMaxPerGroupValid}
                    aria-describedby="max-per-group-hint"
                  />
                  {!isMaxPerGroupValid ? (
                    <p id="max-per-group-hint" className="text-xs text-amber-700">
                      Bitte eine ganze Zahl größer als 0 eingeben.
                    </p>
                  ) : null}
                </div>
                <Button
                  type="button"
                  className="w-full"
                  onClick={applyAutoGrouping}
                  disabled={groupingRows.length === 0 || !isMaxPerGroupValid}
                >
                  Automatisch zuteilen
                </Button>
                <p className="text-xs text-slate-500">
                  Sortierung nach Alter: älteste Torhüter zuerst in Gruppe A, jüngere in späteren
                  Gruppen
                  {isMaxPerGroupValid ? ` (max. ${maxPerGroup} pro Gruppe).` : '.'}
                </p>
              </div>
            </div>

            <Separator />

            {selectedEventIds.size === 0 ? (
              <p className="text-sm text-slate-500">
                Bitte mindestens ein kommendes Event auswählen.
              </p>
            ) : groupingRows.length === 0 ? (
              <p className="text-sm text-slate-500">
                Für die ausgewählten Events liegen keine passenden Anmeldungen vor (eingereicht
                oder Schnuppertraining).
              </p>
            ) : (
              <div className="space-y-3">
                <div className="flex justify-end">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleExportPdf}
                    disabled={exportingPdf}
                  >
                    {exportingPdf ? 'Exportiert…' : 'Export'}
                  </Button>
                </div>
                <div className="overflow-x-auto rounded-2xl border border-slate-200/80 bg-white/90">
                <table className="min-w-[36rem] w-full text-left text-sm">
                  <thead className="border-b border-slate-200 bg-slate-50/80 text-xs uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="px-4 py-3 font-semibold">Torwart</th>
                      <th className="px-4 py-3 font-semibold">Geburtsjahr</th>
                      <th className="min-w-[9.5rem] px-4 py-3 font-semibold">Gruppe</th>
                      <th className="px-4 py-3 font-semibold">Ort</th>
                      <th className="px-4 py-3 font-semibold">Zeit</th>
                    </tr>
                  </thead>
                  <tbody>
                    {displayedGroupingRows.map((row, index) => {
                      const prev = index > 0 ? displayedGroupingRows[index - 1] : null
                      const showEventHeader = !prev || prev.eventId !== row.eventId
                      const options =
                        groupOptionsByEventId.get(row.eventId) ??
                        groupOptionsForCount(1, effectiveMaxPerGroup)
                      const assigned = groupAssignments[row.rowKey] ?? ''
                      const selectOptions =
                        assigned && !options.includes(assigned)
                          ? [...options, assigned]
                          : options

                      return (
                        <Fragment key={row.rowKey}>
                          {showEventHeader ? (
                            <tr className="bg-indigo-50/60">
                              <td
                                colSpan={5}
                                className="px-4 py-2 text-xs font-semibold uppercase tracking-wide text-indigo-700"
                              >
                                {row.eventTitle}
                              </td>
                            </tr>
                          ) : null}
                          <tr className="border-b border-slate-100 last:border-0">
                            <td className="px-4 py-3 font-medium text-slate-900">
                              {row.keeperName}
                            </td>
                            <td className="px-4 py-3 text-slate-600">
                              {row.birthYear ?? '—'}
                            </td>
                            <td className="min-w-[9.5rem] px-4 py-3">
                              <select
                                className={groupSelectClass}
                                value={assigned}
                                onChange={(e) =>
                                  setGroupAssignments((prevAssignments) => ({
                                    ...prevAssignments,
                                    [row.rowKey]: e.target.value,
                                  }))
                                }
                                aria-label={`Gruppe für ${row.keeperName}`}
                              >
                                <option value="">—</option>
                                {selectOptions.map((option) => (
                                  <option key={option} value={option}>
                                    {option}
                                  </option>
                                ))}
                              </select>
                            </td>
                            <td className="px-4 py-3 text-slate-600">{row.locationName}</td>
                            <td className="px-4 py-3 text-slate-600">{row.timeRange}</td>
                          </tr>
                        </Fragment>
                      )
                    })}
                  </tbody>
                </table>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  )
}
