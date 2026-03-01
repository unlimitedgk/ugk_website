'use client'

import { useEffect, useState } from 'react'
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
import { supabase, clearInvalidRefreshToken } from '@/lib/supabaseClient'
import { formatLocation } from '@/lib/formatEvent'



type ParentForm = {
  firstName: string
  lastName: string
  phone: string
}

type ChildForm = {
  id?: string
  tempId: string
  firstName: string
  lastName: string
  birthDate: string
  gender: string
  email: string
  phone: string
  team: string
  healthInsuranceNumber: string
  medication: string
  gloveSize: string
  shirtSize: string
  diet: string
  relationship: string
  isPrimary: boolean
}

type TrainingEvent = {
  id: string
  title: string
  description: string | null
  startDate: string
  startTime: string
  endTime: string
  price: number | null
  locationName: string | null
  openForRegistration: boolean
}

type CampEvent = {
  id: string
  title: string
  description: string | null
  startDate: string
  endDate: string
  startTime: string
  endTime: string
  price: number | null
  locationName: string | null
  street?: string | null
  postalCode?: string | null
  city?: string | null
  locationNotes?: string | null
  openForRegistration: boolean
}

type EventRegistrationStatus =
  | 'submitted'
  | 'accepted'
  | 'confirmed'
  | 'cancelled'
  | string

type MandateState = 'none' | 'pending' | 'active' | 'revoked'

