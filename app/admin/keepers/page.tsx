'use client'

import { useMemo, useState } from 'react'
import useSWR from 'swr'
import Navbar from '@/components/Navbar'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { supabase } from '@/lib/supabaseClient'
import {
  TRAINING_GROUP_LABELS,
  TRAINING_GROUP_OPTIONS,
  type TrainingGroup,
  defaultTargetYears,
  formatTargetYears,
} from '@/lib/trainingGroup'

type KeeperRow = {
  id: string
  first_name: string | null
  last_name: string | null
  birth_date: string | null
  team: string | null
}

type OverrideRow = {
  keeper_id: string
  training_group: TrainingGroup
  allowed: boolean
  note: string | null
  set_at: string
}

type OverrideMode = 'auto' | 'allowed' | 'denied'

const MODE_LABELS: Record<OverrideMode, string> = {
  auto: 'Automatisch',
  allowed: 'Freigeschaltet',
  denied: 'Gesperrt',
}

const selectClass =
  'w-full rounded-xl border border-slate-200 bg-white/90 px-2 py-1.5 text-sm text-slate-900 shadow-sm outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-200'

const birthYearOf = (birthDate: string | null) => {
  if (!birthDate) return null
  const year = Number(String(birthDate).slice(0, 4))
  return Number.isFinite(year) ? year : null
}

/** Standard-Berechtigung nach Jahrgang für das aktuelle Jahr (ohne Override). */
const autoAllowed = (group: TrainingGroup, birthYear: number | null, referenceYear: number) => {
  if (birthYear === null) return false
  const { min, max } = defaultTargetYears(group, referenceYear)
  return (min === null || birthYear >= min) && (max === null || birthYear <= max)
}

const overrideKey = (keeperId: string, group: TrainingGroup) => `${keeperId}:${group}`

