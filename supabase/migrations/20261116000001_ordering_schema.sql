-- ChestBest QR ordering: schema, RLS, functions, realtime, storage.
-- Money is integer fils. All guest/staff writes go through functions below.

create schema if not exists private;
grant usage on schema private to anon, authenticated;

create type public.order_status as enum ('received', 'preparing', 'ready', 'served', 'cancelled');
create type public.staff_role as enum ('owner', 'staff');

create function private.new_slug() returns text
language sql volatile set search_path = '' as $$
  select substr(md5(gen_random_uuid()::text || clock_timestamp()::text), 1, 10)
$$;

-- ---------------------------------------------------------------- tables

create table public.restaurants (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9-]{2,40}$'),
  name text not null check (length(name) between 1 and 60),
  name_ar text not null check (length(name_ar) between 1 and 60),
  tagline text not null default '' check (length(tagline) <= 150),
  tagline_ar text not null default '' check (length(tagline_ar) <= 150),
  currency text not null default 'AED',
  accent text not null default '#e85d2a' check (accent ~ '^#[0-9a-fA-F]{6}$'),
  service_mode text not null default 'table' check (service_mode in ('table', 'counter')),
  ordering_paused boolean not null default false,
  pin_required boolean not null default false,
  order_counter integer not null default 0,
  created_at timestamptz not null default now()
);

create table public.staff_members (
  restaurant_id uuid not null references public.restaurants on delete cascade,
  user_id uuid not null references auth.users on delete cascade,
  role public.staff_role not null default 'staff',
  display_name text check (display_name is null or length(display_name) <= 60),
  created_at timestamptz not null default now(),
  primary key (restaurant_id, user_id)
);
create index staff_members_user_idx on public.staff_members (user_id);

create table public.staff_invites (
  restaurant_id uuid not null references public.restaurants on delete cascade,
  email text not null check (email = lower(email) and email like '%_@_%'),
  role public.staff_role not null default 'staff',
  created_at timestamptz not null default now(),
  primary key (restaurant_id, email)
);
create index staff_invites_email_idx on public.staff_invites (email);

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants on delete cascade,
  name text not null check (length(name) between 1 and 60),
  name_ar text not null check (length(name_ar) between 1 and 60),
  position integer not null default 0
);
create index categories_restaurant_idx on public.categories (restaurant_id, position);

create table public.menu_items (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants on delete cascade,
  category_id uuid not null references public.categories on delete restrict,
  name text not null check (length(name) between 1 and 80),
  name_ar text not null check (length(name_ar) between 1 and 80),
  description text not null default '' check (length(description) <= 400),
  description_ar text not null default '' check (length(description_ar) <= 400),
  price_fils integer not null check (price_fils between 0 and 1000000),
  image_url text check (image_url is null or image_url ~ '^https://'),
  available boolean not null default true,
  badge text check (badge is null or length(badge) <= 40),
  badge_ar text check (badge_ar is null or length(badge_ar) <= 40),
  position integer not null default 0,
  created_at timestamptz not null default now()
);
create index menu_items_restaurant_idx on public.menu_items (restaurant_id, position);
create index menu_items_category_idx on public.menu_items (category_id);

create table public.item_options (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.menu_items on delete cascade,
  restaurant_id uuid not null references public.restaurants on delete cascade,
  name text not null check (length(name) between 1 and 100),
  name_ar text not null check (length(name_ar) between 1 and 100),
  price_fils integer not null default 0 check (price_fils between 0 and 1000000),
  position integer not null default 0
);
create index item_options_item_idx on public.item_options (item_id, position);
create index item_options_restaurant_idx on public.item_options (restaurant_id);

create table public.tables (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants on delete cascade,
  number integer not null check (number between 1 and 999),
  qr_slug text not null unique default private.new_slug(),
  pin text check (pin is null or pin ~ '^[0-9]{4}$'),
  created_at timestamptz not null default now(),
  unique (restaurant_id, number)
);

