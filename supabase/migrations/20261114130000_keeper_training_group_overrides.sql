-- Kinder-/Jugendtraining, Schritt 2: Admin-Freischaltungen + Berechtigungsfunktionen
-- Noch KEINE Durchsetzung (die kommt in Schritt 3 per Trigger).
-- Angewendet auf Projekt qywxlmanlwyrqtpcjybk am 2026-11-14 via Supabase MCP.
--
-- Regel:
--   1. Hat das Event eine training_group und existiert für (Keeper, Gruppe) ein Override,
--      gilt dieser (allowed = true -> darf, false -> gesperrt).
--   2. Sonst Jahrgangsprüfung: Geburtsjahr zwischen events.target_year_min und target_year_max
--      (fehlende Grenze = offen). Ohne beide Grenzen darf jeder.
--   3. Ist eine Grenze gesetzt, aber der Keeper hat kein Geburtsdatum -> nicht berechtigt.

-- ---------------------------------------------------------------------------
-- Tabelle: Freischaltungen/Sperren pro Torhüter und Zielgruppe
-- Eigene Tabelle (nicht Spalte auf keepers), weil Eltern keepers updaten dürfen.
-- ---------------------------------------------------------------------------
create table if not exists public.keeper_training_group_overrides (
  keeper_id      uuid not null references public.keepers(id) on delete cascade,
  training_group public.training_group_types not null,
  allowed        boolean not null,
  note           text,
  set_by         uuid references auth.users(id) on delete set null default auth.uid(),
  set_at         timestamptz not null default now(),
  primary key (keeper_id, training_group)
);

comment on table public.keeper_training_group_overrides is
  'Admin-Override der Jahrgangsprüfung pro Torhüter und Zielgruppe (allowed=true: freigeschaltet, false: gesperrt). Kein Eintrag = automatisch nach Jahrgang.';

alter table public.keeper_training_group_overrides enable row level security;

drop policy if exists ktgo_select on public.keeper_training_group_overrides;
create policy ktgo_select on public.keeper_training_group_overrides
  for select to authenticated
  using (public.is_admin_or_trainer() or public.parent_owns_keeper(keeper_id));

drop policy if exists ktgo_insert_admin on public.keeper_training_group_overrides;
create policy ktgo_insert_admin on public.keeper_training_group_overrides
  for insert to authenticated
  with check (public.is_admin());

drop policy if exists ktgo_update_admin on public.keeper_training_group_overrides;
create policy ktgo_update_admin on public.keeper_training_group_overrides
  for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists ktgo_delete_admin on public.keeper_training_group_overrides;
create policy ktgo_delete_admin on public.keeper_training_group_overrides
  for delete to authenticated
  using (public.is_admin());

-- set_at / set_by bei Änderungen automatisch aktualisieren
create or replace function public.ktgo_touch()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.set_at := now();
  new.set_by := coalesce(auth.uid(), new.set_by);
  return new;
end;
$$;

revoke execute on function public.ktgo_touch() from public, anon, authenticated;

drop trigger if exists trg_ktgo_touch on public.keeper_training_group_overrides;
create trigger trg_ktgo_touch
  before update on public.keeper_training_group_overrides
  for each row execute function public.ktgo_touch();

-- ---------------------------------------------------------------------------
-- Interne Kernfunktion (ohne Rechteprüfung, nicht über die API aufrufbar).
-- Liefert einen Grund-Code:
--   open             - Event ohne Jahrgangsgrenzen
--   year_ok          - Jahrgang passt
--   year_mismatch    - Jahrgang passt nicht
--   no_birth_date    - Grenzen gesetzt, aber kein Geburtsdatum
--   override_allowed - Admin hat freigeschaltet
--   override_denied  - Admin hat gesperrt
--   event_not_found / keeper_not_found
-- ---------------------------------------------------------------------------
create or replace function public._keeper_event_eligibility(p_keeper_id uuid, p_event_id uuid)
returns text
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_group      public.training_group_types;
  v_year_min   integer;
  v_year_max   integer;
  v_override   boolean;
  v_birth_date date;
  v_birth_year integer;
begin
  select e.training_group, e.target_year_min, e.target_year_max
    into v_group, v_year_min, v_year_max
  from public.events e
  where e.id = p_event_id;

  if not found then
    return 'event_not_found';
  end if;

  select k.birth_date into v_birth_date
  from public.keepers k
  where k.id = p_keeper_id;

  if not found then
    return 'keeper_not_found';
  end if;

  if v_group is not null then
    select o.allowed into v_override
    from public.keeper_training_group_overrides o
    where o.keeper_id = p_keeper_id
      and o.training_group = v_group;

    if found then
      return case when v_override then 'override_allowed' else 'override_denied' end;
    end if;
  end if;

  if v_year_min is null and v_year_max is null then
    return 'open';
  end if;

  if v_birth_date is null then
    return 'no_birth_date';
  end if;

  v_birth_year := extract(year from v_birth_date)::integer;

  if (v_year_min is null or v_birth_year >= v_year_min)
     and (v_year_max is null or v_birth_year <= v_year_max) then
    return 'year_ok';
  end if;

  return 'year_mismatch';
end;
$$;

revoke execute on function public._keeper_event_eligibility(uuid, uuid) from public, anon, authenticated;
grant execute on function public._keeper_event_eligibility(uuid, uuid) to service_role;

-- ---------------------------------------------------------------------------
-- Öffentliche Prüffunktion: darf dieser Keeper zu diesem Event?
-- Nur Admin/Trainer oder die Eltern des Keepers dürfen fragen.
-- ---------------------------------------------------------------------------
create or replace function public.keeper_can_join_event(p_keeper_id uuid, p_event_id uuid)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if auth.uid() is not null
     and not (public.is_admin_or_trainer() or public.parent_owns_keeper(p_keeper_id)) then
    raise exception 'NOT_AUTHORIZED' using errcode = '42501';
  end if;

  return public._keeper_event_eligibility(p_keeper_id, p_event_id)
         in ('open', 'year_ok', 'override_allowed');
end;
$$;

revoke execute on function public.keeper_can_join_event(uuid, uuid) from public, anon;
grant execute on function public.keeper_can_join_event(uuid, uuid) to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Für das Eltern-Dashboard: Berechtigung aller eigenen Keeper für die übergebenen Events
-- ---------------------------------------------------------------------------
create or replace function public.my_keepers_event_eligibility(p_event_ids uuid[])
returns table (keeper_id uuid, event_id uuid, allowed boolean, reason text)
language sql
stable
security definer
set search_path = public
as $$
  with my_keepers as (
    select distinct r.keeper_id
    from public.parents pa
    join public.relationships r on r.parent_id = pa.id
    join public.keepers k on k.id = r.keeper_id
    where pa.user_id = auth.uid()
      and k.deleted_at is null
  ),
  pairs as (
    select mk.keeper_id, ev.id as event_id,
           public._keeper_event_eligibility(mk.keeper_id, ev.id) as reason
    from my_keepers mk
    cross join unnest(p_event_ids) as ev(id)
  )
  select p.keeper_id, p.event_id,
         p.reason in ('open', 'year_ok', 'override_allowed') as allowed,
         p.reason
  from pairs p;
$$;

revoke execute on function public.my_keepers_event_eligibility(uuid[]) from public, anon;
grant execute on function public.my_keepers_event_eligibility(uuid[]) to authenticated;
