/**
 * Reine Aggregations-Helfer für das Analytics-Dashboard (app/admin/analytics).
 * Bewusst frei von React/Supabase, damit sie leicht testbar bleiben.
 */

export type EventType = 'weekly_training' | 'camp' | 'keeperday'
export type Gender = 'female' | 'male' | 'diverse'

export type KeeperRow = {
  id: string
  first_name: string | null
  last_name: string | null
  birth_date: string | null
  gender: string | null
  created_at: string
  deleted_at: string | null
}

export type EventRow = {
  id: string
  event_type: EventType
  start_date: string
  capacity: number | null
  price: number | string | null
  /**
   * DB-Enum public.event_status_types. Bewusst weit typisiert: die Union in
   * lib/eventStatus.ts kennt 'archived' nicht, und hier wird ohnehin nur
   * gegen einzelne Literale verglichen.
   */
  event_status: string | null
}

export type ParticipantRow = {
  id: string
  event_id: string | null
  keeper_id: string | null
  /** Nur für das Probetraining-Matching geladen. */
  registration_id?: string | null
  first_name?: string | null
  gender: Gender | null
  birth_date: string | null
  price: number | string | null
  is_paid: boolean | null
  status: 'submitted' | 'cancelled' | 'accepted' | 'confirmed' | 'missed'
  created_at: string
}

export const EVENT_TYPES: EventType[] = ['weekly_training', 'camp', 'keeperday']

export const EVENT_TYPE_LABELS: Record<EventType, string> = {
  weekly_training: 'Wöchentliches Training',
  camp: 'Camp',
  keeperday: 'Keeperday',
}

/** Storno/No-Show zählen weder für Umsatz noch für Auslastung. */
export function isCountable(status: ParticipantRow['status']): boolean {
  return status !== 'cancelled' && status !== 'missed'
}

/**
 * Nur abgeschlossene Events zählen für Auslastungs-Durchschnitte.
 * Geplante Events (open/full/preview) haben naturgemäss noch keine bestätigten
 * Teilnehmer und würden den Schnitt nach unten ziehen; abgesagte Events haben
 * gar nicht stattgefunden.
 */
export function isClosedEvent(event: EventRow): boolean {
  return event.event_status === 'closed'
}

export function toNumber(value: number | string | null | undefined): number {
  if (value == null) return 0
  const n = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(n) ? n : 0
}

