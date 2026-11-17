-- Undo a mistaken bump on the kitchen board: move an order back one step.
--   preparing -> received, ready -> preparing, served -> ready
-- Same roles as the step being undone. Only within 2 minutes of that step, never after the table paid.
create function public.revert_order(p_order uuid, p_from public.order_status) returns void
language plpgsql security definer set search_path = '' as $$
declare
  o public.orders;
  stamp timestamptz;
begin
  select * into o from public.orders where id = p_order for update;
  if p_from not in ('preparing', 'ready', 'served') then raise exception using message = 'INVALID_TRANSITION'; end if;
  perform private.require_role(o.restaurant_id, case when p_from = 'served'
    then array['staff', 'kitchen', 'waiter'] else array['staff', 'kitchen'] end::public.staff_role[]);
  if o.status <> p_from then raise exception using message = 'STALE'; end if;
  if exists (select 1 from public.visits where id = o.visit_id and paid_at is not null) then
    raise exception using message = 'SETTLED';
  end if;
  stamp := case p_from when 'preparing' then o.preparing_at when 'ready' then o.ready_at else o.served_at end;
  if stamp < now() - interval '2 minutes' then raise exception using message = 'UNDO_EXPIRED'; end if;
  update public.orders set
    status = case p_from when 'preparing' then 'received' when 'ready' then 'preparing' else 'ready' end::public.order_status,
    preparing_at = case when p_from = 'preparing' then null else preparing_at end,
    ready_at = case when p_from = 'ready' then null else ready_at end,
    served_at = case when p_from = 'served' then null else served_at end
  where id = o.id;
end $$;

revoke execute on function public.revert_order(uuid, public.order_status) from public, anon;
grant execute on function public.revert_order(uuid, public.order_status) to authenticated;
