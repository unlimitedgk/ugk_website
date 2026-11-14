-- Kinder-/Jugendtraining, Schritt 3: serverseitige Durchsetzung per Trigger
-- Angewendet auf Projekt qywxlmanlwyrqtpcjybk am 2026-11-14 via Supabase MCP.
--
-- Greift bei jeder neuen bzw. reaktivierten Anmeldung zu einem weekly_training:
--   - mit keeper_id (Eltern-Dashboard): _keeper_event_eligibility (Override vor Jahrgang)
--   - ohne keeper_id (öffentliches Schnuppertraining): Jahrgang aus new.birth_date
-- Kein Check für Admin/Trainer, für Stornos und für andere Event-Typen.
-- Termine ohne target_year_min/max (alle bestehenden) sind nicht betroffen.
-- Fehler: message 'TRAINING_GROUP_NOT_ALLOWED', detail = Grund-Code.
--
-- Name trg_zz_* -> läuft nach trg_erp_set_event_id und trg_fill_participant_snapshot
-- (BEFORE-Trigger werden alphabetisch ausgeführt), d.h. event_id und birth_date sind gesetzt.

create or replace function public.check_event_eligibility()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_event_id   uuid;
  v_event_type public.event_types;
  v_year_min   integer;
  v_year_max   integer;
  v_reason     text;
  v_birth_year integer;
  v_active     constant text[] := array['submitted', 'accepted', 'confirmed'];
begin
  -- Nur aktive Anmeldungen prüfen
  if new.status is null or not (new.status::text = any (v_active)) then
    return new;
  end if;

  -- Bei UPDATE nur prüfen, wenn die Anmeldung (re)aktiviert oder umgehängt wird
  if tg_op = 'UPDATE'
     and old.status is not null
     and old.status::text = any (v_active)
     and old.keeper_id is not distinct from new.keeper_id
     and old.event_id is not distinct from new.event_id then
    return new;
  end if;

  -- Admin/Trainer dürfen immer
  if public.is_admin_or_trainer() then
    return new;
  end if;

  v_event_id := new.event_id;
  if v_event_id is null then
    select r.event_id into v_event_id
    from public.event_registrations r
    where r.id = new.registration_id;
  end if;

  select e.event_type, e.target_year_min, e.target_year_max
    into v_event_type, v_year_min, v_year_max
  from public.events e
  where e.id = v_event_id;

  if not found or v_event_type is distinct from 'weekly_training' then
    return new;
  end if;

  if new.keeper_id is not null then
    v_reason := public._keeper_event_eligibility(new.keeper_id, v_event_id);
  else
    if v_year_min is null and v_year_max is null then
      v_reason := 'open';
    elsif new.birth_date is null then
      v_reason := 'no_birth_date';
    else
      v_birth_year := extract(year from new.birth_date)::integer;
      if (v_year_min is null or v_birth_year >= v_year_min)
         and (v_year_max is null or v_birth_year <= v_year_max) then
        v_reason := 'year_ok';
      else
        v_reason := 'year_mismatch';
      end if;
    end if;
  end if;

  if v_reason in ('open', 'year_ok', 'override_allowed') then
    return new;
  end if;

  raise exception 'TRAINING_GROUP_NOT_ALLOWED'
    using errcode = 'P0001',
          detail  = v_reason,
          hint    = format('Jahrgänge %s–%s',
                           coalesce(v_year_min::text, '…'),
                           coalesce(v_year_max::text, '…'));
end;
$$;

revoke execute on function public.check_event_eligibility() from public, anon, authenticated;

drop trigger if exists trg_zz_check_event_eligibility on public.event_registration_participants;
create trigger trg_zz_check_event_eligibility
  before insert or update on public.event_registration_participants
  for each row execute function public.check_event_eligibility();
