-- Kapazitätsgrenze, Schritt 1: serverseitige Durchsetzung + automatischer Status open <-> full
-- Angewendet auf Projekt qywxlmanlwyrqtpcjybk am 2026-11-17 via Supabase MCP.
--
-- Regeln:
--   - events.capacity NULL  -> unbegrenzt viele Anmeldungen.
--   - Aktiv zählen Teilnehmer mit Status submitted / accepted / confirmed
--     (gleiche Definition wie in check_event_eligibility), inkl. Schnuppertrainings.
--   - Neue bzw. reaktivierte Anmeldung wird abgelehnt (message 'EVENT_FULL'), wenn
--     event_status = 'full' ist oder die aktiven Teilnehmer bereits >= capacity sind.
--   - Admin/Trainer dürfen überbuchen (kein Check).
--   - event_status wechselt automatisch open -> full (Kapazität erreicht) und
--     full -> open (Platz frei geworden). Andere Status bleiben unberührt, ebenso ein
--     manuelles 'full' bei Events ohne capacity.
--   - Achtung: events.open_for_registration ist eine GENERATED Column
--     (event_status = 'open'). Bei 'full' wird sie also automatisch false.
--     Frontend-Abfragen, die volle Events weiter anzeigen sollen, müssen deshalb auf
--     event_status in ('open','full') filtern statt auf open_for_registration.

-- ---------------------------------------------------------------------------
-- 1) Status eines Events anhand der aktiven Teilnehmer nachziehen
-- ---------------------------------------------------------------------------
create or replace function public.refresh_event_full_status(p_event_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_capacity integer;
  v_status   public.event_status_types;
  v_count    integer;
begin
  if p_event_id is null then
    return;
  end if;

  select e.capacity, e.event_status
    into v_capacity, v_status
  from public.events e
  where e.id = p_event_id;

  if not found or v_capacity is null or v_status not in ('open', 'full') then
    return;
  end if;

  select pg_catalog.count(*)::integer
    into v_count
  from public.event_registration_participants p
  where p.event_id = p_event_id
    and p.status in ('submitted', 'accepted', 'confirmed');

  if v_count >= v_capacity and v_status = 'open' then
    update public.events set event_status = 'full' where id = p_event_id;
  elsif v_count < v_capacity and v_status = 'full' then
    update public.events set event_status = 'open' where id = p_event_id;
  end if;
end;
$$;

revoke execute on function public.refresh_event_full_status(uuid) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- 2) Kapazitäts-Check vor dem Speichern eines Teilnehmers
-- ---------------------------------------------------------------------------
-- Name trg_zzz_* -> läuft nach trg_erp_set_event_id und trg_zz_check_event_eligibility
-- (BEFORE-Trigger werden alphabetisch ausgeführt).
create or replace function public.check_event_capacity()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_event_id uuid;
  v_capacity integer;
  v_status   public.event_status_types;
  v_count    integer;
  v_active   constant text[] := array['submitted', 'accepted', 'confirmed'];
begin
  -- Nur Anmeldungen, die (neu) aktiv werden
  if new.status is null or not (new.status::text = any (v_active)) then
    return new;
  end if;

  if tg_op = 'UPDATE'
     and old.status is not null
     and old.status::text = any (v_active)
     and old.event_id is not distinct from new.event_id then
    return new;
  end if;

  -- Admin/Trainer dürfen überbuchen
  if public.is_admin_or_trainer() then
    return new;
  end if;

  v_event_id := new.event_id;
  if v_event_id is null then
    select r.event_id into v_event_id
    from public.event_registrations r
    where r.id = new.registration_id;
  end if;

  -- Event-Zeile sperren: serialisiert gleichzeitige Anmeldungen zum selben Event
  select e.capacity, e.event_status
    into v_capacity, v_status
  from public.events e
  where e.id = v_event_id
  for update;

  if not found then
    return new;
  end if;

  if v_status = 'full' then
    raise exception 'EVENT_FULL'
      using errcode = 'P0001',
            detail  = 'status_full';
  end if;

  if v_capacity is null then
    return new;
  end if;

  -- Sieht auch bereits verarbeitete Zeilen desselben (Mehrzeilen-)Inserts
  select pg_catalog.count(*)::integer
    into v_count
  from public.event_registration_participants p
  where p.event_id = v_event_id
    and p.status::text = any (v_active)
    and p.id <> new.id;

  if v_count >= v_capacity then
    raise exception 'EVENT_FULL'
      using errcode = 'P0001',
            detail  = 'capacity_reached',
            hint    = format('Kapazität %s', v_capacity);
  end if;

  return new;
end;
$$;

revoke execute on function public.check_event_capacity() from public, anon, authenticated;

drop trigger if exists trg_zzz_check_event_capacity on public.event_registration_participants;
create trigger trg_zzz_check_event_capacity
  before insert or update on public.event_registration_participants
  for each row execute function public.check_event_capacity();

-- ---------------------------------------------------------------------------
-- 3) Nach Änderungen an Teilnehmern den Event-Status nachziehen
-- ---------------------------------------------------------------------------
create or replace function public.erp_refresh_event_full_status()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op in ('INSERT', 'UPDATE') then
    perform public.refresh_event_full_status(new.event_id);
  end if;

  if tg_op = 'DELETE'
     or (tg_op = 'UPDATE' and old.event_id is distinct from new.event_id) then
    perform public.refresh_event_full_status(old.event_id);
  end if;

  return null;
end;
$$;

revoke execute on function public.erp_refresh_event_full_status() from public, anon, authenticated;

drop trigger if exists trg_event_capacity_refresh on public.event_registration_participants;
create trigger trg_event_capacity_refresh
  after insert or update of status, event_id or delete on public.event_registration_participants
  for each row execute function public.erp_refresh_event_full_status();

-- ---------------------------------------------------------------------------
-- 4) Kapazität oder Status eines Events geändert -> Status nachziehen
-- ---------------------------------------------------------------------------
-- Z.B. Admin erhöht die Kapazität -> full wird wieder open; Admin öffnet ein bereits
-- volles Event -> wird direkt full. Rekursion endet, da refresh nur bei Abweichung updated.
create or replace function public.events_refresh_full_status()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.refresh_event_full_status(new.id);
  return null;
end;
$$;

revoke execute on function public.events_refresh_full_status() from public, anon, authenticated;

drop trigger if exists trg_events_capacity_refresh on public.events;
create trigger trg_events_capacity_refresh
  after update of capacity, event_status on public.events
  for each row
  when (old.capacity is distinct from new.capacity
        or old.event_status is distinct from new.event_status)
  execute function public.events_refresh_full_status();

-- Bestehende Events einmalig abgleichen (aktuell hat keines eine capacity -> no-op)
select public.refresh_event_full_status(e.id)
from public.events e
where e.capacity is not null;