create table public.visits (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants on delete cascade,
  table_id uuid not null references public.tables on delete cascade,
  table_number integer not null,
  opened_at timestamptz not null default now(),
  closed_at timestamptz,
  bill_requested_at timestamptz,
  paid_at timestamptz,
  payment_method text check (payment_method is null or payment_method in ('cash', 'card')),
  settled_total_fils integer,
  guest_count integer not null default 0
);
create unique index visits_one_open_per_table on public.visits (table_id) where closed_at is null;
create index visits_open_restaurant_idx on public.visits (restaurant_id) where closed_at is null;

create table public.visit_guests (
  id uuid primary key default gen_random_uuid(),
  visit_id uuid not null references public.visits on delete cascade,
  restaurant_id uuid not null references public.restaurants on delete cascade,
  user_id uuid not null references auth.users on delete cascade,
  display_name text check (display_name is null or length(display_name) between 1 and 40),
  seq integer not null,
  joined_at timestamptz not null default now(),
  unique (visit_id, user_id)
);
create index visit_guests_user_idx on public.visit_guests (user_id);

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants on delete cascade,
  visit_id uuid not null references public.visits on delete cascade,
  guest_id uuid not null references public.visit_guests on delete cascade,
  request_id uuid not null,
  number integer not null,
  table_number integer not null,
  guest_name text,
  guest_seq integer not null,
  status public.order_status not null default 'received',
  total_fils integer not null default 0,
  note text check (note is null or length(note) <= 200),
  cancel_reason text,
  is_first_of_visit boolean not null default false,
  created_at timestamptz not null default now(),
  preparing_at timestamptz,
  ready_at timestamptz,
  served_at timestamptz,
  cancelled_at timestamptz,
  unique (guest_id, request_id)
);
create index orders_board_idx on public.orders (restaurant_id, status, created_at);
create index orders_visit_idx on public.orders (visit_id);

create table public.order_lines (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders on delete cascade,
  visit_id uuid not null references public.visits on delete cascade,
  restaurant_id uuid not null references public.restaurants on delete cascade,
  item_id uuid references public.menu_items on delete set null,
  option_id uuid,
  name text not null,
  name_ar text not null,
  option_name text,
  option_name_ar text,
  unit_price_fils integer not null,
  quantity integer not null check (quantity between 1 and 20),
  position integer not null default 0
);
create index order_lines_order_idx on public.order_lines (order_id);
create index order_lines_visit_idx on public.order_lines (visit_id);
create index order_lines_restaurant_idx on public.order_lines (restaurant_id);
create index order_lines_item_idx on public.order_lines (item_id);

create table public.service_requests (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants on delete cascade,
  visit_id uuid not null references public.visits on delete cascade,
  guest_id uuid references public.visit_guests on delete set null,
  table_number integer not null,
  guest_name text,
  guest_seq integer,
  kind text not null check (kind in ('waiter', 'bill')),
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  resolved_by uuid references auth.users on delete set null
);
create unique index service_requests_one_open on public.service_requests (visit_id, kind) where resolved_at is null;
create index service_requests_open_idx on public.service_requests (restaurant_id) where resolved_at is null;
create index service_requests_guest_idx on public.service_requests (guest_id);
create index service_requests_resolver_idx on public.service_requests (resolved_by);

-- ---------------------------------------------------------------- access helpers

create function private.is_staff(rid uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.staff_members
    where restaurant_id = rid and user_id = (select auth.uid())
  )
$$;

create function private.is_owner(rid uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.staff_members
    where restaurant_id = rid and user_id = (select auth.uid()) and role = 'owner'
  )
$$;

create function private.my_open_visit_ids() returns setof uuid
language sql stable security definer set search_path = '' as $$
  select vg.visit_id
  from public.visit_guests vg
  join public.visits v on v.id = vg.visit_id
  where vg.user_id = (select auth.uid()) and v.closed_at is null
$$;

grant execute on function private.is_staff(uuid), private.is_owner(uuid), private.my_open_visit_ids() to anon, authenticated;

-- ---------------------------------------------------------------- RLS

