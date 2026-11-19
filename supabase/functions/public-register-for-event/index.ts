// supabase/functions/public-register-for-event/index.ts
import { serve } from "https://deno.land/std@0.224.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
}

type ContactInput = {
  first_name: string
  last_name: string
  email?: string | null
  phone?: string | null
}

type ParticipantInput = {
  keeper_id?: string | null // for logged-in flow later; in public flow you typically omit
  first_name: string
  last_name: string
  birth_date: string // YYYY-MM-DD
  gender?: string | null
  email?: string | null
  phone?: string | null
  team?: string | null
  health_insurance_number?: string | null
  medication?: string | null
  glove_size?: number | string | null
  shirt_size?: string | null
  diet: string | null
  price: number
}

type PublicRegisterBody = {
  event_id: string

  // compliance/marketing
  agb_accepted: boolean
  media_creation_accepted: boolean
  newsletter_opt_in?: boolean | null

  // informed via
  informed_via: string

  // check if trail_training flag
  is_trial_training: boolean

  // contact person (parent or keeper who is registering)
  contact: ContactInput

  // one or multiple participants
  participants: ParticipantInput[]
}

function jsonResponse(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  })
}

function isUuid(v: unknown): v is string {
  return typeof v === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v)
}

function cleanText(v: unknown, max = 200): string | null {
  if (v === null || v === undefined) return null
  const s = String(v).trim()
  if (!s) return null
  return s.length > max ? s.slice(0, max) : s
}

function cleanEmail(v: unknown): string | null {
  const s = cleanText(v, 320)
  if (!s) return null
  // simple sanity check (don’t overdo email regex)
  if (!/^\S+@\S+\.\S+$/.test(s)) return null
  return s
}

function cleanDateYYYYMMDD(v: unknown): string | null {
  const s = cleanText(v, 20)
  if (!s) return null
  // YYYY-MM-DD
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return null
  return s
}

function toNumericGloveSize(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null
  const n = typeof v === "number" ? v : Number(String(v).trim())
  if (Number.isNaN(n)) return null
  return n
}

