-- Brand kit: the owner's colour, cover, vibe, welcome note and Instagram, worn by guest pages and QR cards.
-- Spec: docs/superpowers/specs/2026-11-27-brand-kit-menu-psychology-design.md. Test: supabase/tests/brand_kit.sql.

-- accent was never read by the UI, so every row still holds the old orange default.
-- Reset to Sufra indigo so turning it on changes no live venue's look.
update public.restaurants set accent = '#1E2A5A';
alter table public.restaurants alter column accent set default '#1E2A5A';

alter table public.restaurants
  add column cover_url text check (cover_url ~ '^https://' and length(cover_url) <= 500),
  add column vibe text not null default 'sufra' check (vibe in ('sufra', 'bold', 'clean', 'classic')),
  add column welcome_note text not null default '' check (length(welcome_note) <= 280),
  add column welcome_note_ar text not null default '' check (length(welcome_note_ar) <= 280),
  add column instagram text not null default '' check (instagram ~ '^[A-Za-z0-9._]{0,30}$');

-- No policy changes: owners already update their row through RLS, and guests read restaurants (public brand data).
