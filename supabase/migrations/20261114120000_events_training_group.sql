-- Kinder-/Jugendtraining, Schritt 1: Zielgruppe als Bezeichnung am Event
-- Angewendet auf Projekt qywxlmanlwyrqtpcjybk am 2026-11-14 via Supabase MCP.
-- Reine Bezeichnung (Dashboard-Aufteilung, Bezug für Admin-Freischaltungen).
-- Die Altersprüfung läuft über die bestehenden Spalten target_year_min / target_year_max.
-- NULL = offen für alle (Standard für alle bestehenden Termine).

do $$
begin
  if not exists (select 1 from pg_type where typname = 'training_group_types') then
    create type public.training_group_types as enum ('kids', 'youth');
  end if;
end
$$;

alter table public.events
  add column if not exists training_group public.training_group_types null;

comment on column public.events.training_group is
  'Zielgruppe für weekly_training: kids = Kindertraining (kleine Tore), youth = Jugendtraining (große Tore), NULL = offen für alle.';
