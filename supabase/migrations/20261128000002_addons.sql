-- Menu psychology, part 2 (spec 2026-11-27, Phase 2): multi-select add-ons per dish,
-- place_order v3 (add-ons + a "via" marker for suggested lines), and menu_stats() for the owner.

create table public.item_addons (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.menu_items on delete cascade,
  restaurant_id uuid not null references public.restaurants on delete cascade,
  name text not null check (length(name) between 1 and 100),
  name_ar text not null default '' check (length(name_ar) <= 100),
  price_fils integer not null default 0 check (price_fils between 0 and 1000000),
  position integer not null default 0
);
create index item_addons_item_idx on public.item_addons (item_id, position);
create index item_addons_restaurant_idx on public.item_addons (restaurant_id);
alter table public.item_addons enable row level security;
create policy "menu readable" on public.item_addons for select to anon, authenticated using (true);
create policy "owner inserts" on public.item_addons for insert to authenticated with check (private.is_owner(restaurant_id));
create policy "owner updates" on public.item_addons for update to authenticated using (private.is_owner(restaurant_id)) with check (private.is_owner(restaurant_id));
create policy "owner deletes" on public.item_addons for delete to authenticated using (private.is_owner(restaurant_id));
revoke all on public.item_addons from anon, authenticated;
grant select on public.item_addons to anon, authenticated;
grant insert, update, delete on public.item_addons to authenticated;

alter table public.menu_items add column addon_max smallint not null default 0 check (addon_max between 0 and 10);
alter table public.order_lines
  add column addons jsonb not null default '[]',
  add column via text check (via in ('pairing', 'quick', 'usual'));

