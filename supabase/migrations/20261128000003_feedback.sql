-- Return loop (spec 2026-11-27, Phase 3): rate the visit, Google review link, owner reads feedback.
-- Guests write only through leave_feedback; they never read visit_feedback.

alter table public.restaurants
  add column google_review_url text check (google_review_url is null or (google_review_url ~ '^https://' and length(google_review_url) <= 500));

create table public.visit_feedback (
  id uuid primary key default gen_random_uuid(),
  visit_id uuid not null references public.visits on delete cascade,
  restaurant_id uuid not null references public.restaurants on delete cascade,
  user_id uuid not null,
  rating smallint not null check (rating between 1 and 5),
  note text check (note is null or length(note) <= 500),
  created_at timestamptz not null default now(),
  unique (visit_id, user_id)
);
create index visit_feedback_restaurant_idx on public.visit_feedback (restaurant_id, created_at desc);

alter table public.visit_feedback enable row level security;
create policy "owner reads" on public.visit_feedback for select to authenticated
  using (private.is_owner(restaurant_id));
revoke all on public.visit_feedback from anon, authenticated;
grant select on public.visit_feedback to authenticated;

-- One row per guest per visit; rating again updates it. Only for a visit the caller sat at, closed in the last 24 h.
create function public.leave_feedback(p_visit uuid, p_rating int, p_note text) returns void
language plpgsql security definer set search_path = '' as $$
declare
  rid uuid;
begin
  if p_rating is null or p_rating not between 1 and 5 then raise exception using message = 'INVALID_RATING'; end if;
  select v.restaurant_id into rid from public.visits v join public.visit_guests vg on vg.visit_id = v.id
  where v.id = p_visit and vg.user_id = auth.uid() and v.closed_at > now() - interval '24 hours';
  if rid is null then raise exception using message = 'FORBIDDEN'; end if;
  insert into public.visit_feedback (visit_id, restaurant_id, user_id, rating, note)
  values (p_visit, rid, auth.uid(), p_rating, left(nullif(btrim(p_note), ''), 500))
  on conflict (visit_id, user_id) do update set rating = excluded.rating, note = excluded.note, created_at = now();
end $$;
revoke execute on function public.leave_feedback(uuid, int, text) from public, anon;
grant execute on function public.leave_feedback(uuid, int, text) to authenticated;

-- guest_session also says which closed visit to rate and the rating already given.
create or replace function public.guest_session(p_slug text) returns json
language plpgsql stable security definer set search_path = '' as $$
declare
  uid uuid := auth.uid();
  t public.tables;
  g public.visit_guests;
  last public.visits;
begin
  select * into t from public.tables where qr_slug = p_slug;
  if not found then raise exception using message = 'TABLE_NOT_FOUND'; end if;
  if uid is null then return json_build_object('visit_id', null, 'ended', false); end if;

  select vg.* into g from public.visit_guests vg join public.visits v on v.id = vg.visit_id
  where vg.user_id = uid and v.table_id = t.id and v.closed_at is null;
  if found then
    return json_build_object('visit_id', g.visit_id, 'guest_id', g.id, 'display_name', g.display_name, 'seq', g.seq, 'ended', false);
  end if;

  select v.* into last from public.visit_guests vg join public.visits v on v.id = vg.visit_id
  where vg.user_id = uid and v.table_id = t.id and v.closed_at > now() - interval '12 hours'
  order by v.closed_at desc limit 1;
  return json_build_object('visit_id', null, 'ended', last.id is not null, 'paid_method', last.payment_method,
    'last_visit', last.id,
    'rating', (select f.rating from public.visit_feedback f where f.visit_id = last.id and f.user_id = uid));
end $$;
