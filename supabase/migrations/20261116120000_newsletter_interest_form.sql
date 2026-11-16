-- Interessenten-Formular (Camps/Keeperdays), Schritt 1: newsletter_contacts erweitern
-- Angewendet auf Projekt qywxlmanlwyrqtpcjybk am 2026-11-16 via Supabase MCP.
--
-- - Neue Quelle 'interest_form' für Kontakte aus dem öffentlichen Formular auf /camps bzw. /keeperdays.
-- - Neue Spalte interests: wofür sich der Kontakt interessiert ('camp', 'keeperday').
-- Schreibzugriff erfolgt ausschließlich über die Edge Function public-newsletter-interest (Service Role),
-- daher keine neuen RLS-Policies und keine öffentliche RPC.
-- Der bestehende Resend-Sync (trg_sync_newsletter_contact_*) greift unverändert.

alter table public.newsletter_contacts
  drop constraint if exists newsletter_contacts_source_check;

alter table public.newsletter_contacts
  add constraint newsletter_contacts_source_check
  check (source = any (array['profile'::text, 'event_registration'::text, 'interest_form'::text]));

alter table public.newsletter_contacts
  add column if not exists interests text[] not null default '{}';

alter table public.newsletter_contacts
  drop constraint if exists newsletter_contacts_interests_check;

alter table public.newsletter_contacts
  add constraint newsletter_contacts_interests_check
  check (interests <@ array['camp'::text, 'keeperday'::text]);

comment on column public.newsletter_contacts.interests is
  'Interessen aus dem Interessenten-Formular: camp, keeperday. Leer = kein Formular-Eintrag.';