-- ---------------------------------------------------------------- place_order v3
-- Same as 20261125000001 plus, per line: addon_ids (distinct, owned by the dish, at most
-- addon_max; a vanished id is PRICE_CHANGED so the guest's cart refreshes) and via.
-- ponytail: add-on costs are not snapshotted into line_costs, so profit counts add-ons as
-- pure margin. Add an addon cost column + trigger branch if owners ask for it.
create or replace function public.place_order(p_request_id uuid, p_lines jsonb, p_note text default null, p_visit uuid default null)
returns json language plpgsql security definer set search_path = '' as $$
declare
  g public.visit_guests := private.guest_in(p_visit);
  v public.visits;
  r public.restaurants;
  existing public.orders;
  new_order public.orders;
  line jsonb;
  it public.menu_items;
  op public.item_options;
  v_item uuid;
  v_option uuid;
  v_addons uuid[];
  addon_snap jsonb;
  addon_sum integer;
  addon_found integer;
  v_via text;
  qty integer;
  expected integer;
  unit integer;
  total integer := 0;
  pos integer := 0;
  num integer;
  clean_note text := left(nullif(btrim(coalesce(p_note, '')), ''), 200);
begin
  select * into v from public.visits where id = g.visit_id for update;
  select * into existing from public.orders where guest_id = g.id and request_id = p_request_id;
  if found then return json_build_object('order_id', existing.id, 'number', existing.number); end if;

  if v.closed_at is not null then raise exception using message = 'VISIT_CLOSED'; end if;
  select * into r from public.restaurants where id = v.restaurant_id;
  if r.ordering_paused then raise exception using message = 'PAUSED'; end if;
  if v.paid_at is not null then raise exception using message = 'SETTLED'; end if;
  if (select count(*) from public.orders where guest_id = g.id and created_at > now() - interval '1 minute') >= 5 then
    raise exception using message = 'RATE_LIMITED';
  end if;
  if jsonb_typeof(p_lines) is distinct from 'array' or jsonb_array_length(p_lines) not between 1 and 40 then
    raise exception using message = 'INVALID_LINES';
  end if;

  insert into private.order_counters as c (restaurant_id, n) values (r.id, 1)
  on conflict (restaurant_id) do update set n = c.n + 1
  returning n into num;
  insert into public.orders (restaurant_id, visit_id, guest_id, request_id, number, table_number, guest_name, guest_seq, note, is_first_of_visit)
  values (r.id, v.id, g.id, p_request_id, num, v.table_number, g.display_name, g.seq, clean_note,
          not exists (select 1 from public.orders where visit_id = v.id))
  returning * into new_order;

  for line in select value from jsonb_array_elements(p_lines) loop
    pos := pos + 1;
    if jsonb_typeof(line->'quantity') is distinct from 'number' or jsonb_typeof(line->'expected_price') is distinct from 'number'
       or (line->>'quantity')::numeric > 1000 or abs((line->>'expected_price')::numeric) > 1e9
       or (line ? 'addon_ids' and jsonb_typeof(line->'addon_ids') not in ('array', 'null')) then
      raise exception using message = 'INVALID_LINES';
    end if;
    qty := (line->>'quantity')::numeric;
    expected := (line->>'expected_price')::numeric;
    if qty <> (line->>'quantity')::numeric or qty not between 1 and 20 then
      raise exception using message = 'INVALID_QUANTITY';
    end if;
    begin
      v_item := (line->>'item_id')::uuid;
      v_option := (line->>'option_id')::uuid;
      v_addons := coalesce((select array_agg(x::uuid) from jsonb_array_elements_text(
        case when jsonb_typeof(line->'addon_ids') = 'array' then line->'addon_ids' else '[]'::jsonb end) x), '{}');
    exception when invalid_text_representation then
      raise exception using message = 'INVALID_LINES';
    end;
    v_via := case when line->>'via' in ('pairing', 'quick', 'usual') then line->>'via' end;

    select * into it from public.menu_items m where m.id = v_item and m.restaurant_id = r.id;
    if not found or not it.available then raise exception using message = 'UNAVAILABLE'; end if;

    op := null;
    if v_option is null then
      if exists (select 1 from public.item_options o where o.item_id = it.id) then
        raise exception using message = 'PRICE_CHANGED';
      end if;
      unit := it.price_fils;
    else
      select * into op from public.item_options o where o.id = v_option and o.item_id = it.id;
      if not found then raise exception using message = 'PRICE_CHANGED'; end if;
      unit := it.price_fils + op.price_fils;
    end if;

    addon_snap := '[]'::jsonb;
    if cardinality(v_addons) > 0 then
      if cardinality(v_addons) <> (select count(distinct x) from unnest(v_addons) x) then
        raise exception using message = 'INVALID_LINES';
      end if;
      -- An id on another dish is a forged line; an id that no longer exists is a stale cart.
      if exists (select 1 from public.item_addons a where a.id = any(v_addons) and a.item_id <> it.id) then
        raise exception using message = 'INVALID_LINES';
      end if;
      select count(*), coalesce(sum(a.price_fils), 0),
             coalesce(jsonb_agg(jsonb_build_object('name', a.name, 'name_ar', a.name_ar, 'price_fils', a.price_fils) order by a.position, a.name), '[]')
        into addon_found, addon_sum, addon_snap
      from public.item_addons a where a.id = any(v_addons) and a.item_id = it.id;
      if addon_found <> cardinality(v_addons) or addon_found > it.addon_max then
        raise exception using message = 'PRICE_CHANGED';
      end if;
      unit := unit + addon_sum;
    end if;
    if expected <> unit then raise exception using message = 'PRICE_CHANGED'; end if;

    insert into public.order_lines (order_id, visit_id, restaurant_id, item_id, option_id, name, name_ar, option_name, option_name_ar, unit_price_fils, quantity, position, addons, via)
    values (new_order.id, v.id, r.id, it.id, op.id, it.name, it.name_ar, op.name, op.name_ar, unit, qty, pos, addon_snap, v_via);
    total := total + unit * qty;
  end loop;

  update public.orders set total_fils = total where id = new_order.id;
  return json_build_object('order_id', new_order.id, 'number', num);
end $$;

-- ---------------------------------------------------------------- menu_stats
-- Owner proof: average order and how many lines came from a suggestion.
create function public.menu_stats(p_from timestamptz, p_to timestamptz) returns json
language plpgsql stable security definer set search_path = '' as $$
declare
  rid uuid := (select restaurant_id from public.staff_members where user_id = (select auth.uid()) and role = 'owner' limit 1);
begin
  if rid is null then raise exception using message = 'FORBIDDEN'; end if;
  return (
    select json_build_object(
      'orders', (select count(*) from public.orders o where o.restaurant_id = rid and o.created_at >= p_from and o.created_at < p_to and o.status <> 'cancelled'),
      'avg_basket_fils', coalesce((select round(avg(o.total_fils))::int from public.orders o where o.restaurant_id = rid and o.created_at >= p_from and o.created_at < p_to and o.status <> 'cancelled'), 0),
      'lines', count(l.id),
      'suggested_lines', count(l.id) filter (where l.via = 'pairing')
    )
    from public.orders o join public.order_lines l on l.order_id = o.id
    where o.restaurant_id = rid and o.created_at >= p_from and o.created_at < p_to and o.status <> 'cancelled'
  );
end $$;

revoke execute on function public.menu_stats(timestamptz, timestamptz) from public, anon;
grant execute on function public.menu_stats(timestamptz, timestamptz) to authenticated;
