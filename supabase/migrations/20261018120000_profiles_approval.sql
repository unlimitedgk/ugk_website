-- Schritt 1: Admin-Freigabe für neue Accounts (Grundlage, noch ohne Login-Sperre)
-- Angewendet auf Projekt qywxlmanlwyrqtpcjybk am 2026-10-18 via Supabase MCP.

alter table public.profiles
  add column if not exists approved_at timestamptz,
  add column if not exists approved_by uuid references auth.users(id) on delete set null;

-- Bestehende Accounts gelten als freigegeben
update public.profiles set approved_at = now() where approved_at is null;

-- Fix: vorher war pg_has_role(current_user, 'postgres', 'member') wegen SECURITY DEFINER
-- immer true, d.h. jeder eingeloggte User konnte seine eigene Rolle (z.B. auf 'admin') ändern.
create or replace function public.prevent_role_change()
 returns trigger
 language plpgsql
 security definer
 set search_path to 'public'
as $function$begin
  -- Allow admin to change roles / approval
  if public.is_admin() then
    return new;
  end if;

  -- Allow server-side changes (service role, SQL editor, DB triggers without end-user JWT).
  -- Hinweis: current_user ist hier wegen SECURITY DEFINER immer der Owner (postgres),
  -- deshalb wird der Aufrufer über die JWT-Claims bestimmt.
  if auth.uid() is null or coalesce(auth.jwt()->>'role', '') = 'service_role' then
    return new;
  end if;

  -- Block non-admin role changes
  if new.role is distinct from old.role then
    raise exception 'Not allowed to change role';
  end if;

  -- Block non-admin approval changes
  if new.approved_at is distinct from old.approved_at
     or new.approved_by is distinct from old.approved_by then
    raise exception 'Not allowed to change approval';
  end if;

  return new;
end;$function$;