export default function ParentLandingPage() {
  const [form, setForm] = useState<ParentForm>({
    firstName: '',
    lastName: '',
    phone: '',
  })
  const [parentId, setParentId] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [initialLoading, setInitialLoading] = useState(true)
  const [userEmail, setUserEmail] = useState<string>('')
  const [newsletterOptIn, setNewsletterOptIn] = useState(false)
  const [mediaCreationAccepted, setMediaCreationAccepted] = useState(false)
  const [parentSaveStatus, setParentSaveStatus] = useState<{
    type: 'success' | 'error'
    text: string
  } | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [children, setChildren] = useState<ChildForm[]>([])
  const [childrenLoading, setChildrenLoading] = useState(false)
  const [weeklyEvents, setWeeklyEvents] = useState<TrainingEvent[]>([])
  const [weeklyEventsLoading, setWeeklyEventsLoading] = useState(false)
  const [weeklySelections, setWeeklySelections] = useState<
    Record<string, Record<string, boolean>>
  >({})
  const [weeklyRegistrationStatus, setWeeklyRegistrationStatus] = useState<
    Record<string, Record<string, EventRegistrationStatus>>
  >({})
  const [weeklySaving, setWeeklySaving] = useState(false)
  const [weeklySaveStatus, setWeeklySaveStatus] = useState<{
    type: 'success' | 'error'
    text: string
  } | null>(null)
  const [campEvents, setCampEvents] = useState<CampEvent[]>([])
  const [campEventsLoading, setCampEventsLoading] = useState(false)
  const [campSelections, setCampSelections] = useState<
    Record<string, Record<string, boolean>>
  >({})
  const [campRegistrationStatus, setCampRegistrationStatus] = useState<
    Record<string, Record<string, EventRegistrationStatus>>
  >({})
  const [campSaving, setCampSaving] = useState(false)
  const [campSaveStatus, setCampSaveStatus] = useState<{
    type: 'success' | 'error'
    text: string
  } | null>(null)
  const [sepaStatus, setSepaStatus] = useState<MandateState>('none')
  const [sepaPreviewText, setSepaPreviewText] = useState('')
  const [sepaReference, setSepaReference] = useState<string | null>(null)
  const [sepaHolderName, setSepaHolderName] = useState('')
  const [sepaIban, setSepaIban] = useState('')
  const [sepaConsent, setSepaConsent] = useState(false)
  const [sepaError, setSepaError] = useState<string | null>(null)
  const [sepaInfo, setSepaInfo] = useState<string | null>(null)
  const [sepaFieldErrors, setSepaFieldErrors] = useState<{
    holder?: string
    iban?: string
    consent?: string
  }>({})
  const [sepaPreviewLoading, setSepaPreviewLoading] = useState(false)
  const [sepaCreateLoading, setSepaCreateLoading] = useState(false)
  const [sepaStatusLoading, setSepaStatusLoading] = useState(false)
  const [sepaRevokeLoading, setSepaRevokeLoading] = useState(false)
  const [childSaveStatus, setChildSaveStatus] = useState<
    Record<string, { type: 'success' | 'error'; text: string } | null>
  >({})
  const [childFieldErrors, setChildFieldErrors] = useState<
    Record<string, Record<string, string>>
  >({})
  const [childSaving, setChildSaving] = useState<Record<string, boolean>>({})
  const [childDeleting, setChildDeleting] = useState<Record<string, boolean>>({})
  const [childExpanded, setChildExpanded] = useState<Record<string, boolean>>({})
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deletePhrase, setDeletePhrase] = useState('')
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [deleteStatus, setDeleteStatus] = useState<{
    type: 'success' | 'error'
    text: string
  } | null>(null)

  const createTempId = () =>
    `tmp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

  const formatEventDate = (value: string) => {
    if (!value) return '—'
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return value
    return date.toLocaleDateString('de-DE')
  }

  const formatEventTimeRange = (start: string, end: string) => {
    if (!start && !end) return '—'
    if (start && end) return `${start} - ${end}`
    return start || end
  }

  const formatCampDateRange = (startDate: string, endDate: string) => {
    if (!startDate) return '—'
    if (!endDate || startDate === endDate) return formatEventDate(startDate)
    return `${formatEventDate(startDate)} – ${formatEventDate(endDate)}`
  }

  const formatEventPrice = (price: number | null) => {
    if (price === null) return 'Preis auf Anfrage'
    const formatted = price.toFixed(2).replace('.', ',')
    return `€ ${formatted}`
  }

  const getTodayDateString = () => new Date().toISOString().split('T')[0]

  const normalizeIban = (value: string) => value.replace(/\s+/g, '').toUpperCase()

  const isIbanValid = (value: string) =>
    /^[A-Z]{2}\d{2}[A-Z0-9]{11,30}$/.test(normalizeIban(value))

  const emptyChild = (): ChildForm => ({
    tempId: createTempId(),
    firstName: '',
    lastName: '',
    birthDate: '',
    gender: '',
    email: '',
    phone: '',
    team: '',
    healthInsuranceNumber: '',
    medication: '',
    gloveSize: '',
    shirtSize: '',
    diet: 'none',
    relationship: '',
    isPrimary: false,
  })

  const getChildKey = (child: ChildForm) => child.tempId

  const updateField = (key: keyof ParentForm, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  const updateChildField = (
    childKey: string,
    field: keyof ChildForm,
    value: string | boolean
  ) => {
    setChildren((prev) =>
      prev.map((child) =>
        getChildKey(child) === childKey ? { ...child, [field]: value } : child
      )
    )
  }

  const toggleChildExpanded = (childKey: string) => {
    setChildExpanded((prev) => ({
      ...prev,
      [childKey]: prev[childKey] === false,
    }))
  }

  const validateForm = () => {
    const nextFieldErrors: Record<string, string> = {}

    if (!form.firstName.trim()) {
      nextFieldErrors.firstName = 'Bitte Vornamen angeben.'
    }
    if (!form.lastName.trim()) {
      nextFieldErrors.lastName = 'Bitte Nachnamen angeben.'
    }
    if (!userEmail.trim()) {
      nextFieldErrors.email = 'Bitte E-Mail angeben.'
    } else if (!/^\S+@\S+\.\S+$/.test(userEmail.trim())) {
      nextFieldErrors.email = 'Bitte eine gültige E-Mail angeben.'
    }
    if (!form.phone.trim()) {
      nextFieldErrors.phone = 'Bitte Telefonnummer angeben.'
    }

    return nextFieldErrors
  }

  const validateChild = (child: ChildForm) => {
    const nextFieldErrors: Record<string, string> = {}
    if (!child.firstName.trim()) {
      nextFieldErrors.firstName = 'Bitte Vornamen angeben.'
    }
    if (!child.lastName.trim()) {
      nextFieldErrors.lastName = 'Bitte Nachnamen angeben.'
    }
    if (!child.birthDate.trim()) {
      nextFieldErrors.birthDate = 'Bitte Geburtsdatum angeben.'
    }
    if (!child.gender.trim()) {
      nextFieldErrors.gender = 'Bitte Geschlecht auswählen.'
    }
    if (!child.relationship.trim()) {
      nextFieldErrors.relationship = 'Bitte Beziehung auswählen.'
    }
    if (!child.gloveSize.trim()) {
      nextFieldErrors.gloveSize = 'Bitte Handschuhgröße angeben.'
    }
    if (!child.shirtSize.trim()) {
      nextFieldErrors.shirtSize = 'Bitte Shirtgröße angeben.'
    }

    return nextFieldErrors
  }

  const loadChildren = async (currentParentId: string) => {
    setChildrenLoading(true)
    setChildSaveStatus({})
    setChildFieldErrors({})

    const { data: relationships, error: relationshipsError } = await supabase
      .from('relationships')
      .select('keeper_id, relationship, is_primary')
      .eq('parent_id', currentParentId)

    if (relationshipsError) {
      setChildrenLoading(false)
      return
    }

    const keeperIds = relationships?.map((row) => row.keeper_id) ?? []
    if (keeperIds.length === 0) {
      setChildren([])
      setChildrenLoading(false)
      return
    }

    const { data: keepers, error: keepersError } = await supabase
      .from('keepers')
      .select(
        'id, first_name, last_name, birth_date, gender, email, phone, team, health_insurance_number, medication, glove_size, shirt_size, diet, created_at'
      )
      .in('id', keeperIds)
      .order('created_at', { ascending: true })

    if (keepersError) {
      setChildrenLoading(false)
      return
    }

    const relationshipByKeeperId = new Map(
      (relationships ?? []).map((row) => [row.keeper_id, row])
    )

    const nextChildren = (keepers ?? []).map((row) => {
      const relationshipRow = relationshipByKeeperId.get(row.id)
      return {
        id: row.id,
        tempId: createTempId(),
        firstName: row.first_name ?? '',
        lastName: row.last_name ?? '',
        birthDate: row.birth_date ?? '',
        gender: row.gender ?? '',
        email: row.email ?? '',
        phone: row.phone ?? '',
        team: row.team ?? '',
        healthInsuranceNumber: row.health_insurance_number ?? '',
        medication: row.medication ?? '',
        gloveSize: row.glove_size ? String(row.glove_size) : '',
        shirtSize: row.shirt_size ?? '',
        diet: (row as { diet?: string }).diet ?? 'none',
        relationship: relationshipRow?.relationship ?? '',
        isPrimary: relationshipRow?.is_primary ?? false,
      }
    })

    setChildren(nextChildren)
    setChildExpanded((prev) => {
      const next = { ...prev }
      nextChildren.forEach((child) => {
        next[child.tempId] = false
      })
      return next
    })
    setChildrenLoading(false)
  }

  const loadWeeklyEvents = async () => {
    setWeeklyEventsLoading(true)
    const today = getTodayDateString()
    const { data, error } = await supabase
      .from('events')
      .select(
        'id, title, description, start_date, start_time, end_time, price, location_name, open_for_registration'
      )
      .eq('open_for_registration', true)
      .eq('event_type', 'weekly_training')
      .gt('start_date', today)
      .order('start_date', { ascending: true })
      .order('start_time', { ascending: true })

    if (error) {
      setWeeklyEvents([])
      setWeeklyEventsLoading(false)
      return
    }

    const nextEvents =
      data?.map((row) => ({
        id: row.id,
        title: row.title ?? '',
        description: row.description ?? '',
        startDate: row.start_date ?? '',
        startTime: row.start_time ?? '',
        endTime: row.end_time ?? '',
        price: row.price ?? null,
        locationName: row.location_name ?? '',
        openForRegistration: row.open_for_registration ?? false,
      })) ?? []

    setWeeklyEvents(nextEvents)
    setWeeklyEventsLoading(false)
  }

  const loadCampEvents = async () => {
    setCampEventsLoading(true)
    const today = getTodayDateString()
    const { data, error } = await supabase
      .from('events')
      .select(
        'id, title, description, start_date, end_date, start_time, end_time, price, location_name, street, postal_code, city, location_notes, open_for_registration'
      )
      .eq('open_for_registration', true)
      .eq('event_type', 'camp')
      .gte('start_date', today)
      .order('start_date', { ascending: true })
      .order('start_time', { ascending: true })

    if (error) {
      setCampEvents([])
      setCampEventsLoading(false)
      return
    }

    const nextEvents: CampEvent[] =
      data?.map((row) => {
        const r = row as {
          end_date?: string
          street?: string | null
          postal_code?: string | null
          city?: string | null
          location_notes?: string | null
        }
        return {
          id: row.id,
          title: row.title ?? '',
          description: row.description ?? '',
          startDate: row.start_date ?? '',
          endDate: r.end_date ?? '',
          startTime: row.start_time ?? '',
          endTime: row.end_time ?? '',
          price: row.price ?? null,
          locationName: row.location_name ?? '',
          street: r.street ?? null,
          postalCode: r.postal_code ?? null,
          city: r.city ?? null,
          locationNotes: r.location_notes ?? null,
          openForRegistration: row.open_for_registration ?? false,
        }
      }) ?? []

    setCampEvents(nextEvents)
    setCampEventsLoading(false)
  }

  const loadSepaStatus = async () => {
    setSepaStatusLoading(true)
    setSepaError(null)
    setSepaInfo(null)

    const { data, error } = await supabase.functions.invoke(
      'sepa-mandate-status',
      {
        method: 'GET',
      }
    )

    
    if (error) {
      setSepaError('Status konnte nicht geladen werden. Bitte erneut versuchen.')
      setSepaStatus('none')
      setSepaReference(null)
      setSepaStatusLoading(false)
      return
    }

    const rawStatus = (data as { state?: string } | null)?.state
    const allowedStatuses: MandateState[] = [
      'none',
      'pending',
      'active',
      'revoked',
    ]
    const nextStatus = rawStatus
      ? allowedStatuses.includes(rawStatus as MandateState)
        ? (rawStatus as MandateState)
        : 'none'
      : 'none'
    const nextReference = (data as { mandate?: { mandate_reference?: string } } | null)
    ?.mandate?.mandate_reference ?? null

    setSepaStatus(nextStatus ?? 'none')
    setSepaReference(nextReference ?? null)
    setSepaStatusLoading(false)
  }

  const handleSepaPreview = async (
    options?: { auto?: boolean }
  ): Promise<boolean> => {
    if (options?.auto) {
      if (!canCreateMandate) return false
      if (sepaPreviewText || sepaPreviewLoading) return true
    }

    setSepaPreviewLoading(true)
    setSepaError(null)
    setSepaInfo(null)

    const { data, error } = await supabase.functions.invoke(
      'sepa-mandate-preview',
      {
        method: 'GET',
      }
    )

    if (error) {
      setSepaError('Mandat konnte nicht geladen werden. Bitte erneut versuchen.')
      setSepaPreviewLoading(false)
      return false
    }

    const preview = (data as { preview_text?: string } | null)?.preview_text ?? ''
    setSepaPreviewText(preview)
    setSepaPreviewLoading(false)
    return true
  }

  const validateSepaInputs = (requireConsent: boolean) => {
    const nextErrors: {
      holder?: string
      iban?: string
      consent?: string
    } = {}
    const trimmedHolder = sepaHolderName.trim()
    const normalizedIban = normalizeIban(sepaIban)

    if (!trimmedHolder) {
      nextErrors.holder = 'Bitte Kontoinhaber:in angeben.'
    }
    if (!normalizedIban) {
      nextErrors.iban = 'Bitte IBAN angeben.'
    } else if (!isIbanValid(normalizedIban)) {
      nextErrors.iban = 'Bitte eine gültige IBAN angeben.'
    }
    if (requireConsent && !sepaConsent) {
      nextErrors.consent = 'Bitte bestätige das SEPA-Lastschriftmandat.'
    }

    setSepaFieldErrors(nextErrors)
    return {
      isValid: Object.keys(nextErrors).length === 0,
      normalizedIban,
      trimmedHolder,
    }
  }

  const handleSepaCreate = async ({
    requireConsent,
    setLoading,
    successMessage,
  }: {
    requireConsent: boolean
    setLoading: (value: boolean) => void
    successMessage?: string
  }) => {
    setLoading(true)
    setSepaError(null)
    setSepaInfo(null)

    const { isValid, normalizedIban, trimmedHolder } =
      validateSepaInputs(requireConsent)

    if (!isValid) {
      setLoading(false)
      return
    }

    const { data, error } = await supabase.functions.invoke('sepa-mandate-create', {
      method: 'POST',
      body: {
        iban: normalizedIban,
        account_holder: trimmedHolder,
        accept_mandate: true,
      },
    })

    if (error) {
      setSepaError(
        'Mandat konnte nicht erstellt werden. Bitte erneut versuchen.'
      )
      setLoading(false)
      return
    }

    setSepaInfo(successMessage ?? 'Bitte E-Mail bestätigen.')
    setLoading(false)
    await loadSepaStatus()
  }

  const handleSepaRevoke = async () => {
    setSepaRevokeLoading(true)
    setSepaError(null)
    setSepaInfo(null)

    const { error } = await supabase.functions.invoke('sepa-mandate-revoke', {
      method: 'POST',
      body: {
        reason: 'user_request',
      },
    })

    if (error) {
      setSepaError('Mandat konnte nicht widerrufen werden. Bitte erneut versuchen.')
      setSepaRevokeLoading(false)
      return
    }

    setSepaRevokeLoading(false)
    await loadSepaStatus()
  }


  const toggleWeeklySelection = (
    eventId: string,
    childKey: string,
    checked: boolean,
    childId?: string
  ) => {
    setWeeklySelections((prev) => ({
      ...prev,
      [eventId]: {
        ...(prev[eventId] ?? {}),
        [childKey]: checked,
      },
    }))
    if (!childId) return
    setWeeklyRegistrationStatus((prev) => {
      const currentStatus = prev[eventId]?.[childId] ?? ''
      if (currentStatus === 'confirmed') return prev
      const nextStatus = checked
        ? currentStatus === 'accepted'
          ? 'accepted'
          : 'submitted'
        : 'cancelled'
      return {
        ...prev,
        [eventId]: {
          ...(prev[eventId] ?? {}),
          [childId]: nextStatus,
        },
      }
    })
  }

  const toggleCampSelection = (
    eventId: string,
    childKey: string,
    checked: boolean,
    childId?: string
  ) => {
    setCampSelections((prev) => ({
      ...prev,
      [eventId]: {
        ...(prev[eventId] ?? {}),
        [childKey]: checked,
      },
    }))
    if (!childId) return
    setCampRegistrationStatus((prev) => {
      const currentStatus = prev[eventId]?.[childId] ?? ''
      if (currentStatus === 'confirmed') return prev
      const nextStatus = checked
        ? currentStatus === 'accepted'
          ? 'accepted'
          : 'submitted'
        : 'cancelled'
      return {
        ...prev,
        [eventId]: {
          ...(prev[eventId] ?? {}),
          [childId]: nextStatus,
        },
      }
    })
  }

  const loadWeeklyRegistrations = async (
    currentUserId: string,
    eventIds: string[],
    keeperIds: string[]
  ) => {
    if (eventIds.length === 0 || keeperIds.length === 0) {
      setWeeklyRegistrationStatus({})
      setWeeklySelections({})
      return
    }

    const { data: registrations, error: registrationsError } = await supabase
      .from('event_registrations')
      .select('id, event_id')
      .in('event_id', eventIds)
      .eq('created_by_user_id', currentUserId)

    if (registrationsError) {
      setWeeklyRegistrationStatus({})
      return
    }

    const registrationIds =
      registrations?.map((row) => row.id).filter(Boolean) ?? []
    const registrationById = new Map(
      (registrations ?? []).map((row) => [row.id, row.event_id])
    )

    if (registrationIds.length === 0) {
      setWeeklyRegistrationStatus({})
      setWeeklySelections(() => {
        const nextSelections: Record<string, Record<string, boolean>> = {}
        weeklyEvents.forEach((event) => {
          const eventSelections: Record<string, boolean> = {}
          children.forEach((child) => {
            if (!child.id) return
            eventSelections[getChildKey(child)] = false
          })
          nextSelections[event.id] = eventSelections
        })
        return nextSelections
      })
      return
    }

    const { data: participants, error: participantsError } = await supabase
      .from('event_registration_participants')
      .select('registration_id, keeper_id, status')
      .in('registration_id', registrationIds)
      .in('keeper_id', keeperIds)

    if (participantsError) {
      setWeeklyRegistrationStatus({})
      return
    }

    const nextStatus: Record<string, Record<string, EventRegistrationStatus>> = {}
    ;(participants ?? []).forEach((row) => {
      if (!row.keeper_id) return
      const eventId = registrationById.get(row.registration_id)
      if (!eventId) return
      if (!nextStatus[eventId]) {
        nextStatus[eventId] = {}
      }
      nextStatus[eventId][row.keeper_id] = row.status ?? ''
    })

    setWeeklyRegistrationStatus(nextStatus)
    setWeeklySelections(() => {
      const nextSelections: Record<string, Record<string, boolean>> = {}
      weeklyEvents.forEach((event) => {
        const eventSelections: Record<string, boolean> = {}
        children.forEach((child) => {
          if (!child.id) return
          const status = nextStatus[event.id]?.[child.id] ?? ''
          eventSelections[getChildKey(child)] = [
            'submitted',
            'confirmed',
            'accepted',
          ].includes(status)
        })
        nextSelections[event.id] = eventSelections
      })
      return nextSelections
    })
  }

  const loadCampRegistrations = async (
    currentUserId: string,
    eventIds: string[],
    keeperIds: string[]
  ) => {
    if (eventIds.length === 0 || keeperIds.length === 0) {
      setCampRegistrationStatus({})
      setCampSelections({})
      return
    }

    const { data: registrations, error: registrationsError } = await supabase
      .from('event_registrations')
      .select('id, event_id')
      .in('event_id', eventIds)
      .eq('created_by_user_id', currentUserId)

    if (registrationsError) {
      setCampRegistrationStatus({})
      return
    }

    const registrationIds =
      registrations?.map((row) => row.id).filter(Boolean) ?? []
    const registrationById = new Map(
      (registrations ?? []).map((row) => [row.id, row.event_id])
    )

    if (registrationIds.length === 0) {
      setCampRegistrationStatus({})
      setCampSelections(() => {
        const nextSelections: Record<string, Record<string, boolean>> = {}
        campEvents.forEach((event) => {
          const eventSelections: Record<string, boolean> = {}
          children.forEach((child) => {
            if (!child.id) return
            eventSelections[getChildKey(child)] = false
          })
          nextSelections[event.id] = eventSelections
        })
        return nextSelections
      })
      return
    }

    const { data: participants, error: participantsError } = await supabase
      .from('event_registration_participants')
      .select('registration_id, keeper_id, status')
      .in('registration_id', registrationIds)
      .in('keeper_id', keeperIds)

    if (participantsError) {
      setCampRegistrationStatus({})
      return
    }

    const nextStatus: Record<string, Record<string, EventRegistrationStatus>> = {}
    ;(participants ?? []).forEach((row) => {
      if (!row.keeper_id) return
      const eventId = registrationById.get(row.registration_id)
      if (!eventId) return
      if (!nextStatus[eventId]) {
        nextStatus[eventId] = {}
      }
      nextStatus[eventId][row.keeper_id] = row.status ?? ''
    })

    setCampRegistrationStatus(nextStatus)
    setCampSelections(() => {
      const nextSelections: Record<string, Record<string, boolean>> = {}
      campEvents.forEach((event) => {
        const eventSelections: Record<string, boolean> = {}
        children.forEach((child) => {
          if (!child.id) return
          const status = nextStatus[event.id]?.[child.id] ?? ''
          eventSelections[getChildKey(child)] = [
            'submitted',
            'confirmed',
            'accepted',
          ].includes(status)
        })
        nextSelections[event.id] = eventSelections
      })
      return nextSelections
    })
  }

  const handleWeeklySave = async () => {
    setWeeklySaving(true)
    setWeeklySaveStatus(null)

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      setWeeklySaveStatus({
        type: 'error',
        text: 'Speichern fehlgeschlagen. Bitte erneut anmelden.',
      })
      setWeeklySaving(false)
      return
    }

    const currentUserId = user.id
    const eventIds = weeklyEvents.map((event) => event.id)
    const keeperIds = children.map((child) => child.id).filter(Boolean) as string[]

    if (eventIds.length === 0 || keeperIds.length === 0) {
      setWeeklySaveStatus({ type: 'error', text: 'Speichern fehlgeschlagen.' })
      setWeeklySaving(false)
      return
    }

    try {
      const { data: existingHeaders, error: existingHeadersError } = await supabase
        .from('event_registrations')
        .select('id, event_id')
        .in('event_id', eventIds)
        .eq('created_by_user_id', currentUserId)

      if (existingHeadersError) {
        setWeeklySaveStatus({
          type: 'error',
          text: `Speichern fehlgeschlagen: ${existingHeadersError.message}`,
        })
        setWeeklySaving(false)
        return
      }

      const existingHeaderByEventId = new Map(
        (existingHeaders ?? []).map((row) => [row.event_id, row.id])
      )
      const headerPayload = weeklyEvents
        .filter((event) => !existingHeaderByEventId.has(event.id))
        .map((event) => ({
          event_id: event.id,
          created_by_user_id: currentUserId,
          contact_first_name: form.firstName.trim() || null,
          contact_last_name: form.lastName.trim() || null,
          contact_email: userEmail.trim() || null,
          contact_phone: form.phone.trim() || null,
        }))

      const { data: insertedHeaders, error: headerError } =
        headerPayload.length > 0
          ? await supabase
              .from('event_registrations')
              .insert(headerPayload)
              .select('id, event_id')
          : { data: [], error: null }

      if (headerError) {
        setWeeklySaveStatus({
          type: 'error',
          text: `Speichern fehlgeschlagen: ${headerError.message}`,
        })
        setWeeklySaving(false)
        return
      }

      const registrationIdByEventId = new Map(
        [...(existingHeaders ?? []), ...(insertedHeaders ?? [])].map((row) => [
          row.event_id,
          row.id,
        ])
      )
      const registrationIds = Array.from(registrationIdByEventId.values())
      if (registrationIds.length > 0) {
        const { data: existingParticipants, error: existingParticipantsError } =
          await supabase
            .from('event_registration_participants')
            .select('id, registration_id, keeper_id, status')
            .in('registration_id', registrationIds)
            .in('keeper_id', keeperIds)

        if (existingParticipantsError) {
          setWeeklySaveStatus({
            type: 'error',
            text: `Speichern fehlgeschlagen: ${existingParticipantsError.message}`,
          })
          setWeeklySaving(false)
          return
        }

        const existingParticipantByKey = new Map(
          (existingParticipants ?? []).map((row) => [
            `${row.registration_id}-${row.keeper_id}`,
            row,
          ])
        )

        const participantInserts: Array<{
          registration_id: string
          keeper_id: string
          status: EventRegistrationStatus
        }> = []

        const participantUpdates: Array<{
          id: string
          registration_id: string
          keeper_id: string
          status: EventRegistrationStatus | null
        }> = []

        weeklyEvents.forEach((event) => {
          const registrationId = registrationIdByEventId.get(event.id)
          if (!registrationId) return
          children.forEach((child) => {
            if (!child.id) return
            const childKey = getChildKey(child)
            const isChecked = Boolean(weeklySelections[event.id]?.[childKey])
            const currentStatus =
              weeklyRegistrationStatus[event.id]?.[child.id] ?? ''
            const key = `${registrationId}-${child.id}`
            const existing = existingParticipantByKey.get(key)

            if (isChecked) {
              const desiredStatus =
                currentStatus === 'confirmed'
                  ? 'confirmed'
                  : currentStatus === 'accepted'
                    ? 'accepted'
                    : 'submitted'
              if (existing) {
                if ((existing.status ?? '') !== desiredStatus) {
                  participantUpdates.push({
                    id: existing.id,
                    registration_id: existing.registration_id,
                    keeper_id: existing.keeper_id,
                    status: desiredStatus,
                  })
                }
              } else {
                participantInserts.push({
                  registration_id: registrationId,
                  keeper_id: child.id,
                  status: desiredStatus,
                })
              }
            } else if (existing && existing.status !== 'cancelled') {
              participantUpdates.push({
                id: existing.id,
                registration_id: existing.registration_id,
                keeper_id: existing.keeper_id,
                status: 'cancelled',
              })
            }
          })
        })

        if (participantInserts.length > 0) {
          const { error } = await supabase
            .from('event_registration_participants')
            .insert(participantInserts)
          if (error) {
            setWeeklySaveStatus({
              type: 'error',
              text: `Speichern fehlgeschlagen: ${error.message}`,
            })
            setWeeklySaving(false)
            return
          }
        }

        if (participantUpdates.length > 0) {
          const { error } = await supabase
            .from('event_registration_participants')
            .upsert(participantUpdates, { onConflict: 'id' })
          if (error) {
            setWeeklySaveStatus({
              type: 'error',
              text: `Speichern fehlgeschlagen: ${error.message}`,
            })
            setWeeklySaving(false)
            return
          }
        }
      }


      setWeeklySaveStatus({ type: 'success', text: 'Speichern erfolgreich.' })
      await loadWeeklyRegistrations(currentUserId, eventIds, keeperIds)
    } catch (error) {
      setWeeklySaveStatus({
        type: 'error',
        text: 'Speichern fehlgeschlagen. Bitte erneut versuchen.',
      })
    } finally {
      setWeeklySaving(false)
    }
  }

  const handleCampSave = async () => {
    setCampSaving(true)
    setCampSaveStatus(null)

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      setCampSaveStatus({
        type: 'error',
        text: 'Speichern fehlgeschlagen. Bitte erneut anmelden.',
      })
      setCampSaving(false)
      return
    }

    const currentUserId = user.id
    const eventIds = campEvents.map((event) => event.id)
    const keeperIds = children.map((child) => child.id).filter(Boolean) as string[]

    if (eventIds.length === 0 || keeperIds.length === 0) {
      setCampSaveStatus({ type: 'error', text: 'Speichern fehlgeschlagen.' })
      setCampSaving(false)
      return
    }

    try {
      const { data: existingHeaders, error: existingHeadersError } = await supabase
        .from('event_registrations')
        .select('id, event_id')
        .in('event_id', eventIds)
        .eq('created_by_user_id', currentUserId)

      if (existingHeadersError) {
        setCampSaveStatus({
          type: 'error',
          text: `Speichern fehlgeschlagen: ${existingHeadersError.message}`,
        })
        setCampSaving(false)
        return
      }

      const existingHeaderByEventId = new Map(
        (existingHeaders ?? []).map((row) => [row.event_id, row.id])
      )
      const headerPayload = campEvents
        .filter((event) => !existingHeaderByEventId.has(event.id))
        .map((event) => ({
          event_id: event.id,
          created_by_user_id: currentUserId,
          contact_first_name: form.firstName.trim() || null,
          contact_last_name: form.lastName.trim() || null,
          contact_email: userEmail.trim() || null,
          contact_phone: form.phone.trim() || null,
        }))

      const { data: insertedHeaders, error: headerError } =
        headerPayload.length > 0
          ? await supabase
              .from('event_registrations')
              .insert(headerPayload)
              .select('id, event_id')
          : { data: [], error: null }

      if (headerError) {
        setCampSaveStatus({
          type: 'error',
          text: `Speichern fehlgeschlagen: ${headerError.message}`,
        })
        setCampSaving(false)
        return
      }

      const registrationIdByEventId = new Map(
        [...(existingHeaders ?? []), ...(insertedHeaders ?? [])].map((row) => [
          row.event_id,
          row.id,
        ])
      )
      const registrationIds = Array.from(registrationIdByEventId.values())
      if (registrationIds.length > 0) {
        const { data: existingParticipants, error: existingParticipantsError } =
          await supabase
            .from('event_registration_participants')
            .select('id, registration_id, keeper_id, status')
            .in('registration_id', registrationIds)
            .in('keeper_id', keeperIds)

        if (existingParticipantsError) {
          setCampSaveStatus({
            type: 'error',
            text: `Speichern fehlgeschlagen: ${existingParticipantsError.message}`,
          })
          setCampSaving(false)
          return
        }

        const existingParticipantByKey = new Map(
          (existingParticipants ?? []).map((row) => [
            `${row.registration_id}-${row.keeper_id}`,
            row,
          ])
        )

        const participantInserts: Array<{
          registration_id: string
          keeper_id: string
          status: EventRegistrationStatus
        }> = []

        const participantUpdates: Array<{
          id: string
          registration_id: string
          keeper_id: string
          status: EventRegistrationStatus | null
        }> = []

        campEvents.forEach((event) => {
          const registrationId = registrationIdByEventId.get(event.id)
          if (!registrationId) return
          children.forEach((child) => {
            if (!child.id) return
            const childKey = getChildKey(child)
            const isChecked = Boolean(campSelections[event.id]?.[childKey])
            const currentStatus =
              campRegistrationStatus[event.id]?.[child.id] ?? ''
            const key = `${registrationId}-${child.id}`
            const existing = existingParticipantByKey.get(key)

            if (isChecked) {
              const desiredStatus =
                currentStatus === 'confirmed'
                  ? 'confirmed'
                  : currentStatus === 'accepted'
                    ? 'accepted'
                    : 'submitted'
              if (existing) {
                if ((existing.status ?? '') !== desiredStatus) {
                  participantUpdates.push({
                    id: existing.id,
                    registration_id: existing.registration_id,
                    keeper_id: existing.keeper_id,
                    status: desiredStatus,
                  })
                }
              } else {
                participantInserts.push({
                  registration_id: registrationId,
                  keeper_id: child.id,
                  status: desiredStatus,
                })
              }
            } else if (existing && existing.status !== 'cancelled') {
              participantUpdates.push({
                id: existing.id,
                registration_id: existing.registration_id,
                keeper_id: existing.keeper_id,
                status: 'cancelled',
              })
            }
          })
        })

        if (participantInserts.length > 0) {
          const { error } = await supabase
            .from('event_registration_participants')
            .insert(participantInserts)
          if (error) {
            setCampSaveStatus({
              type: 'error',
              text: `Speichern fehlgeschlagen: ${error.message}`,
            })
            setCampSaving(false)
            return
          }
        }

        if (participantUpdates.length > 0) {
          const { error } = await supabase
            .from('event_registration_participants')
            .upsert(participantUpdates, { onConflict: 'id' })
          if (error) {
            setCampSaveStatus({
              type: 'error',
              text: `Speichern fehlgeschlagen: ${error.message}`,
            })
            setCampSaving(false)
            return
          }
        }
      }

      setCampSaveStatus({ type: 'success', text: 'Speichern erfolgreich.' })
      await loadCampRegistrations(currentUserId, eventIds, keeperIds)

      /* Send camp confirmation email for each newly created registration */
      const inserted = (insertedHeaders ?? []) as Array<{ id: string; event_id: string }>
      for (const row of inserted) {
        const selectedCamp = campEvents.find((c) => c.id === row.event_id)
        if (!selectedCamp) continue
        const selectedChildren = children.filter(
          (c) => c.id && campSelections[row.event_id]?.[getChildKey(c)]
        )
        fetch(
          `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/send-camp-confirmation`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
              apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            },
            body: JSON.stringify({
              parentEmail: userEmail,
              parentName: `${form.firstName} ${form.lastName}`.trim(),
              campTitle: selectedCamp.title,
              start_date: selectedCamp.startDate,
              end_date: selectedCamp.endDate ?? '',
              start_time: selectedCamp.startTime ?? '',
              end_time: selectedCamp.endTime ?? '',
              location_name: selectedCamp.locationName ?? '',
              location: formatLocation(
                selectedCamp.street ?? null,
                selectedCamp.postalCode ?? null,
                selectedCamp.city ?? null
              ),
              location_notes: selectedCamp.locationNotes ?? null,
              children: selectedChildren.map((c) => ({
                firstName: c.firstName,
                lastName: c.lastName,
              })),
              registrationId: row.id,
            }),
          }
        ).catch((err) => {
          console.error('Camp confirmation email failed', err)
        })
      }
    } catch (error) {
      setCampSaveStatus({
        type: 'error',
        text: 'Speichern fehlgeschlagen. Bitte erneut versuchen.',
      })
    } finally {
      setCampSaving(false)
    }
  }

  const addChild = () => {
    const newChild = emptyChild()
    setChildren((prev) => [...prev, newChild])
    setChildExpanded((prev) => ({ ...prev, [newChild.tempId]: true }))
  }

  const removeChildState = (childKey: string) => {
    setChildren((prev) => prev.filter((child) => getChildKey(child) !== childKey))
    setChildFieldErrors((prev) => {
      const next = { ...prev }
      delete next[childKey]
      return next
    })
    setChildSaveStatus((prev) => {
      const next = { ...prev }
      delete next[childKey]
      return next
    })
    setChildSaving((prev) => {
      const next = { ...prev }
      delete next[childKey]
      return next
    })
    setChildDeleting((prev) => {
      const next = { ...prev }
      delete next[childKey]
      return next
    })
    setChildExpanded((prev) => {
      const next = { ...prev }
      delete next[childKey]
      return next
    })
  }

  const handleChildDelete = async (child: ChildForm) => {
    const childKey = getChildKey(child)
    const confirmed = window.confirm(
      'Möchtest du diese Kinderdaten wirklich löschen? Dies kann nicht rückgängig gemacht werden.'
    )
    if (!confirmed) return

    if (!child.id) {
      removeChildState(childKey)
      return
    }

    setChildDeleting((prev) => ({ ...prev, [childKey]: true }))
    setChildSaveStatus((prev) => ({ ...prev, [childKey]: null }))

    

    const { error: keeperError } = await supabase
      .from('keepers')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', child.id)

    if (keeperError) {
      setChildSaveStatus((prev) => ({
        ...prev,
        [childKey]: { type: 'error', text: keeperError.message },
      }))
      setChildDeleting((prev) => ({ ...prev, [childKey]: false }))
      return
    }

    const { error: relationshipError } = await supabase
      .from('relationships')
      .delete()
      .eq('keeper_id', child.id)

    if (relationshipError) {
      setChildSaveStatus((prev) => ({
        ...prev,
        [childKey]: { type: 'error', text: relationshipError.message },
      }))
      setChildDeleting((prev) => ({ ...prev, [childKey]: false }))
      return
    }

    removeChildState(childKey)
    setChildSaveStatus((prev) => ({
      ...prev,
      [childKey]: { type: 'success', text: 'Kinderdaten gelöscht.' },
    }))
  }

  const handleChildSave = async (child: ChildForm) => {
    const childKey = getChildKey(child)
    setChildSaveStatus((prev) => ({ ...prev, [childKey]: null }))
    setChildFieldErrors((prev) => ({ ...prev, [childKey]: {} }))

    const nextFieldErrors = validateChild(child)
    if (Object.keys(nextFieldErrors).length > 0) {
      setChildFieldErrors((prev) => ({ ...prev, [childKey]: nextFieldErrors }))
      setChildSaveStatus((prev) => ({
        ...prev,
        [childKey]: { type: 'error', text: 'Speichern fehlgeschlagen.' },
      }))
      return
    }

    if (!parentId) {
      setChildSaveStatus((prev) => ({
        ...prev,
        [childKey]: { type: 'error', text: 'Speichern fehlgeschlagen.' },
      }))
      return
    }

    setChildSaving((prev) => ({ ...prev, [childKey]: true }))

    const hadInvalidSession = await clearInvalidRefreshToken()
    if (hadInvalidSession) {
      setChildSaveStatus((prev) => ({
        ...prev,
        [childKey]: { type: 'error', text: 'Speichern fehlgeschlagen.' },
      }))
      setChildSaving((prev) => ({ ...prev, [childKey]: false }))
      return
    }

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      setChildSaveStatus((prev) => ({
        ...prev,
        [childKey]: { type: 'error', text: 'Speichern fehlgeschlagen.' },
      }))
      setChildSaving((prev) => ({ ...prev, [childKey]: false }))
      return
    }

    const gloveSizeValue = child.gloveSize.trim()
    const gloveSizeNumber = gloveSizeValue ? Number(gloveSizeValue) : null
    const gloveSize =
      gloveSizeNumber !== null && Number.isNaN(gloveSizeNumber)
        ? null
        : gloveSizeNumber

    const payload = {
      first_name: child.firstName.trim(),
      last_name: child.lastName.trim(),
      birth_date: child.birthDate,
      gender: child.gender,
      email: child.email.trim() || null,
      phone: child.phone.trim() || null,
      team: child.team.trim() || null,
      health_insurance_number: child.healthInsuranceNumber.trim() || null,
      medication: child.medication.trim() || null,
      glove_size: gloveSize,
      shirt_size: child.shirtSize.trim() || null,
      diet: child.diet || null,
    }
    

    let keeperId: string | undefined

    if (child.id) {
      const { data, error } = await supabase
        .from('keepers')
        .update(payload)
        .eq('id', child.id)
        .select('id')
        .single()

      if (error) {
        setChildSaveStatus((prev) => ({
          ...prev,
          [childKey]: { type: 'error', text: 'Speichern fehlgeschlagen.' },
        }))
        setChildSaving((prev) => ({ ...prev, [childKey]: false }))
        return
      }

      keeperId = data?.id
    } else {
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession()
      console.log('has session', !!session)
      console.log('token starts', session?.access_token?.slice(0, 20))
      console.log('jwt parts', session?.access_token?.split('.')?.length)

      if (sessionError || !session?.access_token) {
        setChildSaveStatus((prev) => ({
          ...prev,
          [childKey]: { type: 'error', text: 'Speichern fehlgeschlagen.' },
        }))
        setChildSaving((prev) => ({ ...prev, [childKey]: false }))
        return
      }

      const relationshipValue = child.relationship.trim() || null
      const isPrimaryValue = child.isPrimary
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
      const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

      if (!supabaseUrl || !supabaseAnonKey) {
        setChildSaveStatus((prev) => ({
          ...prev,
          [childKey]: { type: 'error', text: 'Speichern fehlgeschlagen.' },
        }))
        setChildSaving((prev) => ({ ...prev, [childKey]: false }))
        return
      }

      const { data, error } = await supabase.functions.invoke(
        'create-child-keeper-from-parent',
        {
          body: {
            keeper: payload,
            relationship: {
              relationship: relationshipValue,
              is_primary: isPrimaryValue,
            },
          },
        }
      )
      
      
      if (error) {
        setChildSaveStatus((prev) => ({
          ...prev,
          [childKey]: { type: 'error', text: 'Speichern fehlgeschlagen.' },
        }))
        setChildSaving((prev) => ({ ...prev, [childKey]: false }))
        console.log('error 1')
        return
      }

      // data is already parsed JSON (or null)
      const jsonRecord = data as
      | { success: true; keeperId: string; relationshipId?: string }
      | { error: string; details?: string }
      | null

      if (!jsonRecord) {
        console.log('error 3 - no data returned')
        setChildSaveStatus((prev) => ({
          ...prev,
          [childKey]: { type: 'error', text: 'Speichern fehlgeschlagen.' },
        }))
        setChildSaving((prev) => ({ ...prev, [childKey]: false }))
        return
      }

      if ('error' in jsonRecord && jsonRecord.error) {
        console.log('error 3', jsonRecord.error, jsonRecord.details)
        setChildSaveStatus((prev) => ({
          ...prev,
          [childKey]: {
            type: 'error',
            text: `Speichern fehlgeschlagen: ${jsonRecord.error}${jsonRecord.details ? ` (${jsonRecord.details})` : ''}`,
          },
        }))
        setChildSaving((prev) => ({ ...prev, [childKey]: false }))
        return
      }
      
      if (!('success' in jsonRecord) || !jsonRecord.success) {
        console.log('error 3 - unexpected response', jsonRecord)
        setChildSaveStatus((prev) => ({
          ...prev,
          [childKey]: { type: 'error', text: 'Speichern fehlgeschlagen.' },
        }))
        setChildSaving((prev) => ({ ...prev, [childKey]: false }))
        return
      }

      keeperId = jsonRecord.keeperId
    }

    if (!keeperId) {
      setChildSaveStatus((prev) => ({
        ...prev,
        [childKey]: { type: 'error', text: 'Speichern fehlgeschlagen.' },
      }))
      setChildSaving((prev) => ({ ...prev, [childKey]: false }))
      console.log('error 4')
      return
    }

    if (child.id) {
      const { error: relationshipError } = await supabase
        .from('relationships')
        .upsert(
          {
            parent_id: parentId,
            keeper_id: keeperId,
            relationship: child.relationship,
            is_primary: child.isPrimary,
          },
          { onConflict: 'keeper_id,parent_id' }
        )

      if (relationshipError) {
        setChildSaveStatus((prev) => ({
          ...prev,
          [childKey]: { type: 'error', text: 'Speichern fehlgeschlagen.' },
        }))
        setChildSaving((prev) => ({ ...prev, [childKey]: false }))
        return
      }
    }

    if (!child.id) {
      setChildren((prev) =>
        prev.map((item) =>
          getChildKey(item) === childKey ? { ...item, id: keeperId } : item
        )
      )
    }

    setChildSaveStatus((prev) => ({
      ...prev,
      [childKey]: { type: 'success', text: 'Speichern erfolgreich.' },
    }))
    setChildSaving((prev) => ({ ...prev, [childKey]: false }))
  }

  useEffect(() => {
    const loadParentData = async () => {
      const hadInvalidSession = await clearInvalidRefreshToken()
      if (hadInvalidSession) {
        setParentSaveStatus({ type: 'error', text: 'Speichern fehlgeschlagen.' })
        setInitialLoading(false)
        return
      }

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser()

      if (userError || !user) {
        setParentSaveStatus({ type: 'error', text: 'Speichern fehlgeschlagen.' })
        setInitialLoading(false)
        return
      }

    const { data, error } = await supabase
      .from('parents')
      .select('id, first_name, last_name, phone')
        .eq('user_id', user.id)
        .maybeSingle()

      if (error) {
        setParentSaveStatus({ type: 'error', text: 'Speichern fehlgeschlagen.' })
        setInitialLoading(false)
        return
      }

      const nextUserEmail = user.email ?? ''
      setUserId(user.id)
      setUserEmail(nextUserEmail)

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('newsletter_opt_in, media_creation_accepted')
        .eq('id', user.id)
        .maybeSingle()

      if (!profileError) {
        setNewsletterOptIn(Boolean(profile?.newsletter_opt_in))
        setMediaCreationAccepted(Boolean(profile?.media_creation_accepted))
      }

      if (data) {
        setParentId(data.id)
        setForm({
          firstName: data.first_name ?? '',
          lastName: data.last_name ?? '',
          phone: data.phone ?? '',
        })
        await loadChildren(data.id)
      } else {
        setForm((prev) => ({
          ...prev,
        }))
        setParentId(null)
        setChildren([])
      }

      await loadWeeklyEvents()
      await loadCampEvents()
      await loadSepaStatus()
      setInitialLoading(false)
    }

    loadParentData()
  }, [])

  useEffect(() => {
    if (!userId || weeklyEventsLoading || childrenLoading) return

    const eventIds = weeklyEvents.map((event) => event.id)
    const keeperIds = children.map((child) => child.id).filter(Boolean) as string[]

    if (eventIds.length === 0 || keeperIds.length === 0) {
      setWeeklyRegistrationStatus({})
      setWeeklySelections({})
      return
    }

    loadWeeklyRegistrations(userId, eventIds, keeperIds)
  }, [userId, weeklyEventsLoading, childrenLoading, weeklyEvents, children])

  useEffect(() => {
    if (!userId || campEventsLoading || childrenLoading) return

    const eventIds = campEvents.map((event) => event.id)
    const keeperIds = children.map((child) => child.id).filter(Boolean) as string[]

    if (eventIds.length === 0 || keeperIds.length === 0) {
      setCampRegistrationStatus({})
      setCampSelections({})
      return
    }

    loadCampRegistrations(userId, eventIds, keeperIds)
  }, [userId, campEventsLoading, childrenLoading, campEvents, children])

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setParentSaveStatus(null)
    setFieldErrors({})

    const nextFieldErrors = validateForm()
    if (Object.keys(nextFieldErrors).length > 0) {
      setFieldErrors(nextFieldErrors)
      setParentSaveStatus({ type: 'error', text: 'Speichern fehlgeschlagen.' })
      return
    }

    setLoading(true)

    const hadInvalidSession = await clearInvalidRefreshToken()
    if (hadInvalidSession) {
      setParentSaveStatus({ type: 'error', text: 'Speichern fehlgeschlagen.' })
      setLoading(false)
      return
    }

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      setParentSaveStatus({ type: 'error', text: 'Speichern fehlgeschlagen.' })
      setLoading(false)
      return
    }

    if (!user.email) {
      setParentSaveStatus({ type: 'error', text: 'Speichern fehlgeschlagen.' })
      setLoading(false)
      return
    }

    const payload = {
      first_name: form.firstName.trim(),
      last_name: form.lastName.trim(),
      phone: form.phone.trim(),
      email: user.email.trim(),
      user_id: user.id,
    }

    const { data, error } = await supabase
      .from('parents')
      .upsert(payload, { onConflict: 'user_id' })
      .select('id')
      .single()

    if (error) {
      setParentSaveStatus({ type: 'error', text: 'Speichern fehlgeschlagen.' })
      setLoading(false)
      return
    }

    if (data?.id && data.id !== parentId) {
      setParentId(data.id)
      await loadChildren(data.id)
    }

    const { error: profileError } = await supabase
      .from('profiles')
      .update({
        newsletter_opt_in: newsletterOptIn,
        media_creation_accepted: mediaCreationAccepted,
      })
      .eq('id', user.id)

    if (profileError) {
      setParentSaveStatus({ type: 'error', text: 'Speichern fehlgeschlagen.' })
      setLoading(false)
      return
    }

    setParentSaveStatus({ type: 'success', text: 'Speichern erfolgreich.' })
    setLoading(false)
  }

  const handleDeleteAccountStart = () => {
    const confirmed = window.confirm(
      'Möchtest du deinen Zugang wirklich löschen? Dies entfernt alle Daten und kann nicht rückgängig gemacht werden.'
    )
    if (!confirmed) return
    setDeletePhrase('')
    setDeleteStatus(null)
    setDeleteDialogOpen(true)
  }

  const handleDeleteAccount = async () => {
    if (deletePhrase !== 'ACCOUNT-LÖSCHEN') return
    setDeleteLoading(true)
    setDeleteStatus(null)

    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession()

    if (sessionError || !session?.access_token) {
      setDeleteStatus({
        type: 'error',
        text: 'Löschen fehlgeschlagen. Bitte erneut anmelden.',
      })
      setDeleteLoading(false)
      return
    }

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/delete-account`, {
        method: 'POST',
        headers: {
          apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
          Authorization: `Bearer ${session.access_token}`,
        },
      })

      if (!response.ok) {
        setDeleteStatus({
          type: 'error',
          text: 'Löschen fehlgeschlagen. Bitte später erneut versuchen.',
        })
        setDeleteLoading(false)
        return
      }

      setDeleteStatus({
        type: 'success',
        text: 'Dein Konto wird gelöscht.',
      })
      setTimeout(() => {
        window.location.href = '/'
      }, 800)
    } catch (error) {
      setDeleteStatus({
        type: 'error',
        text: 'Löschen fehlgeschlagen. Bitte später erneut versuchen.',
      })
    } finally {
      setDeleteLoading(false)
    }
  }

  const canCreateMandate = sepaStatus === 'none' || sepaStatus === 'revoked'
  const normalizedSepaIban = normalizeIban(sepaIban)
  const isSepaHolderValid = sepaHolderName.trim().length > 0
  const isSepaIbanValid = Boolean(normalizedSepaIban) && isIbanValid(normalizedSepaIban)
  const canSubmitSepaMandate = sepaConsent && isSepaHolderValid && isSepaIbanValid

  useEffect(() => {
    void handleSepaPreview({ auto: true })
  }, [
    canCreateMandate,
    sepaPreviewText,
    sepaPreviewLoading,
  ])

  return (
    <main className="relative min-h-screen overflow-hidden bg-gradient-to-b from-slate-50 via-white to-indigo-50">
      <Navbar showHome showLogout />
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-32 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-indigo-200/40 blur-3xl" />
        <div className="absolute bottom-0 right-0 h-72 w-72 rounded-full bg-rose-200/40 blur-3xl" />
      </div>

      <div className="relative mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 py-10">
        <Card className="border-white/60 bg-white/80 shadow-[0_30px_60px_rgba(15,23,42,0.12)] backdrop-blur-xl">
          <CardHeader className="gap-3">
            <div>
              <CardTitle className="text-3xl md:text-4xl">Elternprofil</CardTitle>
              <CardDescription>
                Verwalte deine persönlichen Kontaktdaten für alle Elternangaben.
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <Separator />

            <form onSubmit={handleSubmit} className="space-y-6 max-w-full overflow-x-hidden">
              <fieldset
                disabled={loading || initialLoading}
                className="space-y-6 min-w-0"
              >
                <Card className="border-slate-200/70 bg-white/70 shadow-none">
                  <CardHeader className="pb-0">
                    <CardTitle className="text-base">Stammdaten</CardTitle>
                    <CardDescription>
                      Diese Angaben werden für die Elternverwaltung verwendet.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="parentFirstName">Vorname</Label>
                      <Input
                        id="parentFirstName"
                        placeholder="Vorname"
                        required
                        value={form.firstName}
                        onChange={(e) => updateField('firstName', e.target.value)}
                        aria-invalid={Boolean(fieldErrors.firstName)}
                        aria-describedby={
                          fieldErrors.firstName ? 'parentFirstName-error' : undefined
                        }
                      />
                      {fieldErrors.firstName && (
                        <p id="parentFirstName-error" className="text-xs text-rose-600">
                          {fieldErrors.firstName}
                        </p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="parentLastName">Nachname</Label>
                      <Input
                        id="parentLastName"
                        placeholder="Nachname"
                        required
                        value={form.lastName}
                        onChange={(e) => updateField('lastName', e.target.value)}
                        aria-invalid={Boolean(fieldErrors.lastName)}
                        aria-describedby={
                          fieldErrors.lastName ? 'parentLastName-error' : undefined
                        }
                      />
                      {fieldErrors.lastName && (
                        <p id="parentLastName-error" className="text-xs text-rose-600">
                          {fieldErrors.lastName}
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
                        value={userEmail}
                        disabled
                        readOnly
                        aria-invalid={Boolean(fieldErrors.email)}
                        aria-describedby={fieldErrors.email ? 'parentEmail-error' : undefined}
                      />
                      {fieldErrors.email && (
                        <p id="parentEmail-error" className="text-xs text-rose-600">
                          {fieldErrors.email}
                        </p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="parentPhone">Telefon</Label>
                      <Input
                        id="parentPhone"
                        placeholder="Telefon"
                        required
                        value={form.phone}
                        onChange={(e) => updateField('phone', e.target.value)}
                        aria-invalid={Boolean(fieldErrors.phone)}
                        aria-describedby={fieldErrors.phone ? 'parentPhone-error' : undefined}
                      />
                      {fieldErrors.phone && (
                        <p id="parentPhone-error" className="text-xs text-rose-600">
                          {fieldErrors.phone}
                        </p>
                      )}
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <div className="flex items-start gap-2 pt-1">
                        <input
                          id="parent-newsletter-opt-in"
                          type="checkbox"
                          className="mt-1 h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-400"
                          checked={newsletterOptIn}
                          onChange={(e) => setNewsletterOptIn(e.target.checked)}
                        />
                        <Label
                          htmlFor="parent-newsletter-opt-in"
                          className="text-sm text-slate-700"
                        >
                          Mit dem E-Mail Newsletter auf dem Laufenden bleiben.
                        </Label>
                      </div>
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <div className="flex items-start gap-2 pt-1">
                        <input
                          id="parent-media-creation-accepted"
                          type="checkbox"
                          className="mt-1 h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-400"
                          checked={mediaCreationAccepted}
                          onChange={(e) => setMediaCreationAccepted(e.target.checked)}
                        />
                        <Label
                          htmlFor="parent-media-creation-accepted"
                          className="text-sm text-slate-700"
                        >
                          Die Anfertigung und Verwendung von Foto- und Videoaufnahmen
                          zu Zwecken der Öffentlichkeitsarbeit (z. B. Webseite, Social
                          Media, Drucksorten) erfolgt ausschließlich auf Grundlage
                          einer gesonderten und freiwilligen Einwilligung der
                          betroffenen Personen bzw. der Eltern oder gesetzlichen
                          Vertreter:innen.
                        </Label>
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
                    </div>
                  </CardContent>
                </Card>

                <div className="flex flex-col items-end gap-2">
                  <Button
                    type="submit"
                    className="w-auto bg-black/80 text-white border border-black"
                    disabled={loading || initialLoading}
                  >
                    {loading ? 'Speichern...' : 'Speichern'}
                  </Button>
                  {parentSaveStatus && (
                    <p
                      className={`text-sm ${
                        parentSaveStatus.type === 'success'
                          ? 'text-emerald-600'
                          : 'text-rose-600'
                      }`}
                    >
                      {parentSaveStatus.text}
                    </p>
                  )}
                </div>
              </fieldset>
            </form>
          </CardContent>
        </Card>

        <Card className="border-white/60 bg-white/80 shadow-[0_30px_60px_rgba(15,23,42,0.12)] backdrop-blur-xl">
          <CardHeader className="gap-3">
            <div>
              <CardTitle className="text-3xl md:text-4xl">SEPA Lastschriftmandat</CardTitle>
              <CardDescription>
                Verwalte dein SEPA-Lastschriftmandat für Abbuchungen.
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <Separator />
            <div className="space-y-4">
              {sepaStatusLoading ? (
                <p className="text-sm text-slate-600">Status wird geladen...</p>
              ) : (
                <>
                  {sepaError && (
                    <Alert className="border-rose-200 bg-rose-50 text-rose-700">
                      <AlertTitle>Fehler</AlertTitle>
                      <AlertDescription>{sepaError}</AlertDescription>
                    </Alert>
                  )}
                  {sepaInfo && (
                    <p className="text-sm text-emerald-600">{sepaInfo}</p>
                  )}

                  {sepaStatus === 'active' && (
                    <div className="space-y-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
                          Mandat aktiv
                        </span>
                        {sepaReference && (
                          <span className="text-xs text-slate-600">
                            Referenz: {sepaReference}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-slate-600">
                        Abbuchungen sind möglich.
                      </p>
                    </div>
                  )}

                  {sepaStatus === 'pending' && (
                    <div className="space-y-3">
                      <p className="text-sm text-slate-600">
                        Mandat erstellt. Bitte bestätige den Link in deiner E-Mail innerhalb von 24h.
                      </p>
                      {sepaReference && (
                        <p className="text-xs text-slate-500">
                          Mandatsreferenz: {sepaReference}
                        </p>
                      )}
                      <Button
                        type="button"
                        variant="outline"
                        className="w-auto border border-black text-black hover:bg-slate-50"
                        onClick={handleSepaRevoke}
                        disabled={sepaRevokeLoading}
                      >
                        {sepaRevokeLoading ? 'Widerrufen...' : 'Mandat widerrufen'}
                      </Button>
                    </div>
                  )}

                  {sepaStatus === 'revoked' && (
                    <div className="space-y-3">
                      <p className="text-sm text-slate-600">
                        Mandat widerrufen.
                      </p>
                    </div>
                  )}

                  {canCreateMandate && (
                    <div className="space-y-4">
                      <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                          <Label htmlFor="sepa-holder">Kontoinhaber:in</Label>
                          <Input
                            id="sepa-holder"
                            placeholder="Vor- und Nachname"
                            value={sepaHolderName}
                            onChange={(e) => setSepaHolderName(e.target.value)}
                            aria-invalid={Boolean(sepaFieldErrors.holder)}
                          />
                          {sepaFieldErrors.holder && (
                            <p className="text-xs text-rose-600">
                              {sepaFieldErrors.holder}
                            </p>
                          )}
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="sepa-iban">IBAN</Label>
                          <Input
                            id="sepa-iban"
                            placeholder="DE00 0000 0000 0000 0000 00"
                            value={sepaIban}
                            onChange={(e) => setSepaIban(normalizeIban(e.target.value))}
                            aria-invalid={Boolean(sepaFieldErrors.iban)}
                          />
                          {sepaFieldErrors.iban && (
                            <p className="text-xs text-rose-600">
                              {sepaFieldErrors.iban}
                            </p>
                          )}
                        </div>
                      <div className="space-y-2 md:col-span-2">
                        {sepaPreviewLoading && (
                          <p className="text-sm text-slate-600">
                            Mandat wird geladen...
                          </p>
                        )}
                        {sepaPreviewText && (
                          <pre className="w-full max-w-prose overflow-x-auto whitespace-pre-wrap break-words rounded-2xl border border-slate-200 bg-slate-50/70 p-4 text-xs text-slate-700 md:max-w-2xl">
                            {sepaPreviewText}
                          </pre>
                        )}
                      </div>
                    </div>

                      <div className="space-y-2">
                        <div className="flex items-start gap-2 pt-1">
                          <input
                            id="sepa-consent"
                            type="checkbox"
                            className="mt-1 h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-400"
                            checked={sepaConsent}
                            onChange={(e) => setSepaConsent(e.target.checked)}
                          />
                          <Label
                            htmlFor="sepa-consent"
                            className="text-sm text-slate-700"
                          >
                            Ich habe das SEPA-Lastschriftmandat gelesen und erteile ein SEPA-Lastschriftmandat.
                          </Label>
                        </div>
                        {sepaFieldErrors.consent && (
                          <p className="text-xs text-rose-600">
                            {sepaFieldErrors.consent}
                          </p>
                        )}
                      </div>

                      

                      <Button
                        type="button"
                        className="w-auto bg-black/80 text-white border border-black"
                        onClick={() =>
                          handleSepaCreate({
                            requireConsent: true,
                            setLoading: setSepaCreateLoading,
                          })
                        }
                        disabled={sepaCreateLoading || !canSubmitSepaMandate}
                      >
                        {sepaCreateLoading ? 'Senden...' : 'Mandat erteilen'}
                      </Button>
                    </div>
                  )}

                  {sepaStatus === 'active' && (
                    <div className="space-y-2">
                      {sepaPreviewLoading && (
                        <p className="text-sm text-slate-600">
                          Mandat wird geladen...
                        </p>
                      )}
                      {sepaPreviewText && (
                        <pre className="w-full max-w-prose overflow-x-auto whitespace-pre-wrap break-words rounded-2xl border border-slate-200 bg-slate-50/70 p-4 text-xs text-slate-700 md:max-w-2xl">
                          {sepaPreviewText}
                        </pre>
                      )}
                      <Button
                        type="button"
                        variant="outline"
                        className="w-auto border border-black text-black hover:bg-slate-50"
                        onClick={handleSepaRevoke}
                        disabled={sepaRevokeLoading}
                      >
                        {sepaRevokeLoading ? 'Widerrufen...' : 'Mandat widerrufen'}
                      </Button>
                    </div>
                  )}
                </>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="border-white/60 bg-white/80 shadow-[0_30px_60px_rgba(15,23,42,0.12)] backdrop-blur-xl">
          <CardHeader className="gap-3">
            <div>
              <CardTitle className="text-3xl md:text-4xl">Kinder verwalten</CardTitle>
              <CardDescription>
                Pflege die Daten deiner Kinder (Keeper) für die Anmeldungen.
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <Separator />

            {!parentId && (
              <Alert className="border-amber-200 bg-amber-50 text-amber-700">
                <AlertTitle>Elterndaten fehlen</AlertTitle>
                <AlertDescription>
                  Bitte speichere zuerst dein Elternprofil, bevor du Kinder anlegst.
                </AlertDescription>
              </Alert>
            )}

            <div className="flex items-center justify-between">
              <div className="text-sm text-slate-600">
                {childrenLoading
                  ? 'Kinder werden geladen...'
                  : `${children.length} Kind${
                      children.length === 1 ? '' : 'er'
                    } gespeichert.`}
              </div>
              <Button
                type="button"
                className="w-auto bg-black/80 text-white border border-black"
                onClick={addChild}
                disabled={!parentId || childrenLoading}
              >
                Kind hinzufügen
              </Button>
            </div>

            <div className="space-y-6">
              {children.map((child, index) => {
                const childKey = getChildKey(child)
                const errors = childFieldErrors[childKey] ?? {}
                const isSaving = Boolean(childSaving[childKey])
                const isDeleting = Boolean(childDeleting[childKey])
                const isExpanded = childExpanded[childKey] !== false
                return (
                  <Card
                    key={childKey}
                    className="border-slate-200/70 bg-white/70 shadow-none"
                  >
                    <CardHeader className={isExpanded ? "p-4 pb-0" : "p-4"}>
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <CardTitle className="text-base">
                            Kind {index + 1}
                            {child.firstName || child.lastName
                              ? ` · ${child.firstName} ${child.lastName}`.trim()
                              : ''}
                          </CardTitle>
                          <Button
                            type="button"
                            variant="outline"
                            className="w-auto bg-white text-black border border-black"
                            onClick={() => toggleChildExpanded(childKey)}
                            aria-label={isExpanded ? 'Einklappen' : 'Ausklappen'}
                          >
                            {isExpanded ? '▲' : '▼'}
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            className="w-auto bg-black/80 text-white border border-black"
                            onClick={() => handleChildDelete(child)}
                            aria-label="Kind löschen"
                            disabled={isSaving || isDeleting}
                          >
                            🗑
                          </Button>
                        </div>
                        {isExpanded && (
                          <span className="rounded-full bg-rose-100 px-3 py-1 text-xs font-semibold text-rose-600">
                            Pflichtfelder *
                          </span>
                        )}
                      </div>
                    </CardHeader>
                    {isExpanded && (
                      <CardContent className="grid gap-4 p-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor={`child-first-name-${childKey}`}>
                          Vorname *
                        </Label>
                        <Input
                          id={`child-first-name-${childKey}`}
                          placeholder="Vorname"
                          required
                          value={child.firstName}
                          onChange={(e) =>
                            updateChildField(childKey, 'firstName', e.target.value)
                          }
                          aria-invalid={Boolean(errors.firstName)}
                          aria-describedby={
                            errors.firstName
                              ? `child-first-name-${childKey}-error`
                              : undefined
                          }
                        />
                        {errors.firstName && (
                          <p
                            id={`child-first-name-${childKey}-error`}
                            className="text-xs text-rose-600"
                          >
                            {errors.firstName}
                          </p>
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor={`child-last-name-${childKey}`}>
                          Nachname *
                        </Label>
                        <Input
                          id={`child-last-name-${childKey}`}
                          placeholder="Nachname"
                          required
                          value={child.lastName}
                          onChange={(e) =>
                            updateChildField(childKey, 'lastName', e.target.value)
                          }
                          aria-invalid={Boolean(errors.lastName)}
                          aria-describedby={
                            errors.lastName
                              ? `child-last-name-${childKey}-error`
                              : undefined
                          }
                        />
                        {errors.lastName && (
                          <p
                            id={`child-last-name-${childKey}-error`}
                            className="text-xs text-rose-600"
                          >
                            {errors.lastName}
                          </p>
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor={`child-birth-date-${childKey}`}>
                          Geburtsdatum *
                        </Label>
                        <Input
                          id={`child-birth-date-${childKey}`}
                          type="date"
                          required
                          value={child.birthDate}
                          onChange={(e) =>
                            updateChildField(childKey, 'birthDate', e.target.value)
                          }
                          aria-invalid={Boolean(errors.birthDate)}
                          aria-describedby={
                            errors.birthDate
                              ? `child-birth-date-${childKey}-error`
                              : undefined
                          }
                        />
                        {errors.birthDate && (
                          <p
                            id={`child-birth-date-${childKey}-error`}
                            className="text-xs text-rose-600"
                          >
                            {errors.birthDate}
                          </p>
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor={`child-gender-${childKey}`}>
                          Geschlecht *
                        </Label>
                        <select
                          id={`child-gender-${childKey}`}
                          className="flex h-11 w-full rounded-xl border border-slate-200 bg-white/90 px-3 py-2 text-sm text-slate-900 shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 disabled:cursor-not-allowed disabled:opacity-60"
                          required
                          value={child.gender}
                          onChange={(e) =>
                            updateChildField(childKey, 'gender', e.target.value)
                          }
                          aria-invalid={Boolean(errors.gender)}
                          aria-describedby={
                            errors.gender
                              ? `child-gender-${childKey}-error`
                              : undefined
                          }
                        >
                          <option value="">Bitte auswählen</option>
                          <option value="male">Männlich</option>
                          <option value="female">Weiblich</option>
                          <option value="diverse">Divers</option>
                        </select>
                        {errors.gender && (
                          <p
                            id={`child-gender-${childKey}-error`}
                            className="text-xs text-rose-600"
                          >
                            {errors.gender}
                          </p>
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor={`child-team-${childKey}`}>Team</Label>
                        <Input
                          id={`child-team-${childKey}`}
                          placeholder="Team/Verein"
                          value={child.team}
                          onChange={(e) =>
                            updateChildField(childKey, 'team', e.target.value)
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor={`child-insurance-${childKey}`}>
                          Versicherungsnummer
                        </Label>
                        <Input
                          id={`child-insurance-${childKey}`}
                          placeholder="Versicherungsnummer"
                          value={child.healthInsuranceNumber}
                          onChange={(e) =>
                            updateChildField(
                              childKey,
                              'healthInsuranceNumber',
                              e.target.value
                            )
                          }
                        />
                      </div>
                      <div className="space-y-2 md:col-span-2">
                        <Label htmlFor={`child-medication-${childKey}`}>
                          Medikamente
                        </Label>
                        <Input
                          id={`child-medication-${childKey}`}
                          placeholder="Medikamente"
                          value={child.medication}
                          onChange={(e) =>
                            updateChildField(childKey, 'medication', e.target.value)
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor={`child-glove-${childKey}`}>
                          Handschuhgröße *
                        </Label>
                        <Input
                          id={`child-glove-${childKey}`}
                          type="number"
                          min="0"
                          step="0.5"
                          placeholder="z.B. 6.5"
                          value={child.gloveSize}
                          onChange={(e) =>
                            updateChildField(childKey, 'gloveSize', e.target.value)
                          }
                          aria-invalid={Boolean(errors.gloveSize)}
                          aria-describedby={
                            errors.gloveSize
                              ? `child-glove-${childKey}-error`
                              : undefined
                          }
                        />
                        {errors.gloveSize && (
                          <p
                            id={`child-glove-${childKey}-error`}
                            className="text-xs text-rose-600"
                          >
                            {errors.gloveSize}
                          </p>
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor={`child-shirt-${childKey}`}>
                          Shirtgröße *
                        </Label>
                        <Input
                          id={`child-shirt-${childKey}`}
                          placeholder="z.B. 176, M, L"
                          value={child.shirtSize}
                          onChange={(e) =>
                            updateChildField(childKey, 'shirtSize', e.target.value)
                          }
                          aria-invalid={Boolean(errors.shirtSize)}
                          aria-describedby={
                            errors.shirtSize
                              ? `child-shirt-${childKey}-error`
                              : undefined
                          }
                        />
                        {errors.shirtSize && (
                          <p
                            id={`child-shirt-${childKey}-error`}
                            className="text-xs text-rose-600"
                          >
                            {errors.shirtSize}
                          </p>
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor={`child-diet-${childKey}`}>Ernährung</Label>
                        <select
                          id={`child-diet-${childKey}`}
                          value={child.diet}
                          onChange={(e) =>
                            updateChildField(childKey, 'diet', e.target.value)
                          }
                          className="flex h-11 w-full rounded-xl border border-slate-200 bg-white/90 px-3 py-2 text-sm text-slate-900 shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 disabled:cursor-not-allowed disabled:opacity-60"
                          aria-invalid={Boolean(errors.diet)}
                          aria-describedby={
                            errors.diet
                              ? `child-diet-${childKey}-error`
                              : undefined
                          }
                        >
                          <option value="none">Keine besondere Ernährung</option>
                          <option value="vegetarian">Vegetarisch</option>
                          <option value="vegan">Vegan</option>
                        </select>
                        {errors.diet && (
                          <p
                            id={`child-diet-${childKey}-error`}
                            className="text-xs text-rose-600"
                          >
                            {errors.diet}
                          </p>
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor={`child-relationship-${childKey}`}>
                          Beziehung zum Kind *
                        </Label>
                        <select
                          id={`child-relationship-${childKey}`}
                          className="flex h-11 w-full rounded-xl border border-slate-200 bg-white/90 px-3 py-2 text-sm text-slate-900 shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 disabled:cursor-not-allowed disabled:opacity-60"
                          required
                          value={child.relationship}
                          onChange={(e) =>
                            updateChildField(childKey, 'relationship', e.target.value)
                          }
                          aria-invalid={Boolean(errors.relationship)}
                          aria-describedby={
                            errors.relationship
                              ? `child-relationship-${childKey}-error`
                              : undefined
                          }
                        >
                          <option value="">Bitte auswählen</option>
                          <option value="parent">Eltern</option>
                          <option value="grandparent">Großeltern</option>
                          <option value="relatives">Verwandtschaft</option>
                          <option value="supervisor">Aufsichtsperson</option>
                          <option value="other">Sonstige</option>
                        </select>
                        {errors.relationship && (
                          <p
                            id={`child-relationship-${childKey}-error`}
                            className="text-xs text-rose-600"
                          >
                            {errors.relationship}
                          </p>
                        )}
                      </div>
                      <div className="space-y-2 md:col-span-2">
                        <div className="flex items-start gap-2 pt-1">
                          <input
                            id={`child-primary-${childKey}`}
                            type="checkbox"
                            className="mt-1 h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-400"
                            checked={child.isPrimary}
                            onChange={(e) =>
                              updateChildField(childKey, 'isPrimary', e.target.checked)
                            }
                          />
                          <Label
                            htmlFor={`child-primary-${childKey}`}
                            className="text-sm text-slate-700"
                          >
                            Ich bin erster Ansprechpartner für dieses Kind
                          </Label>
                        </div>
                      </div>
                      </CardContent>
                    )}
                    {isExpanded && (
                      <CardContent className="flex flex-col items-end gap-2 pt-0">
                        <Button
                          type="button"
                          className="w-auto bg-black/80 text-white border border-black"
                          onClick={() => handleChildSave(child)}
                          disabled={!parentId || childrenLoading || isSaving}
                        >
                          {isSaving ? 'Speichern...' : 'Speichern'}
                        </Button>
                        {childSaveStatus[childKey] && (
                          <p
                            className={`text-sm ${
                              childSaveStatus[childKey]?.type === 'success'
                                ? 'text-emerald-600'
                                : 'text-rose-600'
                            }`}
                          >
                            {childSaveStatus[childKey]?.text}
                          </p>
                        )}
                      </CardContent>
                    )}
                  </Card>
                )
              })}

              {children.length === 0 && !childrenLoading && (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-white/60 p-6 text-center text-sm text-slate-500">
                  Noch keine Kinder angelegt. Klicke auf „Kind hinzufügen“, um
                  dein erstes Kind zu erfassen.
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="border-white/60 bg-white/80 shadow-[0_30px_60px_rgba(15,23,42,0.12)] backdrop-blur-xl">
          <CardHeader className="gap-3">
            <div>
              <CardTitle className="text-3xl md:text-4xl">
                Wöchentliches Gruppentraining
              </CardTitle>
              <CardDescription>
                Wähle pro Kind die gewünschten Gruppentrainings aus.
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <Separator />

            <div className="text-sm text-slate-600">
              {weeklyEventsLoading
                ? 'Trainings werden geladen...'
                : `${weeklyEvents.length} offene Termine verfügbar.`}
            </div>

            {children.length === 0 && (
              <Alert className="border-amber-200 bg-amber-50 text-amber-700">
                <AlertTitle>Keine Kinder hinterlegt</AlertTitle>
                <AlertDescription>
                  Bitte lege zuerst Kinder an, um Trainings auswählen zu können.
                </AlertDescription>
              </Alert>
            )}

            {!weeklyEventsLoading && weeklyEvents.length === 0 && (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-white/60 p-6 text-center text-sm text-slate-500">
                Aktuell sind keine offenen Gruppentrainings verfügbar.
              </div>
            )}

            {weeklyEvents.length > 0 && children.length > 0 && (
              <div className="space-y-4">
                <div className="space-y-4 md:hidden">
                  {weeklyEvents.map((event) => {
                    const metaParts = [
                      formatEventDate(event.startDate),
                      formatEventTimeRange(event.startTime, event.endTime),
                      formatEventPrice(event.price),
                      event.locationName ? event.locationName : null,
                    ].filter(Boolean) as string[]
                    return (
                      <div
                        key={event.id}
                        className="rounded-2xl border border-slate-200 bg-white/70 p-4 shadow-sm"
                      >
                        <div className="space-y-1">
                          <p className="text-sm font-semibold text-slate-900">
                            {event.title}
                          </p>
                          {event.description && (
                            <p className="text-xs text-slate-600">
                              {event.description}
                            </p>
                          )}
                          <p className="text-xs text-slate-500">
                            {metaParts.join(' | ')}
                          </p>
                        </div>
                        <div className="mt-3 space-y-2">
                          {children.map((child, index) => {
                            const childKey = getChildKey(child)
                            const checkboxId = `weekly-${event.id}-${childKey}`
                            const childLabel = `${child.firstName} ${child.lastName}`.trim()
                            const status = child.id
                              ? weeklyRegistrationStatus[event.id]?.[child.id]
                              : ''
                            const isLocked = status === 'confirmed'
                            const isChecked = [
                              'submitted',
                              'accepted',
                              'confirmed',
                            ].includes(status)
                            return (
                              <label
                                key={`${event.id}-${childKey}`}
                                htmlFor={checkboxId}
                                className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white/70 px-3 py-2 text-sm text-slate-700"
                              >
                                <span className="font-medium">
                                  {childLabel || `Kind ${index + 1}`}
                                </span>
                                <input
                                  id={checkboxId}
                                  type="checkbox"
                                  className={`h-4 w-4 rounded ${
                                    status === 'accepted'
                                      ? 'border-emerald-300 text-emerald-600 focus:ring-emerald-400 accent-emerald-600'
                                      : 'border-slate-300 text-indigo-600 focus:ring-indigo-400 accent-indigo-600'
                                  }`}
                                  checked={isChecked}
                                  disabled={!child.id || weeklySaving || isLocked}
                                  onChange={(e) =>
                                    toggleWeeklySelection(
                                      event.id,
                                      childKey,
                                      e.target.checked,
                                      child.id
                                    )
                                  }
                                  aria-label={`Teilnahme von ${child.firstName || 'Kind'} an ${event.title}`}
                                />
                              </label>
                            )
                          })}
                        </div>
                      </div>
                    )
                  })}
                </div>

                <div className="hidden overflow-auto rounded-2xl border border-slate-200 bg-white/70 md:block">
                  <div
                    className="grid min-w-[680px] border-b border-slate-200 bg-slate-50/80 text-xs font-semibold text-slate-600"
                    style={{
                      gridTemplateColumns: `minmax(240px, 1.6fr) repeat(${children.length}, minmax(140px, 1fr))`,
                    }}
                  >
                    <div className="px-4 py-3">Training</div>
                    {children.map((child, index) => {
                      const childLabel = `${child.firstName} ${child.lastName}`.trim()
                      return (
                        <div key={child.tempId} className="px-4 py-3 text-center">
                          {childLabel || `Kind ${index + 1}`}
                        </div>
                      )
                    })}
                  </div>

                  {weeklyEvents.map((event) => {
                    const metaParts = [
                      formatEventDate(event.startDate),
                      formatEventTimeRange(event.startTime, event.endTime),
                      formatEventPrice(event.price),
                      event.locationName ? event.locationName : null,
                    ].filter(Boolean) as string[]
                    return (
                      <div
                        key={event.id}
                        className="grid min-w-[680px] border-b border-slate-100 last:border-b-0"
                        style={{
                          gridTemplateColumns: `minmax(240px, 1.6fr) repeat(${children.length}, minmax(140px, 1fr))`,
                        }}
                      >
                        <div className="space-y-1 px-4 py-3">
                          <p className="text-sm font-semibold text-slate-900">
                            {event.title}
                          </p>
                          {event.description && (
                            <p className="text-xs text-slate-600">
                              {event.description}
                            </p>
                          )}
                          <p className="text-xs text-slate-500">
                            {metaParts.join(' | ')}
                          </p>
                        </div>
                        {children.map((child) => {
                          const childKey = getChildKey(child)
                          const checkboxId = `weekly-${event.id}-${childKey}`
                          const status = child.id
                            ? weeklyRegistrationStatus[event.id]?.[child.id]
                            : ''
                          const isLocked = status === 'confirmed'
                          const isChecked = [
                            'submitted',
                            'accepted',
                            'confirmed',
                          ].includes(status)
                          return (
                            <div
                              key={`${event.id}-${childKey}`}
                              className="flex items-center justify-center px-4 py-3"
                            >
                              <input
                                id={checkboxId}
                                type="checkbox"
                                className={`h-4 w-4 rounded ${
                                  status === 'accepted'
                                    ? 'border-emerald-300 text-emerald-600 focus:ring-emerald-400 accent-emerald-600'
                                    : 'border-slate-300 text-indigo-600 focus:ring-indigo-400 accent-indigo-600'
                                }`}
                                checked={isChecked}
                                disabled={!child.id || weeklySaving || isLocked}
                                onChange={(e) =>
                                  toggleWeeklySelection(
                                    event.id,
                                    childKey,
                                    e.target.checked,
                                    child.id
                                  )
                                }
                                aria-label={`Teilnahme von ${child.firstName || 'Kind'} an ${event.title}`}
                              />
                            </div>
                          )
                        })}
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            <div className="flex justify-end">
              <Button
                type="button"
                className="w-auto bg-black/80 text-white border border-black"
                disabled={
                  weeklyEventsLoading ||
                  weeklySaving ||
                  weeklyEvents.length === 0 ||
                  children.length === 0
                }
                onClick={handleWeeklySave}
              >
                {weeklySaving ? 'Speichern...' : 'Speichern'}
              </Button>
            </div>
            {weeklySaveStatus && (
              <p
                className={`text-sm ${
                  weeklySaveStatus.type === 'success'
                    ? 'text-emerald-600'
                    : 'text-rose-600'
                }`}
              >
                {weeklySaveStatus.text}
              </p>
            )}
          </CardContent>
        </Card>

        <Card className="border-white/60 bg-white/80 shadow-[0_30px_60px_rgba(15,23,42,0.12)] backdrop-blur-xl">
          <CardHeader className="gap-3">
            <div>
              <CardTitle className="text-3xl md:text-4xl">
                Camps
              </CardTitle>
              <CardDescription>
                Wähle pro Kind die gewünschten Camps aus.
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <Separator />

            <div className="text-sm text-slate-600">
              {campEventsLoading
                ? 'Camps werden geladen...'
                : `${campEvents.length} offene Camps verfügbar.`}
            </div>

            {children.length === 0 && (
              <Alert className="border-amber-200 bg-amber-50 text-amber-700">
                <AlertTitle>Keine Kinder hinterlegt</AlertTitle>
                <AlertDescription>
                  Bitte lege zuerst Kinder an, um Camps auswählen zu können.
                </AlertDescription>
              </Alert>
            )}

            {!campEventsLoading && campEvents.length === 0 && (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-white/60 p-6 text-center text-sm text-slate-500">
                Aktuell sind keine offenen Camps verfügbar.
              </div>
            )}

            {campEvents.length > 0 && children.length > 0 && (
              <div className="space-y-4">
                <div className="space-y-4 md:hidden">
                  {campEvents.map((event) => {
                    const metaParts = [
                      formatCampDateRange(event.startDate, event.endDate),
                      formatEventTimeRange(event.startTime, event.endTime),
                      formatEventPrice(event.price),
                      event.locationName ? event.locationName : null,
                    ].filter(Boolean) as string[]
                    return (
                      <div
                        key={event.id}
                        className="rounded-2xl border border-slate-200 bg-white/70 p-4 shadow-sm"
                      >
                        <div className="space-y-1">
                          <p className="text-sm font-semibold text-slate-900">
                            {event.title}
                          </p>
                          {event.description && (
                            <p className="text-xs text-slate-600">
                              {event.description}
                            </p>
                          )}
                          <p className="text-xs text-slate-500">
                            {metaParts.join(' | ')}
                          </p>
                        </div>
                        <div className="mt-3 space-y-2">
                          {children.map((child, index) => {
                            const childKey = getChildKey(child)
                            const checkboxId = `camp-${event.id}-${childKey}`
                            const childLabel = `${child.firstName} ${child.lastName}`.trim()
                            const status = child.id
                              ? campRegistrationStatus[event.id]?.[child.id]
                              : ''
                            const isLocked = status === 'confirmed'
                            const isChecked = [
                              'submitted',
                              'accepted',
                              'confirmed',
                            ].includes(status)
                            return (
                              <label
                                key={`${event.id}-${childKey}`}
                                htmlFor={checkboxId}
                                className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white/70 px-3 py-2 text-sm text-slate-700"
                              >
                                <span className="font-medium">
                                  {childLabel || `Kind ${index + 1}`}
                                </span>
                                <input
                                  id={checkboxId}
                                  type="checkbox"
                                  className={`h-4 w-4 rounded ${
                                    status === 'accepted'
                                      ? 'border-emerald-300 text-emerald-600 focus:ring-emerald-400 accent-emerald-600'
                                      : 'border-slate-300 text-indigo-600 focus:ring-indigo-400 accent-indigo-600'
                                  }`}
                                  checked={isChecked}
                                  disabled={!child.id || campSaving || isLocked}
                                  onChange={(e) =>
                                    toggleCampSelection(
                                      event.id,
                                      childKey,
                                      e.target.checked,
                                      child.id
                                    )
                                  }
                                  aria-label={`Teilnahme von ${child.firstName || 'Kind'} an ${event.title}`}
                                />
                              </label>
                            )
                          })}
                        </div>
                      </div>
                    )
                  })}
                </div>

                <div className="hidden overflow-auto rounded-2xl border border-slate-200 bg-white/70 md:block">
                  <div
                    className="grid min-w-[680px] border-b border-slate-200 bg-slate-50/80 text-xs font-semibold text-slate-600"
                    style={{
                      gridTemplateColumns: `minmax(240px, 1.6fr) repeat(${children.length}, minmax(140px, 1fr))`,
                    }}
                  >
                    <div className="px-4 py-3">Camp</div>
                    {children.map((child, index) => {
                      const childLabel = `${child.firstName} ${child.lastName}`.trim()
                      return (
                        <div key={child.tempId} className="px-4 py-3 text-center">
                          {childLabel || `Kind ${index + 1}`}
                        </div>
                      )
                    })}
                  </div>

                  {campEvents.map((event) => {
                    const metaParts = [
                      formatCampDateRange(event.startDate, event.endDate),
                      formatEventTimeRange(event.startTime, event.endTime),
                      formatEventPrice(event.price),
                      event.locationName ? event.locationName : null,
                    ].filter(Boolean) as string[]
                    return (
                      <div
                        key={event.id}
                        className="grid min-w-[680px] border-b border-slate-100 last:border-b-0"
                        style={{
                          gridTemplateColumns: `minmax(240px, 1.6fr) repeat(${children.length}, minmax(140px, 1fr))`,
                        }}
                      >
                        <div className="space-y-1 px-4 py-3">
                          <p className="text-sm font-semibold text-slate-900">
                            {event.title}
                          </p>
                          {event.description && (
                            <p className="text-xs text-slate-600">
                              {event.description}
                            </p>
                          )}
                          <p className="text-xs text-slate-500">
                            {metaParts.join(' | ')}
                          </p>
                        </div>
                        {children.map((child) => {
                          const childKey = getChildKey(child)
                          const checkboxId = `camp-${event.id}-${childKey}`
                          const status = child.id
                            ? campRegistrationStatus[event.id]?.[child.id]
                            : ''
                          const isLocked = status === 'confirmed'
                          const isChecked = [
                            'submitted',
                            'accepted',
                            'confirmed',
                          ].includes(status)
                          return (
                            <div
                              key={`${event.id}-${childKey}`}
                              className="flex items-center justify-center px-4 py-3"
                            >
                              <input
                                id={checkboxId}
                                type="checkbox"
                                className={`h-4 w-4 rounded ${
                                  status === 'accepted'
                                    ? 'border-emerald-300 text-emerald-600 focus:ring-emerald-400 accent-emerald-600'
                                    : 'border-slate-300 text-indigo-600 focus:ring-indigo-400 accent-indigo-600'
                                }`}
                                checked={isChecked}
                                disabled={!child.id || campSaving || isLocked}
                                onChange={(e) =>
                                  toggleCampSelection(
                                    event.id,
                                    childKey,
                                    e.target.checked,
                                    child.id
                                  )
                                }
                                aria-label={`Teilnahme von ${child.firstName || 'Kind'} an ${event.title}`}
                              />
                            </div>
                          )
                        })}
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            <div className="flex justify-end">
              <Button
                type="button"
                className="w-auto bg-black/80 text-white border border-black"
                disabled={
                  campEventsLoading ||
                  campSaving ||
                  campEvents.length === 0 ||
                  children.length === 0
                }
                onClick={handleCampSave}
              >
                {campSaving ? 'Speichern...' : 'Speichern'}
              </Button>
            </div>
            {campSaveStatus && (
              <p
                className={`text-sm ${
                  campSaveStatus.type === 'success'
                    ? 'text-emerald-600'
                    : 'text-rose-600'
                }`}
              >
                {campSaveStatus.text}
              </p>
            )}
          </CardContent>
        </Card>

        <Card className="border-rose-200/80 bg-white/80 shadow-[0_30px_60px_rgba(190,18,60,0.18)] backdrop-blur-xl">
          <CardHeader className="gap-3">
            <div>
              <CardTitle className="text-3xl text-rose-700 md:text-4xl">
                Dangerzone
              </CardTitle>
              <CardDescription className="text-rose-700/80">
                Das Löschen deines Zugangs entfernt alle gespeicherten Daten und ist
                endgültig.
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert className="border-rose-200 bg-white/80 text-rose-700">
              <AlertTitle>Unwiderruflich</AlertTitle>
              <AlertDescription>
                Dieser Vorgang kann nicht rückgängig gemacht werden. Bitte prüfe
                sorgfältig, ob du wirklich alle Daten löschen möchtest.
              </AlertDescription>
            </Alert>
            <div className="flex flex-wrap items-center gap-3">
              <Button
                type="button"
                className="w-auto bg-rose-600 text-black border border-black"
                onClick={handleDeleteAccountStart}
              >
                Zugang löschen
              </Button>
              {deleteStatus && (
                <p
                  className={`text-sm ${
                    deleteStatus.type === 'success'
                      ? 'text-emerald-600'
                      : 'text-rose-600'
                  }`}
                >
                  {deleteStatus.text}
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {deleteDialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 px-4 py-6">
          <div className="w-full max-w-lg rounded-3xl border border-rose-200 bg-white p-6 shadow-2xl">
            <div className="space-y-3">
              <h2 className="text-xl font-semibold text-rose-700">
                Konto endgültig löschen
              </h2>
              <p className="text-sm text-slate-600">
                Tippe <span className="font-semibold text-rose-700">ACCOUNT-LÖSCHEN</span>{' '}
                ein, um fortzufahren.
              </p>
            </div>
            <div className="mt-5 space-y-2">
              <Label htmlFor="delete-account-confirmation" className="text-rose-700">
                Bestätigungscode
              </Label>
              <Input
                id="delete-account-confirmation"
                placeholder="ACCOUNT-LÖSCHEN"
                value={deletePhrase}
                onChange={(e) => setDeletePhrase(e.target.value)}
              />
            </div>
            {deleteStatus && (
              <p
                className={`mt-3 text-sm ${
                  deleteStatus.type === 'success' ? 'text-emerald-600' : 'text-rose-600'
                }`}
              >
                {deleteStatus.text}
              </p>
            )}
            <div className="mt-6 flex flex-wrap items-center justify-end gap-3">
              <Button
                type="button"
                variant="outline"
                className="w-auto border border-black text-black hover:bg-slate-50"
                onClick={() => setDeleteDialogOpen(false)}
                disabled={deleteLoading}
              >
                Abbrechen
              </Button>
              <Button
                type="button"
                className="w-auto bg-black/80 text-white border border-black"
                onClick={handleDeleteAccount}
                disabled={deletePhrase !== 'ACCOUNT-LÖSCHEN' || deleteLoading}
              >
                {deleteLoading ? 'Löschen...' : 'Meinen Zugang endgültig löschen'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