alter table public.restaurants enable row level security;
alter table public.staff_members enable row level security;
alter table public.staff_invites enable row level security;
alter table public.categories enable row level security;
alter table public.menu_items enable row level security;
alter table public.item_options enable row level security;
alter table public.tables enable row level security;
alter table public.visits enable row level security;
alter table public.visit_guests enable row level security;
alter table public.orders enable row level security;
alter table public.order_lines enable row level security;
alter table public.service_requests enable row level security;

-- Public menu data
create policy "menu readable" on public.restaurants for select to anon, authenticated using (true);
create policy "owner updates restaurant" on public.restaurants for update to authenticated
  using (private.is_owner(id)) with check (private.is_owner(id));

create policy "menu readable" on public.categories for select to anon, authenticated using (true);
create policy "owner inserts" on public.categories for insert to authenticated with check (private.is_owner(restaurant_id));
create policy "owner updates" on public.categories for update to authenticated using (private.is_owner(restaurant_id)) with check (private.is_owner(restaurant_id));
create policy "owner deletes" on public.categories for delete to authenticated using (private.is_owner(restaurant_id));

create policy "menu readable" on public.menu_items for select to anon, authenticated using (true);
create policy "owner inserts" on public.menu_items for insert to authenticated with check (private.is_owner(restaurant_id));
create policy "owner updates" on public.menu_items for update to authenticated using (private.is_owner(restaurant_id)) with check (private.is_owner(restaurant_id));
create policy "owner deletes" on public.menu_items for delete to authenticated using (private.is_owner(restaurant_id));

create policy "menu readable" on public.item_options for select to anon, authenticated using (true);
create policy "owner inserts" on public.item_options for insert to authenticated with check (private.is_owner(restaurant_id));
create policy "owner updates" on public.item_options for update to authenticated using (private.is_owner(restaurant_id)) with check (private.is_owner(restaurant_id));
create policy "owner deletes" on public.item_options for delete to authenticated using (private.is_owner(restaurant_id));

-- Staff-only data (table PINs and slugs never reach guests directly)
create policy "staff reads" on public.tables for select to authenticated using (private.is_staff(restaurant_id));
create policy "owner inserts" on public.tables for insert to authenticated with check (private.is_owner(restaurant_id));
create policy "owner updates" on public.tables for update to authenticated using (private.is_owner(restaurant_id)) with check (private.is_owner(restaurant_id));
create policy "owner deletes" on public.tables for delete to authenticated using (private.is_owner(restaurant_id));

create policy "self or team reads" on public.staff_members for select to authenticated
  using (user_id = (select auth.uid()) or private.is_staff(restaurant_id));
create policy "owner removes others" on public.staff_members for delete to authenticated
  using (private.is_owner(restaurant_id) and user_id <> (select auth.uid()));

create policy "owner reads" on public.staff_invites for select to authenticated using (private.is_owner(restaurant_id));
create policy "owner inserts" on public.staff_invites for insert to authenticated with check (private.is_owner(restaurant_id));
create policy "owner deletes" on public.staff_invites for delete to authenticated using (private.is_owner(restaurant_id));

-- Visit data: staff of the restaurant, or guests of that open visit
create policy "staff or own visit" on public.visits for select to authenticated
  using (private.is_staff(restaurant_id) or id in (select private.my_open_visit_ids()));
create policy "staff or own visit" on public.visit_guests for select to authenticated
  using (private.is_staff(restaurant_id) or visit_id in (select private.my_open_visit_ids()));
create policy "staff or own visit" on public.orders for select to authenticated
  using (private.is_staff(restaurant_id) or visit_id in (select private.my_open_visit_ids()));
create policy "staff or own visit" on public.order_lines for select to authenticated
  using (private.is_staff(restaurant_id) or visit_id in (select private.my_open_visit_ids()));
create policy "staff or own visit" on public.service_requests for select to authenticated
  using (private.is_staff(restaurant_id) or visit_id in (select private.my_open_visit_ids()));

