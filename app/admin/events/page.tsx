'use client'

import { Fragment, useEffect, useMemo, useState } from 'react'
import useSWR from 'swr'
import Navbar from '@/components/Navbar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Separator } from '@/components/ui/separator'
import { supabase } from '@/lib/supabaseClient'

type StatusCounts = {
  submitted: number
  accepted: number
  confirmed: number
}

const RESERVED_KEYS = new Set(['id', 'created_at', 'created_by', 'updated_at'])
const TEXTAREA_HINTS = ['description', 'notes', 'details', 'content']
const NUMBER_HINTS = ['price', 'amount', 'capacity', 'count', 'max', 'min', 'slots', 'seats']
const HIDDEN_EVENT_FIELDS = new Set([
  'street',
  'postalcode',
  'city',
  'locationnotes',
  'urlpicture',
  'agemin',
  'agemax',
  'openforregistration',
])

const EVENT_STATUS_OPTIONS = [
  'open',
  'closed',
  'preview',
  'cancelled',
  'full',
  'draft',
] as const

const EVENT_TYPE_OPTIONS = ['weekly_training', 'camp', 'keeperday'] as const

const isEventStatusKey = (key: string) => normalizeKey(key) === 'eventstatus'
const isEventTypeKey = (key: string) => normalizeKey(key) === 'eventtype'

const inputClass =
  'w-full rounded-xl border border-slate-200 bg-white/90 px-3 py-2 text-sm text-slate-900 shadow-sm outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-200'

const formatHeader = (key: string) =>
  key
    .replace(/_/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/\b\w/g, (char) => char.toUpperCase())

const normalizeKey = (key: string) => key.toLowerCase().replace(/[^a-z0-9]/g, '')

const toMonthYear = (value: unknown) => {
  if (!value) return null
  const parsed = new Date(String(value))
  if (Number.isNaN(parsed.getTime())) return null
  const year = String(parsed.getFullYear())
  const month = String(parsed.getMonth() + 1).padStart(2, '0')
  return {
    key: `${year}-${month}`,
    label: `${month}.${year}`,
    month,
    year,
  }
}

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

const isBooleanKey = (key: string, value: unknown) => {
  if (typeof value === 'boolean') return true
  const lower = key.toLowerCase()
  return lower.startsWith('is_') || lower.endsWith('_enabled') || lower.endsWith('_active')
}

const isNumberKey = (key: string, value: unknown) => {
  if (typeof value === 'number') return true
  const lower = key.toLowerCase()
  return NUMBER_HINTS.some((hint) => lower.includes(hint))
}

const isDateTimeKey = (key: string, value: unknown) => {
  const lower = key.toLowerCase()
  if (lower.includes('datetime')) return true
  return typeof value === 'string' && value.includes('T') && value.includes(':')
}

const isDateKey = (key: string) => {
  const lower = key.toLowerCase()
  return lower.endsWith('_date') || lower.includes('date')
}

const isTimeKey = (key: string) => {
  const lower = key.toLowerCase()
  return lower.endsWith('_time') || lower.includes('time')
}

const coerceBoolean = (value: unknown) => {
  if (typeof value === 'boolean') return value
  if (typeof value === 'number') return value === 1
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase()
    if (['true', 't', '1', 'yes', 'open'].includes(normalized)) return true
    if (['false', 'f', '0', 'no', 'closed'].includes(normalized)) return false
  }
  return false
}

const formatForInput = (value: unknown, key: string) => {
  if (value === null || value === undefined) return ''
  if (isDateTimeKey(key, value)) {
    const stringValue = String(value)
    if (stringValue.includes('T')) {
      return stringValue.replace('Z', '').slice(0, 16)
    }
    return stringValue
  }
  if (isDateKey(key)) {
    const stringValue = String(value)
    return stringValue.includes('T') ? stringValue.split('T')[0] : stringValue
  }
  if (isTimeKey(key)) {
    const stringValue = String(value)
    return stringValue.length >= 5 ? stringValue.slice(0, 5) : stringValue
  }
  if (isBooleanKey(key, value)) {
    return coerceBoolean(value)
  }
  return value
}

const formatForDatabase = (value: unknown, key: string, sampleValue: unknown) => {
  if (isBooleanKey(key, sampleValue)) {
    if (value === '' || value === null || value === undefined) return null
    return coerceBoolean(value)
  }
  if (isNumberKey(key, sampleValue)) {
    if (value === '' || value === null || value === undefined) return null
    const numeric = Number(value)
    return Number.isNaN(numeric) ? null : numeric
  }
  if (isDateKey(key) || isTimeKey(key) || isDateTimeKey(key, sampleValue)) {
    return value === '' ? null : value
  }
  return value === '' ? null : value
}

