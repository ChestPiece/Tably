-- Review fixes (2026-11-25): place_order race + closed-visit guard, order counter off the
-- realtime-published restaurants row, PIN lockout, guest requests aimed at a visit,
-- invite "opened" set on accept (not on a link preview), and missing indexes.

-- ---------------------------------------------------------------- order counter
-- restaurants is in the realtime publication and every guest listens to it, so bumping a
-- counter there woke every guest phone on every order. The counter lives here instead.
create table private.order_counters (
  restaurant_id uuid primary key references public.restaurants (id) on delete cascade,
  n integer not null default 0
);
insert into private.order_counters (restaurant_id, n) select id, order_counter from public.restaurants;
alter table public.restaurants drop column order_counter;

-- ---------------------------------------------------------------- PIN lockout
alter table public.tables
  add column pin_fails integer not null default 0,
  add column pin_locked_until timestamptz;

-- ---------------------------------------------------------------- guest identity
-- A guest can sit in two open visits (scanned two tables). Requests name the visit they
-- mean; without one, the latest join wins as before.
create function private.guest_in(p_visit uuid) returns public.visit_guests
language plpgsql stable security definer set search_path = '' as $$
declare g public.visit_guests;
begin
  if p_visit is null then return private.current_guest(); end if;
  if auth.uid() is null then raise exception using message = 'AUTH_REQUIRED'; end if;
  select vg.* into g from public.visit_guests vg join public.visits v on v.id = vg.visit_id
  where vg.user_id = auth.uid() and vg.visit_id = p_visit and v.closed_at is null;
  if not found then raise exception using message = 'VISIT_CLOSED'; end if;
  return g;
end $$;

-- ---------------------------------------------------------------- join_table
-- A wrong PIN returns {error} instead of raising, so the failure count survives
-- (a raise would roll it back). 5 misses lock the table's PIN for 15 minutes.
-- ponytail: counted per table, so someone holding the slug can keep a table locked; move to a
-- per-(user, table) count if that is ever abused.
create or replace function public.join_table(p_slug text, p_name text default null, p_pin text default null)
returns json language plpgsql security definer set search_path = '' as $$
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
  select * into t from public.tables where qr_slug = p_slug for update;
  if not found then raise exception using message = 'TABLE_NOT_FOUND'; end if;
  select * into r from public.restaurants where id = t.restaurant_id;
  if r.pin_required and t.pin is not null then
    if t.pin_locked_until > now() then return json_build_object('error', 'PIN_LOCKED'); end if;
    if coalesce(p_pin, '') <> t.pin then
      update public.tables
      set pin_fails = case when pin_fails >= 4 then 0 else pin_fails + 1 end,
          pin_locked_until = case when pin_fails >= 4 then now() + interval '15 minutes' else pin_locked_until end
      where id = t.id;
      return json_build_object('error', case when t.pin_fails >= 4 then 'PIN_LOCKED' else 'BAD_PIN' end);
    end if;
    if t.pin_fails > 0 then update public.tables set pin_fails = 0 where id = t.id; end if;
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

-- ---------------------------------------------------------------- place_order
-- Idempotency check now runs after the visit lock, so two concurrent retries with one
-- request id return the same order instead of a unique-violation error. A visit closed
-- after the guest lookup is refused. Bad ids raise INVALID_LINES, not a raw cast error.
drop function public.place_order(uuid, jsonb, text);
create function public.place_order(p_request_id uuid, p_lines jsonb, p_note text default null, p_visit uuid default null)
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
       or (line->>'quantity')::numeric > 1000 or abs((line->>'expected_price')::numeric) > 1e9 then
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
    exception when invalid_text_representation then
      raise exception using message = 'INVALID_LINES';
    end;

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
    if expected <> unit then raise exception using message = 'PRICE_CHANGED'; end if;

    insert into public.order_lines (order_id, visit_id, restaurant_id, item_id, option_id, name, name_ar, option_name, option_name_ar, unit_price_fils, quantity, position)
    values (new_order.id, v.id, r.id, it.id, op.id, it.name, it.name_ar, op.name, op.name_ar, unit, qty, pos);
    total := total + unit * qty;
  end loop;

  update public.orders set total_fils = total where id = new_order.id;
  return json_build_object('order_id', new_order.id, 'number', num);
end $$;

-- ---------------------------------------------------------------- waiter / bill
drop function public.call_waiter();
drop function public.request_bill(text);
drop function private.open_request(text, text);

