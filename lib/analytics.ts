/**
 * Reine Aggregations-Helfer für das Analytics-Dashboard (app/admin/analytics).
 * Bewusst frei von React/Supabase, damit sie leicht testbar bleiben.
 */

export type EventType = 'weekly_training' | 'camp' | 'keeperday'
export type Gender = 'female' | 'male' | 'diverse'

export type KeeperRow = {
  id: string
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

export type MemberGrowthPoint = { month: string; label: string; neu: number; kumuliert: number }

/**
 * Neue Keeper pro Monat + kumulierte Summe.
 * `baseBefore` = Anzahl Keeper, die schon vor dem ersten angezeigten Monat existierten,
 * damit die kumulierte Linie korrekt startet.
 */
export function newMembersByMonth(keepers: KeeperRow[], months: string[]): MemberGrowthPoint[] {
  const perMonth = new Map<string, number>()
  months.forEach((m) => perMonth.set(m, 0))
  const firstMonth = months[0] ?? ''
  let baseBefore = 0
  keepers.forEach((k) => {
    const key = monthKey(k.created_at)
    if (!key) return
    if (perMonth.has(key)) {
      perMonth.set(key, (perMonth.get(key) ?? 0) + 1)
    } else if (firstMonth && key < firstMonth) {
      baseBefore += 1
    }
  })
  let running = baseBefore
  return months.map((m) => {
    const neu = perMonth.get(m) ?? 0
    running += neu
    return { month: m, label: monthLabel(m), neu, kumuliert: running }
  })
}

export type RevenuePoint = { month: string; label: string } & Record<EventType, number>

/**
 * Umsatz pro Monat und Event-Typ (Monat = event.start_date).
 * Standard: nur bestätigte Teilnehmer (status = 'confirmed').
 * `forecast` = zusätzlich offene Anmeldungen (submitted + accepted) für eine Prognose.
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

// ---------------------------------------------------------------------------
// Scorecards
// ---------------------------------------------------------------------------

/**
 * Bewusst nur absolute Kennzahlen – keine Monatswerte. Monatsbezogene Auswertungen
 * (Umsatz, Auslastung) leben ausschliesslich in den Charts mit eigenem Zeitraumfilter.
 */
export type Scorecards = {
  activeMembers: number
  avgParticipantsPerTraining: number | null
  /** No-Show-Quote: Anteil 'missed' an abgeschlossenen Teilnahmen (confirmed + missed). */
  noShowRatePct: number
  /** Eventausfälle: Anteil abgesagter Events an (cancelled + closed), alle Event-Typen. */
  cancellationRatePct: number
}

export function computeScorecards(
  keepers: KeeperRow[],
  participants: ParticipantRow[],
  events: EventRow[]
): Scorecards {
  // Ø Teilnehmer je wöchentlichem Training (absolut; Kapazität wird nicht gepflegt).
  // Nur abgeschlossene Trainings: geplante hätten 0 bestätigte Teilnehmer, abgesagte
  // haben nicht stattgefunden – beide würden den Schnitt verfälschen.
  const weekly = events.filter((e) => e.event_type === 'weekly_training' && isClosedEvent(e))
  const confirmedByEvent = new Map<string, number>()
  participants.forEach((p) => {
    if (p.status !== 'confirmed' || !p.event_id) return
    confirmedByEvent.set(p.event_id, (confirmedByEvent.get(p.event_id) ?? 0) + 1)
  })
  let confirmedInWeekly = 0
  weekly.forEach((e) => {
    confirmedInWeekly += confirmedByEvent.get(e.id) ?? 0
  })
  const avgParticipantsPerTraining = weekly.length
    ? Math.round((confirmedInWeekly / weekly.length) * 10) / 10
    : null

  // No-Show-Quote: Anteil 'missed' an abgeschlossenen Teilnahmen (confirmed + missed).
  // 'cancelled' = rechtzeitige Abmeldung → zählt nicht; submitted/accepted sind noch offen.
  const missedCount = participants.filter((p) => p.status === 'missed').length
  const finalizedCount = participants.filter(
    (p) => p.status === 'confirmed' || p.status === 'missed'
  ).length
  const noShowRatePct = finalizedCount > 0 ? Math.round((missedCount / finalizedCount) * 100) : 0

  // Eventausfälle: abgesagt / (abgesagt + abgeschlossen), über alle Event-Typen.
  // Geplante Events bleiben bewusst aussen vor – sonst würde die Quote allein
  // dadurch sinken, dass neue Termine angelegt werden.
  const cancelledCount = events.filter((e) => e.event_status === 'cancelled').length
  const closedCount = events.filter(isClosedEvent).length
  const cancellationBase = cancelledCount + closedCount
  const cancellationRatePct =
    cancellationBase > 0 ? Math.round((cancelledCount / cancellationBase) * 1000) / 10 : 0

  return {
    activeMembers: keepers.length,
    avgParticipantsPerTraining,
    noShowRatePct,
    cancellationRatePct,
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