export default function AdminEventsPage() {
  const [editingEventId, setEditingEventId] = useState<string | null>(null)
  const [editDraft, setEditDraft] = useState<Record<string, any> | null>(null)
  const [rowError, setRowError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [sepaCsvLoading, setSepaCsvLoading] = useState(false)
  const [sepaCsvError, setSepaCsvError] = useState<string | null>(null)
  const [billingEventTypeFilter, setBillingEventTypeFilter] = useState('all')
  const [billingMonthFilter, setBillingMonthFilter] = useState('all')
  const [billingYearFilter, setBillingYearFilter] = useState('all')
  const [expandedBillingRowId, setExpandedBillingRowId] = useState<string | null>(null)
  const [billingPaidUpdatingId, setBillingPaidUpdatingId] = useState<string | null>(null)
  const [eventOverviewTypeFilter, setEventOverviewTypeFilter] = useState('weekly_training')
  const [eventOverviewVisibleCount, setEventOverviewVisibleCount] = useState(4)
  const [showClosedEvents, setShowClosedEvents] = useState(false)

  const [createDraft, setCreateDraft] = useState<Record<string, any>>({})
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)
  const [createSuccess, setCreateSuccess] = useState<string | null>(null)

  const {
    data: eventsData,
    error: eventsError,
    mutate: mutateEvents,
  } = useSWR('admin-events', async () => {
    const { data, error } = await supabase.from('events').select('*').order('created_at', {
      ascending: false,
    })
    if (error) throw error
    return data ?? []
  })

  const { data: registrationsData, error: registrationsError } = useSWR(
    'event-registrations',
    async () => {
      const { data, error } = await supabase.from('event_registrations').select('*')
      if (error) throw error
      return data ?? []
    }
  )

  const { data: participantsData, error: participantsError, mutate: mutateParticipants } =
    useSWR('event-registration-participants', async () => {
      const { data, error } = await supabase.from('event_registration_participants').select('*')
      if (error) throw error
      return data ?? []
    })

  const { data: sepaMandatesData, error: sepaMandatesError } = useSWR(
    'sepa-mandates',
    async () => {
      const { data, error } = await supabase
        .from('sepa_mandates')
        .select('*')
        .order('created_at', {
          ascending: false,
        })
      if (error) throw error
      return data ?? []
    }
  )

  const events = eventsData ?? []
  const sepaMandates = sepaMandatesData ?? []
  const sepaMandateKeys = useMemo(
    () => (sepaMandates[0] ? Object.keys(sepaMandates[0]) : []),
    [sepaMandates]
  )
  const sepaUserIdKey = useMemo(() => {
    if (sepaMandateKeys.includes('user_id')) return 'user_id'
    return (
      getKeyByHints(sepaMandateKeys, [
        'user_id',
        'userid',
        'user',
        'nutzer_id',
        'nutzerid',
        'nutzer',
      ]) ?? 'user_id'
    )
  }, [sepaMandateKeys])
  const sepaUserIds = useMemo(() => {
    const ids = new Set<string>()
    sepaMandates.forEach((mandate: any) => {
      const userIdValue = mandate?.user_id ?? mandate?.[sepaUserIdKey]
      if (userIdValue) ids.add(String(userIdValue))
    })
    return Array.from(ids)
  }, [sepaMandates, sepaUserIdKey])

  const { data: parentsData, error: parentsError } = useSWR(
    sepaUserIds.length ? ['parents-admin', ...sepaUserIds] : null,
    async () => {
      const { data, error } = await supabase
        .from('parents')
        .select('user_id, first_name, last_name, email, phone')
        .in('user_id', sepaUserIds)
        .is('deleted_at', null)
      if (error) throw error
      return data ?? []
    }
  )

  const { data: keepersData, error: keepersError } = useSWR(
    sepaUserIds.length ? ['keepers-admin', ...sepaUserIds] : null,
    async () => {
      const { data, error } = await supabase
        .from('keepers')
        .select('user_id, first_name, last_name, email, phone')
        .in('user_id', sepaUserIds)
        .is('deleted_at', null)
      if (error) throw error
      return data ?? []
    }
  )
  const { data: profilesData, error: profilesError } = useSWR(
    sepaUserIds.length ? ['profiles-admin', ...sepaUserIds] : null,
    async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, role, newsletter_opt_in')
        .in('id', sepaUserIds)
        .neq('role', 'admin')
      if (error) throw error
      return data ?? []
    }
  )
  const sepaStatusKey = useMemo(
    () => getKeyByHints(sepaMandateKeys, ['status', 'state']) ?? 'status',
    [sepaMandateKeys]
  )
  const sepaCreatedAtKey = useMemo(
    () =>
      getKeyByHints(sepaMandateKeys, [
        'updated_at',
        'updatedat',
        'created_at',
        'createdat',
        'mandate_created_at',
      ]) ?? 'created_at',
    [sepaMandateKeys]
  )
  const userNameById = useMemo(() => {
    const map = new Map<string, string>()
    const addName = (row: any) => {
      const userId = row?.user_id ?? row?.userid ?? row?.userId
      if (!userId) return
      const firstName = row?.first_name ?? row?.firstName ?? ''
      const lastName = row?.last_name ?? row?.lastName ?? ''
      const fullName = `${firstName} ${lastName}`.trim()
      if (!fullName) return
      map.set(String(userId), fullName)
    }
    parentsData?.forEach(addName)
    keepersData?.forEach(addName)
    return map
  }, [keepersData, parentsData])
  type UserDetail = { first_name: string; last_name: string; email: string; phone: string }
  const userDetailById = useMemo(() => {
    const map = new Map<string, UserDetail>()
    const setDetail = (row: any) => {
      const userId = row?.user_id ?? row?.userid ?? row?.userId
      if (!userId) return
      const key = String(userId)
      if (map.has(key)) return
      map.set(key, {
        first_name: String(row?.first_name ?? row?.firstName ?? '').trim(),
        last_name: String(row?.last_name ?? row?.lastName ?? '').trim(),
        email: String(row?.email ?? '').trim(),
        phone: String(row?.phone ?? '').trim(),
      })
    }
    parentsData?.forEach(setDetail)
    keepersData?.forEach(setDetail)
    return map
  }, [keepersData, parentsData])
  const userRoleById = useMemo(() => {
    const map = new Map<string, string>()
    profilesData?.forEach((profile: any) => {
      const id = profile?.id
      if (!id) return
      const role = String(profile?.role ?? '').trim()
      if (!role) return
      map.set(String(id), role)
    })
    return map
  }, [profilesData])
  const userNewsletterById = useMemo(() => {
    const map = new Map<string, boolean>()
    profilesData?.forEach((profile: any) => {
      const id = profile?.id
      if (id == null) return
      const val = profile?.newsletter_opt_in
      const optIn =
        typeof val === 'boolean' ? val : String(val ?? '').toLowerCase() === 'true' || val === 1
      map.set(String(id), optIn)
    })
    return map
  }, [profilesData])
  const sepaMandatesByUser = useMemo(() => {
    if (!sepaMandates.length) return []
    const latestByUser = new Map<string, any>()
    const getTimestamp = (value: unknown) => {
      if (value instanceof Date) return value.getTime()
      if (typeof value === 'number') return value
      if (typeof value === 'string') {
        const parsed = Date.parse(value)
        return Number.isNaN(parsed) ? 0 : parsed
      }
      return 0
    }

    sepaMandates.forEach((mandate: any, index) => {
      const userIdValue = mandate?.user_id ?? mandate?.[sepaUserIdKey]
      if (!userIdValue) return
      const key = String(userIdValue)
      const stamp = getTimestamp(mandate?.[sepaCreatedAtKey])
      const current = latestByUser.get(key)
      if (!current || stamp > current._stamp || (stamp === current._stamp && index > current._index)) {
        latestByUser.set(key, { ...mandate, _stamp: stamp, _index: index })
      }
    })

    return Array.from(latestByUser.values()).map(({ _stamp, _index, ...mandate }) => mandate)
  }, [sepaCreatedAtKey, sepaMandates, sepaUserIdKey])
  const sepaStatusStyles: Record<string, string> = {
    revoked: 'bg-rose-50 text-rose-600',
    pending: 'bg-blue-50 text-blue-600',
    active: 'bg-emerald-50 text-emerald-600',
    confirmed: 'bg-slate-100 text-slate-600',
    unknown: 'bg-slate-100 text-slate-500',
  }
  const eventColumns = useMemo(() => {
    if (!events.length) return []
    return Object.keys(events[0] ?? {}).filter((key) => !RESERVED_KEYS.has(key))
  }, [events])
  const eventPriceKey = useMemo(
    () => getKeyByHints(eventColumns, ['price', 'cost', 'amount', 'fee']) ?? 'price',
    [eventColumns]
  )
  const eventTypeKey = useMemo(
    () => getKeyByHints(eventColumns, ['event_type', 'eventtype', 'type']) ?? 'event_type',
    [eventColumns]
  )
  const eventStatusKey = useMemo(
    () => getKeyByHints(eventColumns, ['event_status', 'eventstatus']) ?? 'event_status',
    [eventColumns]
  )
  const eventDateKey = useMemo(
    () =>
      getKeyByHints(eventColumns, ['start_date', 'startdate', 'start', 'event_date', 'date']) ??
      'start_date',
    [eventColumns]
  )
  const eventEndDateKey = useMemo(
    () =>
      getKeyByHints(eventColumns, ['end_date', 'enddate', 'end', 'event_end_date']) ?? 'end_date',
    [eventColumns]
  )
  const eventsSortedByStartDate = useMemo(() => {
    if (!events.length || !eventDateKey) return [...events]
    return [...events].sort((a, b) => {
      const aVal = a[eventDateKey]
      const bVal = b[eventDateKey]
      const aTime = aVal ? new Date(aVal).getTime() : 0
      const bTime = bVal ? new Date(bVal).getTime() : 0
      return bTime - aTime
    })
  }, [events, eventDateKey])

  const eventOverviewTypeOptions = useMemo(() => {
    const types = new Set<string>(['weekly_training'])
    events.forEach((eventRow: any) => {
      const raw = eventTypeKey ? eventRow?.[eventTypeKey] : undefined
      const t = String(raw ?? '').trim()
      if (t) types.add(t)
    })
    return Array.from(types).sort((a, b) => a.localeCompare(b))
  }, [events, eventTypeKey])

  const eventsFilteredByType = useMemo(() => {
    if (eventOverviewTypeFilter === 'all') return eventsSortedByStartDate
    return eventsSortedByStartDate.filter((eventRow: any) => {
      const raw = eventTypeKey ? eventRow?.[eventTypeKey] : undefined
      return String(raw ?? '').trim() === eventOverviewTypeFilter
    })
  }, [eventsSortedByStartDate, eventOverviewTypeFilter, eventTypeKey])

  const eventsFilteredByClosed = useMemo(() => {
    if (showClosedEvents) return eventsFilteredByType
    return eventsFilteredByType.filter((eventRow: any) => {
      const status = eventStatusKey ? eventRow?.[eventStatusKey] : undefined
      return String(status ?? '').trim().toLowerCase() !== 'closed'
    })
  }, [eventsFilteredByType, showClosedEvents, eventStatusKey])

  const eventOverviewDisplayed = useMemo(
    () => eventsFilteredByClosed.slice(0, eventOverviewVisibleCount),
    [eventsFilteredByClosed, eventOverviewVisibleCount]
  )
  const eventOverviewHasMore =
    eventOverviewVisibleCount < eventsFilteredByClosed.length
  const editableColumns = useMemo(
    () => eventColumns.filter((key) => !HIDDEN_EVENT_FIELDS.has(normalizeKey(key))),
    [eventColumns]
  )
  const primaryTitleKey = useMemo(() => {
    if (!eventColumns.length) return ''
    return (
      getKeyByHints(eventColumns, ['title', 'name', 'event_name', 'eventtitle', 'event']) ??
      eventColumns[0] ??
      ''
    )
  }, [eventColumns])

  useEffect(() => {
    if (!eventColumns.length) return
    const seed = events[0] ?? {}
    setCreateDraft((prev) => {
      const next: Record<string, any> = {}
      eventColumns.forEach((key) => {
        const prevValue = prev[key]
        next[key] =
          prevValue !== undefined ? prevValue : formatForInput(seed[key], key)
      })
      return next
    })
  }, [eventColumns, events])

  const { data: allKeepersForBilling } = useSWR(
    'admin-keepers-billing',
    async () => {
      const { data, error } = await supabase
        .from('keepers')
        .select('id, user_id, first_name, last_name')
        .is('deleted_at', null)
      if (error) throw error
      return data ?? []
    }
  )

  const keeperIdToName = useMemo(() => {
    const map = new Map<string, string>()
    ;(allKeepersForBilling ?? []).forEach((row: any) => {
      const first = String(row?.first_name ?? row?.firstname ?? '').trim()
      const last = String(row?.last_name ?? row?.lastname ?? '').trim()
      const name = `${first} ${last}`.trim() || '—'
      if (row?.id != null) map.set(String(row.id), name)
      if (row?.user_id != null) map.set(String(row.user_id), name)
    })
    return map
  }, [allKeepersForBilling])

  const statusCountsByEventId = useMemo(() => {
    const map = new Map<string, StatusCounts>()
    if (!participantsData?.length) return map

    const registrationKeys = registrationsData?.[0]
      ? Object.keys(registrationsData[0])
      : []
    const participantKeys = participantsData?.[0] ? Object.keys(participantsData[0]) : []

    const registrationEventIdKey = getKeyByHints(registrationKeys, ['event_id', 'eventid'])
    const registrationIdKey =
      getKeyByHints(registrationKeys, ['id', 'registration_id', 'event_registration_id']) || 'id'

    const participantEventIdKey = getKeyByHints(participantKeys, ['event_id', 'eventid'])
    const participantRegistrationIdKey = getKeyByHints(participantKeys, [
      'event_registration_id',
      'registration_id',
      'event_reg_id',
    ])
    const statusKey = getKeyByHints(participantKeys, ['status'])

    const registrationIdToEventId = new Map<string, string>()
    if (registrationsData?.length && registrationEventIdKey) {
      registrationsData.forEach((registration: any) => {
        const registrationId = registration[registrationIdKey]
        const eventId = registration[registrationEventIdKey]
        if (registrationId !== undefined && eventId !== undefined) {
          registrationIdToEventId.set(String(registrationId), String(eventId))
        }
      })
    }

    participantsData.forEach((participant: any) => {
      if (!statusKey) return
      const status = String(participant[statusKey] ?? '').toLowerCase()
      if (status !== 'submitted' && status !== 'accepted' && status !== 'confirmed') return

      let eventId: unknown = participantEventIdKey
        ? participant[participantEventIdKey]
        : undefined
      if (!eventId && participantRegistrationIdKey) {
        const registrationId = participant[participantRegistrationIdKey]
        eventId = registrationIdToEventId.get(String(registrationId))
      }
      if (!eventId) return

      const key = String(eventId)
      const current = map.get(key) ?? { submitted: 0, accepted: 0, confirmed: 0 }
      if (status === 'submitted') current.submitted += 1
      if (status === 'accepted') current.accepted += 1
      if (status === 'confirmed') current.confirmed += 1
      map.set(key, current)
    })

    return map
  }, [participantsData, registrationsData])

  const billingRows = useMemo(() => {
    if (!registrationsData?.length || !participantsData?.length || !events.length) return []

    const registrationKeys = registrationsData?.[0] ? Object.keys(registrationsData[0]) : []
    const participantKeys = participantsData?.[0] ? Object.keys(participantsData[0]) : []

    const registrationEventIdKey = getKeyByHints(registrationKeys, ['event_id', 'eventid'])
    const registrationIdKey =
      getKeyByHints(registrationKeys, ['id', 'registration_id', 'event_registration_id']) || 'id'
    const registrationFirstNameKey = getKeyByHints(registrationKeys, [
      'contact_first_name',
      'firstname',
      'first_name',
      'first',
    ])
    const registrationLastNameKey = getKeyByHints(registrationKeys, [
      'contact_last_name',
      'lastname',
      'last_name',
      'last',
    ])
    const registrationCreatedByKey = getKeyByHints(registrationKeys, [
      'created_by_user_id',
      'created_by',
      'created_by_user',
      'created_by_id',
      'user_id',
    ])
    const registrationContactMailKey = getKeyByHints(registrationKeys, [
      'contact_mail',
      'contact_email',
      'email',
    ])

    const participantRegistrationIdKey = getKeyByHints(participantKeys, [
      'event_registration_id',
      'registration_id',
      'event_reg_id',
    ])
    const participantStatusKey = getKeyByHints(participantKeys, ['status'])
    const participantPriceKey = getKeyByHints(participantKeys, ['price', 'amount', 'fee']) ?? 'price'
    const participantKeeperIdKey = getKeyByHints(participantKeys, [
      'keeper_id',
      'keeperid',
      'keeper',
    ])
    const participantIdKey =
      getKeyByHints(participantKeys, ['id', 'participant_id', 'event_registration_participant_id']) ??
      'id'
    const participantIsPaidKey =
      getKeyByHints(participantKeys, ['is_paid', 'ispaid', 'paid']) ?? 'is_paid'
    const participantFirstNameKey = getKeyByHints(participantKeys, [
      'first_name',
      'firstname',
      'first',
    ])
    const participantLastNameKey = getKeyByHints(participantKeys, [
      'last_name',
      'lastname',
      'last',
    ])

    const registrationById = new Map<string, any>()
    registrationsData.forEach((reg: any) => {
      const id = reg?.[registrationIdKey]
      if (id !== undefined && id !== null) registrationById.set(String(id), reg)
    })

    const eventsById = new Map<string, any>()
    events.forEach((eventRow: any) => {
      if (eventRow?.id !== undefined && eventRow?.id !== null) {
        eventsById.set(String(eventRow.id), eventRow)
      }
    })

    const aggregated = new Map<
      string,
      {
        id: string
        createdById: string
        name: string
        monthKey: string
        monthLabel: string
        eventType: string
        amount: number
        details: Array<{
          participantId: string
          keeperName: string
          eventType: string
          startDate: string
          price: number
          isPaid: boolean
        }>
      }
    >()

    if (!participantStatusKey || !participantRegistrationIdKey) return []

    participantsData.forEach((participant: any) => {
      const status = String(
        participant?.[participantStatusKey as string] ?? ''
      ).toLowerCase()
      if (status !== 'confirmed') return
      const registrationId = participant?.[participantRegistrationIdKey as string]
      if (registrationId === undefined || registrationId === null) return
      const registration = registrationById.get(String(registrationId))
      if (!registration) return

      const eventId =
        registrationEventIdKey != null
          ? registration?.[registrationEventIdKey]
          : registration?.event_id
      if (!eventId) return
      const eventRow = eventsById.get(String(eventId))
      if (!eventRow) return

      const participantPriceRaw = participant?.[participantPriceKey]
      const participantPrice = Number.isFinite(Number(participantPriceRaw))
        ? Number(participantPriceRaw)
        : 0

      const createdById = registrationCreatedByKey
        ? registration?.[registrationCreatedByKey]
        : undefined
      const firstName = registrationFirstNameKey
        ? String(registration?.[registrationFirstNameKey] ?? '').trim()
        : ''
      const lastName = registrationLastNameKey
        ? String(registration?.[registrationLastNameKey] ?? '').trim()
        : ''
      const contactMailRaw = registrationContactMailKey
        ? String(registration?.[registrationContactMailKey] ?? '').trim()
        : ''
      const normalizedEmail = contactMailRaw.toLowerCase()

      let billingKey: string
      if (createdById) {
        billingKey = String(createdById)
      } else {
        const guestPart =
          normalizedEmail || firstName || lastName
            ? `${normalizedEmail || 'n/a'}-${firstName || ''}-${lastName || ''}`.trim()
            : `reg-${registrationId}`
        billingKey = `guest-${guestPart}`
      }

      const monthInfo = toMonthYear(eventRow?.[eventDateKey])
      if (!monthInfo) return

      const eventTypeRaw = eventTypeKey ? eventRow?.[eventTypeKey] : ''
      const eventType = String(eventTypeRaw ?? '').trim() || '—'
      const aggregateKey = `${billingKey}-${monthInfo.key}`

      const contactName = `${firstName} ${lastName}`.trim()
      const fullName =
        userNameById.get(String(billingKey)) ??
        (contactName || (createdById ? '—' : 'Gast'))

      const keeperId = participantKeeperIdKey
        ? participant?.[participantKeeperIdKey as string]
        : undefined
      let keeperName: string
      if (keeperId != null) {
        keeperName = keeperIdToName.get(String(keeperId)) ?? `ID ${keeperId}`
      } else {
        const partFirst = participantFirstNameKey
          ? String(participant?.[participantFirstNameKey] ?? '').trim()
          : ''
        const partLast = participantLastNameKey
          ? String(participant?.[participantLastNameKey] ?? '').trim()
          : ''
        const participantName = `${partFirst} ${partLast}`.trim()
        keeperName = participantName || contactName || '—'
      }

      const startDateRaw = eventRow?.[eventDateKey]
      const startDate =
        startDateRaw != null
          ? (typeof startDateRaw === 'string' && startDateRaw.length >= 10
              ? new Date(startDateRaw).toLocaleDateString('de-DE', {
                  day: '2-digit',
                  month: '2-digit',
                  year: 'numeric',
                })
              : String(startDateRaw))
          : '—'

      const participantId =
        participantIdKey != null ? participant?.[participantIdKey as string] : undefined
      const isPaid = Boolean(
        participantIsPaidKey != null && participant?.[participantIsPaidKey as string]
      )
      const detail = {
        participantId: participantId != null ? String(participantId) : '',
        keeperName,
        eventType,
        startDate,
        price: participantPrice,
        isPaid,
      }

      const current = aggregated.get(aggregateKey)
      if (current) {
        current.amount += participantPrice
        current.details.push(detail)
        if (current.name === '—' && fullName !== '—') {
          current.name = fullName
        }
      } else {
        aggregated.set(aggregateKey, {
          id: aggregateKey,
          createdById: billingKey,
          name: fullName,
          monthKey: monthInfo.key,
          monthLabel: monthInfo.label,
          eventType,
          amount: participantPrice,
          details: [detail],
        })
      }
    })

    return Array.from(aggregated.values()).sort((a, b) => {
      if (a.monthKey === b.monthKey) return a.name.localeCompare(b.name)
      return a.monthKey > b.monthKey ? -1 : 1
    })
  }, [
    eventDateKey,
    eventTypeKey,
    events,
    keeperIdToName,
    participantsData,
    registrationsData,
    userNameById,
  ])

  const billingFilters = useMemo(() => {
    const types = new Set<string>()
    const months = new Map<string, string>()
    const years = new Set<string>()

    billingRows.forEach((row: any) => {
      ;(row.details ?? []).forEach((d: any) => {
        if (d.eventType && d.eventType !== '—') types.add(d.eventType)
      })
      const [year, month] = String(row.monthKey ?? '').split('-')
      if (month) months.set(month, month)
      if (year) years.add(year)
    })

    return {
      types: Array.from(types).sort((a, b) => a.localeCompare(b)),
      months: Array.from(months.entries())
        .sort((a, b) => Number(a[0]) - Number(b[0]))
        .map(([value, label]) => ({ value, label })),
      years: Array.from(years).sort((a, b) => Number(b) - Number(a)),
    }
  }, [billingRows])

  const filteredBillingRows = useMemo(() => {
    return billingRows.filter((row: any) => {
      if (billingEventTypeFilter !== 'all') {
        const hasMatchingType = (row.details ?? []).some(
          (d: any) => d.eventType === billingEventTypeFilter
        )
        if (!hasMatchingType) return false
      }
      const [year, month] = String(row.monthKey ?? '').split('-')
      if (billingMonthFilter !== 'all' && month !== billingMonthFilter) return false
      if (billingYearFilter !== 'all' && year !== billingYearFilter) return false
      return true
    })
  }, [billingEventTypeFilter, billingMonthFilter, billingRows, billingYearFilter])

  const handleBillingPaidToggle = async (participantId: string, paid: boolean) => {
    if (!participantId) return
    setBillingPaidUpdatingId(participantId)
    const { error } = await supabase
      .from('event_registration_participants')
      .update({ is_paid: paid })
      .eq('id', participantId)
    setBillingPaidUpdatingId(null)
    if (error) {
      console.error('[AdminEvents] Update is_paid failed', error)
      return
    }
    await mutateParticipants()
  }

  if (
    eventsError ||
    registrationsError ||
    participantsError ||
    sepaMandatesError ||
    parentsError ||
    keepersError ||
    profilesError
  ) {
    console.error(
      '[AdminEvents] Load error',
      eventsError ||
        registrationsError ||
        participantsError ||
        sepaMandatesError ||
        parentsError ||
        keepersError ||
        profilesError
    )
    return <p className="p-6">Events konnten nicht geladen werden.</p>
  }

  const needSepaUserData = sepaUserIds.length > 0
  const hasSepaUserData =
    !needSepaUserData || (!!parentsData && !!keepersData && !!profilesData)
  if (
    !eventsData ||
    !registrationsData ||
    !participantsData ||
    !sepaMandatesData ||
    !hasSepaUserData
  ) {
    return <p className="p-6">Events werden geladen…</p>
  }

  const handleEdit = (eventRow: any) => {
    setEditingEventId(String(eventRow.id))
    const initialDraft: Record<string, any> = {}
    eventColumns.forEach((key) => {
      initialDraft[key] = formatForInput(eventRow[key], key)
    })
    setEditDraft(initialDraft)
    setRowError(null)
  }

  const handleCancel = () => {
    setEditingEventId(null)
    setEditDraft(null)
    setRowError(null)
  }

  const handleSave = async () => {
    if (!editingEventId || !editDraft) return
    setSaving(true)
    setRowError(null)

    const sampleRow = events.find((event: any) => String(event.id) === editingEventId) ?? {}
    const payload = editableColumns.reduce<Record<string, any>>((acc, key) => {
      acc[key] = formatForDatabase(editDraft[key], key, sampleRow[key])
      return acc
    }, {})

    const eventId =
      Number.isNaN(Number(editingEventId)) || editingEventId === ''
        ? editingEventId
        : Number(editingEventId)

    const { error } = await supabase.from('events').update(payload).eq('id', eventId)

    if (error) {
      console.error('[AdminEvents] Update error', error)
      setRowError(error.message ?? String(error))
      setSaving(false)
      return
    }

    await mutateEvents(
      (prev = []) =>
        prev.map((event: any) =>
          String(event.id) === String(eventId)
            ? {
                ...event,
                ...payload,
              }
            : event
        ),
      false
    )
    setEditingEventId(null)
    setEditDraft(null)
    setSaving(false)
  }

  const handleDelete = async (eventRow: any) => {
    const eventId = eventRow?.id
    if (!eventId) return
    const confirmed = window.confirm('Dieses Event wirklich löschen?')
    if (!confirmed) return
    setDeleteId(String(eventId))

    const { error } = await supabase.from('events').delete().eq('id', eventId)
    if (error) {
      console.error('[AdminEvents] Delete error', error)
      setRowError(error.message ?? String(error))
      setDeleteId(null)
      return
    }

    await mutateEvents((prev = []) => prev.filter((event: any) => event.id !== eventId), false)
    setDeleteId(null)
  }

  const handleCreate = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setCreateError(null)
    setCreateSuccess(null)

    if (!eventColumns.length) {
      setCreateError('Keine Event-Spalten gefunden. Bitte erstelle zuerst ein Event in Supabase.')
      return
    }

    const sampleRow = events[0] ?? {}
    const payload = editableColumns.reduce<Record<string, any>>((acc, key) => {
      acc[key] = formatForDatabase(createDraft[key], key, sampleRow[key])
      return acc
    }, {})

    setCreating(true)
    const { error } = await supabase.from('events').insert(payload)
    if (error) {
      console.error('[AdminEvents] Create error', error)
      setCreateError(error.message ?? String(error))
      setCreating(false)
      return
    }

    await mutateEvents()
    setCreateSuccess('Event wurde erstellt.')
    setCreating(false)
    setCreateDraft((prev) => {
      const reset: Record<string, any> = {}
      eventColumns.forEach((key) => {
        reset[key] = typeof prev[key] === 'boolean' ? false : ''
      })
      return reset
    })
  }

  const downloadSepaCsv = async () => {
    setSepaCsvError(null)
    setSepaCsvLoading(true)
    try {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
      const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      if (!supabaseUrl || !anonKey) {
        throw new Error('Supabase-Konfiguration fehlt.')
      }

      const {
        data: { session },
      } = await supabase.auth.getSession()
      if (!session?.access_token) throw new Error('Nicht eingeloggt.')

      const res = await fetch(`${supabaseUrl}/functions/v1/export-sepa-mandates-csv`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          apikey: anonKey,
          'Content-Type': 'application/json',
        },
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err?.error ?? 'Export fehlgeschlagen.')
      }

      const csv = await res.text()
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
      const url = URL.createObjectURL(blob)

      const a = document.createElement('a')
      a.href = url
      a.download = `sepa_mandates_${new Date().toISOString().slice(0, 10)}.csv`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Export fehlgeschlagen.'
      setSepaCsvError(message)
    } finally {
      setSepaCsvLoading(false)
    }
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-gradient-to-b from-slate-50 via-white to-indigo-50">
      <Navbar showLogout rightLinkHref="#new-event" rightLinkLabel="Event erstellen" />
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
              <CardTitle className="text-3xl md:text-4xl">Event-Übersicht</CardTitle>
              <CardDescription>
                Verwalte Events, aktualisiere Details und sieh die aktuellen Teilnehmerstände.
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <Separator />
            {!events.length ? (
              <p className="text-sm text-slate-500">
                Noch keine Events vorhanden. Lege dein erstes Event weiter unten an.
              </p>
            ) : (
              <>
                <div className="flex flex-wrap items-end gap-3">
                  <div className="space-y-1">
                    <Label htmlFor="event-overview-type" className="text-xs text-slate-500">
                      Events Filter:
                    </Label>
                    <select
                      id="event-overview-type"
                      className={inputClass}
                      value={eventOverviewTypeFilter}
                      onChange={(e) => setEventOverviewTypeFilter(e.target.value)}
                    >
                      <option value="all">Alle</option>
                      {eventOverviewTypeOptions.map((type) => (
                        <option key={type} value={type}>
                          {type}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <input
                    id="show-closed-events"
                    type="checkbox"
                    checked={showClosedEvents}
                    onChange={(e) => setShowClosedEvents(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <Label htmlFor="show-closed-events" className="cursor-pointer text-sm text-slate-600">
                    Geschlossene Events anzeigen
                  </Label>
                </div>
                <div className="grid gap-6 md:grid-cols-2">
                  {eventOverviewDisplayed.map((eventRow: any) => {
                  const isEditing = String(eventRow.id) === editingEventId
                  const counts = statusCountsByEventId.get(String(eventRow.id)) ?? {
                    submitted: 0,
                    accepted: 0,
                    confirmed: 0,
                  }
                  const endDateValue = eventRow[eventEndDateKey]
                  const endDatePassed =
                    endDateValue != null &&
                    endDateValue !== '' &&
                    new Date(endDateValue).getTime() < Date.now()
                  const detailColumns = primaryTitleKey
                    ? editableColumns.filter((key) => key !== primaryTitleKey)
                    : editableColumns
                  const titleValue = primaryTitleKey ? eventRow[primaryTitleKey] : undefined
                  const titleDisplay =
                    titleValue === null || titleValue === undefined || titleValue === ''
                      ? `Event #${eventRow.id}`
                      : String(titleValue)

                  return (
                    <Card
                      key={eventRow.id}
                      className="flex h-full flex-col border border-slate-200/80 bg-white/80 shadow-[0_20px_40px_rgba(15,23,42,0.08)]"
                    >
                      <CardHeader className="gap-4">
                        <div className="flex flex-wrap items-start justify-between gap-4">
                          <div className="space-y-2">
                            <div className="text-xs uppercase tracking-[0.2em] text-slate-400">
                              Event
                            </div>
                            {isEditing && primaryTitleKey ? (
                              <Input
                                value={editDraft?.[primaryTitleKey] ?? ''}
                                onChange={(event) =>
                                  setEditDraft((prev) =>
                                    prev
                                      ? { ...prev, [primaryTitleKey]: event.target.value }
                                      : prev
                                  )
                                }
                                className={`${inputClass} max-w-sm`}
                              />
                            ) : (
                              <CardTitle className="text-xl">{titleDisplay}</CardTitle>
                            )}
                          </div>
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                              Angemeldet: {counts.submitted}
                            </span>
                            <span className="inline-flex items-center rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-600">
                              Bestätigt: {counts.confirmed}
                            </span>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-5">
                        <div className="grid gap-3 sm:grid-cols-2">
                          {detailColumns.map((key) => {
                            const value = eventRow[key]
                            const isEmpty = value === null || value === undefined || value === ''
                            const displayValue = isEmpty ? '—' : String(value)
                            const inputType = isDateTimeKey(key, value)
                              ? 'datetime-local'
                              : isDateKey(key)
                                ? 'date'
                                : isTimeKey(key)
                                  ? 'time'
                                  : isNumberKey(key, value)
                                    ? 'number'
                                    : 'text'

                            return (
                              <div
                                key={key}
                                className={isEditing ? 'space-y-1' : 'flex flex-wrap items-center gap-2'}
                              >
                                <div
                                  className={
                                    isEditing
                                      ? 'text-xs font-semibold uppercase tracking-wide text-slate-400'
                                      : 'text-xs font-semibold uppercase tracking-wide text-slate-400'
                                  }
                                >
                                  {formatHeader(key)}
                                </div>
                                {isEditing ? (
                                  isEventStatusKey(key) ? (
                                    <select
                                      className={inputClass}
                                      value={
                                        (() => {
                                          const v = String(editDraft?.[key] ?? '')
                                          return (EVENT_STATUS_OPTIONS as readonly string[]).includes(
                                            v
                                          )
                                            ? v
                                            : EVENT_STATUS_OPTIONS[0]
                                        })()
                                      }
                                      onChange={(e) =>
                                        setEditDraft((prev) =>
                                          prev ? { ...prev, [key]: e.target.value } : prev
                                        )
                                      }
                                    >
                                      {EVENT_STATUS_OPTIONS.map((opt) => (
                                        <option key={opt} value={opt}>
                                          {opt}
                                        </option>
                                      ))}
                                    </select>
                                  ) : isBooleanKey(key, value) ? (
                                    <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2">
                                      <input
                                        type="checkbox"
                                        checked={coerceBoolean(editDraft?.[key])}
                                        onChange={(event) =>
                                          setEditDraft((prev) =>
                                            prev ? { ...prev, [key]: event.target.checked } : prev
                                          )
                                        }
                                        className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                                      />
                                      <span className="text-sm text-slate-600">Aktiv</span>
                                    </div>
                                  ) : TEXTAREA_HINTS.some((hint) =>
                                        key.toLowerCase().includes(hint)
                                      ) ? (
                                    <textarea
                                      className={`${inputClass} min-h-[90px]`}
                                      value={editDraft?.[key] ?? ''}
                                      onChange={(event) =>
                                        setEditDraft((prev) =>
                                          prev ? { ...prev, [key]: event.target.value } : prev
                                        )
                                      }
                                    />
                                  ) : (
                                    <input
                                      className={inputClass}
                                      type={inputType}
                                      value={editDraft?.[key] ?? ''}
                                      onChange={(event) =>
                                        setEditDraft((prev) =>
                                          prev ? { ...prev, [key]: event.target.value } : prev
                                        )
                                      }
                                    />
                                  )
                                ) : isBooleanKey(key, value) ? (
                                  <span className="text-sm font-medium text-slate-700">
                                    {isEmpty ? '—' : coerceBoolean(value) ? 'Ja' : 'Nein'}
                                  </span>
                                ) : (
                                  <span className="text-sm text-slate-700">{displayValue}</span>
                                )}
                              </div>
                            )
                          })}
                        </div>
                      </CardContent>
                      <CardFooter className="mt-auto">
                        {isEditing ? (
                          <div className="flex flex-wrap items-center gap-2">
                            <Button size="sm" onClick={handleSave} disabled={saving}>
                              Speichern
                            </Button>
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={handleCancel}
                              disabled={saving}
                            >
                              Abbrechen
                            </Button>
                            {rowError ? (
                              <span className="text-xs text-rose-600">{rowError}</span>
                            ) : null}
                          </div>
                        ) : (
                          <div className="flex flex-row flex-wrap items-center gap-2">
                            <Button
                              as="a"
                              size="sm"
                              variant="outline"
                              className="whitespace-nowrap"
                              href={`/admin/events/${eventRow.id}`}
                            >
                              Details
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="whitespace-nowrap"
                              onClick={() => handleEdit(eventRow)}
                              disabled={editingEventId !== null}
                            >
                              Bearbeiten
                            </Button>
                            {!endDatePassed && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="whitespace-nowrap border-rose-200 text-rose-600 hover:bg-rose-50"
                                onClick={() => handleDelete(eventRow)}
                                disabled={deleteId !== null}
                              >
                                {deleteId === String(eventRow.id) ? 'Löscht...' : 'Löschen'}
                              </Button>
                            )}
                          </div>
                        )}
                      </CardFooter>
                    </Card>
                  )
                  })}
                </div>
                {eventOverviewHasMore && (
                  <div className="flex justify-center pt-2">
                    <Button
                      variant="outline"
                      onClick={() =>
                        setEventOverviewVisibleCount((prev) =>
                          Math.min(prev + 4, eventsFilteredByClosed.length)
                        )
                      }
                    >
                      Mehr anzeigen
                    </Button>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>

        <Card className="border-white/60 bg-white/80 shadow-[0_30px_60px_rgba(15,23,42,0.12)] backdrop-blur-xl">
          <CardHeader className="gap-3">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="space-y-2">
                <CardTitle className="text-2xl md:text-3xl">User und SEPA-Mandate</CardTitle>
                <CardDescription>Übersicht der hinterlegten SEPA-Mandate.</CardDescription>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={downloadSepaCsv}
                disabled={sepaCsvLoading}
              >
                {sepaCsvLoading ? 'Exportiere CSV...' : 'CSV exportieren'}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <Separator />
            {sepaCsvError ? (
              <Alert className="border-rose-200 bg-rose-50 text-rose-700">
                <AlertTitle>Export fehlgeschlagen</AlertTitle>
                <AlertDescription>{sepaCsvError}</AlertDescription>
              </Alert>
            ) : null}
            {!sepaMandatesByUser.length ? (
              <p className="text-sm text-slate-500">Keine SEPA-Mandate vorhanden.</p>
            ) : (
              <div className="overflow-x-auto rounded-2xl border border-slate-200/80 bg-white/80">
                <table className="w-full min-w-[720px] table-auto text-left">
                  <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    <tr>
                      <th scope="col" className="px-4 py-3">
                        Name
                      </th>
                      <th scope="col" className="px-4 py-3">
                        E-Mail
                      </th>
                      <th scope="col" className="px-4 py-3">
                        Telefon
                      </th>
                      <th scope="col" className="px-4 py-3">
                        Rolle
                      </th>
                      <th scope="col" className="px-4 py-3">
                        Newsletter
                      </th>
                      <th scope="col" className="px-4 py-3">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {sepaMandatesByUser.map((mandate: any) => {
                      const userIdValue = mandate?.user_id ?? mandate?.[sepaUserIdKey]
                      const detail = userIdValue
                        ? userDetailById.get(String(userIdValue))
                        : undefined
                      const roleLabel = userIdValue
                        ? userRoleById.get(String(userIdValue)) ?? '—'
                        : '—'
                      const newsletterOptIn = userIdValue
                        ? userNewsletterById.get(String(userIdValue))
                        : undefined
                      const newsletterLabel =
                        newsletterOptIn === undefined ? '—' : newsletterOptIn ? 'Ja' : 'Nein'
                      const rawStatus = String(mandate?.[sepaStatusKey] ?? '').toLowerCase()
                      const normalizedStatus =
                        rawStatus === 'pending' ||
                        rawStatus === 'confirmed' ||
                        rawStatus === 'revoked' ||
                        rawStatus === 'active'
                          ? rawStatus
                          : 'unknown'
                      const statusLabel = (() => {
                        if (normalizedStatus === 'unknown') return 'Unbekannt'
                        if (normalizedStatus === 'pending') return 'Ausstehend'
                        if (normalizedStatus === 'confirmed') return 'Bestätigt'
                        if (normalizedStatus === 'revoked') return 'Widerrufen'
                        if (normalizedStatus === 'active') return 'Aktiv'
                        return 'Unbekannt'
                      })()

                      const displayName =
                        detail?.first_name != null || detail?.last_name != null
                          ? `${detail?.first_name ?? ''} ${detail?.last_name ?? ''}`.trim() || '—'
                          : '—'

                      return (
                        <tr key={mandate?.id ?? `${userIdValue ?? 'unknown'}-${statusLabel}`}>
                          <td className="px-4 py-3 text-sm text-slate-700">{displayName}</td>
                          <td className="px-4 py-3 text-sm text-slate-700">
                            {detail?.email ?? '—'}
                          </td>
                          <td className="px-4 py-3 text-sm text-slate-700">
                            {detail?.phone ?? '—'}
                          </td>
                          <td className="px-4 py-3 text-sm text-slate-600">{roleLabel}</td>
                          <td className="px-4 py-3 text-sm text-slate-600">
                            {newsletterLabel}
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={`inline-flex w-fit items-center rounded-full px-3 py-1 text-xs font-semibold ${sepaStatusStyles[normalizedStatus]}`}
                            >
                              {statusLabel}
                            </span>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-white/60 bg-white/80 shadow-[0_30px_60px_rgba(15,23,42,0.12)] backdrop-blur-xl">
          <CardHeader className="gap-2">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="space-y-2">
                <CardTitle className="text-2xl md:text-3xl">Abrechnungen</CardTitle>
                <CardDescription>
                  Monatliche Summen der bestätigten Event-Teilnahmen je Registrierung.
                </CardDescription>
              </div>
              <div className="flex flex-wrap items-end gap-3">
                <div className="space-y-1">
                  <Label htmlFor="billing-event-type" className="text-xs text-slate-500">
                    Event-Typ
                  </Label>
                  <select
                    id="billing-event-type"
                    className={inputClass}
                    value={billingEventTypeFilter}
                    onChange={(event) => setBillingEventTypeFilter(event.target.value)}
                  >
                    <option value="all">Alle</option>
                    {billingFilters.types.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <Label htmlFor="billing-month" className="text-xs text-slate-500">
                    Monat
                  </Label>
                  <select
                    id="billing-month"
                    className={inputClass}
                    value={billingMonthFilter}
                    onChange={(event) => setBillingMonthFilter(event.target.value)}
                  >
                    <option value="all">Alle</option>
                    {billingFilters.months.map((month) => (
                      <option key={month.value} value={month.value}>
                        {month.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <Label htmlFor="billing-year" className="text-xs text-slate-500">
                    Jahr
                  </Label>
                  <select
                    id="billing-year"
                    className={inputClass}
                    value={billingYearFilter}
                    onChange={(event) => setBillingYearFilter(event.target.value)}
                  >
                    <option value="all">Alle</option>
                    {billingFilters.years.map((year) => (
                      <option key={year} value={year}>
                        {year}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <Separator />
            {!billingRows.length ? (
              <p className="text-sm text-slate-500">Keine Abrechnungen gefunden.</p>
            ) : filteredBillingRows.length === 0 ? (
              <p className="text-sm text-slate-500">
                Keine Abrechnungen für die aktuellen Filter.
              </p>
            ) : (
              <div className="overflow-x-auto rounded-2xl border border-slate-200/80 bg-white/80">
                <table className="w-full min-w-[520px] table-auto text-left">
                  <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    <tr>
                      <th scope="col" className="w-10 px-2 py-3" aria-label="Aufklappen" />
                      <th scope="col" className="px-4 py-3">
                        Name
                      </th>
                      <th scope="col" className="px-4 py-3">
                        Monat-Jahr
                      </th>
                      <th scope="col" className="px-4 py-3 text-right">
                        Betrag
                      </th>
                      <th scope="col" className="w-20 px-4 py-3 text-center">
                        Bezahlt
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredBillingRows.map((row: any) => {
                      const amountLabel = new Intl.NumberFormat('de-DE', {
                        style: 'currency',
                        currency: 'EUR',
                      }).format(Number(row.amount ?? 0))
                      const isExpanded = expandedBillingRowId === row.id
                      const details = row.details ?? []
                      const allPaid =
                        details.length > 0 && details.every((d: any) => Boolean(d.isPaid))

                      return (
                        <Fragment key={row.id}>
                          <tr
                            className={isExpanded ? 'bg-slate-50/50' : ''}
                          >
                            <td className="w-10 px-2 py-3">
                              <button
                                type="button"
                                onClick={() =>
                                  setExpandedBillingRowId((prev) =>
                                    prev === row.id ? null : row.id
                                  )
                                }
                                className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-200/80 hover:text-slate-700"
                                aria-expanded={isExpanded}
                                aria-label={isExpanded ? 'Zuklappen' : 'Details anzeigen'}
                                title={isExpanded ? 'Zuklappen' : 'Details anzeigen'}
                              >
                                <svg
                                  className={`h-4 w-4 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M9 5l7 7-7 7"
                                  />
                                </svg>
                              </button>
                            </td>
                            <td className="px-4 py-3 text-sm text-slate-700">{row.name}</td>
                            <td className="px-4 py-3 text-sm text-slate-600">{row.monthLabel}</td>
                            <td className="px-4 py-3 text-right text-sm font-semibold text-slate-800">
                              {amountLabel}
                            </td>
                            <td className="w-20 px-4 py-3 text-center">
                              {details.length === 0 ? (
                                <span className="text-slate-400">—</span>
                              ) : allPaid ? (
                                <span
                                  className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-emerald-100 text-emerald-600"
                                  title="Alle bezahlt"
                                >
                                  <svg
                                    className="h-4 w-4"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth={2}
                                      d="M5 13l4 4L19 7"
                                    />
                                  </svg>
                                </span>
                              ) : (
                                <span
                                  className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-rose-100 text-rose-600"
                                  title="Noch offen"
                                >
                                  <svg
                                    className="h-4 w-4"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth={2}
                                      d="M6 18L18 6M6 6l12 12"
                                    />
                                  </svg>
                                </span>
                              )}
                            </td>
                          </tr>
                          {isExpanded && details.length > 0 && (
                            <tr key={`${row.id}-details`}>
                              <td colSpan={5} className="bg-slate-50/80 px-4 py-3">
                                <div className="rounded-xl border border-slate-200/80 bg-white p-3">
                                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                                    Einzelpositionen
                                  </p>
                                  <table className="w-full text-left text-sm">
                                    <thead>
                                      <tr className="border-b border-slate-200 text-xs text-slate-500">
                                        <th className="pb-2 pr-3 font-medium">Keeper</th>
                                        <th className="pb-2 pr-3 font-medium">Training / Event</th>
                                        <th className="pb-2 pr-3 font-medium">Datum</th>
                                        <th className="pb-2 pr-3 text-right font-medium">Preis</th>
                                        <th className="w-16 pb-2 pl-3 text-center font-medium">
                                          Bezahlt
                                        </th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                      {details.map((d: any, idx: number) => {
                                        const isUpdating =
                                          billingPaidUpdatingId === d.participantId
                                        return (
                                          <tr key={d.participantId || `${row.id}-d-${idx}`}>
                                            <td className="py-1.5 pr-3 text-slate-700">
                                              {d.keeperName}
                                            </td>
                                            <td className="py-1.5 pr-3 text-slate-600">
                                              {d.eventType}
                                            </td>
                                            <td className="py-1.5 pr-3 text-slate-600">
                                              {d.startDate}
                                            </td>
                                            <td className="py-1.5 pr-3 text-right font-medium text-slate-800">
                                              {new Intl.NumberFormat('de-DE', {
                                                style: 'currency',
                                                currency: 'EUR',
                                              }).format(Number(d.price ?? 0))}
                                            </td>
                                            <td className="w-16 py-1.5 pl-3 text-center">
                                              {d.participantId ? (
                                                <input
                                                  type="checkbox"
                                                  checked={Boolean(d.isPaid)}
                                                  disabled={isUpdating}
                                                  onChange={(e) =>
                                                    handleBillingPaidToggle(
                                                      d.participantId,
                                                      e.target.checked
                                                    )
                                                  }
                                                  className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                                                  aria-label={`Bezahlt: ${d.keeperName}`}
                                                />
                                              ) : (
                                                <span className="text-slate-400">—</span>
                                              )}
                                            </td>
                                          </tr>
                                        )
                                      })}
                                    </tbody>
                                  </table>
                                </div>
                              </td>
                            </tr>
                          )}
                        </Fragment>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        <Card
          id="new-event"
          className="border-white/60 bg-white/80 shadow-[0_30px_60px_rgba(15,23,42,0.12)] backdrop-blur-xl"
        >
          <CardHeader className="gap-2">
            <CardTitle className="text-2xl md:text-3xl">Neues Event erstellen</CardTitle>
            <CardDescription>
              Fülle die wichtigsten Felder aus. Die Spalten basieren auf deiner Events-Tabelle.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <Separator />

            {createError && (
              <Alert className="border-rose-200 bg-rose-50 text-rose-700">
                <AlertTitle>Fehler</AlertTitle>
                <AlertDescription>{createError}</AlertDescription>
              </Alert>
            )}
            {createSuccess && (
              <Alert className="border-emerald-200 bg-emerald-50 text-emerald-700">
                <AlertTitle>Erfolg</AlertTitle>
                <AlertDescription>{createSuccess}</AlertDescription>
              </Alert>
            )}

            <form onSubmit={handleCreate} className="space-y-6">
              <fieldset disabled={creating} className="grid gap-4 md:grid-cols-2">
                {editableColumns.map((key) => {
                  const seedValue = events[0]?.[key]
                  const isTextArea = TEXTAREA_HINTS.some((hint) =>
                    key.toLowerCase().includes(hint)
                  )
                  const inputType = isDateTimeKey(key, seedValue)
                    ? 'datetime-local'
                    : isDateKey(key)
                      ? 'date'
                      : isTimeKey(key)
                        ? 'time'
                        : isNumberKey(key, seedValue)
                          ? 'number'
                          : 'text'

                  return (
                    <div key={key} className={`space-y-1 ${isTextArea ? 'md:col-span-2' : ''}`}>
                      <Label htmlFor={`create-${key}`}>{formatHeader(key)}</Label>
                      {isEventStatusKey(key) ? (
                        <select
                          id={`create-${key}`}
                          className={inputClass}
                          value={
                            (() => {
                              const v = String(createDraft[key] ?? '')
                              return (
                                EVENT_STATUS_OPTIONS as readonly string[]
                              ).includes(v)
                                ? v
                                : EVENT_STATUS_OPTIONS[0]
                            })()
                          }
                          onChange={(event) =>
                            setCreateDraft((prev) => ({ ...prev, [key]: event.target.value }))
                          }
                        >
                          {EVENT_STATUS_OPTIONS.map((opt) => (
                            <option key={opt} value={opt}>
                              {opt}
                            </option>
                          ))}
                        </select>
                      ) : isEventTypeKey(key) ? (
                        <select
                          id={`create-${key}`}
                          className={inputClass}
                          value={
                            (() => {
                              const v = String(createDraft[key] ?? '')
                              return (EVENT_TYPE_OPTIONS as readonly string[]).includes(v)
                                ? v
                                : EVENT_TYPE_OPTIONS[0]
                            })()
                          }
                          onChange={(event) =>
                            setCreateDraft((prev) => ({ ...prev, [key]: event.target.value }))
                          }
                        >
                          {EVENT_TYPE_OPTIONS.map((opt) => (
                            <option key={opt} value={opt}>
                              {opt}
                            </option>
                          ))}
                        </select>
                      ) : isBooleanKey(key, seedValue) ? (
                        <div className="flex items-center gap-3">
                          <input
                            id={`create-${key}`}
                            type="checkbox"
                            checked={coerceBoolean(createDraft[key])}
                            onChange={(event) =>
                              setCreateDraft((prev) => ({
                                ...prev,
                                [key]: event.target.checked,
                              }))
                            }
                            className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                          />
                          <span className="text-sm text-slate-600">Aktiv</span>
                        </div>
                      ) : isTextArea ? (
                        <textarea
                          id={`create-${key}`}
                          className={`${inputClass} min-h-[120px]`}
                          value={createDraft[key] ?? ''}
                          onChange={(event) =>
                            setCreateDraft((prev) => ({ ...prev, [key]: event.target.value }))
                          }
                        />
                      ) : (
                        <Input
                          id={`create-${key}`}
                          type={inputType}
                          value={createDraft[key] ?? ''}
                          onChange={(event) =>
                            setCreateDraft((prev) => ({ ...prev, [key]: event.target.value }))
                          }
                          className={inputClass}
                        />
                      )}
                    </div>
                  )
                })}
              </fieldset>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-xs text-slate-500">
                  Pflichtfelder werden serverseitig geprüft. Bitte vollständig ausfüllen.
                </p>
                <Button type="submit" disabled={creating || !editableColumns.length}>
                  {creating ? 'Erstelle Event...' : 'Event erstellen'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </main>
  )
}