serve(async (req) => {
  try {
    if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders })
    if (req.method !== "POST") return jsonResponse(405, { error: "Method not allowed" })

    const supabaseUrl = Deno.env.get("SUPABASE_URL")
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")

    if (!supabaseUrl || !serviceRoleKey) {
      return jsonResponse(500, { error: "Server misconfigured (missing env)" })
    }

    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false },
    })

    const body = (await req.json().catch(() => null)) as PublicRegisterBody | null
    if (!body) return jsonResponse(400, { error: "Invalid JSON body" })

    // --- Validate input ---
    if (!isUuid(body.event_id)) return jsonResponse(400, { error: "Invalid event_id" })
    if (!body.agb_accepted) return jsonResponse(400, { error: "agb_accepted must be true" })


    const contactFirst = cleanText(body.contact?.first_name, 100)
    const contactLast = cleanText(body.contact?.last_name, 100)
    const contactEmail = cleanEmail(body.contact?.email)
    const contactPhone = cleanText(body.contact?.phone, 50)

    if (!contactFirst || !contactLast) {
      return jsonResponse(400, { error: "contact.first_name and contact.last_name are required" })
    }

    const participants = Array.isArray(body.participants) ? body.participants : []
    if (participants.length === 0) {
      return jsonResponse(400, { error: "participants[] must contain at least 1 participant" })
    }

    // --- Check event exists & is open ---
    const { data: event, error: eventErr } = await admin
      .from("events")
      .select("id, open_for_registration, event_status, capacity, start_date")
      .eq("id", body.event_id)
      .single()

    if (eventErr || !event) {
      return jsonResponse(404, { error: "Event not found" })
    }
    // Ausgebucht: eigener Code, damit das Frontend eine passende Meldung zeigen kann.
    // (open_for_registration ist generated = event_status 'open', daher vor dieser Prüfung.)
    if (event.event_status === "full") {
      return jsonResponse(409, { error: "EVENT_FULL" })
    }
    if (!event.open_for_registration) {
      return jsonResponse(400, { error: "Event is closed for registration" })
    }

    // --- Insert event_registrations (the booking/contact) ---
    const newsletterOptIn = body.newsletter_opt_in ?? null
    const mediaCreationAccepted = body.media_creation_accepted
    const informed_via = body.informed_via
    const is_trial_training = body.is_trial_training

    const regInsert = {
      event_id: body.event_id,
      created_by_user_id: null, // public flow
      contact_first_name: contactFirst,
      contact_last_name: contactLast,
      contact_email: contactEmail,
      contact_phone: contactPhone,
      newsletter_opt_in: newsletterOptIn,
      agb_accepted_at: new Date().toISOString(),
      media_creation_accepted: mediaCreationAccepted,
      informed_via: informed_via,
      is_trial_training: is_trial_training,
    }

    const { data: regRow, error: regErr } = await admin
      .from("event_registrations")
      .insert(regInsert)
      .select("id")
      .single()

    if (regErr || !regRow?.id) {
      return jsonResponse(400, {
        error: "Registration insert failed",
        details: regErr?.message,
      })
    }

    const registrationId = regRow.id as string

    // --- Insert participants (snapshots) ---
    const participantRows = participants.map((p) => {
      const first = cleanText(p.first_name, 100)
      const last = cleanText(p.last_name, 100)
      const birth = cleanDateYYYYMMDD(p.birth_date)

      if (!first || !last || !birth) {
        throw new Error("Each participant requires first_name, last_name, birth_date (YYYY-MM-DD)")
      }

      const keeperId = p.keeper_id && isUuid(p.keeper_id) ? p.keeper_id : null

      const price = p.price

      return {
        registration_id: registrationId,
        event_id: body.event_id, // your trigger also keeps this consistent; explicit is fine
        keeper_id: keeperId,
        first_name: first,
        last_name: last,
        birth_date: birth,
        gender: cleanText(p.gender, 30),
        email: cleanEmail(p.email),
        phone: cleanText(p.phone, 50),
        team: cleanText(p.team, 120),
        health_insurance_number: cleanText(p.health_insurance_number, 80),
        medication: cleanText(p.medication, 500),
        glove_size: toNumericGloveSize(p.glove_size),
        shirt_size: cleanText(p.shirt_size, 30),
        diet: cleanText(p.diet, 80),
        price: price,
        // status defaults to 'submitted' via DB default
      }
    })

    let insertedParticipants:
      | Array<{ id: string; keeper_id: string | null; first_name: string | null; last_name: string | null }>
      | null = null

    const { data: partRows, error: partErr } = await admin
      .from("event_registration_participants")
      .insert(participantRows)
      .select("id, keeper_id, first_name, last_name")

    if (partErr) {
      // Best-effort rollback: delete the registration we just created (CASCADE will remove participants if any inserted)
      await admin.from("event_registrations").delete().eq("id", registrationId)
      // DB-Trigger trg_zzz_check_event_capacity: Kapazität inzwischen erreicht
      if (partErr.message?.includes("EVENT_FULL")) {
        return jsonResponse(409, { error: "EVENT_FULL" })
      }
      // DB-Trigger trg_zz_check_event_eligibility: Jahrgang passt nicht zum Training
      // (detail = Grund-Code, hint = "Jahrgänge 2010–2014")
      if (partErr.message?.includes("TRAINING_GROUP_NOT_ALLOWED")) {
        return jsonResponse(409, {
          error: "TRAINING_GROUP_NOT_ALLOWED",
          reason: partErr.details ?? null,
          years: partErr.hint?.replace(/^Jahrgänge\s*/, "") ?? null,
        })
      }
      return jsonResponse(400, {
        error: "Participant insert failed",
        details: partErr.message,
      })
    }

    insertedParticipants = (partRows ?? []) as any

    return jsonResponse(200, {
      success: true,
      registrationId,
      participantIds: insertedParticipants.map((r) => r.id),
    })
  } catch (e) {
    return jsonResponse(500, {
      error: "Unexpected error",
      details: e instanceof Error ? e.message : String(e),
    })
  }
})
