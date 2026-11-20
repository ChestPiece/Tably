-- Role permissions on the staff RPCs. Run against a seeded DB after the two-roles migration (20261119000001).
-- Always rolls back: success ends with error 'ALL_TESTS_PASSED'; any failure raises the failing assert.
--   Two roles only: owner and staff. Staff run the whole board; kitchen / waiter can no longer be assigned.
--   revert_order (undo) works within 2 minutes, never after payment.
do $$
declare
  rid uuid;
  owner_id uuid := (select user_id from public.staff_members where role = 'owner' limit 1);
  g uuid := gen_random_uuid();
  crew uuid := gen_random_uuid();
  slug text := 'roletest01';
  item uuid; opt uuid; price int;
  res json; o1 uuid; o2 uuid; visit uuid; req uuid; err text;
begin
  select restaurant_id into rid from public.staff_members where user_id = owner_id;
  insert into auth.users (instance_id, id, aud, role, is_anonymous, email, created_at, updated_at) values
    ('00000000-0000-0000-0000-000000000000', g, 'authenticated', 'authenticated', true, null, now(), now()),
    ('00000000-0000-0000-0000-000000000000', crew, 'authenticated', 'authenticated', false, 'crew@roletest.test', now(), now());
  insert into public.staff_members (restaurant_id, user_id, role) values (rid, crew, 'staff');
  insert into public.tables (restaurant_id, number, qr_slug) values (rid, 999, slug);
  update public.restaurants set ordering_paused = false where id = rid;
  select i.id, o.id, i.price_fils + o.price_fils into item, opt, price
  from public.menu_items i join public.item_options o on o.item_id = i.id
  where i.restaurant_id = rid and i.available limit 1;

  -- Old roles are blocked
  begin insert into public.staff_invites (restaurant_id, email, role) values (rid, 'k@roletest.test', 'kitchen'); assert false, 'kitchen invite must fail';
  exception when check_violation then null; end;
  begin update public.staff_members set role = 'waiter' where user_id = crew; assert false, 'waiter role must fail';
  exception when check_violation then null; end;

  -- Guest places two orders and calls a waiter
  perform set_config('request.jwt.claims', json_build_object('sub', g, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  res := public.join_table(slug, 'Role', null);
  visit := (res->>'visit_id')::uuid;
  o1 := (public.place_order(gen_random_uuid(), json_build_array(json_build_object('item_id', item, 'option_id', opt, 'quantity', 1, 'expected_price', price))::jsonb, null)->>'order_id')::uuid;
  o2 := (public.place_order(gen_random_uuid(), json_build_array(json_build_object('item_id', item, 'option_id', opt, 'quantity', 1, 'expected_price', price))::jsonb, null)->>'order_id')::uuid;
  perform public.call_waiter();
  select id into req from public.service_requests where visit_id = visit and resolved_at is null;

  -- Staff: every board action
  perform set_config('request.jwt.claims', json_build_object('sub', crew, 'role', 'authenticated')::text, true);
  perform public.advance_order(o1, 'received');
  perform public.advance_order(o1, 'preparing');
  perform public.revert_order(o1, 'ready');
  assert (select status = 'preparing' and ready_at is null from public.orders where id = o1), 'staff undoes ready';
  begin perform public.revert_order(o1, 'ready'); assert false, 'stale undo must fail';
  exception when others then get stacked diagnostics err = message_text; assert err = 'STALE', 'stale undo got ' || err; end;
  execute 'reset role';
  update public.orders set preparing_at = now() - interval '5 minutes' where id = o1;
  execute 'set local role authenticated';
  begin perform public.revert_order(o1, 'preparing'); assert false, 'old undo must fail';
  exception when others then get stacked diagnostics err = message_text; assert err = 'UNDO_EXPIRED', 'old undo got ' || err; end;
  perform public.advance_order(o1, 'preparing');
  perform public.advance_order(o1, 'ready');
  assert (select status = 'served' from public.orders where id = o1), 'staff serves';
  perform public.set_item_available(item, false);
  perform public.set_item_available(item, true);
  perform public.resolve_request(req);
  assert (select resolved_at is not null from public.service_requests where id = req), 'staff resolves calls';
  perform public.cancel_order(o2, 'Test');
  perform public.record_payment(visit, 'card');
  begin perform public.revert_order(o1, 'served'); assert false, 'undo after payment must fail';
  exception when others then get stacked diagnostics err = message_text; assert err = 'SETTLED', 'paid undo got ' || err; end;
  perform public.close_visit(visit);

  -- Staff cannot change roles
  update public.staff_members set role = 'owner' where user_id = crew;
  assert (select role = 'staff' from public.staff_members where user_id = crew), 'staff cannot promote self';

  -- Owner cannot promote to owner either
  perform set_config('request.jwt.claims', json_build_object('sub', owner_id, 'role', 'authenticated')::text, true);
  begin
    update public.staff_members set role = 'owner' where user_id = crew;
    assert false, 'promote to owner must fail';
  exception when others then get stacked diagnostics err = message_text; assert err like '%row-level security%', 'promote got ' || err; end;

  raise exception 'ALL_TESTS_PASSED';
end $$;
