'use client'

import { useMemo, useState } from 'react'
import useSWR from 'swr'
import {
  Bar,
  BarChart,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

import Navbar from '@/components/Navbar'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { supabase } from '@/lib/supabaseClient'
import {
  ageHistogram,
  avgAttendanceByMonthByType,
  computeScorecards,
  deriveMonthRange,
  EVENT_TYPE_LABELS,
  EVENT_TYPES,
  monthKey,
  monthsBetween,
  newMembersByMonth,
  revenueByMonthByType,
  type EventRow,
  type EventType,
  type Gender,
  type KeeperRow,
  type ParticipantRow,
} from '@/lib/analytics'

const eur = new Intl.NumberFormat('de-AT', {
  style: 'currency',
  currency: 'EUR',
  maximumFractionDigits: 0,
})

const monthInputClass =
  'rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-400'

/** Standard-Zeitraum für die Monats-Charts: BIS = aktueller Monat, VON = aktueller Monat − 6. */
function defaultToMonth(): string {
  return monthKey(new Date().toISOString())
}
function defaultFromMonth(): string {
  const now = new Date()
  return monthKey(new Date(now.getFullYear(), now.getMonth() - 6, 1).toISOString())
}

const TYPE_COLORS: Record<EventType, string> = {
  weekly_training: '#6366f1',
  camp: '#f43f5e',
  keeperday: '#f59e0b',
}

const GENDER_COLORS: Record<Gender, string> = {
  male: '#3b82f6',
  female: '#ec4899',
  diverse: '#a855f7',
}

const GENDER_LABELS: Record<Gender, string> = {
  male: 'Männlich',
  female: 'Weiblich',
  diverse: 'Divers',
}

type GenderFilter = 'all' | Gender
type TypeFilter = 'all' | EventType

export default function AnalyticsPage() {
  const [genderFilter, setGenderFilter] = useState<GenderFilter>('all')
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all')
  const [forecast, setForecast] = useState(false)
  const [fromMonth, setFromMonth] = useState<string>(defaultFromMonth)
  const [toMonth, setToMonth] = useState<string>(defaultToMonth)

  const { data: keepers, error: keepersError } = useSWR<KeeperRow[]>('analytics-keepers', async () => {
    const { data, error } = await supabase
      .from('keepers')
      .select('id, birth_date, gender, created_at, deleted_at')
      .is('deleted_at', null)
    if (error) throw error
    return (data ?? []) as KeeperRow[]
  })

  const { data: events, error: eventsError } = useSWR<EventRow[]>('analytics-events', async () => {
    const { data, error } = await supabase
      .from('events')
      .select('id, event_type, start_date, capacity, price')
    if (error) throw error
    return (data ?? []) as EventRow[]
  })

  const { data: participants, error: participantsError } = useSWR<ParticipantRow[]>(
    'analytics-participants',
    async () => {
      const { data, error } = await supabase
        .from('event_registration_participants')
        .select('id, event_id, keeper_id, gender, birth_date, price, is_paid, status, created_at')
      if (error) throw error
      return (data ?? []) as ParticipantRow[]
    }
  )

  const loading = !keepers || !events || !participants
  const loadError = keepersError || eventsError || participantsError

  const months = useMemo(
    () => (keepers && events ? deriveMonthRange(keepers, events) : []),
    [keepers, events]
  )

  const scorecards = useMemo(
    () =>
      keepers && events && participants
        ? computeScorecards(keepers, participants, events)
        : null,
    [keepers, events, participants]
  )

  const growthData = useMemo(
    () => (keepers ? newMembersByMonth(keepers, months) : []),
    [keepers, months]
  )

  const ageData = useMemo(() => {
    if (!keepers) return []
    return ageHistogram(keepers)
  }, [keepers])

  // Eigener VON/BIS-Zeitraum für die beiden Monats-Charts (Zukunft für Prognose erlaubt).
  const rangeMonths = useMemo(() => monthsBetween(fromMonth, toMonth), [fromMonth, toMonth])

  const revenueData = useMemo(
    () =>
      participants && events
        ? revenueByMonthByType(participants, events, rangeMonths, { forecast })
        : [],
    [participants, events, rangeMonths, forecast]
  )

  const attendanceData = useMemo(
    () =>
      participants && events
        ? avgAttendanceByMonthByType(participants, events, rangeMonths)
        : [],
    [participants, events, rangeMonths]
  )

  const visibleTypes: EventType[] = typeFilter === 'all' ? EVENT_TYPES : [typeFilter]
  const visibleGenders: Gender[] =
    genderFilter === 'all' ? (['male', 'female', 'diverse'] as Gender[]) : [genderFilter]

  return (
    <main className="relative min-h-screen overflow-hidden bg-gradient-to-b from-slate-50 via-white to-indigo-50">
      <Navbar
        showLogout
        secondaryLinkHref="/admin/events"
        secondaryLinkLabel="Events"
        rightLinkHref="/admin/newsletter"
        rightLinkLabel="Newsletter"
      />
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
                Analytics
              </span>
            </div>
            <div className="space-y-2">
              <CardTitle className="text-3xl md:text-4xl">Torhüter-Analytics</CardTitle>
              <CardDescription>
                Wachstum, Auslastung und Einnahmen auf einen Blick. Kennzahlen basieren auf den
                aktuellen Daten aus Keeper-, Event- und Anmeldedaten.
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <Separator />

            {loadError ? (
              <p className="text-sm text-rose-600">
                Daten konnten nicht geladen werden. Bitte Seite neu laden.
              </p>
            ) : loading ? (
              <p className="text-sm text-slate-500">Daten werden geladen…</p>
            ) : (
              <>
                {/* Filterleiste */}
                <div className="flex flex-wrap items-end gap-6">
                  <FilterGroup label="Geschlecht (Altersverteilung)">
                    <FilterPills<GenderFilter>
                      value={genderFilter}
                      onChange={setGenderFilter}
                      options={[
                        { value: 'all', label: 'Alle' },
                        { value: 'male', label: 'Männlich' },
                        { value: 'female', label: 'Weiblich' },
                        { value: 'diverse', label: 'Divers' },
                      ]}
                    />
                  </FilterGroup>
                  <FilterGroup label="Event-Typ">
                    <FilterPills<TypeFilter>
                      value={typeFilter}
                      onChange={setTypeFilter}
                      options={[
                        { value: 'all', label: 'Alle' },
                        { value: 'weekly_training', label: 'Weekly' },
                        { value: 'camp', label: 'Camp' },
                        { value: 'keeperday', label: 'Keeperday' },
                      ]}
                    />
                  </FilterGroup>
                  <FilterGroup label="Zeitraum (Auslastung &amp; Umsatz)">
                    <div className="flex items-center gap-2">
                      <label className="flex items-center gap-1">
                        <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                          Von
                        </span>
                        <input
                          type="month"
                          value={fromMonth}
                          max={toMonth}
                          onChange={(e) => setFromMonth(e.target.value)}
                          className={monthInputClass}
                        />
                      </label>
                      <label className="flex items-center gap-1">
                        <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                          Bis
                        </span>
                        <input
                          type="month"
                          value={toMonth}
                          min={fromMonth}
                          onChange={(e) => setToMonth(e.target.value)}
                          className={monthInputClass}
                        />
                      </label>
                    </div>
                  </FilterGroup>
                </div>

                {/* Scorecards */}
                {scorecards ? (
                  <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
                    <Scorecard label="Aktive Mitglieder" value={String(scorecards.activeMembers)} />
                    <Scorecard
                      label="Wachstum (MoM)"
                      value={`${scorecards.momGrowthPct > 0 ? '+' : ''}${scorecards.momGrowthPct}%`}
                      tone={scorecards.momGrowthPct > 0 ? 'positive' : 'neutral'}
                    />
                    <Scorecard
                      label="Umsatz (Monat)"
                      value={eur.format(scorecards.revenueMtdConfirmed)}
                    />
                    <Scorecard
                      label="Ø TWs/Training"
                      value={
                        scorecards.avgParticipantsPerTraining == null
                          ? '–'
                          : String(scorecards.avgParticipantsPerTraining)
                      }
                    />
                    <Scorecard
                      label="Missed-Quote"
                      value={`${scorecards.noShowRatePct}%`}
                      tone={scorecards.noShowRatePct > 10 ? 'negative' : 'neutral'}
                    />
                    <Scorecard
                      label="Offener Betrag"
                      value={eur.format(scorecards.outstandingAmount)}
                      tone={scorecards.outstandingAmount > 0 ? 'warning' : 'positive'}
                    />
                  </div>
                ) : null}

                {/* Charts */}
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                  {/* 1) Mitglieder-Wachstum */}
                  <ChartCard
                    title="Mitglieder-Wachstum"
                    description="Neue Torhüter pro Monat (Balken) und kumulierte Mitgliederzahl (Linie)."
                  >
                    <ResponsiveContainer width="100%" height={300}>
                      <ComposedChart data={growthData} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                        <XAxis dataKey="label" tick={{ fontSize: 12 }} stroke="#94a3b8" />
                        <YAxis allowDecimals={false} tick={{ fontSize: 12 }} stroke="#94a3b8" />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="neu" name="Neu" fill="#6366f1" radius={[4, 4, 0, 0]} />
                        <Line
                          type="monotone"
                          dataKey="kumuliert"
                          name="Gesamt (kumuliert)"
                          stroke="#0f172a"
                          strokeWidth={2}
                          dot={{ r: 3 }}
                        />
                      </ComposedChart>
                    </ResponsiveContainer>
                  </ChartCard>

                  {/* 2) Altersverteilung nach Geschlecht */}
                  <ChartCard
                    title="Altersverteilung nach Geschlecht"
                    description="Anzahl Torhüter je Altersjahr. Geschlecht über den Filter oben wählbar."
                  >
                    {ageData.length ? (
                      <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={ageData} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                          <XAxis
                            dataKey="label"
                            tick={{ fontSize: 12 }}
                            stroke="#94a3b8"
                            label={{ value: 'Alter (Jahre)', position: 'insideBottom', offset: -2, fontSize: 11, fill: '#94a3b8' }}
                          />
                          <YAxis allowDecimals={false} tick={{ fontSize: 12 }} stroke="#94a3b8" />
                          <Tooltip />
                          <Legend />
                          {visibleGenders.map((g) => (
                            <Bar
                              key={g}
                              dataKey={g}
                              name={GENDER_LABELS[g]}
                              stackId="age"
                              fill={GENDER_COLORS[g]}
                              radius={[4, 4, 0, 0]}
                            />
                          ))}
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <EmptyChart />
                    )}
                  </ChartCard>

                  {/* 3) Ø Torhüter je Event / Monat nach Typ */}
                  <ChartCard
                    title="Ø Torhüter je Event / Monat"
                    description="Durchschnittlich bestätigte Teilnehmer je Event, getrennt nach Typ. Camps/Keeperdays finden nicht monatlich statt – ihre Linie hat nur dort Punkte, wo Events stattfanden. Über den Event-Typ-Filter steuerbar."
                  >
                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart data={attendanceData} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                        <XAxis dataKey="label" tick={{ fontSize: 12 }} stroke="#94a3b8" />
                        <YAxis allowDecimals={false} tick={{ fontSize: 12 }} stroke="#94a3b8" />
                        <Tooltip />
                        <Legend />
                        {visibleTypes.map((t) => (
                          <Line
                            key={t}
                            type="monotone"
                            dataKey={t}
                            name={EVENT_TYPE_LABELS[t]}
                            stroke={TYPE_COLORS[t]}
                            strokeWidth={2}
                            dot={{ r: 3 }}
                            connectNulls
                          />
                        ))}
                      </LineChart>
                    </ResponsiveContainer>
                  </ChartCard>

                  {/* 4) Umsatz pro Monat nach Event */}
                  <ChartCard
                    title="Umsatz pro Monat nach Typ"
                    description="Summe der Teilnehmerpreise je Event-Typ. Standard: nur bestätigte Anmeldungen. 'Prognose' bezieht offene (submitted/accepted) mit ein."
                    action={
                      <button
                        type="button"
                        onClick={() => setForecast((v) => !v)}
                        className={
                          forecast
                            ? 'rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-600 transition'
                            : 'rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-600 transition hover:bg-slate-50'
                        }
                      >
                        {forecast ? 'Prognose ✓' : 'Prognose'}
                      </button>
                    }
                  >
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={revenueData} margin={{ top: 8, right: 8, left: -4, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                        <XAxis dataKey="label" tick={{ fontSize: 12 }} stroke="#94a3b8" />
                        <YAxis
                          tick={{ fontSize: 12 }}
                          stroke="#94a3b8"
                          tickFormatter={(v) => eur.format(Number(v))}
                          width={70}
                        />
                        <Tooltip formatter={(v) => eur.format(Number(v ?? 0))} />
                        <Legend />
                        {visibleTypes.map((t) => (
                          <Bar
                            key={t}
                            dataKey={t}
                            name={EVENT_TYPE_LABELS[t]}
                            stackId="rev"
                            fill={TYPE_COLORS[t]}
                            radius={[4, 4, 0, 0]}
                          />
                        ))}
                      </BarChart>
                    </ResponsiveContainer>
                  </ChartCard>
                </div>

                <p className="text-xs text-slate-400">
                  Hinweis: Der Datenbestand ist noch jung – Monatsverläufe gewinnen mit der Zeit an
                  Aussagekraft. Umsatzzahlen berücksichtigen keine stornierten oder verpassten
                  Anmeldungen.
                </p>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  )
}

// ---------------------------------------------------------------------------
// Kleine UI-Bausteine
// ---------------------------------------------------------------------------

function Scorecard({
  label,
  value,
  tone = 'neutral',
}: {
  label: string
  value: string
  tone?: 'neutral' | 'positive' | 'negative' | 'warning'
}) {
  const toneClass =
    tone === 'positive'
      ? 'text-emerald-600'
      : tone === 'negative'
      ? 'text-rose-600'
      : tone === 'warning'
      ? 'text-amber-600'
      : 'text-slate-900'
  return (
    <div className="rounded-2xl border border-slate-200/70 bg-white/90 p-4 shadow-sm">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-400">{label}</p>
      <p className={`mt-1 text-2xl font-bold ${toneClass}`}>{value}</p>
    </div>
  )
}

function ChartCard({
  title,
  description,
  action,
  children,
}: {
  title: string
  description: string
  action?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <div className="rounded-2xl border border-slate-200/70 bg-white/90 p-5 shadow-sm">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
          <p className="mt-1 text-sm text-slate-500">{description}</p>
        </div>
        {action}
      </div>
      {children}
    </div>
  )
}

function EmptyChart() {
  return (
    <div className="flex h-[300px] items-center justify-center text-sm text-slate-400">
      Keine Daten im gewählten Zeitraum.
    </div>
  )
}

function FilterGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-400">{label}</p>
      {children}
    </div>
  )
}

function FilterPills<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T
  onChange: (v: T) => void
  options: Array<{ value: T; label: string }>
}) {
  return (
    <div className="inline-flex flex-wrap gap-1 rounded-full bg-slate-100 p-1">
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={
            value === opt.value
              ? 'rounded-full bg-white px-3 py-1 text-xs font-semibold text-indigo-600 shadow-sm'
              : 'rounded-full px-3 py-1 text-xs font-medium text-slate-500 hover:text-slate-700'
          }
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}
