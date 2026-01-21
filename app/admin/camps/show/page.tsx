'use client'

import { useMemo, useState } from 'react'
import useSWR from 'swr'
import { supabase } from '@/lib/supabaseClient'
import Navbar from '@/components/Navbar'

export default function AdminCampsShowPage() {
  const [editingCampId, setEditingCampId] = useState<string | null>(null)
  const [editDraft, setEditDraft] = useState<Record<string, any> | null>(null)
  const [rowError, setRowError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const {
    data: campsData,
    error: campsError,
    mutate: mutateCamps,
  } = useSWR('admin-camps', async () => {
    const { data, error } = await supabase
      .from('camps')
      .select('*')
      .order('start_date', { ascending: true })

    if (error) throw error
    return data ?? []
  })

  const { data: registrationsData, error: registrationsError } = useSWR(
    'camp-registrations',
    async () => {
      const { data, error } = await supabase.from('camp_registrations').select('camp_id')
      if (error) throw error
      return data ?? []
    }
  )

  const registrationCountMap = useMemo(() => {
    const countMap = new Map<string, number>()
    registrationsData?.forEach((r: any) => {
      const campId = String(r.camp_id)
      countMap.set(campId, (countMap.get(campId) ?? 0) + 1)
    })
    return countMap
  }, [registrationsData])

  const numberKeys = useMemo(() => new Set(['capacity', 'price', 'age_min', 'age_max']), [])
  const dateKeys = useMemo(() => new Set(['start_date', 'end_date']), [])
  const timeKeys = useMemo(() => new Set(['daily_start_time', 'daily_end_time']), [])

  const camps = campsData ?? []
  const campColumns = useMemo(() => {
    if (!camps.length) return []
    return Object.keys(camps[0] ?? {}).filter(
      (key) => !['id', 'created_by', 'created_at', 'status'].includes(key)
    )
  }, [camps])

  const formatHeader = (key: string) =>
    key
      .replace(/_/g, ' ')
      .replace(/\b\w/g, (char) => char.toUpperCase())

  const isBooleanKey = (key: string) =>
    key.startsWith('is_') || key.endsWith('_enabled') || key.endsWith('_active')

  const coerceBoolean = (value: any) => {
    if (typeof value === 'boolean') return value
    if (typeof value === 'number') return value === 1
    if (typeof value === 'string') {
      const normalized = value.trim().toLowerCase()
      if (['true', 't', '1', 'yes', 'open'].includes(normalized)) return true
      if (['false', 'f', '0', 'no', 'closed'].includes(normalized)) return false
    }
    return false
  }

  const formatForInput = (value: any, key: string) => {
    if (value === null || value === undefined) return ''
    if (dateKeys.has(key)) {
      const stringValue = String(value)
      return stringValue.includes('T') ? stringValue.split('T')[0] : stringValue
    }
    if (timeKeys.has(key)) {
      const stringValue = String(value)
      return stringValue.length >= 5 ? stringValue.slice(0, 5) : stringValue
    }
    if (isBooleanKey(key)) {
      return coerceBoolean(value)
    }
    return value
  }

  const formatForDatabase = (value: any, key: string) => {
    if (isBooleanKey(key)) {
      if (value === '' || value === null || value === undefined) return null
      return coerceBoolean(value)
    }
    if (numberKeys.has(key)) {
      if (value === '' || value === null || value === undefined) return null
      const numeric = Number(value)
      return Number.isNaN(numeric) ? null : numeric
    }
    if (dateKeys.has(key) || timeKeys.has(key)) {
      return value === '' ? null : value
    }
    return value === '' ? null : value
  }

  if (campsError || registrationsError) {
    console.error('[AdminCampsShow] Load error', campsError || registrationsError)
    return <p className="p-6">Failed to load camps.</p>
  }

  if (!campsData || !registrationsData) {
    return <p className="p-6">Loading camps…</p>
  }

  const handleEdit = (camp: any) => {
    setEditingCampId(String(camp.id))
    const initialDraft: Record<string, any> = {}
    campColumns.forEach((key) => {
      initialDraft[key] = formatForInput(camp[key], key)
    })
    setEditDraft(initialDraft)
    setRowError(null)
  }

  const handleCancel = () => {
    setEditingCampId(null)
    setEditDraft(null)
    setRowError(null)
  }

  const handleSave = async () => {
    if (!editingCampId || !editDraft) return

    const invalidNumberKey = campColumns.find((key) => {
      if (!numberKeys.has(key)) return false
      const value = editDraft[key]
      return value !== '' && value !== null && value !== undefined && Number.isNaN(Number(value))
    })

    if (invalidNumberKey) {
      setRowError(`"${formatHeader(invalidNumberKey)}" must be a number.`)
      return
    }

    setSaving(true)
    setRowError(null)

    const payload = campColumns.reduce<Record<string, any>>((acc, key) => {
      acc[key] = formatForDatabase(editDraft[key], key)
      return acc
    }, {})

    const campId =
      Number.isNaN(Number(editingCampId)) || editingCampId === ''
        ? editingCampId
        : Number(editingCampId)

    console.log('[AdminCampsShow] Updating camp', {
      id: campId,
      payload,
    })

    const { error } = await supabase
      .from('camps')
      .update(payload)
      .eq('id', campId)

    if (error) {
      console.error('[AdminCampsShow] Update error', error)
      setRowError(error.message ?? String(error))
      setSaving(false)
      return
    }

    await mutateCamps(
      (prev = []) =>
        prev.map((camp: any) =>
          String(camp.id) === String(campId)
            ? {
                ...camp,
                ...payload,
              }
            : camp
        ),
      false
    )
    setEditingCampId(null)
    setEditDraft(null)
    setSaving(false)
  }

  // 5️⃣ USE THE MAP IN RETURN
  return (
    <div className="min-h-screen">
      <Navbar showLogout />
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-4">Camps overview</h1>

        <table className="w-full border-collapse border">
          <thead>
            <tr>
              {campColumns.map((key) => (
                <th key={key} className="border p-2 text-left">
                  {formatHeader(key)}
                </th>
              ))}
              <th className="border p-2 text-center">Registered</th>
              <th className="border p-2 text-center">Registrations</th>
              <th className="border p-2 text-center">Aktionen</th>
            </tr>
          </thead>

          <tbody>
            {camps.map((camp: any) => {
              const registered = registrationCountMap.get(String(camp.id)) ?? 0
              const isEditing = String(camp.id) === editingCampId

              return (
                <tr key={camp.id}>
                  {campColumns.map((key) => {
                    const value = camp[key]
                    const displayValue =
                      value === null || value === undefined || value === '' ? '-' : String(value)

                    return (
                      <td
                        key={key}
                        className={`border p-2 ${
                          numberKeys.has(key) ? 'text-center' : 'text-left'
                        }`}
                      >
                        {isEditing ? (
                          isBooleanKey(key) ? (
                            <input
                              type="checkbox"
                              checked={coerceBoolean(editDraft?.[key])}
                              onChange={(event) =>
                                setEditDraft((prev) =>
                                  prev ? { ...prev, [key]: event.target.checked } : prev
                                )
                              }
                            />
                          ) : (
                            <input
                              className={`w-full border rounded px-2 py-1 ${
                                numberKeys.has(key) ? 'text-center' : ''
                              }`}
                              type={
                                numberKeys.has(key)
                                  ? 'number'
                                  : dateKeys.has(key)
                                    ? 'date'
                                    : timeKeys.has(key)
                                      ? 'time'
                                      : 'text'
                              }
                              value={editDraft?.[key] ?? ''}
                              onChange={(event) =>
                                setEditDraft((prev) =>
                                  prev ? { ...prev, [key]: event.target.value } : prev
                                )
                              }
                            />
                          )
                        ) : (
                          displayValue
                        )}
                      </td>
                    )
                  })}
                  <td className="border p-2 text-center">{registered}</td>
                  <td className="border p-2 text-center">
                    <a
                      href={`${camp.id}/registrations`}
                      className="text-blue-600 underline"
                    >
                      Show
                    </a>
                  </td>
                  <td className="border p-2 text-center">
                    {isEditing ? (
                      <div className="flex flex-col items-center gap-2">
                        <div className="flex items-center gap-2">
                          <button
                            className="px-3 py-1 rounded border border-gray-300 text-black bg-white disabled:opacity-50"
                            onClick={handleSave}
                            disabled={saving}
                          >
                            Speichern
                          </button>
                          <button
                            className="px-3 py-1 rounded bg-gray-200 text-gray-800 disabled:opacity-50"
                            onClick={handleCancel}
                            disabled={saving}
                          >
                            Abbrechen
                          </button>
                        </div>
                        {rowError ? (
                          <span className="text-xs text-red-600">{rowError}</span>
                        ) : null}
                      </div>
                    ) : (
                      <button
                        className="px-3 py-1 rounded border border-gray-300 text-black bg-white disabled:opacity-50"
                        onClick={() => handleEdit(camp)}
                        disabled={editingCampId !== null}
                      >
                        Bearbeiten
                      </button>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}