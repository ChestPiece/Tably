-- Flow upgrade (2026-11-22):
--   invites by secret link (/join/<token>) with opened / joined status,
--   one account = one restaurant (owner or staff, never both),
--   restaurant logo,
--   waiter / bill requests with "on my way", a 15 s nudge and the guest's payment method.

-- ---------------------------------------------------------------- invites

alter table public.staff_invites
  add column token uuid not null default gen_random_uuid(),
  add column opened_at timestamptz,
  add constraint staff_invites_token_key unique (token);

-- One membership per account. Replaces the plain user_id index.
drop index public.staff_members_user_idx;
create unique index staff_members_one_per_user on public.staff_members (user_id);

-- Public: what the join page shows for a link. Opening it marks the invite "opened".
-- The token is the secret; nothing else about the restaurant's team leaks.
create function public.invite_info(p_token uuid) returns json
language plpgsql security definer set search_path = '' as $$
declare i public.staff_invites; r public.restaurants;
begin
  select * into i from public.staff_invites where token = p_token;
  if not found then return null; end if;
  select * into r from public.restaurants where id = i.restaurant_id;
  update public.staff_invites set opened_at = coalesce(opened_at, now()) where token = p_token;
  return json_build_object('email', i.email, 'restaurant', r.name, 'logo_url', r.logo_url);
end $$;

-- The signed-in, confirmed invitee joins. Returns {status, restaurant}:
-- joined | already_member (elsewhere) | wrong_email | unconfirmed | invalid.
create function public.accept_invite(p_token uuid, p_name text default null) returns json
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

-- Login fallback: links the oldest invite, only for accounts with no membership yet.
create or replace function public.accept_invites() returns integer
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := auth.uid();
  mail text := lower(auth.jwt() ->> 'email');
  i public.staff_invites;
begin
  if uid is null or mail is null or coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) then return 0; end if;
  if not exists (select 1 from auth.users where id = uid and email_confirmed_at is not null) then return 0; end if;
  if exists (select 1 from public.staff_members where user_id = uid) then return 0; end if;
  select * into i from public.staff_invites where email = mail order by created_at limit 1;
  if not found then return 0; end if;
  insert into public.staff_members (restaurant_id, user_id, role) values (i.restaurant_id, uid, i.role);
  delete from public.staff_invites where token = i.token;
  return 1;
end $$;

-- The signed-in user's pending invite, if any (the setup page offers it instead of a new restaurant).
create function public.my_invite() returns json
language sql stable security definer set search_path = '' as $$
  select json_build_object('token', i.token, 'restaurant', r.name)
  from public.staff_invites i join public.restaurants r on r.id = i.restaurant_id
  where i.email = lower(auth.jwt() ->> 'email')
    and not coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false)
  order by i.created_at limit 1
$$;

-- ---------------------------------------------------------------- create_restaurant: owners only, once

create or replace function public.create_restaurant(p_name text, p_currency text, p_timezone text, p_second_lang text, p_tables integer)
returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := (select auth.uid());
  clean text := btrim(coalesce(p_name, ''));
  base text;
  rid uuid;
  mail text;
begin
  select lower(email) into mail from auth.users where id = uid and not is_anonymous and email_confirmed_at is not null;
  if uid is null or mail is null then
    raise exception using message = 'AUTH_REQUIRED';
  end if;
  -- ponytail: one restaurant per account in the beta; lift this with a restaurant switcher.
  if exists (select 1 from public.staff_members where user_id = uid and role = 'owner') then
    raise exception using message = 'ALREADY_OWNER';
  end if;
  if exists (select 1 from public.staff_members where user_id = uid) then
    raise exception using message = 'ALREADY_STAFF';
  end if;
  if exists (select 1 from public.staff_invites where email = mail) then
    raise exception using message = 'HAS_INVITE';
  end if;
  if length(clean) not between 1 and 60
     or coalesce(p_currency, '') !~ '^[A-Z]{3}$'
     or not exists (select 1 from pg_catalog.pg_timezone_names where name = p_timezone)
     or (p_second_lang is not null and p_second_lang <> 'ar')
     or coalesce(p_tables, 0) not between 1 and 50 then
    raise exception using message = 'INVALID_INPUT';
  end if;

  base := left(btrim(regexp_replace(lower(clean), '[^a-z0-9]+', '-', 'g'), '-'), 30);
  if base = '' then base := 'r'; end if;

  insert into public.restaurants (slug, name, name_ar, currency, timezone, second_lang)
  values (base || '-' || left(private.new_slug(), 6), clean, '', p_currency, p_timezone, p_second_lang)
  returning id into rid;
  insert into public.staff_members (restaurant_id, user_id, role) values (rid, uid, 'owner');
  insert into public.categories (restaurant_id, name, name_ar) values (rid, 'Menu', case when p_second_lang = 'ar' then 'القائمة' else '' end);
  insert into public.tables (restaurant_id, number) select rid, n from generate_series(1, p_tables) n;
  return rid;
