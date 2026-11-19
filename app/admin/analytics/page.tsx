'use client'

import { useMemo, useState } from 'react'
import useSWR from 'swr'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  LabelList,
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
  businessByMonth,
  businessFigures,
  computePeriodKpis,
  deriveMonthRange,
  EVENT_TYPE_LABELS,
  EVENT_TYPES,
  monthKey,
  monthLabel,
  monthlyKpiSeries,
  monthsBetween,
  previousPeriod,
  revenueByMonthByType,
  shiftMonth,
  SOURCE_KEYS,
  SOURCE_LABELS,
  sourcesByMonth,
  trialConversion,
  topKeepersByTrainings,
  weeklyAttendanceTrend,
  type EventRow,
  type EventType,
  type Gender,
  type KeeperRow,
  type KpiSeriesPoint,
  type ParentRow,
  type ParticipantRow,
  type PeriodKpis,
  type RegistrationRow,
  type RelationshipRow,
  type SourceKey,
} from '@/lib/analytics'

const eur = new Intl.NumberFormat('de-AT', {
  style: 'currency',
  currency: 'EUR',
  maximumFractionDigits: 0,
})

const monthInputClass =
  'rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-400'

const num1 = new Intl.NumberFormat('de-AT', { maximumFractionDigits: 1 })

const eur2 = new Intl.NumberFormat('de-AT', { style: 'currency', currency: 'EUR' })

function currentMonth(): string {
  return monthKey(new Date().toISOString())
}

/**
 * Globaler Zeitraum – steuert ALLE Kacheln, Charts und Tabellen.
 * Presets = die letzten N Monate inklusive des laufenden Monats.
 */
type PeriodPreset = '3m' | '6m' | '12m' | 'all' | 'custom'
const PRESET_MONTHS: Record<'3m' | '6m' | '12m', number> = { '3m': 3, '6m': 6, '12m': 12 }

const TYPE_COLORS: Record<EventType, string> = {
  weekly_training: '#6366f1',
  camp: '#f43f5e',
  keeperday: '#f59e0b',
}

