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
 * `paidOnly` = nur bezahlte Teilnehmer (is_paid === true) berücksichtigen.
 */
export function revenueByMonthByType(
  participants: ParticipantRow[],
  events: EventRow[],
  months: string[],
  opts: { paidOnly?: boolean } = {}
): RevenuePoint[] {
  const eventById = new Map(events.map((e) => [e.id, e]))
  const acc = new Map<string, Record<EventType, number>>()
  months.forEach((m) => acc.set(m, { weekly_training: 0, camp: 0, keeperday: 0 }))

  participants.forEach((p) => {
    if (!isCountable(p.status)) return
    if (opts.paidOnly && p.is_paid !== true) return
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

export type AttendancePoint = { month: string; label: string; avg: number; auslastung: number | null }

/**
 * Ø bestätigte Teilnehmer je weekly_training pro Monat + Ø Auslastung gegen capacity.
 * Monat = event.start_date. Nur Events des angegebenen Typs.
 */
export function avgAttendanceByMonth(
  participants: ParticipantRow[],
  events: EventRow[],
  months: string[],
  eventType: EventType = 'weekly_training'
): AttendancePoint[] {
  const relevantEvents = events.filter((e) => e.event_type === eventType)
  const eventById = new Map(relevantEvents.map((e) => [e.id, e]))

  // confirmed Teilnehmer je Event
  const confirmedByEvent = new Map<string, number>()
  participants.forEach((p) => {
    if (p.status !== 'confirmed') return
    if (!p.event_id || !eventById.has(p.event_id)) return
    confirmedByEvent.set(p.event_id, (confirmedByEvent.get(p.event_id) ?? 0) + 1)
  })

  // Events pro Monat sammeln (auch Events ohne Anmeldungen zählen mit 0)
  const eventsByMonth = new Map<string, EventRow[]>()
  relevantEvents.forEach((e) => {
    const key = monthKey(e.start_date)
    if (!eventsByMonth.has(key)) eventsByMonth.set(key, [])
    eventsByMonth.get(key)!.push(e)
  })

  return months.map((m) => {
    const evs = eventsByMonth.get(m) ?? []
    if (!evs.length) return { month: m, label: monthLabel(m), avg: 0, auslastung: null }
    let sumConfirmed = 0
    let sumCapacity = 0
    let capacityCount = 0
    evs.forEach((e) => {
      const c = confirmedByEvent.get(e.id) ?? 0
      sumConfirmed += c
      if (e.capacity && e.capacity > 0) {
        sumCapacity += e.capacity
        capacityCount += 1
      }
    })
    const avg = Math.round((sumConfirmed / evs.length) * 10) / 10
    const auslastung =
      capacityCount > 0 && sumCapacity > 0
        ? Math.round((sumConfirmed / sumCapacity) * 100)
        : null
    return { month: m, label: monthLabel(m), avg, auslastung }
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

export type Scorecards = {
  activeMembers: number
  momGrowthPct: number | null
  revenueMtd: number
  avgUtilizationPct: number | null
  cancellationRatePct: number
  outstandingAmount: number
}

export function computeScorecards(
  keepers: KeeperRow[],
  participants: ParticipantRow[],
  events: EventRow[],
  ref: Date = new Date()
): Scorecards {
  const currentMonth = monthKey(ref.toISOString())
  const prevRef = new Date(ref.getFullYear(), ref.getMonth() - 1, 1)
  const prevMonth = monthKey(prevRef.toISOString())

  // Mitglieder-Wachstum
  const newCurrent = keepers.filter((k) => monthKey(k.created_at) === currentMonth).length
  const newPrev = keepers.filter((k) => monthKey(k.created_at) === prevMonth).length
  const momGrowthPct = newPrev > 0 ? Math.round(((newCurrent - newPrev) / newPrev) * 100) : null

  // Umsatz laufender Monat (nach event.start_date)
  const eventById = new Map(events.map((e) => [e.id, e]))
  let revenueMtd = 0
  let outstandingAmount = 0
  participants.forEach((p) => {
    if (!isCountable(p.status)) return
    const ev = p.event_id ? eventById.get(p.event_id) : undefined
    const price = toNumber(p.price)
    if (ev && monthKey(ev.start_date) === currentMonth) revenueMtd += price
    if (p.is_paid !== true) outstandingAmount += price
  })

  // Ø Auslastung weekly_training
  const weekly = events.filter((e) => e.event_type === 'weekly_training')
  const confirmedByEvent = new Map<string, number>()
  participants.forEach((p) => {
    if (p.status !== 'confirmed' || !p.event_id) return
    confirmedByEvent.set(p.event_id, (confirmedByEvent.get(p.event_id) ?? 0) + 1)
  })
  let sumConfirmed = 0
  let sumCapacity = 0
  weekly.forEach((e) => {
    if (e.capacity && e.capacity > 0) {
      sumConfirmed += confirmedByEvent.get(e.id) ?? 0
      sumCapacity += e.capacity
    }
  })
  const avgUtilizationPct = sumCapacity > 0 ? Math.round((sumConfirmed / sumCapacity) * 100) : null

  // Storno-/No-Show-Quote
  const total = participants.length
  const lost = participants.filter((p) => p.status === 'cancelled' || p.status === 'missed').length
  const cancellationRatePct = total > 0 ? Math.round((lost / total) * 100) : 0

  return {
    activeMembers: keepers.length,
    momGrowthPct,
    revenueMtd: Math.round(revenueMtd * 100) / 100,
    avgUtilizationPct,
    cancellationRatePct,
    outstandingAmount: Math.round(outstandingAmount * 100) / 100,
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