end $$;

-- ---------------------------------------------------------------- logo

alter table public.restaurants add column logo_url text check (logo_url is null or length(logo_url) <= 500);

-- ---------------------------------------------------------------- requests: on my way, nudge, method

alter table public.service_requests
  add column acknowledged_at timestamptz,
  add column acknowledged_by uuid references auth.users on delete set null,
  add column ack_name text,
  add column nudged_at timestamptz,
  add column pay_method text check (pay_method in ('cash', 'card'));
create index service_requests_ack_idx on public.service_requests (acknowledged_by);

drop function public.request_bill();
drop function public.call_waiter();
drop function private.open_request(text);

create function private.open_request(p_kind text, p_method text default null) returns void
language plpgsql security definer set search_path = '' as $$
declare
  g public.visit_guests := private.current_guest();
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

create function public.call_waiter() returns void
language sql security definer set search_path = '' as $$ select private.open_request('waiter') $$;

create function public.request_bill(p_method text default null) returns void
language sql security definer set search_path = '' as $$ select private.open_request('bill', p_method) $$;

-- Staff: "On my way". The guest sees the name, never the staff table.
create function public.acknowledge_request(p_request uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare rid uuid;
begin
  select restaurant_id into rid from public.service_requests where id = p_request;
  perform private.require_role(rid, array['staff']::public.staff_role[]);
  update public.service_requests
  set acknowledged_at = now(), acknowledged_by = auth.uid(),
      ack_name = (select display_name from public.staff_members where restaurant_id = rid and user_id = auth.uid())
  where id = p_request and resolved_at is null and acknowledged_at is null;
end $$;

-- Guest: no one answered in 15 s, so the board chimes again. Once per request.
create function public.nudge_request(p_request uuid) returns boolean
language plpgsql security definer set search_path = '' as $$
declare n integer;
begin
  if auth.uid() is null then raise exception using message = 'AUTH_REQUIRED'; end if;
  update public.service_requests set nudged_at = now()
  where id = p_request
    and visit_id in (select private.my_open_visit_ids())
    and resolved_at is null and acknowledged_at is null and nudged_at is null
    and created_at <= now() - interval '15 seconds';
  get diagnostics n = row_count;
  return n > 0;
end $$;

-- Staff: paid at the table. Records payment, then frees the table.
create function public.settle_bill(p_visit uuid, p_method text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  perform public.record_payment(p_visit, p_method);
  perform public.close_visit(p_visit);
end $$;

-- A guest's phone learns how the last visit ended (RLS hides closed visits).
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
  return json_build_object('visit_id', null, 'ended', last.id is not null, 'paid_method', last.payment_method);
end $$;

-- ---------------------------------------------------------------- grants

revoke execute on function public.invite_info(uuid), public.accept_invite(uuid, text), public.my_invite(),
  public.call_waiter(), public.request_bill(text), public.acknowledge_request(uuid), public.nudge_request(uuid), public.settle_bill(uuid, text),
  private.open_request(text, text)
  from public, anon;
grant execute on function public.invite_info(uuid) to anon, authenticated;
grant execute on function public.accept_invite(uuid, text), public.my_invite(),
  public.call_waiter(), public.request_bill(text), public.acknowledge_request(uuid), public.nudge_request(uuid), public.settle_bill(uuid, text)
  to authenticated;

-- ---------------------------------------------------------------- realtime: the owner's Team page updates live

alter publication supabase_realtime add table public.staff_members, public.staff_invites;