const SOURCE_COLORS: Record<SourceKey, string> = {
  friend: '#6366f1',
  club: '#22c55e',
  social_media: '#ec4899',
  website: '#14b8a6',
  email: '#f59e0b',
  newspaper: '#64748b',
  other: '#cbd5e1',
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

const ALL_GENDERS: Gender[] = ['male', 'female', 'diverse']

/** Top-Torhüter: fest Top 5 – mehr schaut sich niemand an. */
const TOP_KEEPER_LIMIT = 5

/** Ein Farbton je Balken. */
const TOP_KEEPER_COLORS = ['#6366f1', '#f43f5e', '#f59e0b', '#10b981', '#3b82f6']

export default function AnalyticsPage() {
  const [forecast, setForecast] = useState(false)
  const [preset, setPreset] = useState<PeriodPreset>('6m')
  const [customFrom, setCustomFrom] = useState<string>(() => shiftMonth(currentMonth(), -5))
  const [customTo, setCustomTo] = useState<string>(currentMonth)

  const { data: keepers, error: keepersError } = useSWR<KeeperRow[]>(
    'analytics-keepers',
    async () => {
      const { data, error } = await supabase
        .from('keepers')
        .select('id, first_name, last_name, birth_date, gender, created_at, deleted_at')
        .is('deleted_at', null)
      if (error) throw error
      return (data ?? []) as KeeperRow[]
    }
  )

  const { data: events, error: eventsError } = useSWR<EventRow[]>('analytics-events', async () => {
    const { data, error } = await supabase
      .from('events')
      .select('id, event_type, start_date, capacity, price, event_status')
    if (error) throw error
    return (data ?? []) as EventRow[]
  })

  const { data: participants, error: participantsError } = useSWR<ParticipantRow[]>(
    'analytics-participants',
    async () => {
      const { data, error } = await supabase
        .from('event_registration_participants')
                .select(
          'id, event_id, registration_id, keeper_id, first_name, gender, birth_date, price, is_paid, status, created_at'
        )
      if (error) throw error
      return (data ?? []) as ParticipantRow[]
    }
  )

  // Für Herkunft & Probetraining-Konversion (Matching über E-Mail / Vorname + Geburtsdatum).
  const { data: registrations, error: registrationsError } = useSWR<RegistrationRow[]>(
    'analytics-registrations',
    async () => {
      const { data, error } = await supabase
        .from('event_registrations')
        .select('id, event_id, contact_email, informed_via, is_trial_training')
      if (error) throw error
      return (data ?? []) as RegistrationRow[]
    }
  )

  const { data: parents, error: parentsError } = useSWR<ParentRow[]>('analytics-parents', async () => {
    const { data, error } = await supabase.from('parents').select('id, email')
    if (error) throw error
    return (data ?? []) as ParentRow[]
  })

  const { data: relationships, error: relationshipsError } = useSWR<RelationshipRow[]>(
    'analytics-relationships',
    async () => {
      const { data, error } = await supabase.from('relationships').select('keeper_id, parent_id')
      if (error) throw error
      return (data ?? []) as RelationshipRow[]
    }
  )

  const loading =
    !keepers || !events || !participants || !registrations || !parents || !relationships
  const loadError =
    keepersError ||
    eventsError ||
    participantsError ||
    registrationsError ||
    parentsError ||
    relationshipsError

  // Globaler Zeitraum (inkl. Zukunft bei „Individuell" – für die Umsatz-Prognose).
  const rangeMonths = useMemo(() => {
    const now = currentMonth()
    if (preset === 'custom') return monthsBetween(customFrom, customTo)
    if (preset === 'all') {
      return keepers && events ? deriveMonthRange(keepers, events, new Date(), Infinity) : []
    }
    return monthsBetween(shiftMonth(now, -(PRESET_MONTHS[preset] - 1)), now)
  }, [preset, customFrom, customTo, keepers, events])

  // „Gesamt" hat keine sinnvolle Vorperiode.
  const prevMonths = useMemo(
    () => (preset === 'all' ? [] : previousPeriod(rangeMonths)),
    [preset, rangeMonths]
  )

  const rangeFrom = rangeMonths[0] ?? currentMonth()
  const rangeTo = rangeMonths[rangeMonths.length - 1] ?? currentMonth()

  const selectPreset = (p: PeriodPreset) => {
    if (p === 'custom') {
      setCustomFrom(rangeFrom)
      setCustomTo(rangeTo)
    }
    setPreset(p)
  }

  const kpis = useMemo(
    () =>
      keepers && events && participants
        ? computePeriodKpis(keepers, participants, events, rangeMonths)
        : null,
    [keepers, events, participants, rangeMonths]
  )

  const prevKpis = useMemo(
    () =>
      keepers && events && participants && prevMonths.length
        ? computePeriodKpis(keepers, participants, events, prevMonths)
        : null,
    [keepers, events, participants, prevMonths]
  )

  const kpiSeries = useMemo(
    () =>
      keepers && events && participants
        ? monthlyKpiSeries(keepers, participants, events, rangeMonths)
        : [],
    [keepers, events, participants, rangeMonths]
  )

  const businessRows = useMemo(
    () =>
      keepers && events && participants
        ? businessByMonth(keepers, participants, events, rangeMonths)
        : [],
    [keepers, events, participants, rangeMonths]
  )

  const businessTotal = useMemo(
    () =>
      keepers && events && participants
        ? businessFigures(keepers, participants, events, rangeMonths)
        : null,
    [keepers, events, participants, rangeMonths]
  )


  const ageData = useMemo(() => (keepers ? ageHistogram(keepers) : []), [keepers])

  const revenueData = useMemo(
    () =>
      participants && events
        ? revenueByMonthByType(participants, events, rangeMonths, { forecast })
        : [],
    [participants, events, rangeMonths, forecast]
  )

  // Ø je Event & Typ + gleitender 3-Monats-Trend der wöchentlichen Trainings.
  const attendanceData = useMemo(() => {
    if (!participants || !events || !keepers) return []
    const trend = weeklyAttendanceTrend(keepers, participants, events, rangeMonths)
    return avgAttendanceByMonthByType(participants, events, rangeMonths).map((p, i) => ({
      ...p,
      trend: trend[i],
    }))
  }, [participants, events, keepers, rangeMonths])

  const sourceData = useMemo(
    () => (registrations && events ? sourcesByMonth(registrations, events, rangeMonths) : []),
    [registrations, events, rangeMonths]
  )
  const sourceTotal = sourceData.reduce((sum, p) => sum + p.total, 0)
  // Nur Quellen mit Werten im Zeitraum in Legende/Balken – sonst Legende voller Nullen.
  const activeSources = SOURCE_KEYS.filter((k) => sourceData.some((p) => p[k] > 0))

  const trials = useMemo(
    () =>
      registrations && participants && events && keepers && parents && relationships
        ? trialConversion(
            registrations,
            participants,
            events,
            keepers,
            parents,
            relationships,
            rangeMonths
          )
        : null,
    [registrations, participants, events, keepers, parents, relationships, rangeMonths]
  )

  const topKeeperData = useMemo(
    () =>
      participants && events && keepers
        ? topKeepersByTrainings(participants, events, keepers, rangeMonths, TOP_KEEPER_LIMIT)
        : [],
    [participants, events, keepers, rangeMonths]
  )

  return (
    <main className="relative min-h-screen overflow-hidden bg-gradient-to-b from-slate-50 via-white to-indigo-50">
      <Navbar
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
                {/* Globaler Zeitraum */}
                <div className="flex flex-wrap items-end justify-between gap-4 rounded-2xl border border-slate-200/70 bg-slate-50/80 p-4">
                  <div className="space-y-1">
                    <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                      Zeitraum
                    </p>
                    <FilterPills<PeriodPreset>
                      value={preset}
                      onChange={selectPreset}
                      options={[
                        { value: '3m', label: '3 Monate' },
                        { value: '6m', label: '6 Monate' },
                        { value: '12m', label: '12 Monate' },
                        { value: 'all', label: 'Gesamt' },
                        { value: 'custom', label: 'Individuell' },
                      ]}
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="flex items-center gap-1">
                      <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                        Von
                      </span>
                      <input
                        type="month"
                        value={rangeFrom}
                        max={rangeTo}
                        onChange={(e) => {
                          if (!e.target.value) return
                          setCustomFrom(e.target.value)
                          setCustomTo(rangeTo)
                          setPreset('custom')
                        }}
                        className={monthInputClass}
                      />
                    </label>
                    <label className="flex items-center gap-1">
                      <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                        Bis
                      </span>
                      <input
                        type="month"
                        value={rangeTo}
                        min={rangeFrom}
                        onChange={(e) => {
                          if (!e.target.value) return
                          setCustomFrom(rangeFrom)
                          setCustomTo(e.target.value)
                          setPreset('custom')
                        }}
                        className={monthInputClass}
                      />
                    </label>
                  </div>
                  <p className="w-full text-xs text-slate-500">
                    Gilt für alle Kennzahlen, Charts und Tabellen.{' '}
                    {prevMonths.length
                      ? `Vergleich mit der Vorperiode ${monthLabel(prevMonths[0])} – ${monthLabel(prevMonths[prevMonths.length - 1])}.`
                      : 'Bei „Gesamt" gibt es keinen Vergleich mit einer Vorperiode.'}
                  </p>
                </div>

                {/* Kennzahlen im Zeitraum */}
                {kpis && keepers ? (
                  <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
                    <KpiTile
                      label="Umsatz"
                      hint="bestätigte Anmeldungen"
                      value={eur.format(kpis.revenue)}
                      delta={relativeDelta(kpis.revenue, prevKpis?.revenue)}
                      series={kpiSeries}
                      seriesKey="revenue"
                      formatPoint={(v) => eur.format(v)}
                    />
                    <KpiTile
                      label="Ø TWs/Training"
                      hint="wöchentliche Trainings"
                      value={fmtOrDash(kpis.avgParticipantsPerTraining, (v) => num1.format(v))}
                      delta={absoluteDelta(
                        kpis.avgParticipantsPerTraining,
                        prevKpis?.avgParticipantsPerTraining,
                        (v) => num1.format(v)
                      )}
                      series={kpiSeries}
                      seriesKey="avgParticipantsPerTraining"
                      formatPoint={(v) => num1.format(v)}
                    />
                    <KpiTile
                      label="Aktive Torhüter"
                      hint={`von ${keepers.length} registriert`}
                      value={String(kpis.activeKeepers)}
                      delta={absoluteDelta(kpis.activeKeepers, prevKpis?.activeKeepers, String)}
                      series={kpiSeries}
                      seriesKey="activeKeepers"
                      formatPoint={String}
                    />
                    <KpiTile
                      label="Neue Torhüter"
                      hint="angelegte Profile"
                      value={String(kpis.newKeepers)}
                      delta={absoluteDelta(kpis.newKeepers, prevKpis?.newKeepers, String)}
                      series={kpiSeries}
                      seriesKey="newKeepers"
                      formatPoint={String}
                    />
                    <KpiTile
                      label="Missed-Quote"
                      hint="nicht erschienen ohne Abmeldung"
                      value={fmtOrDash(kpis.noShowRatePct, (v) => `${num1.format(v)} %`)}
                      delta={absoluteDelta(
                        kpis.noShowRatePct,
                        prevKpis?.noShowRatePct,
                        (v) => `${num1.format(v)} PP`,
                        true
                      )}
                      series={kpiSeries}
                      seriesKey="noShowRatePct"
                      formatPoint={(v) => `${num1.format(v)} %`}
                    />
                    <KpiTile
                      label="Eventausfälle"
                      hint="abgesagte Events"
                      value={fmtOrDash(kpis.cancellationRatePct, (v) => `${num1.format(v)} %`)}
                      delta={absoluteDelta(
                        kpis.cancellationRatePct,
                        prevKpis?.cancellationRatePct,
                        (v) => `${num1.format(v)} PP`,
                        true
                      )}
                      series={kpiSeries}
                      seriesKey="cancellationRatePct"
                      formatPoint={(v) => `${num1.format(v)} %`}
                    />
                  </div>
                ) : null}

                {/* Business-Übersicht je Monat */}
                {businessTotal ? (
                  <ChartCard
                    title="Business-Übersicht"
                    description="Kennzahlen je Monat (Monat = Eventdatum). Umsatz = bestätigte Anmeldungen; „davon offen“ = noch nicht bezahlt; „Entgangen“ = Anmeldungen bei abgesagten Events. Aktive Torhüter in der Summenzeile = verschiedene Torhüter im ganzen Zeitraum."
                  >
                    <div className="-mx-5 overflow-x-auto px-5">
                      <table className="w-full min-w-[720px] text-sm">
                        <thead>
                          <tr className="border-b border-slate-200 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">
                            <th className="py-2 pr-3">Monat</th>
                            <th className="px-3 py-2 text-right">Trainings</th>
                            <th className="px-3 py-2 text-right">Teilnahmen</th>
                            <th className="px-3 py-2 text-right">Ø TWs</th>
                            <th className="px-3 py-2 text-right">Aktive TWs</th>
                            <th className="px-3 py-2 text-right">Umsatz</th>
                            <th className="px-3 py-2 text-right">davon offen</th>
                            <th className="py-2 pl-3 text-right">Entgangen</th>
                          </tr>
                        </thead>
                        <tbody className="tabular-nums text-slate-700">
                          {businessRows.map((r) => (
                            <tr key={r.month} className="border-b border-slate-100">
                              <td className="py-2 pr-3 font-medium text-slate-900">{r.label}</td>
                              <td className="px-3 py-2 text-right">{r.trainings}</td>
                              <td className="px-3 py-2 text-right">{r.participations}</td>
                              <td className="px-3 py-2 text-right">
                                {fmtOrDash(r.avgPerTraining, (v) => num1.format(v))}
                              </td>
                              <td className="px-3 py-2 text-right">{r.activeKeepers}</td>
                              <td className="px-3 py-2 text-right font-medium text-slate-900">
                                {eur2.format(r.revenue)}
                              </td>
                              <td
                                className={`px-3 py-2 text-right ${r.outstanding > 0 ? 'font-medium text-amber-600' : 'text-slate-400'}`}
                              >
                                {eur2.format(r.outstanding)}
                              </td>
                              <td
                                className={`py-2 pl-3 text-right ${r.lostToCancellations > 0 ? 'text-rose-600' : 'text-slate-400'}`}
                              >
                                {eur2.format(r.lostToCancellations)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot className="tabular-nums">
                          <tr className="border-t-2 border-slate-300 font-semibold text-slate-900">
                            <td className="py-2 pr-3">Summe</td>
                            <td className="px-3 py-2 text-right">{businessTotal.trainings}</td>
                            <td className="px-3 py-2 text-right">{businessTotal.participations}</td>
                            <td className="px-3 py-2 text-right">
                              {fmtOrDash(businessTotal.avgPerTraining, (v) => num1.format(v))}
                            </td>
                            <td className="px-3 py-2 text-right">{businessTotal.activeKeepers}</td>
                            <td className="px-3 py-2 text-right">{eur2.format(businessTotal.revenue)}</td>
                            <td className="px-3 py-2 text-right text-amber-600">
                              {eur2.format(businessTotal.outstanding)}
                            </td>
                            <td className="py-2 pl-3 text-right text-rose-600">
                              {eur2.format(businessTotal.lostToCancellations)}
                            </td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  </ChartCard>
                ) : null}

                {/* Charts */}
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                  {/* 1) Aktive & neue Torhüter je Monat */}
                  <ChartCard
                    title="Aktive & neue Torhüter"
                    description="Aktive Torhüter je Monat (Linie: mind. eine bestätigte Teilnahme an einem abgeschlossenen Event) und neu angelegte Torhüter (Balken)."
                  >
                    <ResponsiveContainer width="100%" height={300}>
                      <ComposedChart data={kpiSeries} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                        <XAxis dataKey="label" tick={{ fontSize: 12 }} stroke="#94a3b8" />
                        <YAxis allowDecimals={false} tick={{ fontSize: 12 }} stroke="#94a3b8" />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="newKeepers" name="Neu" fill="#c7d2fe" radius={[4, 4, 0, 0]} />
                        <Line
                          type="monotone"
                          dataKey="activeKeepers"
                          name="Aktiv"
                          stroke="#4f46e5"
                          strokeWidth={2.5}
                          dot={{ r: 3 }}
                        />
                      </ComposedChart>
                    </ResponsiveContainer>
                  </ChartCard>

                  {/* 2) Altersverteilung nach Geschlecht */}
                  <ChartCard
                    title="Altersverteilung nach Geschlecht"
                    description="Anzahl Torhüter je Altersjahr, gestapelt nach Geschlecht. Stand heute – unabhängig vom Zeitraum."
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
                          {ALL_GENDERS.map((g) => (
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
                    description="Durchschnittlich bestätigte Teilnehmer je abgeschlossenem Event, getrennt nach Typ. Gestrichelt: gleitender 3-Monats-Schnitt der wöchentlichen Trainings (gewichtet) – zeigt die Entwicklung ohne Ausreisser einzelner Monate. Geplante und abgesagte Events zählen nicht mit. Camps/Keeperdays finden nicht monatlich statt – ihre Linie hat nur dort Punkte, wo Events stattfanden."
                  >
                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart data={attendanceData} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                        <XAxis dataKey="label" tick={{ fontSize: 12 }} stroke="#94a3b8" />
                        <YAxis allowDecimals={false} tick={{ fontSize: 12 }} stroke="#94a3b8" />
                        <Tooltip />
                        <Legend />
                        {EVENT_TYPES.map((t) => (
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
                        <Line
                          type="monotone"
                          dataKey="trend"
                          name="Trend Training (3 Mon.)"
                          stroke="#0f172a"
                          strokeWidth={2}
                          strokeDasharray="6 4"
                          dot={false}
                          connectNulls
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </ChartCard>

                  {/* 4) Umsatz pro Monat nach Event */}
                  <ChartCard
                    title="Umsatz pro Monat nach Typ"
                    description="Summe der Teilnehmerpreise je Event-Typ. Standard: nur bestätigte Anmeldungen. 'Prognose' bezieht offene (submitted/accepted) mit ein. Abgesagte Events zählen nie mit."
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
                        {EVENT_TYPES.map((t) => (
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

                  {/* 5) Herkunft neuer Kontakte */}
                  <ChartCard
                    title="Wie hast du von uns erfahren?"
                    description={`Angaben aus Gast-Anmeldungen (Probetrainings & Camps) je Monat des Events – ${sourceTotal} ${sourceTotal === 1 ? 'Angabe' : 'Angaben'} im Zeitraum. Bestehende Mitglieder werden nicht gefragt.`}
                  >
                    {sourceTotal ? (
                      <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={sourceData} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                          <XAxis dataKey="label" tick={{ fontSize: 12 }} stroke="#94a3b8" />
                          <YAxis allowDecimals={false} tick={{ fontSize: 12 }} stroke="#94a3b8" />
                          <Tooltip />
                          <Legend />
                          {activeSources.map((k) => (
                            <Bar
                              key={k}
                              dataKey={k}
                              name={SOURCE_LABELS[k]}
                              stackId="src"
                              fill={SOURCE_COLORS[k]}
                            />
                          ))}
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <EmptyChart />
                    )}
                  </ChartCard>

                  {/* 6) Probetraining-Konversion */}
                  <ChartCard
                    title="Probetraining-Konversion"
                    description="Probetrainings im Zeitraum (Monat des Probetrainings). Verknüpfung über Kontakt-E-Mail ↔ Eltern-Konto, sonst Vorname + Geburtsdatum. „Weiter trainiert“ = mind. ein reguläres Training danach – sehr junge Probetrainings hatten dafür evtl. noch keine Gelegenheit."
                  >
                    {trials && trials.total.registered ? (
                      <div className="space-y-5">
                        <div className="space-y-2">
                          {(
                            [
                              ['Angemeldet', trials.total.registered, trials.total.registered],
                              ['Teilgenommen', trials.total.attended, trials.total.registered],
                              ['Profil angelegt', trials.total.profile, trials.total.attended],
                              ['Weiter trainiert', trials.total.converted, trials.total.attended],
                            ] as const
                          ).map(([label, value, base], i) => (
                            <div key={label}>
                              <div className="flex items-baseline justify-between text-sm">
                                <span className="font-medium text-slate-700">{label}</span>
                                <span className="tabular-nums text-slate-900">
                                  <span className="font-semibold">{value}</span>
                                  {i > 0 && base > 0 ? (
                                    <span className="ml-1 text-xs text-slate-400">
                                      ({Math.round((value / base) * 100)} %
                                      {i === 1 ? ' der Anmeldungen' : ' der Teilnehmenden'})
                                    </span>
                                  ) : null}
                                </span>
                              </div>
                              <div className="mt-1 h-2.5 overflow-hidden rounded-full bg-slate-100">
                                <div
                                  className="h-full rounded-full"
                                  style={{
                                    width: `${trials.total.registered ? (value / trials.total.registered) * 100 : 0}%`,
                                    backgroundColor: ['#c7d2fe', '#818cf8', '#6366f1', '#10b981'][i],
                                  }}
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                        <div className="-mx-5 overflow-x-auto px-5">
                          <table className="w-full min-w-[360px] text-sm">
                            <thead>
                              <tr className="border-b border-slate-200 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">
                                <th className="py-2 pr-3">Quelle</th>
                                <th className="px-3 py-2 text-right">Angemeldet</th>
                                <th className="px-3 py-2 text-right">Teilgen.</th>
                                <th className="py-2 pl-3 text-right">Weiter trainiert</th>
                              </tr>
                            </thead>
                            <tbody className="tabular-nums text-slate-700">
                              {trials.bySource.map((r) => (
                                <tr key={r.source ?? 'none'} className="border-b border-slate-100">
                                  <td className="py-2 pr-3 font-medium text-slate-900">
                                    {r.source ? (
                                      <span
                                        className="mr-2 inline-block h-2 w-2 rounded-full align-middle"
                                        style={{ backgroundColor: SOURCE_COLORS[r.source] }}
                                      />
                                    ) : null}
                                    {r.source ? SOURCE_LABELS[r.source] : 'Keine Angabe'}
                                  </td>
                                  <td className="px-3 py-2 text-right">{r.registered}</td>
                                  <td className="px-3 py-2 text-right">{r.attended}</td>
                                  <td className="py-2 pl-3 text-right">
                                    {r.converted}
                                    {r.attended ? (
                                      <span className="ml-1 text-xs text-slate-400">
                                        ({Math.round((r.converted / r.attended) * 100)} %)
                                      </span>
                                    ) : null}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    ) : (
                      <EmptyChart />
                    )}
                  </ChartCard>

                  {/* 7) Top-Torhüter nach absolvierten wöchentlichen Trainings */}
                  <ChartCard
                    className="lg:col-span-2"
                    title="Top 5 Torhüter (wöchentliche Trainings)"
                    description="Anzahl absolvierter wöchentlicher Trainings je Torhüter (bestätigte Teilnahmen an abgeschlossenen Trainings). "
                  >
                    {topKeeperData.length ? (
                      <ResponsiveContainer
                        width="100%"
                        height={Math.max(220, topKeeperData.length * 32 + 40)}
                      >
                        <BarChart
                          data={topKeeperData}
                          layout="vertical"
                          margin={{ top: 8, right: 32, left: 8, bottom: 0 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
                          <XAxis
                            type="number"
                            allowDecimals={false}
                            tick={{ fontSize: 12 }}
                            stroke="#94a3b8"
                          />
                          <YAxis
                            type="category"
                            dataKey="name"
                            tick={{ fontSize: 12 }}
                            stroke="#94a3b8"
                            width={140}
                            interval={0}
                          />
                          <Tooltip formatter={(v) => [`${Number(v ?? 0)}`, 'Trainings']} />
                          <Bar
                            dataKey="trainings"
                            name="Absolvierte Trainings"
                            radius={[0, 4, 4, 0]}
                            barSize={18}
                          >
                            {topKeeperData.map((k, i) => (
                              <Cell
                                key={k.keeperId}
                                fill={TOP_KEEPER_COLORS[i % TOP_KEEPER_COLORS.length]}
                              />
                            ))}
                            <LabelList
                              dataKey="trainings"
                              position="right"
                              fontSize={11}
                              fill="#475569"
                            />
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <EmptyChart />
                    )}
                  </ChartCard>
                </div>

                <p className="text-xs text-slate-400">
                  Hinweis: Monat = Eventdatum (bzw. Anlagedatum bei neuen Torhütern). Umsatzzahlen
                  berücksichtigen keine stornierten oder verpassten Anmeldungen und keine
                  abgesagten Events.
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

type Delta = { text: string; tone: 'good' | 'bad' | 'flat' } | null

function fmtOrDash(value: number | null, fmt: (v: number) => string): string {
  return value == null ? '–' : fmt(value)
}

/** Differenz zur Vorperiode; `lowerIsBetter` dreht die Farbe (Quoten). */
function absoluteDelta(
  cur: number | null,
  prev: number | null | undefined,
  fmt: (v: number) => string,
  lowerIsBetter = false
): Delta {
  if (cur == null || prev == null) return null
  const diff = Math.round((cur - prev) * 10) / 10
  if (diff === 0) return { text: '± 0', tone: 'flat' }
  const better = lowerIsBetter ? diff < 0 : diff > 0
  return { text: `${diff > 0 ? '+' : '−'}${fmt(Math.abs(diff))}`, tone: better ? 'good' : 'bad' }
}

/** Prozentuale Veränderung zur Vorperiode (Umsatz); ohne Basis kein Vergleich. */
function relativeDelta(cur: number, prev: number | null | undefined): Delta {
  if (prev == null || prev <= 0) return null
  const pct = Math.round(((cur - prev) / prev) * 100)
  if (pct === 0) return { text: '± 0 %', tone: 'flat' }
  return { text: `${pct > 0 ? '+' : '−'}${Math.abs(pct)} %`, tone: pct > 0 ? 'good' : 'bad' }
}

function KpiTile({
  label,
  hint,
  value,
  delta,
  series,
  seriesKey,
  formatPoint,
}: {
  label: string
  hint: string
  value: string
  delta: Delta
  series: KpiSeriesPoint[]
  seriesKey: keyof PeriodKpis
  formatPoint: (v: number) => string
}) {
  const deltaClass =
    delta?.tone === 'good'
      ? 'bg-emerald-50 text-emerald-700'
      : delta?.tone === 'bad'
      ? 'bg-rose-50 text-rose-700'
      : 'bg-slate-100 text-slate-500'
  return (
    <div className="flex flex-col rounded-2xl border border-slate-200/70 bg-white/90 p-4 shadow-sm">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-400">{label}</p>
      <div className="mt-1 flex flex-wrap items-baseline gap-2">
        <p className="text-2xl font-bold text-slate-900">{value}</p>
        {delta ? (
          <span
            className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${deltaClass}`}
            title="Veränderung ggü. Vorperiode"
          >
            {delta.text}
          </span>
        ) : null}
      </div>
      <p className="text-xs text-slate-400">
        {hint}
        {delta ? ' · ggü. Vorperiode' : ''}
      </p>
      {series.length > 1 ? (
        <div className="mt-2 h-10">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={series} margin={{ top: 4, right: 2, left: 2, bottom: 2 }}>
              <Tooltip
                formatter={(v) => [formatPoint(Number(v ?? 0)), label]}
                labelFormatter={(_, payload) => payload?.[0]?.payload?.label ?? ''}
                contentStyle={{ fontSize: 11, padding: '4px 8px' }}
              />
              <Line
                type="monotone"
                dataKey={seriesKey}
                stroke="#6366f1"
                strokeWidth={2}
                dot={false}
                connectNulls
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      ) : null}
    </div>
  )
}

function ChartCard({
  title,
  description,
  action,
  className = '',
  children,
}: {
  title: string
  description: string
  action?: React.ReactNode
  className?: string
  children: React.ReactNode
}) {
  return (
    <div
      className={`rounded-2xl border border-slate-200/70 bg-white/90 p-5 shadow-sm ${className}`.trim()}
    >
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

function FilterPills<T extends string | number>({
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
