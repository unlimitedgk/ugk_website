-- Interessenten-Formular, Zwischenschritt: interests-Wert 'general' für allgemeine Newsletter-Einwilligung
-- Angewendet auf Projekt qywxlmanlwyrqtpcjybk am 2026-11-16 via Supabase MCP.
--
-- Bedeutung von interests (= wofür sich jemand eingetragen hat, nicht der aktuelle Status):
--   general   -> Newsletter-Einwilligung über Konto (profiles) oder Event-Anmeldung (event_registrations)
--   camp      -> Interessenten-Formular auf /camps
--   keeperday -> Interessenten-Formular auf /keeperdays
-- Der aktuelle Status steht weiterhin in subscribed. Bei Abmeldung bleibt 'general' stehen.
--
-- Hinweis: Updates auf interests lösen den Resend-Sync NICHT aus
-- (trg_sync_newsletter_contact_update reagiert nur auf email, subscribed, first_name, last_name).

-- 1) Erlaubte Werte erweitern
alter table public.newsletter_contacts
  drop constraint if exists newsletter_contacts_interests_check;

alter table public.newsletter_contacts
  add constraint newsletter_contacts_interests_check
  check (interests <@ array['general'::text, 'camp'::text, 'keeperday'::text]);

comment on column public.newsletter_contacts.interests is
  'Wofür sich der Kontakt eingetragen hat: general (Newsletter via Konto/Anmeldung), camp, keeperday (Interessenten-Formular). Status steht in subscribed.';

-- 2) Bestehende Kontakte: nur wer tatsächlich eingewilligt hat (subscribed_at gesetzt) bekommt 'general'
update public.newsletter_contacts
set interests = array_append(interests, 'general')
where source in ('profile', 'event_registration')
  and subscribed_at is not null
  and not ('general' = any (interests));

-- 3) Trigger-Funktionen: bei Einwilligung künftig automatisch 'general' ergänzen
create or replace function public.sync_profile_to_newsletter_contacts()
 returns trigger
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare
  v_email text;
  v_subscribed boolean;
  v_first_name text;
  v_last_name text;
begin
  select lower(trim(email)) into v_email from auth.users where id = new.id;
  if v_email is null or v_email = '' then
    return new;
  end if;

  v_subscribed := coalesce(new.newsletter_opt_in, false);

  select pa.first_name, pa.last_name into v_first_name, v_last_name
  from public.parents pa
  where pa.user_id = new.id and pa.deleted_at is null
  limit 1;

  if v_first_name is null and v_last_name is null then
    select k.first_name, k.last_name into v_first_name, v_last_name
    from public.keepers k
    where k.user_id = new.id and k.deleted_at is null
    limit 1;
  end if;

  insert into public.newsletter_contacts (email, user_id, first_name, last_name, source, subscribed, subscribed_at, unsubscribed_at, interests)
  values (
    v_email,
    new.id,
    v_first_name,
    v_last_name,
    'profile',
    v_subscribed,
    case when v_subscribed then now() else null end,
    case when not v_subscribed then now() else null end,
    case when v_subscribed then array['general'] else '{}'::text[] end
  )
  on conflict (email) do update set
    user_id = excluded.user_id,
    first_name = coalesce(excluded.first_name, newsletter_contacts.first_name),
    last_name = coalesce(excluded.last_name, newsletter_contacts.last_name),
    source = 'profile',
    subscribed = excluded.subscribed,
    subscribed_at = case when excluded.subscribed and not newsletter_contacts.subscribed then now() else newsletter_contacts.subscribed_at end,
    unsubscribed_at = case when not excluded.subscribed and newsletter_contacts.subscribed then now() else newsletter_contacts.unsubscribed_at end,
    interests = case
      when excluded.subscribed and not ('general' = any (newsletter_contacts.interests))
        then array_append(newsletter_contacts.interests, 'general')
      else newsletter_contacts.interests
    end,
    updated_at = now();

  return new;
end;
$function$;

create or replace function public.sync_registration_to_newsletter_contacts()
 returns trigger
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare
  v_email text;
  v_subscribed boolean;
begin
  if new.created_by_user_id is not null then
    return new;
  end if;

  v_email := lower(trim(new.contact_email));
  if v_email is null or v_email = '' then
    return new;
  end if;

  v_subscribed := coalesce(new.newsletter_opt_in, false);

  insert into public.newsletter_contacts (email, first_name, last_name, source, subscribed, subscribed_at, unsubscribed_at, interests)
  values (
    v_email,
    new.contact_first_name,
    new.contact_last_name,
    'event_registration',
    v_subscribed,
    case when v_subscribed then now() else null end,
    case when not v_subscribed then now() else null end,
    case when v_subscribed then array['general'] else '{}'::text[] end
  )
  on conflict (email) do update set
    first_name = coalesce(newsletter_contacts.first_name, excluded.first_name),
    last_name = coalesce(newsletter_contacts.last_name, excluded.last_name),
    subscribed = excluded.subscribed,
    subscribed_at = case when excluded.subscribed and not newsletter_contacts.subscribed then now() else newsletter_contacts.subscribed_at end,
    unsubscribed_at = case when not excluded.subscribed and newsletter_contacts.subscribed then now() else newsletter_contacts.unsubscribed_at end,
    interests = case
      when excluded.subscribed and not ('general' = any (newsletter_contacts.interests))
        then array_append(newsletter_contacts.interests, 'general')
      else newsletter_contacts.interests
    end,
    updated_at = now();

  return new;
end;
$function$;
