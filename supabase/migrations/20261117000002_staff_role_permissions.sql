-- Role checks on the staff RPCs. The owner always passes.
--   staff (front desk / counter): everything on the board
--   kitchen: start, mark ready, mark served, sold-out toggle
--   waiter:  mark served, resolve waiter calls / bill requests
-- Every role still reads the board (RLS uses private.is_staff).

create function private.require_role(rid uuid, roles public.staff_role[]) returns void
language plpgsql stable security definer set search_path = '' as $$
begin
  if rid is null then raise exception using message = 'NOT_FOUND'; end if;
  if not exists (
    select 1 from public.staff_members
    where restaurant_id = rid and user_id = (select auth.uid()) and (role = 'owner' or role = any (roles))
  ) then raise exception using message = 'FORBIDDEN'; end if;
end $$;

create or replace function public.advance_order(p_order uuid, p_from public.order_status) returns void
language plpgsql security definer set search_path = '' as $$
declare
  o public.orders;
  nxt public.order_status;
begin
  select * into o from public.orders where id = p_order for update;
  perform private.require_role(o.restaurant_id, case when p_from = 'ready'
    then array['staff', 'kitchen', 'waiter'] else array['staff', 'kitchen'] end::public.staff_role[]);
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

create or replace function public.cancel_order(p_order uuid, p_reason text) returns void
language plpgsql security definer set search_path = '' as $$
declare
  o public.orders;
  clean_reason text := left(nullif(btrim(coalesce(p_reason, '')), ''), 200);
begin
  select * into o from public.orders where id = p_order for update;
  perform private.require_role(o.restaurant_id, array['staff']::public.staff_role[]);
  if o.status not in ('received', 'preparing', 'ready') then raise exception using message = 'INVALID_TRANSITION'; end if;
  if clean_reason is null then raise exception using message = 'REASON_REQUIRED'; end if;
  if exists (select 1 from public.visits where id = o.visit_id and paid_at is not null) then
    raise exception using message = 'SETTLED';
  end if;
  update public.orders set status = 'cancelled', cancel_reason = clean_reason, cancelled_at = now() where id = o.id;
end $$;

create or replace function public.resolve_request(p_request uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare rid uuid;
begin
  select restaurant_id into rid from public.service_requests where id = p_request;
  perform private.require_role(rid, array['staff', 'waiter']::public.staff_role[]);
  update public.service_requests set resolved_at = now(), resolved_by = auth.uid()
  where id = p_request and resolved_at is null;
end $$;

create or replace function public.set_item_available(p_item uuid, p_available boolean) returns void
language plpgsql security definer set search_path = '' as $$
declare rid uuid;
begin
  select restaurant_id into rid from public.menu_items where id = p_item;
  perform private.require_role(rid, array['staff', 'kitchen']::public.staff_role[]);
  update public.menu_items set available = p_available where id = p_item;
end $$;

create or replace function public.record_payment(p_visit uuid, p_method text) returns void
language plpgsql security definer set search_path = '' as $$
declare v public.visits;
begin
  select * into v from public.visits where id = p_visit for update;
  perform private.require_role(v.restaurant_id, array['staff']::public.staff_role[]);
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

create or replace function public.close_visit(p_visit uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare v public.visits;
begin
  select * into v from public.visits where id = p_visit for update;
  perform private.require_role(v.restaurant_id, array['staff']::public.staff_role[]);
  if v.closed_at is not null then return; end if;
  if exists (select 1 from public.orders where visit_id = v.id and status in ('received', 'preparing', 'ready')) then
    raise exception using message = 'OPEN_TICKETS';
  end if;
  if v.paid_at is null and private.visit_total(v.id) > 0 then raise exception using message = 'UNPAID'; end if;
  update public.visits set closed_at = now() where id = v.id;
  update public.service_requests set resolved_at = now(), resolved_by = auth.uid()
  where visit_id = v.id and resolved_at is null;
end $$;

-- Owner changes a teammate's role (never their own, never to owner).
grant update (role) on public.staff_members to authenticated;
create policy "owner sets others' role" on public.staff_members for update to authenticated
  using (private.is_owner(restaurant_id) and user_id <> (select auth.uid()))
  with check (private.is_owner(restaurant_id) and user_id <> (select auth.uid()) and role <> 'owner');