-- Table grants (RLS above decides rows)
revoke all on all tables in schema public from anon, authenticated;
grant select on all tables in schema public to anon, authenticated;
grant update on public.restaurants to authenticated;
grant insert, update, delete on public.categories, public.menu_items, public.item_options, public.tables to authenticated;
grant delete on public.staff_members to authenticated;
grant insert, delete on public.staff_invites to authenticated;

-- ---------------------------------------------------------------- guest functions

-- Public info for a QR slug. Never returns the PIN.
create function public.table_info(p_slug text) returns json
language sql stable security definer set search_path = '' as $$
  select json_build_object(
    'table_number', t.number,
    'restaurant_id', r.id,
    'pin_required', r.pin_required and t.pin is not null
  )
  from public.tables t join public.restaurants r on r.id = t.restaurant_id
  where t.qr_slug = p_slug
$$;

-- Current guest's place at this table: joined open visit, or whether their last visit here ended.
create function public.guest_session(p_slug text) returns json
language plpgsql stable security definer set search_path = '' as $$
declare
  uid uuid := auth.uid();
  t public.tables;
  g public.visit_guests;
begin
  select * into t from public.tables where qr_slug = p_slug;
  if not found then raise exception using message = 'TABLE_NOT_FOUND'; end if;
  if uid is null then return json_build_object('visit_id', null, 'ended', false); end if;

  select vg.* into g from public.visit_guests vg join public.visits v on v.id = vg.visit_id
  where vg.user_id = uid and v.table_id = t.id and v.closed_at is null;
  if found then
    return json_build_object('visit_id', g.visit_id, 'guest_id', g.id, 'display_name', g.display_name, 'seq', g.seq, 'ended', false);
  end if;

  return json_build_object('visit_id', null, 'ended', exists (
    select 1 from public.visit_guests vg join public.visits v on v.id = vg.visit_id
    where vg.user_id = uid and v.table_id = t.id and v.closed_at > now() - interval '12 hours'
  ));
end $$;

create function public.join_table(p_slug text, p_name text default null, p_pin text default null) returns json
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := auth.uid();
  t public.tables;
  r public.restaurants;
  v public.visits;
  g public.visit_guests;
  clean_name text := left(nullif(btrim(coalesce(p_name, '')), ''), 40);
  next_seq integer;
begin
  if uid is null then raise exception using message = 'AUTH_REQUIRED'; end if;
  select * into t from public.tables where qr_slug = p_slug;
  if not found then raise exception using message = 'TABLE_NOT_FOUND'; end if;
  select * into r from public.restaurants where id = t.restaurant_id;
  if r.pin_required and t.pin is not null and coalesce(p_pin, '') <> t.pin then
    raise exception using message = 'BAD_PIN';
  end if;

  insert into public.visits (restaurant_id, table_id, table_number)
  values (t.restaurant_id, t.id, t.number)
  on conflict (table_id) where closed_at is null do nothing;
  select * into v from public.visits where table_id = t.id and closed_at is null for update;

  select * into g from public.visit_guests where visit_id = v.id and user_id = uid;
  if found then
    if clean_name is not null then
      update public.visit_guests set display_name = clean_name where id = g.id returning * into g;
    end if;
  else
    update public.visits set guest_count = guest_count + 1 where id = v.id returning guest_count into next_seq;
    insert into public.visit_guests (visit_id, restaurant_id, user_id, display_name, seq)
    values (v.id, v.restaurant_id, uid, clean_name, next_seq) returning * into g;
  end if;

  return json_build_object('visit_id', v.id, 'guest_id', g.id, 'display_name', g.display_name, 'seq', g.seq);
end $$;

create function private.current_guest() returns public.visit_guests
language plpgsql stable security definer set search_path = '' as $$
declare g public.visit_guests;
begin
  if auth.uid() is null then raise exception using message = 'AUTH_REQUIRED'; end if;
  select vg.* into g from public.visit_guests vg join public.visits v on v.id = vg.visit_id
  where vg.user_id = auth.uid() and v.closed_at is null
  order by vg.joined_at desc limit 1;
  if not found then raise exception using message = 'VISIT_CLOSED'; end if;
  return g;