create function private.open_request(p_kind text, p_method text default null, p_visit uuid default null) returns void
language plpgsql security definer set search_path = '' as $$
declare
  g public.visit_guests := private.guest_in(p_visit);
  v public.visits;
begin
  if p_method is not null and p_method not in ('cash', 'card') then raise exception using message = 'INVALID_METHOD'; end if;
  select * into v from public.visits where id = g.visit_id;
  insert into public.service_requests (restaurant_id, visit_id, guest_id, table_number, guest_name, guest_seq, kind, pay_method)
  values (v.restaurant_id, v.id, g.id, v.table_number, g.display_name, g.seq, p_kind, p_method)
  on conflict (visit_id, kind) where resolved_at is null
  do update set pay_method = coalesce(excluded.pay_method, public.service_requests.pay_method);
  if p_kind = 'bill' then
    update public.visits set bill_requested_at = coalesce(bill_requested_at, now()) where id = v.id;
  end if;
end $$;

create function public.call_waiter(p_visit uuid default null) returns void
language sql security definer set search_path = '' as $$ select private.open_request('waiter', null, p_visit) $$;

create function public.request_bill(p_method text default null, p_visit uuid default null) returns void
language sql security definer set search_path = '' as $$ select private.open_request('bill', p_method, p_visit) $$;

-- ---------------------------------------------------------------- invites
-- Link previews (WhatsApp, Slack) fetch the page and called invite_info, marking the
-- invite "opened" before anyone saw it. invite_info is read-only now; the Team page
-- learns about use when the invite disappears on accept.
create or replace function public.invite_info(p_token uuid) returns json
language plpgsql stable security definer set search_path = '' as $$
declare i public.staff_invites; r public.restaurants;
begin
  select * into i from public.staff_invites where token = p_token;
  if not found then return null; end if;
  select * into r from public.restaurants where id = i.restaurant_id;
  return json_build_object('email', i.email, 'restaurant', r.name, 'logo_url', r.logo_url);
end $$;

-- A signed-in person on the join page (accept_invite returned wrong_email/unconfirmed)
-- is a real open.
create or replace function public.accept_invite(p_token uuid, p_name text default null) returns json
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := auth.uid();
  mail text := lower(auth.jwt() ->> 'email');
  i public.staff_invites;
  m public.staff_members;
  rname text;
  clean text := left(nullif(btrim(coalesce(p_name, '')), ''), 60);
begin
  if uid is null or coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) then
    raise exception using message = 'AUTH_REQUIRED';
  end if;
  select * into i from public.staff_invites where token = p_token;
  if not found then return json_build_object('status', 'invalid'); end if;
  update public.staff_invites set opened_at = coalesce(opened_at, now()) where token = p_token;
  select name into rname from public.restaurants where id = i.restaurant_id;
  if mail is distinct from i.email then
    return json_build_object('status', 'wrong_email', 'restaurant', rname, 'email', i.email);
  end if;
  if not exists (select 1 from auth.users where id = uid and email_confirmed_at is not null) then
    return json_build_object('status', 'unconfirmed', 'restaurant', rname);
  end if;
  select * into m from public.staff_members where user_id = uid;
  if found and m.restaurant_id <> i.restaurant_id then
    return json_build_object('status', 'already_member', 'restaurant', (select name from public.restaurants where id = m.restaurant_id));
  end if;
  if not found then
    insert into public.staff_members (restaurant_id, user_id, role, display_name) values (i.restaurant_id, uid, i.role, clean);
  elsif clean is not null and m.display_name is null then
    update public.staff_members set display_name = clean where user_id = uid;
  end if;
  delete from public.staff_invites where token = p_token;
  return json_build_object('status', 'joined', 'restaurant', rname);
end $$;

-- ---------------------------------------------------------------- indexes
create index orders_restaurant_created_idx on public.orders (restaurant_id, created_at);
create index visits_restaurant_paid_idx on public.visits (restaurant_id, paid_at) where paid_at is not null;
create index visit_guests_restaurant_idx on public.visit_guests (restaurant_id);
alter table public.item_costs add column id uuid primary key default gen_random_uuid();

-- ---------------------------------------------------------------- grants
revoke execute on function private.guest_in(uuid) from public, anon, authenticated;
revoke execute on function private.open_request(text, text, uuid) from public, anon, authenticated;
revoke execute on function public.place_order(uuid, jsonb, text, uuid), public.call_waiter(uuid),
  public.request_bill(text, uuid) from public, anon;
grant execute on function public.place_order(uuid, jsonb, text, uuid), public.call_waiter(uuid),
  public.request_bill(text, uuid) to authenticated;
