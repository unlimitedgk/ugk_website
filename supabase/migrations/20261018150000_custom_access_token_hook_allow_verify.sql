-- Fix zu Schritt 5/7: Der Bestätigungslink (/verify) lief in den Hook-Fehler und die
-- E-Mail-Bestätigung wurde dadurch zurückgerollt. Jetzt werden nur Passwort-Login und
-- Token-Refresh abgelehnt; alle anderen Methoden bekommen ein wertloses Token
-- (Rolle 'anon', läuft nach 5 Sekunden ab).
-- Angewendet auf Projekt qywxlmanlwyrqtpcjybk am 2026-10-18 via Supabase MCP.

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
  v_claims jsonb;
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

  -- Echte Logins (Passwort) und Session-Verlängerung werden abgelehnt
  if v_method in ('password', 'token_refresh') then
    return jsonb_build_object(
      'error', jsonb_build_object(
        'http_code', 403,
        'message', 'account_not_approved'
      )
    );
  end if;

  -- Alles andere (v.a. Klick auf den Bestätigungslink, /verify): kein Fehler,
  -- sonst wird die E-Mail-Bestätigung zurückgerollt. Das Token ist wertlos:
  -- Rolle 'anon' und läuft nach 5 Sekunden ab.
  v_claims := event->'claims';
  v_claims := jsonb_set(v_claims, '{role}', '"anon"');
  v_claims := jsonb_set(v_claims, '{exp}', to_jsonb(coalesce((v_claims->>'iat')::bigint, extract(epoch from now())::bigint) + 5));
  return jsonb_set(event, '{claims}', v_claims);
end;
$function$;

grant execute on function public.custom_access_token_hook(jsonb) to supabase_auth_admin;
revoke execute on function public.custom_access_token_hook(jsonb) from authenticated, anon, public;