end $$;

-- p_lines: [{item_id, option_id|null, quantity, expected_price}]
create function public.place_order(p_request_id uuid, p_lines jsonb, p_note text default null) returns json
language plpgsql security definer set search_path = '' as $$
declare
  g public.visit_guests := private.current_guest();
  v public.visits;
  r public.restaurants;
  existing public.orders;
  new_order public.orders;
  line jsonb;
  it public.menu_items;
  op public.item_options;
  qty integer;
  expected integer;
  unit integer;
  total integer := 0;
  pos integer := 0;
  num integer;
  clean_note text := left(nullif(btrim(coalesce(p_note, '')), ''), 200);
begin
  select * into existing from public.orders where guest_id = g.id and request_id = p_request_id;
  if found then return json_build_object('order_id', existing.id, 'number', existing.number); end if;

  select * into v from public.visits where id = g.visit_id for update;
  select * into r from public.restaurants where id = v.restaurant_id;
  if r.ordering_paused then raise exception using message = 'PAUSED'; end if;
  if v.paid_at is not null then raise exception using message = 'SETTLED'; end if;
  if (select count(*) from public.orders where guest_id = g.id and created_at > now() - interval '1 minute') >= 5 then
    raise exception using message = 'RATE_LIMITED';
  end if;
  if jsonb_typeof(p_lines) is distinct from 'array' or jsonb_array_length(p_lines) not between 1 and 40 then
    raise exception using message = 'INVALID_LINES';
  end if;

  update public.restaurants set order_counter = order_counter + 1 where id = r.id returning order_counter into num;
  insert into public.orders (restaurant_id, visit_id, guest_id, request_id, number, table_number, guest_name, guest_seq, note, is_first_of_visit)
  values (r.id, v.id, g.id, p_request_id, num, v.table_number, g.display_name, g.seq, clean_note,
          not exists (select 1 from public.orders where visit_id = v.id))
  returning * into new_order;

  for line in select value from jsonb_array_elements(p_lines) loop
    pos := pos + 1;
    if jsonb_typeof(line->'quantity') is distinct from 'number' or jsonb_typeof(line->'expected_price') is distinct from 'number' then
      raise exception using message = 'INVALID_LINES';
    end if;
    qty := (line->>'quantity')::numeric;
    expected := (line->>'expected_price')::numeric;
    if qty <> (line->>'quantity')::numeric or qty not between 1 and 20 then
      raise exception using message = 'INVALID_QUANTITY';
    end if;

    select * into it from public.menu_items
    where id = (line->>'item_id')::uuid and restaurant_id = r.id;
    if not found or not it.available then raise exception using message = 'UNAVAILABLE'; end if;

    op := null;
    if line->>'option_id' is null then
      if exists (select 1 from public.item_options where item_id = it.id) then
        raise exception using message = 'PRICE_CHANGED';
      end if;
      unit := it.price_fils;
    else
      select * into op from public.item_options where id = (line->>'option_id')::uuid and item_id = it.id;
      if not found then raise exception using message = 'PRICE_CHANGED'; end if;
      unit := it.price_fils + op.price_fils;
    end if;
    if expected <> unit then raise exception using message = 'PRICE_CHANGED'; end if;

    insert into public.order_lines (order_id, visit_id, restaurant_id, item_id, option_id, name, name_ar, option_name, option_name_ar, unit_price_fils, quantity, position)
    values (new_order.id, v.id, r.id, it.id, op.id, it.name, it.name_ar, op.name, op.name_ar, unit, qty, pos);
    total := total + unit * qty;
  end loop;

  update public.orders set total_fils = total where id = new_order.id;
  return json_build_object('order_id', new_order.id, 'number', num);
end $$;

create function private.open_request(p_kind text) returns void
language plpgsql security definer set search_path = '' as $$
declare
  g public.visit_guests := private.current_guest();
  v public.visits;
