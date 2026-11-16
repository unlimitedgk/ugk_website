// supabase/functions/public-newsletter-interest/index.ts
//
// Öffentliches Interessenten-Formular auf /camps bzw. /keeperdays.
// - Prüft das reCAPTCHA-Token serverseitig (Supabase-Secret RECAPTCHA_SECRET_KEY).
// - Legt den Kontakt in newsletter_contacts an bzw. aktualisiert ihn (subscribed = true, interest ergänzt).
// - Der Resend-Sync läuft automatisch über die bestehenden Trigger
//   (trg_sync_newsletter_contact_insert/_update -> sync-newsletter-contact). Es wird KEINE Mail versendet.
// - Antwortet immer generisch mit { success: true }, damit nicht abgefragt werden kann, ob eine E-Mail existiert.
import { serve } from "https://deno.land/std@0.224.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
}

const INTERESTS = ["camp", "keeperday"] as const
type Interest = (typeof INTERESTS)[number]

type Body = {
  interest?: unknown
  first_name?: unknown
  last_name?: unknown
  email?: unknown
  recaptcha_token?: unknown
}

type ExistingContact = {
  id: string
  first_name: string | null
  last_name: string | null
  subscribed: boolean
  subscribed_at: string | null
  interests: string[] | null
}

function jsonResponse(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  })
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
  if (!/^\S+@\S+\.\S+$/.test(s)) return null
  return s.toLowerCase()
}

function isInterest(v: unknown): v is Interest {
  return typeof v === "string" && (INTERESTS as readonly string[]).includes(v)
}

async function verifyRecaptcha(token: string, secret: string): Promise<boolean> {
  try {
    const res = await fetch("https://www.google.com/recaptcha/api/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ secret, response: token }),
    })
    const result = (await res.json()) as { success?: boolean }
    return result.success === true
  } catch {
    return false
  }
}

serve(async (req) => {
  try {
    if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders })
    if (req.method !== "POST") return jsonResponse(405, { error: "Method not allowed" })

    const supabaseUrl = Deno.env.get("SUPABASE_URL")
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")
    const recaptchaSecret = Deno.env.get("RECAPTCHA_SECRET_KEY")
    if (!supabaseUrl || !serviceRoleKey || !recaptchaSecret) {
      return jsonResponse(500, { error: "Server misconfigured (missing env)" })
    }

    const body = (await req.json().catch(() => null)) as Body | null
    if (!body) return jsonResponse(400, { error: "Invalid JSON body" })

    // --- Validierung ---
    const token = cleanText(body.recaptcha_token, 4000)
    if (!token) return jsonResponse(400, { error: "Missing reCAPTCHA token" })

    if (!isInterest(body.interest)) return jsonResponse(400, { error: "Invalid interest" })
    const interest = body.interest

    const firstName = cleanText(body.first_name, 100)
    const lastName = cleanText(body.last_name, 100)
    const email = cleanEmail(body.email)
    if (!firstName || !lastName || !email) {
      return jsonResponse(400, { error: "first_name, last_name and a valid email are required" })
    }

    // --- reCAPTCHA (in derselben Function wie der Eintrag -> nicht umgehbar) ---
    if (!(await verifyRecaptcha(token, recaptchaSecret))) {
      return jsonResponse(400, { error: "reCAPTCHA verification failed" })
    }

    const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } })
    const now = new Date().toISOString()

    const updateExisting = async (existing: ExistingContact) => {
      const interests = Array.from(new Set([...(existing.interests ?? []), interest]))
      const { error } = await admin
        .from("newsletter_contacts")
        .update({
          first_name: existing.first_name ?? firstName,
          last_name: existing.last_name ?? lastName,
          subscribed: true,
          // Erneute ausdrückliche Einwilligung, wenn vorher abgemeldet
          subscribed_at: existing.subscribed ? existing.subscribed_at : now,
          interests,
          updated_at: now,
        })
        .eq("id", existing.id)
      if (error) throw new Error(`update failed: ${error.message}`)
    }

    const fetchExisting = async () => {
      const { data, error } = await admin
        .from("newsletter_contacts")
        .select("id, first_name, last_name, subscribed, subscribed_at, interests")
        .eq("email", email)
        .maybeSingle()
      if (error) throw new Error(`select failed: ${error.message}`)
      return data as ExistingContact | null
    }

    const existing = await fetchExisting()
    if (existing) {
      await updateExisting(existing)
    } else {
      const { error } = await admin.from("newsletter_contacts").insert({
        email,
        first_name: firstName,
        last_name: lastName,
        source: "interest_form",
        subscribed: true,
        subscribed_at: now,
        interests: [interest],
      })
      if (error) {
        // Gleichzeitiger Eintrag mit derselben E-Mail -> als Update nachziehen
        if (error.code === "23505") {
          const again = await fetchExisting()
          if (!again) throw new Error(`insert conflict without row: ${error.message}`)
          await updateExisting(again)
        } else {
          throw new Error(`insert failed: ${error.message}`)
        }
      }
    }

    return jsonResponse(200, { success: true })
  } catch (e) {
    console.error("public-newsletter-interest failed", e)
    return jsonResponse(500, { error: "Unexpected error" })
  }
})
