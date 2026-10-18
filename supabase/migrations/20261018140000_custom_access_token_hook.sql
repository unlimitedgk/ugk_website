-- Schritt 5: Login-Sperre für nicht freigegebene Accounts (Custom Access Token Hook)
-- Angewendet auf Projekt qywxlmanlwyrqtpcjybk am 2026-10-18 via Supabase MCP.
-- WICHTIG: Wirkt erst, wenn der Hook im Dashboard aktiviert ist
-- (Authentication -> Hooks -> Custom Access Token -> public.custom_access_token_hook).
-- Rollback: Hook im Dashboard deaktivieren.

create or replace function public.custom_access_token_hook(event jsonb)
returns jsonb
language plpgsql
stable
set search_path to 'public'
as $function$
declare
  v_role text;
  v_approved_at timestamptz;
  v_method text;
begin
  select p.role, p.approved_at
    into v_role, v_approved_at
  from public.profiles p
  where p.id = (event->>'user_id')::uuid;

  -- Freigegeben oder Admin -> Token unverändert ausstellen
  if v_role = 'admin' or v_approved_at is not null then
    return event;
  end if;

  v_method := event->>'authentication_method';

  -- Beim Klick auf den Bestätigungslink wird direkt ein Token ausgestellt.
  -- Kein Fehler, damit die E-Mail-Bestätigung sicher durchläuft, aber das Token
  -- bekommt nur die Rolle 'anon' (keine Rechte über RLS).
  if v_method = 'email/signup' then
    return jsonb_set(event, '{claims,role}', '"anon"');
  end if;

  return jsonb_build_object(
    'error', jsonb_build_object(
      'http_code', 403,
      'message', 'account_not_approved'
    )
  );
end;
$function$;

grant usage on schema public to supabase_auth_admin;
grant execute on function public.custom_access_token_hook(jsonb) to supabase_auth_admin;
revoke execute on function public.custom_access_token_hook(jsonb) from authenticated, anon, public;

-- Hook läuft als supabase_auth_admin (kein BYPASSRLS) -> braucht Leserecht + Policy
grant select on table public.profiles to supabase_auth_admin;
drop policy if exists profiles_select_auth_admin on public.profiles;
create policy profiles_select_auth_admin on public.profiles
  as permissive for select to supabase_auth_admin using (true);