begin
  select * into v from public.visits where id = g.visit_id;
  insert into public.service_requests (restaurant_id, visit_id, guest_id, table_number, guest_name, guest_seq, kind)
  values (v.restaurant_id, v.id, g.id, v.table_number, g.display_name, g.seq, p_kind)
  on conflict (visit_id, kind) where resolved_at is null do nothing;
  if p_kind = 'bill' then
    update public.visits set bill_requested_at = coalesce(bill_requested_at, now()) where id = v.id;
  end if;
end $$;

create function public.call_waiter() returns void
language sql security definer set search_path = '' as $$ select private.open_request('waiter') $$;

create function public.request_bill() returns void
language sql security definer set search_path = '' as $$ select private.open_request('bill') $$;

-- ---------------------------------------------------------------- staff functions

create function private.require_staff(rid uuid) returns void
language plpgsql stable security definer set search_path = '' as $$
begin
  if rid is null then raise exception using message = 'NOT_FOUND'; end if;
  if not private.is_staff(rid) then raise exception using message = 'FORBIDDEN'; end if;
end $$;

create function public.advance_order(p_order uuid, p_from public.order_status) returns void
language plpgsql security definer set search_path = '' as $$
declare
  o public.orders;
  nxt public.order_status;
begin
  select * into o from public.orders where id = p_order for update;
  perform private.require_staff(o.restaurant_id);
  if o.status <> p_from then raise exception using message = 'STALE'; end if;
  nxt := case p_from when 'received' then 'preparing' when 'preparing' then 'ready' when 'ready' then 'served' end;
  if nxt is null then raise exception using message = 'INVALID_TRANSITION'; end if;
  update public.orders set
    status = nxt,
    preparing_at = case when nxt = 'preparing' then now() else preparing_at end,
    ready_at = case when nxt = 'ready' then now() else ready_at end,
    served_at = case when nxt = 'served' then now() else served_at end
  where id = o.id;
end $$;

create function public.cancel_order(p_order uuid, p_reason text) returns void
language plpgsql security definer set search_path = '' as $$
declare
  o public.orders;
  clean_reason text := left(nullif(btrim(coalesce(p_reason, '')), ''), 200);
begin
  select * into o from public.orders where id = p_order for update;
  perform private.require_staff(o.restaurant_id);
  if o.status not in ('received', 'preparing', 'ready') then raise exception using message = 'INVALID_TRANSITION'; end if;
  if clean_reason is null then raise exception using message = 'REASON_REQUIRED'; end if;
  if exists (select 1 from public.visits where id = o.visit_id and paid_at is not null) then
    raise exception using message = 'SETTLED';
  end if;
  update public.orders set status = 'cancelled', cancel_reason = clean_reason, cancelled_at = now() where id = o.id;
end $$;

