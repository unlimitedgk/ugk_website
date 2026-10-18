// supabase/functions/admin-review-signup/index.ts
// Admin gibt neue Accounts frei (approve) oder lehnt sie ab (reject = Account löschen).
import { serve } from "https://deno.land/std/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  })
}

function getIp(req: Request): string | null {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null
}
function getUserAgent(req: Request): string | null {
  return req.headers.get("user-agent")
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders })
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405)

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!

  // 1) Verify caller via JWT
  const authHeader = req.headers.get("authorization") ?? ""
  const jwt = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null
  if (!jwt) return json({ error: "Unauthorized" }, 401)

  const supabaseAuth = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: `Bearer ${jwt}` } },
    auth: { persistSession: false },
  })

  const { data: userRes, error: userErr } = await supabaseAuth.auth.getUser()
  const caller = userRes?.user
  if (userErr || !caller) return json({ error: "Unauthorized" }, 401)

  // 2) Check role (admin-only)
  const { data: callerProfile, error: profErr } = await supabaseAuth
    .from("profiles")
    .select("role")
    .eq("id", caller.id)
    .single()

  if (profErr || !callerProfile || callerProfile.role !== "admin") {
    return json({ error: "Forbidden" }, 403)
  }

  // 3) Validate input
  let body: { user_id?: string; action?: string }
  try {
    body = await req.json()
  } catch {
    return json({ error: "Invalid JSON" }, 400)
  }
  const userId = body.user_id
  const action = body.action
  if (!userId || (action !== "approve" && action !== "reject")) {
    return json({ error: "user_id and action ('approve' | 'reject') required" }, 400)
  }

  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  })

  // 4) Target must be a pending (not yet approved) non-admin account
  const { data: target, error: targetErr } = await supabaseAdmin
    .from("profiles")
    .select("id, role, approved_at")
    .eq("id", userId)
    .maybeSingle()

  if (targetErr) {
    console.error("target lookup failed", targetErr)
    return json({ error: "Lookup failed" }, 500)
  }
  if (!target) return json({ error: "User not found" }, 404)
  if (target.role === "admin") return json({ error: "Admins cannot be reviewed" }, 400)
  if (target.approved_at) return json({ error: "User is already approved" }, 409)

  const { data: authUserRes, error: authUserErr } =
    await supabaseAdmin.auth.admin.getUserById(userId)
  const authUser = authUserRes?.user
  if (authUserErr || !authUser) return json({ error: "User not found" }, 404)

  // 5a) Approve
  if (action === "approve") {
    if (!authUser.email_confirmed_at) {
      return json({ error: "E-Mail ist noch nicht bestätigt" }, 409)
    }

    const { error: updErr } = await supabaseAdmin
      .from("profiles")
      .update({ approved_at: new Date().toISOString(), approved_by: caller.id })
      .eq("id", userId)
      .is("approved_at", null)

    if (updErr) {
      console.error("approve failed", updErr)
      return json({ error: "Approve failed" }, 500)
    }

    return json({ success: true, action })
  }

  // 5b) Reject = Account löschen (analog delete-account)
  const nowIso = new Date().toISOString()

  const { data: activeMandates, error: findErr } = await supabaseAdmin
    .from("sepa_mandates")
    .select("id")
    .eq("user_id", userId)
    .eq("status", "active")

  if (findErr) {
    console.error("mandate lookup failed", findErr)
    return json({ error: "Reject failed" }, 500)
  }

  if (activeMandates && activeMandates.length > 0) {
    const { error: revokeErr } = await supabaseAdmin
      .from("sepa_mandates")
      .update({
        status: "revoked",
        revoked_at: nowIso,
        revoked_reason: "account_rejected",
        updated_at: nowIso,
      })
      .eq("user_id", userId)
      .eq("status", "active")

    if (revokeErr) {
      console.error("mandate revoke failed", revokeErr)
      return json({ error: "Reject failed" }, 500)
    }

    await supabaseAdmin.from("sepa_mandate_audit_events").insert(
      activeMandates.map((m) => ({
        mandate_id: m.id,
        event_type: "mandate_revoked",
        actor_user_id: caller.id,
        ip: getIp(req),
        user_agent: getUserAgent(req),
        metadata: { reason: "account_rejected" },
      }))
    )
  }

  // newsletter_contacts hat ON DELETE SET NULL -> E-Mail würde sonst übrig bleiben
  const { error: nlErr } = await supabaseAdmin
    .from("newsletter_contacts")
    .delete()
    .eq("user_id", userId)

  if (nlErr) {
    console.error("newsletter contact delete failed", nlErr)
    return json({ error: "Reject failed" }, 500)
  }

  const { error: delErr } = await supabaseAdmin.auth.admin.deleteUser(userId)
  if (delErr) {
    console.error("deleteUser failed", delErr)
    return json({ error: "Reject failed" }, 500)
  }

  return json({ success: true, action })
})
