-- Menu psychology, part 1 (spec 2026-11-27, Phase 2): preset tags, a featured hero per
-- category, owner-set pairings, and menu_signals(), which ranks dishes from real orders.
-- Signals return item ids only: guests never see counts or money.

alter table public.menu_items
  add column tags text[] not null default '{}'
    check (tags <@ array['chef','new','spicy','veg','signature']::text[] and cardinality(tags) <= 3),
  add column featured boolean not null default false;

create table public.item_pairings (
  item_id uuid not null references public.menu_items on delete cascade,
  pairs_with_id uuid not null references public.menu_items on delete cascade,
  restaurant_id uuid not null references public.restaurants on delete cascade,
  primary key (item_id, pairs_with_id),
  check (item_id <> pairs_with_id)
);
create index item_pairings_restaurant_idx on public.item_pairings (restaurant_id);
create index item_pairings_pairs_idx on public.item_pairings (pairs_with_id);
alter table public.item_pairings enable row level security;
create policy "menu readable" on public.item_pairings for select to anon, authenticated using (true);
create policy "owner inserts" on public.item_pairings for insert to authenticated with check (private.is_owner(restaurant_id));
create policy "owner deletes" on public.item_pairings for delete to authenticated using (private.is_owner(restaurant_id));
revoke all on public.item_pairings from anon, authenticated;
grant select on public.item_pairings to anon, authenticated;
grant insert, delete on public.item_pairings to authenticated;

-- popular: top 2 per category (30 days, >= 3 sold). quick: top 6 available overall.
-- pairs: up to 3 dishes that shared an order with each dish at least 3 times (60 days).
-- ponytail: scans 60 days of lines per call; fine for one venue's volume. Cache in a table
-- refreshed by cron if a venue grows past ~100k lines in 60 days.
create function public.menu_signals(p_restaurant uuid) returns json
language sql stable security definer set search_path = '' as $$
  with sold as (
    select l.item_id, sum(l.quantity) as qty
    from public.orders o join public.order_lines l on l.order_id = o.id
    where o.restaurant_id = p_restaurant and o.status <> 'cancelled'
      and o.created_at > now() - interval '30 days' and l.item_id is not null
    group by l.item_id
    having sum(l.quantity) >= 3
  ),
  ranked as (
    select s.item_id, s.qty, m.available,
           row_number() over (partition by m.category_id order by s.qty desc, m.position) as in_cat,
           row_number() over (order by s.qty desc, m.position) as overall
    from sold s join public.menu_items m on m.id = s.item_id
  ),
  co as (
    select a.item_id, b.item_id as other, count(distinct a.order_id) as n
    from public.orders o
    join public.order_lines a on a.order_id = o.id
    join public.order_lines b on b.order_id = o.id and b.item_id <> a.item_id
    where o.restaurant_id = p_restaurant and o.status <> 'cancelled'
      and o.created_at > now() - interval '60 days'
    group by a.item_id, b.item_id
    having count(distinct a.order_id) >= 3
  ),
  co_top as (
    select item_id, other, row_number() over (partition by item_id order by n desc, other) as k from co
  )
  select json_build_object(
    'popular', coalesce((select json_agg(item_id order by qty desc) from ranked where in_cat <= 2), '[]'::json),
    'quick', coalesce((select json_agg(item_id order by overall) from (
      select item_id, row_number() over (order by overall) as overall from ranked where available
    ) q where overall <= 6), '[]'::json),
    'pairs', coalesce((select json_object_agg(item_id, others) from (
      select item_id, json_agg(other order by k) as others from co_top where k <= 3 group by item_id
    ) p), '{}'::json)
  );
$$;

revoke execute on function public.menu_signals(uuid) from public;
grant execute on function public.menu_signals(uuid) to anon, authenticated;