export default function AdminKeepersPage() {
  const referenceYear = new Date().getFullYear()
  const [search, setSearch] = useState('')
  const [onlyOverrides, setOnlyOverrides] = useState(false)
  const [savingKey, setSavingKey] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [noteDrafts, setNoteDrafts] = useState<Record<string, string>>({})

  const {
    data: keepers,
    error: keepersError,
    isLoading: keepersLoading,
  } = useSWR('admin-keepers-training-groups', async () => {
    const { data, error } = await supabase
      .from('keepers')
      .select('id, first_name, last_name, birth_date, team')
      .is('deleted_at', null)
      .order('last_name', { ascending: true })
      .order('first_name', { ascending: true })
    if (error) throw error
    return (data ?? []) as KeeperRow[]
  })

  const {
    data: overrides,
    error: overridesError,
    mutate: mutateOverrides,
  } = useSWR('admin-keeper-training-group-overrides', async () => {
    const { data, error } = await supabase
      .from('keeper_training_group_overrides')
      .select('keeper_id, training_group, allowed, note, set_at')
    if (error) throw error
    return (data ?? []) as OverrideRow[]
  })

  const overrideByKey = useMemo(() => {
    const map = new Map<string, OverrideRow>()
    ;(overrides ?? []).forEach((row) => map.set(overrideKey(row.keeper_id, row.training_group), row))
    return map
  }, [overrides])

  const filteredKeepers = useMemo(() => {
    const query = search.trim().toLowerCase()
    return (keepers ?? []).filter((keeper) => {
      if (onlyOverrides) {
        const hasOverride = TRAINING_GROUP_OPTIONS.some((group) =>
          overrideByKey.has(overrideKey(keeper.id, group))
        )
        if (!hasOverride) return false
      }
      if (!query) return true
      const name = `${keeper.first_name ?? ''} ${keeper.last_name ?? ''}`.toLowerCase()
      const year = String(birthYearOf(keeper.birth_date) ?? '')
      return name.includes(query) || year.includes(query) || (keeper.team ?? '').toLowerCase().includes(query)
    })
  }, [keepers, search, onlyOverrides, overrideByKey])

  const modeFor = (keeperId: string, group: TrainingGroup): OverrideMode => {
    const row = overrideByKey.get(overrideKey(keeperId, group))
    if (!row) return 'auto'
    return row.allowed ? 'allowed' : 'denied'
  }

  const handleModeChange = async (keeperId: string, group: TrainingGroup, mode: OverrideMode) => {
    const key = overrideKey(keeperId, group)
    setSavingKey(key)
    setActionError(null)

    const { error } =
      mode === 'auto'
        ? await supabase
            .from('keeper_training_group_overrides')
            .delete()
            .eq('keeper_id', keeperId)
            .eq('training_group', group)
        : await supabase.from('keeper_training_group_overrides').upsert(
            {
              keeper_id: keeperId,
              training_group: group,
              allowed: mode === 'allowed',
              note: noteDrafts[key]?.trim() || overrideByKey.get(key)?.note || null,
            },
            { onConflict: 'keeper_id,training_group' }
          )

    if (error) {
      setActionError(`Speichern fehlgeschlagen: ${error.message}`)
    } else if (mode === 'auto') {
      setNoteDrafts((prev) => {
        const next = { ...prev }
        delete next[key]
        return next
      })
    }
    await mutateOverrides()
    setSavingKey(null)
  }

  const handleNoteSave = async (keeperId: string, group: TrainingGroup) => {
    const key = overrideKey(keeperId, group)
    const existing = overrideByKey.get(key)
    const draft = noteDrafts[key]
    if (!existing || draft === undefined || draft.trim() === (existing.note ?? '')) return

    setSavingKey(key)
    setActionError(null)
    const { error } = await supabase
      .from('keeper_training_group_overrides')
      .update({ note: draft.trim() || null })
      .eq('keeper_id', keeperId)
      .eq('training_group', group)
    if (error) setActionError(`Notiz konnte nicht gespeichert werden: ${error.message}`)
    await mutateOverrides()
    setSavingKey(null)
  }

  const overrideCount = overrides?.length ?? 0
  const loadError = keepersError || overridesError

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar
        showLogout
        secondaryLinkHref="/admin/events"
        secondaryLinkLabel="Events"
        rightLinkHref="/admin/analytics"
        rightLinkLabel="Analytics"
      />
      <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="mb-6 flex flex-col gap-1">
          <h1 className="text-2xl font-semibold text-slate-900">Torhüter-Freischaltungen</h1>
          <p className="text-sm text-slate-500">
            Standardmäßig entscheidet der Jahrgang, ob ein Torhüter sich für Kinder- oder
            Jugendtrainings anmelden darf. Hier kannst du das pro Torhüter überschreiben.
          </p>
        </div>

        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Card>
            <CardHeader>
              <CardDescription>Aktive Torhüter</CardDescription>
              <CardTitle>{keepers?.length ?? '—'}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader>
              <CardDescription>Abweichende Einstellungen</CardDescription>
              <CardTitle>{overrideCount}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader>
              <CardDescription>Standard-Jahrgänge {referenceYear}</CardDescription>
              <CardTitle className="text-base">
                {TRAINING_GROUP_OPTIONS.map((group) => {
                  const years = defaultTargetYears(group, referenceYear)
                  return (
                    <span key={group} className="block">
                      {TRAINING_GROUP_LABELS[group]}: Jg. {formatTargetYears(years.min, years.max)}
                    </span>
                  )
                })}
              </CardTitle>
            </CardHeader>
          </Card>
        </div>

        <Card>
          <CardHeader className="gap-3">
            <CardTitle>Torhüter</CardTitle>
            <div className="flex flex-wrap items-center gap-4">
              <Input
                placeholder="Suche nach Name, Jahrgang oder Verein…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="max-w-sm"
              />
              <label className="flex items-center gap-2 text-sm text-slate-600">
                <input
                  type="checkbox"
                  checked={onlyOverrides}
                  onChange={(e) => setOnlyOverrides(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                />
                Nur abweichende anzeigen
              </label>
            </div>
            <p className="text-xs text-slate-500">
              „Automatisch“ zeigt die Berechtigung nach den Standard-Jahrgängen. Maßgeblich bei der
              Anmeldung sind die Jahrgänge, die am jeweiligen Termin hinterlegt sind.
            </p>
            {actionError ? <p className="text-sm text-rose-600">{actionError}</p> : null}
          </CardHeader>
          <CardContent>
            {keepersLoading ? (
              <p className="text-sm text-slate-500">Laden…</p>
            ) : loadError ? (
              <p className="text-sm text-rose-600">Fehler beim Laden der Torhüter.</p>
            ) : filteredKeepers.length === 0 ? (
              <p className="text-sm text-slate-500">Keine Torhüter gefunden.</p>
            ) : (
              <div className="overflow-x-auto rounded-2xl border border-slate-200/80 bg-white/80">
                <table className="min-w-full text-sm">
                  <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="px-3 py-2">Name</th>
                      <th className="px-3 py-2">Jahrgang</th>
                      {TRAINING_GROUP_OPTIONS.map((group) => (
                        <th key={group} className="px-3 py-2">
                          {TRAINING_GROUP_LABELS[group]}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredKeepers.map((keeper) => {
                      const birthYear = birthYearOf(keeper.birth_date)
                      return (
                        <tr key={keeper.id} className="align-top">
                          <td className="px-3 py-3">
                            <div className="font-medium text-slate-800">
                              {`${keeper.first_name ?? ''} ${keeper.last_name ?? ''}`.trim() || '—'}
                            </div>
                            {keeper.team ? (
                              <div className="text-xs text-slate-500">{keeper.team}</div>
                            ) : null}
                          </td>
                          <td className="px-3 py-3 text-slate-700">{birthYear ?? '—'}</td>
                          {TRAINING_GROUP_OPTIONS.map((group) => {
                            const key = overrideKey(keeper.id, group)
                            const mode = modeFor(keeper.id, group)
                            const auto = autoAllowed(group, birthYear, referenceYear)
                            const effective = mode === 'auto' ? auto : mode === 'allowed'
                            return (
                              <td key={group} className="min-w-[220px] px-3 py-3">
                                <div className="flex items-center gap-2">
                                  <select
                                    aria-label={`${TRAINING_GROUP_LABELS[group]} für ${keeper.first_name ?? ''} ${keeper.last_name ?? ''}`}
                                    className={selectClass}
                                    value={mode}
                                    disabled={savingKey === key}
                                    onChange={(e) =>
                                      handleModeChange(keeper.id, group, e.target.value as OverrideMode)
                                    }
                                  >
                                    {(Object.keys(MODE_LABELS) as OverrideMode[]).map((opt) => (
                                      <option key={opt} value={opt}>
                                        {opt === 'auto'
                                          ? `${MODE_LABELS.auto} (${auto ? 'darf' : 'darf nicht'})`
                                          : MODE_LABELS[opt]}
                                      </option>
                                    ))}
                                  </select>
                                  <span
                                    title={effective ? 'Darf sich anmelden' : 'Darf sich nicht anmelden'}
                                    className={`inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                                      effective
                                        ? 'bg-emerald-100 text-emerald-700'
                                        : 'bg-rose-100 text-rose-700'
                                    }`}
                                  >
                                    {effective ? '✓' : '✕'}
                                  </span>
                                </div>
                                {mode !== 'auto' ? (
                                  <Input
                                    placeholder="Notiz (optional)"
                                    value={noteDrafts[key] ?? overrideByKey.get(key)?.note ?? ''}
                                    onChange={(e) =>
                                      setNoteDrafts((prev) => ({ ...prev, [key]: e.target.value }))
                                    }
                                    onBlur={() => handleNoteSave(keeper.id, group)}
                                    disabled={savingKey === key}
                                    className="mt-2 h-8 text-xs"
                                  />
                                ) : null}
                              </td>
                            )
                          })}
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
