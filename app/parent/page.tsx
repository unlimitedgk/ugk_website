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
  allergies: string
  medication: string
  gloveSize: string
  shirtSize: string
  relationship: string
  isPrimary: boolean
}

export default function ParentLandingPage() {
  const [form, setForm] = useState<ParentForm>({
    firstName: '',
    lastName: '',
    phone: '',
  })
  const [parentId, setParentId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [initialLoading, setInitialLoading] = useState(true)
  const [userEmail, setUserEmail] = useState<string>('')
  const [parentSaveStatus, setParentSaveStatus] = useState<{
    type: 'success' | 'error'
    text: string
  } | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [children, setChildren] = useState<ChildForm[]>([])
  const [childrenLoading, setChildrenLoading] = useState(false)
  const [childSaveStatus, setChildSaveStatus] = useState<
    Record<string, { type: 'success' | 'error'; text: string } | null>
  >({})
  const [childFieldErrors, setChildFieldErrors] = useState<
    Record<string, Record<string, string>>
  >({})
  const [childSaving, setChildSaving] = useState<Record<string, boolean>>({})
  const [childDeleting, setChildDeleting] = useState<Record<string, boolean>>({})
  const [childExpanded, setChildExpanded] = useState<Record<string, boolean>>({})

  const createTempId = () =>
    `tmp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

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
    allergies: '',
    medication: '',
    gloveSize: '',
    shirtSize: '',
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
        'id, first_name, last_name, birth_date, gender, email, phone, team, health_insurance_number, allergies, medication, glove_size, shirt_size, created_at'
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
        allergies: row.allergies ?? '',
        medication: row.medication ?? '',
        gloveSize: row.glove_size ? String(row.glove_size) : '',
        shirtSize: row.shirt_size ?? '',
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

    const { error: keeperError } = await supabase
      .from('keepers')
      .delete()
      .eq('id', child.id)

    if (keeperError) {
      setChildSaveStatus((prev) => ({
        ...prev,
        [childKey]: { type: 'error', text: keeperError.message },
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
      allergies: child.allergies.trim() || null,
      medication: child.medication.trim() || null,
      glove_size: gloveSize,
      shirt_size: child.shirtSize.trim() || null,
    }

    const query = child.id
      ? supabase.from('keepers').update(payload).eq('id', child.id).select('id')
      : supabase.from('keepers').insert(payload).select('id').single()

    const { data, error } = await query

    if (error) {
      setChildSaveStatus((prev) => ({
        ...prev,
        [childKey]: { type: 'error', text: 'Speichern fehlgeschlagen.' },
      }))
      setChildSaving((prev) => ({ ...prev, [childKey]: false }))
      return
    }

    const keeperId = child.id ?? (Array.isArray(data) ? data[0]?.id : data?.id)

    if (!keeperId) {
      setChildSaveStatus((prev) => ({
        ...prev,
        [childKey]: { type: 'error', text: 'Speichern fehlgeschlagen.' },
      }))
      setChildSaving((prev) => ({ ...prev, [childKey]: false }))
      return
    }

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
      setUserEmail(nextUserEmail)

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

      setInitialLoading(false)
    }

    loadParentData()
  }, [])

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

    setParentSaveStatus({ type: 'success', text: 'Speichern erfolgreich.' })
    setLoading(false)
  }

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

            <form onSubmit={handleSubmit} className="space-y-6">
              <fieldset disabled={loading || initialLoading} className="space-y-6">
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
                  </CardContent>
                </Card>

                <div className="flex flex-col items-end gap-2">
                  <Button
                    type="submit"
                    className="rounded-full px-6"
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
              <CardTitle className="text-3xl md:text-4xl">Kinder verwalten</CardTitle>
              <CardDescription>
                Pflege die Daten deiner Kinder (Keeper) für die Anmeldungen fest.
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
                className="rounded-full px-6"
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
                    <CardHeader className="pb-0">
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
                            className="h-8 rounded-full px-3"
                            onClick={() => toggleChildExpanded(childKey)}
                            aria-label={isExpanded ? 'Einklappen' : 'Ausklappen'}
                          >
                            {isExpanded ? '▲' : '▼'}
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            className="h-8 rounded-full border-rose-200 px-3 text-rose-600 hover:bg-rose-50 hover:text-rose-700"
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
                      <CardContent className="grid gap-4 md:grid-cols-2">
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
                        <Label htmlFor={`child-email-${childKey}`}>E-Mail</Label>
                        <Input
                          id={`child-email-${childKey}`}
                          type="email"
                          placeholder="E-Mail"
                          value={child.email}
                          onChange={(e) =>
                            updateChildField(childKey, 'email', e.target.value)
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor={`child-phone-${childKey}`}>Telefon</Label>
                        <Input
                          id={`child-phone-${childKey}`}
                          placeholder="Telefon"
                          value={child.phone}
                          onChange={(e) =>
                            updateChildField(childKey, 'phone', e.target.value)
                          }
                        />
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
                        <Label htmlFor={`child-allergies-${childKey}`}>
                          Allergien
                        </Label>
                        <Input
                          id={`child-allergies-${childKey}`}
                          placeholder="Allergien"
                          value={child.allergies}
                          onChange={(e) =>
                            updateChildField(childKey, 'allergies', e.target.value)
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
                          Handschuhgröße
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
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor={`child-shirt-${childKey}`}>
                          Shirtgröße
                        </Label>
                        <Input
                          id={`child-shirt-${childKey}`}
                          placeholder="z.B. S, M, L"
                          value={child.shirtSize}
                          onChange={(e) =>
                            updateChildField(childKey, 'shirtSize', e.target.value)
                          }
                        />
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
                            Ich bin erster Ansprechpartner für dieses Kind *
                          </Label>
                        </div>
                      </div>
                      </CardContent>
                    )}
                    {isExpanded && (
                      <CardContent className="flex flex-col items-end gap-2 pt-0">
                        <Button
                          type="button"
                          className="rounded-full px-6"
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
      </div>
    </main>
  )
}