create function public.resolve_request(p_request uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare rid uuid;
begin
  select restaurant_id into rid from public.service_requests where id = p_request;
  perform private.require_staff(rid);
  update public.service_requests set resolved_at = now(), resolved_by = auth.uid()
  where id = p_request and resolved_at is null;
end $$;

create function public.set_item_available(p_item uuid, p_available boolean) returns void
language plpgsql security definer set search_path = '' as $$
declare rid uuid;
begin
  select restaurant_id into rid from public.menu_items where id = p_item;
  perform private.require_staff(rid);
  update public.menu_items set available = p_available where id = p_item;
end $$;

create function private.visit_total(p_visit uuid) returns integer
language sql stable security definer set search_path = '' as $$
  select coalesce(sum(total_fils), 0)::integer from public.orders where visit_id = p_visit and status <> 'cancelled'
$$;

create function public.record_payment(p_visit uuid, p_method text) returns void
language plpgsql security definer set search_path = '' as $$
declare v public.visits;
begin
  select * into v from public.visits where id = p_visit for update;
  perform private.require_staff(v.restaurant_id);
  if v.closed_at is not null then raise exception using message = 'VISIT_CLOSED'; end if;
  if v.paid_at is not null then raise exception using message = 'ALREADY_PAID'; end if;
  if p_method not in ('cash', 'card') then raise exception using message = 'INVALID_METHOD'; end if;
  if exists (select 1 from public.orders where visit_id = v.id and status in ('received', 'preparing', 'ready')) then
    raise exception using message = 'OPEN_TICKETS';
  end if;
  update public.visits set paid_at = now(), payment_method = p_method, settled_total_fils = private.visit_total(v.id) where id = v.id;
  update public.service_requests set resolved_at = now(), resolved_by = auth.uid()
  where visit_id = v.id and kind = 'bill' and resolved_at is null;
end $$;

create function public.close_visit(p_visit uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare v public.visits;
begin
  select * into v from public.visits where id = p_visit for update;
  perform private.require_staff(v.restaurant_id);
  if v.closed_at is not null then return; end if;
  if exists (select 1 from public.orders where visit_id = v.id and status in ('received', 'preparing', 'ready')) then
    raise exception using message = 'OPEN_TICKETS';
  end if;
  if v.paid_at is null and private.visit_total(v.id) > 0 then raise exception using message = 'UNPAID'; end if;
  update public.visits set closed_at = now() where id = v.id;
  update public.service_requests set resolved_at = now(), resolved_by = auth.uid()
  where visit_id = v.id and resolved_at is null;
end $$;

-- Links the signed-in user to any restaurant that invited their email.
create function public.accept_invites() returns integer
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := auth.uid();
  mail text := lower(auth.jwt() ->> 'email');
  linked integer;
begin
  if uid is null or mail is null or coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) then return 0; end if;
  insert into public.staff_members (restaurant_id, user_id, role)
  select restaurant_id, uid, role from public.staff_invites where email = mail
  on conflict (restaurant_id, user_id) do nothing;
  get diagnostics linked = row_count;
  delete from public.staff_invites where email = mail;
  return linked;
end $$;

-- Owner-only: wipe visits/orders for a fresh demo.
create function public.reset_demo(p_restaurant uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not private.is_owner(p_restaurant) then raise exception using message = 'FORBIDDEN'; end if;
  delete from public.visits where restaurant_id = p_restaurant;
  update public.restaurants set order_counter = 0 where id = p_restaurant;
end $$;

-- Function grants: nothing is callable by default.
revoke execute on all functions in schema public from public, anon, authenticated;
revoke execute on all functions in schema private from public;
grant execute on function private.is_staff(uuid), private.is_owner(uuid), private.my_open_visit_ids() to anon, authenticated;
grant execute on function public.table_info(text), public.guest_session(text) to anon, authenticated;
grant execute on function public.join_table(text, text, text), public.place_order(uuid, jsonb, text),
  public.call_waiter(), public.request_bill(),
  public.advance_order(uuid, public.order_status), public.cancel_order(uuid, text), public.resolve_request(uuid),
  public.set_item_available(uuid, boolean), public.record_payment(uuid, text), public.close_visit(uuid),
  public.accept_invites(), public.reset_demo(uuid)
  to authenticated;

-- ---------------------------------------------------------------- realtime

alter publication supabase_realtime add table
  public.orders, public.service_requests, public.visits, public.menu_items, public.restaurants;

-- ---------------------------------------------------------------- storage (menu photos)

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('menu-images', 'menu-images', true, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

create policy "owner reads menu images" on storage.objects for select to authenticated
  using (bucket_id = 'menu-images' and private.is_owner(((storage.foldername(name))[1])::uuid));
create policy "owner uploads menu images" on storage.objects for insert to authenticated
  with check (bucket_id = 'menu-images' and private.is_owner(((storage.foldername(name))[1])::uuid));
create policy "owner updates menu images" on storage.objects for update to authenticated
  using (bucket_id = 'menu-images' and private.is_owner(((storage.foldername(name))[1])::uuid))
  with check (bucket_id = 'menu-images' and private.is_owner(((storage.foldername(name))[1])::uuid));
create policy "owner deletes menu images" on storage.objects for delete to authenticated
  using (bucket_id = 'menu-images' and private.is_owner(((storage.foldername(name))[1])::uuid));
