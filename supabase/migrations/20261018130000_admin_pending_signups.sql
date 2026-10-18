-- Schritt 2: Liste der offenen Freigaben für den Admin
-- Angewendet auf Projekt qywxlmanlwyrqtpcjybk am 2026-10-18 via Supabase MCP.
-- SECURITY DEFINER, weil die E-Mail aus auth.users gelesen wird (umgeht RLS),
-- daher eigene Admin-Prüfung und kein Zugriff für anon/public.

create or replace function public.admin_pending_signups()
returns table (
  id uuid,
  email text,
  role text,
  created_at timestamptz,
  email_confirmed_at timestamptz
)
language plpgsql
stable
security definer
set search_path to 'public'
as $function$
begin
  if not public.is_admin() then
    raise exception 'Not allowed' using errcode = '42501';
  end if;

  return query
    select p.id, u.email::text, p.role, p.created_at, u.email_confirmed_at
    from public.profiles p
    join auth.users u on u.id = p.id
    where p.approved_at is null
      and p.role <> 'admin'
    order by p.created_at desc;
end;
$function$;

revoke all on function public.admin_pending_signups() from public, anon;
grant execute on function public.admin_pending_signups() to authenticated;