/** 'YYYY-MM' aus einem ISO-/Datums-String. Leerer String bei ungültigem Input. */
export function monthKey(dateStr: string | null | undefined): string {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  if (Number.isNaN(d.getTime())) return ''
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

/** 'YYYY-MM' -> 'MM.YYYY' für Achsenbeschriftungen. */
export function monthLabel(key: string): string {
  const [y, m] = key.split('-')
  if (!y || !m) return key
  return `${m}.${y}`
}

/** Lückenlose, aufsteigende Monatsliste zwischen zwei 'YYYY-MM'-Keys (inklusive). */
export function monthsBetween(startKey: string, endKey: string): string[] {
  if (!startKey || !endKey || startKey > endKey) return []
  const [sy, sm] = startKey.split('-').map(Number)
  const [ey, em] = endKey.split('-').map(Number)
  const out: string[] = []
  let y = sy
  let m = sm
  // Sicherheitslimit gegen Endlosschleifen bei fehlerhaftem Input.
  for (let i = 0; i < 600 && (y < ey || (y === ey && m <= em)); i++) {
    out.push(`${y}-${String(m).padStart(2, '0')}`)
    m += 1
    if (m > 12) {
      m = 1
      y += 1
    }
  }
  return out
}

/** Aktuelles Alter in Jahren zum Stichtag (Default: heute). */
export function computeAge(birthDate: string | null | undefined, ref: Date = new Date()): number | null {
  if (!birthDate) return null
  const b = new Date(birthDate)
  if (Number.isNaN(b.getTime())) return null
  let age = ref.getFullYear() - b.getFullYear()
  const monthDiff = ref.getMonth() - b.getMonth()
  if (monthDiff < 0 || (monthDiff === 0 && ref.getDate() < b.getDate())) age -= 1
  return age
}

export function normalizeGender(value: string | null | undefined): Gender | null {
  if (!value) return null
  const v = value.trim().toLowerCase()
  if (v === 'female' || v === 'weiblich' || v === 'w' || v === 'f') return 'female'
  if (v === 'male' || v === 'männlich' || v === 'maennlich' || v === 'm') return 'male'
  if (v === 'diverse' || v === 'divers' || v === 'd') return 'diverse'
  return null
}

// ---------------------------------------------------------------------------
// Chart-Aggregationen
// ---------------------------------------------------------------------------

export type RevenuePoint = { month: string; label: string } & Record<EventType, number>

/**
 * Umsatz pro Monat und Event-Typ (Monat = event.start_date).
 * Standard: nur bestätigte Teilnehmer (status = 'confirmed').
 * `forecast` = zusätzlich offene Anmeldungen (submitted + accepted) für eine Prognose.
 *
 * Abgesagte Events (`event_status = 'cancelled'`) bleiben immer aussen vor: bei einer
 * Absage bleiben die Anmeldungen bewusst auf submitted/accepted stehen, wären in der
 * Prognose also erwarteter Umsatz aus einem Termin, der nicht stattfindet.
 */
export function revenueByMonthByType(
  participants: ParticipantRow[],
  events: EventRow[],
  months: string[],
  opts: { forecast?: boolean } = {}
): RevenuePoint[] {
  const eventById = new Map(events.map((e) => [e.id, e]))
  const acc = new Map<string, Record<EventType, number>>()
  months.forEach((m) => acc.set(m, { weekly_training: 0, camp: 0, keeperday: 0 }))

  participants.forEach((p) => {
    if (!isCountable(p.status)) return
    if (!opts.forecast && p.status !== 'confirmed') return
    const ev = p.event_id ? eventById.get(p.event_id) : undefined
    if (!ev) return
    if (ev.event_status === 'cancelled') return
    const key = monthKey(ev.start_date)
    const bucket = acc.get(key)
    if (!bucket) return
    bucket[ev.event_type] += toNumber(p.price)
  })

  return months.map((m) => {
    const bucket = acc.get(m) ?? { weekly_training: 0, camp: 0, keeperday: 0 }
    return {
      month: m,
      label: monthLabel(m),
      weekly_training: Math.round(bucket.weekly_training * 100) / 100,
      camp: Math.round(bucket.camp * 100) / 100,
      keeperday: Math.round(bucket.keeperday * 100) / 100,
    }
  })
}

export type AttendanceByTypePoint = { month: string; label: string } & Record<
  EventType,
  number | null
>

/**
 * Ø bestätigte Teilnehmer je Event pro Monat – getrennt nach Event-Typ.
 * Monat = event.start_date. Wert ist `null`, wenn in dem Monat kein Event dieses Typs
 * stattfand (wichtig für Camps/Keeperdays, die nicht monatlich stattfinden – so entsteht
 * keine irreführende „0"-Linie, sondern eine Lücke).
 * Nenner sind ausschliesslich abgeschlossene Events (`event_status = 'closed'`).
 */
export function avgAttendanceByMonthByType(
  participants: ParticipantRow[],
  events: EventRow[],
  months: string[]
): AttendanceByTypePoint[] {
  // confirmed Teilnehmer je Event
  const confirmedByEvent = new Map<string, number>()
  participants.forEach((p) => {
    if (p.status !== 'confirmed' || !p.event_id) return
    confirmedByEvent.set(p.event_id, (confirmedByEvent.get(p.event_id) ?? 0) + 1)
  })

  // Summe confirmed + Anzahl Events je (Monat, Typ)
  const agg = new Map<string, { sum: number; count: number }>()
  events.filter(isClosedEvent).forEach((e) => {
    const key = `${monthKey(e.start_date)}|${e.event_type}`
    const entry = agg.get(key) ?? { sum: 0, count: 0 }
    entry.sum += confirmedByEvent.get(e.id) ?? 0
    entry.count += 1
    agg.set(key, entry)
  })

  return months.map((m) => {
    const point = { month: m, label: monthLabel(m) } as AttendanceByTypePoint
    EVENT_TYPES.forEach((t) => {
      const entry = agg.get(`${m}|${t}`)
      point[t] = entry && entry.count > 0 ? Math.round((entry.sum / entry.count) * 10) / 10 : null
    })
    return point
  })
}

export type AgeBin = { age: number; label: string; male: number; female: number; diverse: number }

/**
 * Altersverteilung (ein Balken je Altersjahr) aus Keeper-Stammdaten.
 * Ein Datensatz pro Mitglied → keine Doppelzählung über mehrere Anmeldungen.
 */
export function ageHistogram(keepers: KeeperRow[], ref: Date = new Date()): AgeBin[] {
  const bins = new Map<number, AgeBin>()
  keepers.forEach((k) => {
    const age = computeAge(k.birth_date, ref)
    if (age == null || age < 0 || age > 120) return
    const gender = normalizeGender(k.gender)
    if (!bins.has(age)) {
      bins.set(age, { age, label: `${age}`, male: 0, female: 0, diverse: 0 })
    }
    const bin = bins.get(age)!
    if (gender === 'male') bin.male += 1
    else if (gender === 'female') bin.female += 1
    else if (gender === 'diverse') bin.diverse += 1
  })
  return Array.from(bins.values()).sort((a, b) => a.age - b.age)
}

export type TopKeeperPoint = { keeperId: string; name: string; trainings: number }

/** 'Vorname N.'-artiger Anzeigename; fällt auf die Keeper-ID zurück, wenn nichts gepflegt ist. */
export function keeperDisplayName(keeper: KeeperRow): string {
  const name = [keeper.first_name, keeper.last_name].filter(Boolean).join(' ').trim()
  return name || `#${keeper.id.slice(0, 8)}`
}

/**
 * Top-Torhüter nach Anzahl absolvierter wöchentlicher Trainings im gewählten Zeitraum.
 * Absolviert = `status = 'confirmed'` auf einem abgeschlossenen (`closed`) weekly_training,
 * dessen `start_date` in einem der übergebenen Monate liegt. 'missed' zählt bewusst nicht:
 * das Training wurde nicht absolviert (siehe No-Show-Quote).
 * Teilnahmen ohne bekannten (z. B. gelöschten) Keeper werden ausgelassen.
 */
export function topKeepersByTrainings(
  participants: ParticipantRow[],
  events: EventRow[],
  keepers: KeeperRow[],
  months: string[],
  limit: number
): TopKeeperPoint[] {
  const monthSet = new Set(months)
  const trainingIds = new Set(
    events
      .filter(
        (e) =>
          e.event_type === 'weekly_training' &&
          isClosedEvent(e) &&
          monthSet.has(monthKey(e.start_date))
      )
      .map((e) => e.id)
  )

  const counts = new Map<string, number>()
  participants.forEach((p) => {
    if (p.status !== 'confirmed' || !p.keeper_id || !p.event_id) return
    if (!trainingIds.has(p.event_id)) return
    counts.set(p.keeper_id, (counts.get(p.keeper_id) ?? 0) + 1)
  })

  const nameById = new Map(keepers.map((k) => [k.id, keeperDisplayName(k)]))
  return Array.from(counts.entries())
    .filter(([keeperId]) => nameById.has(keeperId))
    .map(([keeperId, trainings]) => ({ keeperId, name: nameById.get(keeperId)!, trainings }))
    .sort((a, b) => b.trainings - a.trainings || a.name.localeCompare(b.name, 'de'))
    .slice(0, Math.max(1, limit))
}

// ---------------------------------------------------------------------------
// Kennzahlen je Zeitraum (Kacheln)
// ---------------------------------------------------------------------------

/**
 * Alle Kachel-Kennzahlen beziehen sich auf den globalen Zeitraum (Monat = event.start_date
 * bzw. keeper.created_at). `null` = im Zeitraum keine Datenbasis (Kachel zeigt „–").
 */
export type PeriodKpis = {
  /** Summe der Teilnehmerpreise, nur `confirmed`, abgesagte Events ausgenommen. */
  revenue: number
  /** Ø bestätigte Teilnehmer je abgeschlossenem wöchentlichem Training. */
  avgParticipantsPerTraining: number | null
  /** Verschiedene Torhüter mit ≥ 1 bestätigter Teilnahme an einem abgeschlossenen Event. */
  activeKeepers: number
  /** Im Zeitraum angelegte (nicht gelöschte) Torhüter. */
  newKeepers: number
  /** missed / (confirmed + missed) – 'cancelled' (rechtzeitige Abmeldung) zählt nicht. */
  noShowRatePct: number | null
  /** cancelled / (cancelled + closed), alle Event-Typen; geplante Events bleiben aussen vor. */
  cancellationRatePct: number | null
}

export function computePeriodKpis(
  keepers: KeeperRow[],
  participants: ParticipantRow[],
  events: EventRow[],
  months: string[]
): PeriodKpis {
  const monthSet = new Set(months)
  const inRange = (e: EventRow) => monthSet.has(monthKey(e.start_date))
  const rangeEvents = events.filter(inRange)
  const eventById = new Map(rangeEvents.map((e) => [e.id, e]))

  let revenue = 0
  let missed = 0
  let finalized = 0
  const confirmedByEvent = new Map<string, number>()
  const active = new Set<string>()

  participants.forEach((p) => {
    const ev = p.event_id ? eventById.get(p.event_id) : undefined
    if (!ev) return
    if (p.status === 'missed') {
      missed += 1
      finalized += 1
    }
    if (p.status !== 'confirmed') return
    finalized += 1
    if (ev.event_status !== 'cancelled') revenue += toNumber(p.price)
    confirmedByEvent.set(ev.id, (confirmedByEvent.get(ev.id) ?? 0) + 1)
    if (p.keeper_id && isClosedEvent(ev)) active.add(p.keeper_id)
  })

  // Nur abgeschlossene Trainings: geplante hätten 0 bestätigte Teilnehmer, abgesagte
  // haben nicht stattgefunden – beide würden den Schnitt verfälschen.
  const weekly = rangeEvents.filter((e) => e.event_type === 'weekly_training' && isClosedEvent(e))
  const confirmedInWeekly = weekly.reduce((sum, e) => sum + (confirmedByEvent.get(e.id) ?? 0), 0)

  const cancelledCount = rangeEvents.filter((e) => e.event_status === 'cancelled').length
  const closedCount = rangeEvents.filter(isClosedEvent).length
  const cancellationBase = cancelledCount + closedCount

  return {
    revenue: Math.round(revenue * 100) / 100,
    avgParticipantsPerTraining: weekly.length
      ? Math.round((confirmedInWeekly / weekly.length) * 10) / 10
      : null,
    activeKeepers: active.size,
    newKeepers: keepers.filter((k) => monthSet.has(monthKey(k.created_at))).length,
    noShowRatePct: finalized > 0 ? Math.round((missed / finalized) * 1000) / 10 : null,
    cancellationRatePct:
      cancellationBase > 0 ? Math.round((cancelledCount / cancellationBase) * 1000) / 10 : null,
  }
}

export type KpiSeriesPoint = { month: string; label: string } & PeriodKpis

/** Kennzahlen je Einzelmonat – Grundlage für die Mini-Verläufe in den Kacheln. */
export function monthlyKpiSeries(
  keepers: KeeperRow[],
  participants: ParticipantRow[],
  events: EventRow[],
  months: string[]
): KpiSeriesPoint[] {
  return months.map((m) => ({
    month: m,
    label: monthLabel(m),
    ...computePeriodKpis(keepers, participants, events, [m]),
  }))
}

/**
 * Gleitender Ø TWs je wöchentlichem Training über die letzten `window` Monate (inkl. Monat m).
 * Gewichtet (Summe Teilnehmer / Summe Trainings), nicht Mittel der Monatsmittel – ein Monat
 * mit 2 Trainings zählt weniger als einer mit 8. Greift für die ersten Punkte bewusst auch
 * auf Monate VOR dem Zeitraum zurück, damit die Linie nicht mit Ausreissern startet.
 */
export function weeklyAttendanceTrend(
  keepers: KeeperRow[],
  participants: ParticipantRow[],
  events: EventRow[],
  months: string[],
  window = 3
): Array<number | null> {
  return months.map(
    (m) =>
      computePeriodKpis(keepers, participants, events, monthsBetween(shiftMonth(m, -(window - 1)), m))
        .avgParticipantsPerTraining
  )
}

/** 'YYYY-MM' um `delta` Monate verschieben. */
export function shiftMonth(key: string, delta: number): string {
  const [y, m] = key.split('-').map(Number)
  if (!y || !m) return key
  const d = new Date(y, m - 1 + delta, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

/** Gleich langer Zeitraum unmittelbar vor `months` (für den Vergleich „ggü. Vorperiode"). */
export function previousPeriod(months: string[]): string[] {
  if (!months.length) return []
  const end = shiftMonth(months[0], -1)
  return monthsBetween(shiftMonth(end, -(months.length - 1)), end)
}

// ---------------------------------------------------------------------------
// Business-Tabelle
// ---------------------------------------------------------------------------

export type BusinessFigures = {
  /** Abgeschlossene wöchentliche Trainings. */
  trainings: number
  /** Bestätigte Teilnahmen an nicht abgesagten Events (alle Typen) – Basis des Umsatzes. */
  participations: number
  avgPerTraining: number | null
  /** Verschiedene Torhüter – in der Summenzeile über den GANZEN Zeitraum, nicht aufsummiert. */
  activeKeepers: number
  revenue: number
  /** Davon noch nicht bezahlt (`is_paid` ist nie false, nur true/NULL → `!== true`). */
  outstanding: number
  /**
   * Entgangener Umsatz durch abgesagte Events: Preise der Anmeldungen, die bei der Absage
   * bewusst auf submitted/accepted stehen bleiben (bzw. confirmed waren).
   */
  lostToCancellations: number
}

export type BusinessRow = { month: string; label: string } & BusinessFigures

const round2 = (n: number) => Math.round(n * 100) / 100

export function businessFigures(
  keepers: KeeperRow[],
  participants: ParticipantRow[],
  events: EventRow[],
  months: string[]
): BusinessFigures {
  const kpis = computePeriodKpis(keepers, participants, events, months)
  const monthSet = new Set(months)
  const eventById = new Map(
    events.filter((e) => monthSet.has(monthKey(e.start_date))).map((e) => [e.id, e])
  )

  let participations = 0
  let outstanding = 0
  let lostToCancellations = 0
  participants.forEach((p) => {
    const ev = p.event_id ? eventById.get(p.event_id) : undefined
    if (!ev) return
    if (ev.event_status === 'cancelled') {
      if (p.status === 'submitted' || p.status === 'accepted' || p.status === 'confirmed') {
        lostToCancellations += toNumber(p.price)
      }
      return
    }
    if (p.status !== 'confirmed') return
    participations += 1
    if (p.is_paid !== true) outstanding += toNumber(p.price)
  })

  return {
    trainings: Array.from(eventById.values()).filter(
      (e) => e.event_type === 'weekly_training' && isClosedEvent(e)
    ).length,
    participations,
    avgPerTraining: kpis.avgParticipantsPerTraining,
    activeKeepers: kpis.activeKeepers,
    revenue: kpis.revenue,
    outstanding: round2(outstanding),
    lostToCancellations: round2(lostToCancellations),
  }
}

/** Eine Zeile je Monat (neuester zuerst) – die Summenzeile kommt aus `businessFigures(months)`. */
export function businessByMonth(
  keepers: KeeperRow[],
  participants: ParticipantRow[],
  events: EventRow[],
  months: string[]
): BusinessRow[] {
  return months
    .map((m) => ({ month: m, label: monthLabel(m), ...businessFigures(keepers, participants, events, [m]) }))
    .reverse()
}

// ---------------------------------------------------------------------------
// Probetrainings: Herkunft & Konversion
// ---------------------------------------------------------------------------

export type RegistrationRow = {
  id: string
  event_id: string
  contact_email: string | null
  informed_via: string | null
  is_trial_training: boolean | null
}
export type ParentRow = { id: string; email: string | null }
export type RelationshipRow = { keeper_id: string; parent_id: string }

export const SOURCE_KEYS = [
  'friend',
  'club',
  'social_media',
  'website',
  'email',
  'newspaper',
  'other',
] as const
export type SourceKey = (typeof SOURCE_KEYS)[number]

/** Gleiche Bezeichnungen wie im Admin-Event-Export (app/admin/events). */
export const SOURCE_LABELS: Record<SourceKey, string> = {
  friend: 'Freund/in',
  /** Nur Camp/Keeper Day abgefragt. */
  club: 'Trainer/in oder Verein',
  social_media: 'Soziale Medien',
  website: 'Webseite',
  email: 'E-Mail',
  newspaper: 'Zeitung',
  other: 'Sonstiges',
}

export function normalizeSource(value: string | null | undefined): SourceKey | null {
  const v = value?.trim().toLowerCase()
  if (!v) return null
  return (SOURCE_KEYS as readonly string[]).includes(v) ? (v as SourceKey) : 'other'
}

export type SourcePoint = { month: string; label: string; total: number } & Record<SourceKey, number>

/**
 * „Wie hast du von uns erfahren?" je Monat (Monat = Eventdatum). Gefragt wird bei Gast-
 * Anmeldungen (Probetraining, Camp) – Anmeldungen bestehender Mitglieder haben kein
 * `informed_via` und fallen automatisch raus.
 */
export function sourcesByMonth(
  registrations: RegistrationRow[],
  events: EventRow[],
  months: string[]
): SourcePoint[] {
  const eventById = new Map(events.map((e) => [e.id, e]))
  const acc = new Map<string, Record<SourceKey, number>>()
  const empty = () =>
    Object.fromEntries(SOURCE_KEYS.map((k) => [k, 0])) as Record<SourceKey, number>
  months.forEach((m) => acc.set(m, empty()))
  registrations.forEach((r) => {
    const source = normalizeSource(r.informed_via)
    const ev = eventById.get(r.event_id)
    if (!source || !ev) return
    const bucket = acc.get(monthKey(ev.start_date))
    if (bucket) bucket[source] += 1
  })
  return months.map((m) => {
    const bucket = acc.get(m) ?? empty()
    const total = SOURCE_KEYS.reduce((sum, k) => sum + bucket[k], 0)
    return { month: m, label: monthLabel(m), total, ...bucket }
  })
}

export type TrialStats = {
  /** Teilnehmer aus Probetraining-Anmeldungen (alle Status). */
  registered: number
  /** Davon tatsächlich da gewesen (`confirmed`). */
  attended: number
  /** Von den Teilnehmenden: Eltern-Konto bzw. Torhüter-Profil gefunden. */
  profile: number
  /** Von den Teilnehmenden: ≥ 1 bestätigtes reguläres Training NACH dem Probetraining. */
  converted: number
}

export type TrialSourceRow = { source: SourceKey | null } & TrialStats

const norm = (v: string | null | undefined) => v?.trim().toLowerCase() || ''
const nameKey = (first: string | null | undefined, birth: string | null | undefined) =>
  norm(first) && birth ? `${norm(first)}|${birth}` : ''

/**
 * Probetraining-Konversion. Probetraining-Teilnehmer sind Gäste und haben NIE eine
 * `keeper_id` – die Verknüpfung zu einem späteren Mitglied läuft daher über
 *   1. Kontakt-E-Mail der Anmeldung ↔ `parents.email` (→ Kinder über `relationships`,
 *      eingeschränkt auf denselben Vornamen), und
 *   2. Fallback Vorname + Geburtsdatum ↔ `keepers`.
 * „Weiter trainiert" = bestätigte Teilnahme an einem abgeschlossenen wöchentlichen Training
 * aus einer NICHT-Probetraining-Anmeldung nach dem Probetraining – erkannt über die
 * gefundenen Keeper, Vorname + Geburtsdatum oder dieselbe Kontakt-E-Mail (Gast-Wiederanmeldung).
 * Zeitraum = Monat des Probetrainings.
 */
export function trialConversion(
  registrations: RegistrationRow[],
  participants: ParticipantRow[],
  events: EventRow[],
  keepers: KeeperRow[],
  parents: ParentRow[],
  relationships: RelationshipRow[],
  months: string[]
): { total: TrialStats; bySource: TrialSourceRow[] } {
  const monthSet = new Set(months)
  const eventById = new Map(events.map((e) => [e.id, e]))
  const regById = new Map(registrations.map((r) => [r.id, r]))

  const parentIdsByEmail = new Map<string, string[]>()
  parents.forEach((pa) => {
    const e = norm(pa.email)
    if (e) parentIdsByEmail.set(e, [...(parentIdsByEmail.get(e) ?? []), pa.id])
  })
  const keeperIdsByParent = new Map<string, string[]>()
  relationships.forEach((r) =>
    keeperIdsByParent.set(r.parent_id, [...(keeperIdsByParent.get(r.parent_id) ?? []), r.keeper_id])
  )
  const keeperById = new Map(keepers.map((k) => [k.id, k]))
  const keeperIdsByName = new Map<string, string[]>()
  keepers.forEach((k) => {
    const key = nameKey(k.first_name, k.birth_date)
    if (key) keeperIdsByName.set(key, [...(keeperIdsByName.get(key) ?? []), k.id])
  })

  // Spätere reguläre Trainings (abgeschlossen, bestätigt, keine Probetraining-Anmeldung).
  const regular = participants.flatMap((q) => {
    if (q.status !== 'confirmed') return []
    const ev = q.event_id ? eventById.get(q.event_id) : undefined
    if (!ev || ev.event_type !== 'weekly_training' || !isClosedEvent(ev)) return []
    const reg = q.registration_id ? regById.get(q.registration_id) : undefined
    if (reg?.is_trial_training) return []
    return [
      {
        date: ev.start_date,
        keeperId: q.keeper_id,
        name: nameKey(q.first_name, q.birth_date),
        email: norm(reg?.contact_email),
      },
    ]
  })

  const zero = (): TrialStats => ({ registered: 0, attended: 0, profile: 0, converted: 0 })
  const total = zero()
  const bySource = new Map<SourceKey | null, TrialStats>()

  participants.forEach((p) => {
    const reg = p.registration_id ? regById.get(p.registration_id) : undefined
    if (!reg?.is_trial_training) return
    const ev = p.event_id ? eventById.get(p.event_id) : undefined
    if (!ev || !monthSet.has(monthKey(ev.start_date))) return

    const source = normalizeSource(reg.informed_via)
    const row = bySource.get(source) ?? zero()
    bySource.set(source, row)
    total.registered += 1
    row.registered += 1
    if (p.status !== 'confirmed') return
    total.attended += 1
    row.attended += 1

    const email = norm(reg.contact_email)
    const name = nameKey(p.first_name, p.birth_date)
    const parentIds = email ? parentIdsByEmail.get(email) ?? [] : []
    const keeperIds = new Set<string>(name ? keeperIdsByName.get(name) ?? [] : [])
    parentIds.forEach((pid) =>
      (keeperIdsByParent.get(pid) ?? []).forEach((kid) => {
        if (norm(keeperById.get(kid)?.first_name) === norm(p.first_name)) keeperIds.add(kid)
      })
    )

    if (parentIds.length || keeperIds.size) {
      total.profile += 1
      row.profile += 1
    }
    const continued = regular.some(
      (q) =>
        q.date > ev.start_date &&
        ((q.keeperId && keeperIds.has(q.keeperId)) ||
          (name && q.name === name) ||
          (email && q.email === email))
    )
    if (continued) {
      total.converted += 1
      row.converted += 1
    }
  })

  return {
    total,
    bySource: Array.from(bySource.entries())
      .map(([source, stats]) => ({ source, ...stats }))
      .sort((a, b) => b.registered - a.registered),
  }
}

/** Bestimmt die anzuzeigende Monatsspanne aus den Daten, begrenzt auf `maxMonths`. */
export function deriveMonthRange(
  keepers: KeeperRow[],
  events: EventRow[],
  ref: Date = new Date(),
  maxMonths = 12
): string[] {
  const keys: string[] = []
  keepers.forEach((k) => {
    const m = monthKey(k.created_at)
    if (m) keys.push(m)
  })
  events.forEach((e) => {
    const m = monthKey(e.start_date)
    if (m) keys.push(m)
  })
  const endKey = monthKey(ref.toISOString())
  if (!keys.length) return endKey ? [endKey] : []
  const minKey = keys.reduce((a, b) => (a < b ? a : b))
  const full = monthsBetween(minKey, endKey)
  return full.length > maxMonths ? full.slice(full.length - maxMonths) : full
}
