-- Role permissions on the staff RPCs. Run against a seeded DB after the staff role migrations.
-- Always rolls back: success ends with error 'ALL_TESTS_PASSED'; any failure raises the failing assert.
--   owner, staff (front desk): everything
--   kitchen: start / ready / served, sold-out toggle; no cancel, calls, payments
--   waiter:  served, resolve calls; no start / ready, cancel, sold-out, payments
--   revert_order (undo) uses the same role as the step it undoes, within 2 minutes, never after payment
do $$
declare
  rid uuid;
  owner_id uuid := (select user_id from public.staff_members where role = 'owner' limit 1);
  g uuid := gen_random_uuid();
  cook uuid := gen_random_uuid();
  waiter uuid := gen_random_uuid();
  slug text := 'roletest01';
  item uuid; opt uuid; price int;
  res json; o1 uuid; o2 uuid; visit uuid; req uuid; err text;
begin
  select restaurant_id into rid from public.staff_members where user_id = owner_id;
  insert into auth.users (instance_id, id, aud, role, is_anonymous, email, created_at, updated_at) values
    ('00000000-0000-0000-0000-000000000000', g, 'authenticated', 'authenticated', true, null, now(), now()),
    ('00000000-0000-0000-0000-000000000000', cook, 'authenticated', 'authenticated', false, 'cook@roletest.test', now(), now()),
    ('00000000-0000-0000-0000-000000000000', waiter, 'authenticated', 'authenticated', false, 'waiter@roletest.test', now(), now());
  insert into public.staff_members (restaurant_id, user_id, role) values (rid, cook, 'kitchen'), (rid, waiter, 'waiter');
  insert into public.tables (restaurant_id, number, qr_slug) values (rid, 999, slug);
  update public.restaurants set ordering_paused = false where id = rid;
  select i.id, o.id, i.price_fils + o.price_fils into item, opt, price
  from public.menu_items i join public.item_options o on o.item_id = i.id
  where i.restaurant_id = rid and i.available limit 1;

  -- Guest places two orders
  perform set_config('request.jwt.claims', json_build_object('sub', g, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  res := public.join_table(slug, 'Role', null);
  visit := (res->>'visit_id')::uuid;
  o1 := (public.place_order(gen_random_uuid(), json_build_array(json_build_object('item_id', item, 'option_id', opt, 'quantity', 1, 'expected_price', price))::jsonb, null)->>'order_id')::uuid;
  o2 := (public.place_order(gen_random_uuid(), json_build_array(json_build_object('item_id', item, 'option_id', opt, 'quantity', 1, 'expected_price', price))::jsonb, null)->>'order_id')::uuid;
  perform public.call_waiter();
  select id into req from public.service_requests where visit_id = visit and resolved_at is null;

  -- Waiter: cannot start cooking, cancel, toggle sold-out or take payment
  perform set_config('request.jwt.claims', json_build_object('sub', waiter, 'role', 'authenticated')::text, true);
  assert (select count(*) from public.orders where id = o1) = 1, 'waiter reads the board';
  begin perform public.advance_order(o1, 'received'); assert false, 'waiter must not start';
  exception when others then get stacked diagnostics err = message_text; assert err = 'FORBIDDEN', 'waiter start got ' || err; end;
  begin perform public.cancel_order(o1, 'x'); assert false, 'waiter must not cancel';
  exception when others then get stacked diagnostics err = message_text; assert err = 'FORBIDDEN', 'waiter cancel got ' || err; end;
  begin perform public.set_item_available(item, false); assert false, 'waiter must not toggle sold-out';
  exception when others then get stacked diagnostics err = message_text; assert err = 'FORBIDDEN', 'waiter sold-out got ' || err; end;
  begin perform public.record_payment(visit, 'cash'); assert false, 'waiter must not take payment';
  exception when others then get stacked diagnostics err = message_text; assert err = 'FORBIDDEN', 'waiter pay got ' || err; end;
  perform public.resolve_request(req);
  assert (select resolved_at is not null from public.service_requests where id = req), 'waiter resolves calls';

  -- Kitchen: start, ready, sold-out; no cancel, calls, payments
  perform set_config('request.jwt.claims', json_build_object('sub', cook, 'role', 'authenticated')::text, true);
  perform public.advance_order(o1, 'received');
  perform public.advance_order(o1, 'preparing');
  -- Undo a mistaken bump: back one step, timestamp cleared; stale undo fails
  perform public.revert_order(o1, 'ready');
  assert (select status = 'preparing' and ready_at is null from public.orders where id = o1), 'kitchen undoes ready';
  begin perform public.revert_order(o1, 'ready'); assert false, 'stale undo must fail';
  exception when others then get stacked diagnostics err = message_text; assert err = 'STALE', 'stale undo got ' || err; end;
  execute 'reset role';
  update public.orders set preparing_at = now() - interval '5 minutes' where id = o1;
  execute 'set local role authenticated';
  begin perform public.revert_order(o1, 'preparing'); assert false, 'old undo must fail';
  exception when others then get stacked diagnostics err = message_text; assert err = 'UNDO_EXPIRED', 'old undo got ' || err; end;
  perform public.advance_order(o1, 'preparing');
  perform public.set_item_available(item, true);
  begin perform public.cancel_order(o2, 'x'); assert false, 'kitchen must not cancel';
  exception when others then get stacked diagnostics err = message_text; assert err = 'FORBIDDEN', 'kitchen cancel got ' || err; end;
  begin perform public.resolve_request(req); assert false, 'kitchen must not resolve calls';
  exception when others then get stacked diagnostics err = message_text; assert err = 'FORBIDDEN', 'kitchen resolve got ' || err; end;
  begin perform public.close_visit(visit); assert false, 'kitchen must not close tables';
  exception when others then get stacked diagnostics err = message_text; assert err = 'FORBIDDEN', 'kitchen close got ' || err; end;

  -- Waiter serves from the pass
  perform set_config('request.jwt.claims', json_build_object('sub', waiter, 'role', 'authenticated')::text, true);
  perform public.advance_order(o1, 'ready');
  assert (select status = 'served' from public.orders where id = o1), 'waiter serves';
  begin perform public.revert_order(o2, 'received'); assert false, 'received has no undo';
  exception when others then get stacked diagnostics err = message_text; assert err = 'FORBIDDEN' or err = 'INVALID_TRANSITION', 'received undo got ' || err; end;
  perform public.revert_order(o1, 'served');
  assert (select status = 'ready' and served_at is null from public.orders where id = o1), 'waiter undoes served';
  perform public.advance_order(o1, 'ready');

  -- Owner keeps every permission
  perform set_config('request.jwt.claims', json_build_object('sub', owner_id, 'role', 'authenticated')::text, true);
  perform public.cancel_order(o2, 'Test');
  perform public.record_payment(visit, 'card');
  perform public.close_visit(visit);
  begin perform public.revert_order(o1, 'served'); assert false, 'undo after payment must fail';
  exception when others then get stacked diagnostics err = message_text; assert err = 'SETTLED', 'paid undo got ' || err; end;

  -- Owner can change a role but not promote to owner
  update public.staff_members set role = 'waiter' where user_id = cook;
  assert (select role = 'waiter' from public.staff_members where user_id = cook), 'owner changes role';
  begin
    update public.staff_members set role = 'owner' where user_id = cook;
    assert false, 'promote to owner must fail';
  exception when others then get stacked diagnostics err = message_text; assert err like '%row-level security%', 'promote got ' || err; end;

  -- Staff cannot change roles
  perform set_config('request.jwt.claims', json_build_object('sub', waiter, 'role', 'authenticated')::text, true);
  update public.staff_members set role = 'staff' where user_id = waiter;
  assert (select count(*) from public.staff_members where user_id = waiter and role = 'staff') = 0, 'waiter cannot change own role';

  raise exception 'ALL_TESTS_PASSED';
end $$;
