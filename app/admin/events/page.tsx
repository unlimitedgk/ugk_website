'use client'

import { useEffect, useMemo, useState } from 'react'
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
  'eventtype',
])

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

  const { data: participantsData, error: participantsError } = useSWR(
    'event-registration-participants',
    async () => {
      const { data, error } = await supabase.from('event_registration_participants').select('*')
      if (error) throw error
      return data ?? []
    }
  )

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
        .select('user_id, first_name, last_name')
        .in('user_id', sepaUserIds)
      if (error) throw error
      return data ?? []
    }
  )

  const { data: keepersData, error: keepersError } = useSWR(
    sepaUserIds.length ? ['keepers-admin', ...sepaUserIds] : null,
    async () => {
      const { data, error } = await supabase
        .from('keepers')
        .select('user_id, first_name, last_name')
        .in('user_id', sepaUserIds)
      if (error) throw error
      return data ?? []
    }
  )
  const { data: profilesData, error: profilesError } = useSWR(
    sepaUserIds.length ? ['profiles-admin', ...sepaUserIds] : null,
    async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, role')
        .in('id', sepaUserIds)
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
  const eventDateKey = useMemo(
    () =>
      getKeyByHints(eventColumns, ['start_date', 'startdate', 'start', 'event_date', 'date']) ??
      'start_date',
    [eventColumns]
  )
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

    const participantRegistrationIdKey = getKeyByHints(participantKeys, [
      'event_registration_id',
      'registration_id',
      'event_reg_id',
    ])
    const participantStatusKey = getKeyByHints(participantKeys, ['status'])

    const eventsById = new Map<string, any>()
    events.forEach((eventRow: any) => {
      if (eventRow?.id !== undefined && eventRow?.id !== null) {
        eventsById.set(String(eventRow.id), eventRow)
      }
    })

    const confirmedByRegistration = new Map<string, number>()
    participantsData.forEach((participant: any) => {
      if (!participantStatusKey) return
      const status = String(participant?.[participantStatusKey] ?? '').toLowerCase()
      if (status !== 'confirmed') return
      if (!participantRegistrationIdKey) return
      const registrationId = participant?.[participantRegistrationIdKey]
      if (registrationId === undefined || registrationId === null) return
      const key = String(registrationId)
      confirmedByRegistration.set(key, (confirmedByRegistration.get(key) ?? 0) + 1)
    })

    const aggregated = new Map<string, any>()
    registrationsData.forEach((registration: any) => {
      const registrationId = registration?.[registrationIdKey]
      if (registrationId === undefined || registrationId === null) return

      const createdById = registrationCreatedByKey
        ? registration?.[registrationCreatedByKey]
        : undefined
      if (!createdById) return

      const eventId = registrationEventIdKey
        ? registration?.[registrationEventIdKey]
        : registration?.event_id
      if (!eventId) return
      const eventRow = eventsById.get(String(eventId))
      if (!eventRow) return

      const confirmedCount = confirmedByRegistration.get(String(registrationId)) ?? 0
      if (confirmedCount <= 0) return

      const priceRaw = eventRow?.[eventPriceKey]
      const price = Number(priceRaw)
      if (!Number.isFinite(price) || price <= 0) return

      const monthInfo = toMonthYear(eventRow?.[eventDateKey])
      if (!monthInfo) return

      const firstName = registrationFirstNameKey
        ? String(registration?.[registrationFirstNameKey] ?? '').trim()
        : ''
      const lastName = registrationLastNameKey
        ? String(registration?.[registrationLastNameKey] ?? '').trim()
        : ''
      const contactName = `${firstName} ${lastName}`.trim()
      const fallbackName =
        userNameById.get(String(createdById)) ?? (contactName ? contactName : '—')
      const fullName = contactName || fallbackName
      const eventTypeRaw = eventTypeKey ? eventRow?.[eventTypeKey] : ''
      const eventType = String(eventTypeRaw ?? '').trim() || '—'
      const amount = price * confirmedCount

      const aggregateKey = `${createdById}-${monthInfo.key}-${eventType}`
      const current = aggregated.get(aggregateKey)
      if (current) {
        current.amount += amount
        if (current.name === '—' && fullName !== '—') {
          current.name = fullName
        }
        return
      }

      aggregated.set(aggregateKey, {
        id: aggregateKey,
        createdById: String(createdById),
        name: fullName,
        monthKey: monthInfo.key,
        monthLabel: monthInfo.label,
        eventType,
        amount,
      })
    })

    return Array.from(aggregated.values()).sort((a, b) => {
      if (a.monthKey === b.monthKey) return a.name.localeCompare(b.name)
      return a.monthKey > b.monthKey ? -1 : 1
    })
  }, [events, eventDateKey, eventPriceKey, eventTypeKey, participantsData, registrationsData])

  const billingFilters = useMemo(() => {
    const types = new Set<string>()
    const months = new Map<string, string>()
    const years = new Set<string>()

    billingRows.forEach((row: any) => {
      if (row.eventType && row.eventType !== '—') types.add(row.eventType)
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
      if (billingEventTypeFilter !== 'all' && row.eventType !== billingEventTypeFilter) {
        return false
      }
      const [year, month] = String(row.monthKey ?? '').split('-')
      if (billingMonthFilter !== 'all' && month !== billingMonthFilter) return false
      if (billingYearFilter !== 'all' && year !== billingYearFilter) return false
      return true
    })
  }, [billingEventTypeFilter, billingMonthFilter, billingRows, billingYearFilter])

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
    const payload = eventColumns.reduce<Record<string, any>>((acc, key) => {
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
              <div className="grid gap-6 md:grid-cols-2">
                {events.map((eventRow: any) => {
                  const isEditing = String(eventRow.id) === editingEventId
                  const counts = statusCountsByEventId.get(String(eventRow.id)) ?? {
                    submitted: 0,
                    accepted: 0,
                    confirmed: 0,
                  }
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
                              Eingereicht: {counts.submitted}
                            </span>
                            <span className="inline-flex items-center rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-600">
                              Akzeptiert: {counts.accepted}
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
                                  isBooleanKey(key, value) ? (
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
                            <Button
                              size="sm"
                              variant="outline"
                              className="whitespace-nowrap border-rose-200 text-rose-600 hover:bg-rose-50"
                              onClick={() => handleDelete(eventRow)}
                              disabled={deleteId !== null}
                            >
                              {deleteId === String(eventRow.id) ? 'Löscht...' : 'Löschen'}
                            </Button>
                          </div>
                        )}
                      </CardFooter>
                    </Card>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-white/60 bg-white/80 shadow-[0_30px_60px_rgba(15,23,42,0.12)] backdrop-blur-xl">
          <CardHeader className="gap-3">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="space-y-2">
                <CardTitle className="text-2xl md:text-3xl">SEPA-Mandate</CardTitle>
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
                <table className="w-full min-w-[520px] table-auto text-left">
                  <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    <tr>
                      <th scope="col" className="px-4 py-3">
                        Nutzer:in
                      </th>
                      <th scope="col" className="px-4 py-3">
                        Status
                      </th>
                      <th scope="col" className="px-4 py-3">
                        Rolle
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {sepaMandatesByUser.map((mandate: any) => {
                      const userIdValue = mandate?.user_id ?? mandate?.[sepaUserIdKey]
                      const userName = userIdValue
                        ? userNameById.get(String(userIdValue))
                        : undefined
                      const displayName = userName ?? 'Unbekannt'
                      const roleLabel = userIdValue
                        ? userRoleById.get(String(userIdValue)) ?? '—'
                        : '—'
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

                      return (
                        <tr key={mandate?.id ?? `${userIdValue ?? 'unknown'}-${statusLabel}`}>
                          <td className="px-4 py-3 text-sm text-slate-700">{displayName}</td>
                          <td className="px-4 py-3">
                            <span
                              className={`inline-flex w-fit items-center rounded-full px-3 py-1 text-xs font-semibold ${sepaStatusStyles[normalizedStatus]}`}
                            >
                              {statusLabel}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm text-slate-600">{roleLabel}</td>
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
                      <th scope="col" className="px-4 py-3">
                        Name
                      </th>
                      <th scope="col" className="px-4 py-3">
                        Monat-Jahr
                      </th>
                      <th scope="col" className="px-4 py-3 text-right">
                        Betrag
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredBillingRows.map((row: any) => {
                      const amountLabel = new Intl.NumberFormat('de-DE', {
                        style: 'currency',
                        currency: 'EUR',
                      }).format(Number(row.amount ?? 0))

                      return (
                        <tr key={row.id}>
                          <td className="px-4 py-3 text-sm text-slate-700">{row.name}</td>
                          <td className="px-4 py-3 text-sm text-slate-600">{row.monthLabel}</td>
                          <td className="px-4 py-3 text-right text-sm font-semibold text-slate-800">
                            {amountLabel}
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
                {eventColumns.map((key) => {
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
                      {isBooleanKey(key, seedValue) ? (
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
                <Button type="submit" disabled={creating || !eventColumns.length}>
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
