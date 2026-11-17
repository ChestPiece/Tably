-- End-to-end check of the order flow functions + RLS.
-- Run against a seeded DB (supabase/seed.sql). Always rolls back:
-- success ends with error 'ALL_TESTS_PASSED'; any failure raises the failing assert.
do $$
declare
  g1 uuid := gen_random_uuid();
  g2 uuid := gen_random_uuid();
  owner_id uuid := (select user_id from public.staff_members where role = 'owner' limit 1);
  slug6 text; slug7 text;
  sig uuid; sig_classic uuid; hot uuid; hot_orig uuid; cola uuid; cola_reg uuid;
  res json; order1 uuid; visit6 uuid; n int; err text;
begin
  insert into auth.users (instance_id, id, aud, role, is_anonymous, created_at, updated_at)
  values ('00000000-0000-0000-0000-000000000000', g1, 'authenticated', 'authenticated', true, now(), now()),
         ('00000000-0000-0000-0000-000000000000', g2, 'authenticated', 'authenticated', true, now(), now());
  -- The live venue only has table 1; add 6 and 7 for this run (rolled back).
  insert into public.tables (restaurant_id, number)
  select r.id, v.num from public.restaurants r, (values (6), (7)) v(num)
  where not exists (select 1 from public.tables t where t.restaurant_id = r.id and t.number = v.num);
  select qr_slug into slug6 from public.tables where number = 6;
  select qr_slug into slug7 from public.tables where number = 7;
  select id into sig from public.menu_items where name = 'The Signature Burger';
  select id into sig_classic from public.item_options where item_id = sig and name = 'Classic';
  select id into hot from public.menu_items where name = 'Hotshots';
  select id into hot_orig from public.item_options where item_id = hot and name = 'Original';
  select id into cola from public.menu_items where name = 'Ice-cold Cola';
  select id into cola_reg from public.item_options where item_id = cola and name = 'Regular';

  -- Guest 1 joins table 6 as Sara and orders 2 Signature + Hotshots + Cola = AED 81
  perform set_config('request.jwt.claims', json_build_object('sub', g1, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  res := public.join_table(slug6, 'Sara', null);
  visit6 := (res->>'visit_id')::uuid;
  assert (res->>'seq')::int = 1, 'first guest gets seq 1';
  res := public.place_order('11111111-1111-4111-8111-111111111111', json_build_array(
    json_build_object('item_id', sig, 'option_id', sig_classic, 'quantity', 2, 'expected_price', 2800),
    json_build_object('item_id', hot, 'option_id', hot_orig, 'quantity', 1, 'expected_price', 1800),
    json_build_object('item_id', cola, 'option_id', cola_reg, 'quantity', 1, 'expected_price', 700))::jsonb, 'No onions');
  order1 := (res->>'order_id')::uuid;
  assert (select total_fils from public.orders where id = order1) = 8100, 'total is AED 81.00';
  assert (select is_first_of_visit and guest_name = 'Sara' and status = 'received' from public.orders where id = order1), 'first order flagged, named, received';

  -- Idempotent retry returns the same order
  res := public.place_order('11111111-1111-4111-8111-111111111111', '[]'::jsonb, null);
  assert (res->>'order_id')::uuid = order1, 'retry returns same order';

  -- Wrong price rejected
  begin
    perform public.place_order(gen_random_uuid(), json_build_array(json_build_object('item_id', sig, 'option_id', sig_classic, 'quantity', 1, 'expected_price', 100))::jsonb, null);
    assert false, 'price change should fail';
  exception when others then get stacked diagnostics err = message_text; assert err = 'PRICE_CHANGED', 'got ' || err; end;

  -- Guest cannot advance orders or see tables
  begin
    perform public.advance_order(order1, 'received');
    assert false, 'guest must not advance';
  exception when others then get stacked diagnostics err = message_text; assert err = 'FORBIDDEN', 'got ' || err; end;
  assert (select count(*) from public.tables) = 0, 'guest cannot read tables (PINs/slugs)';
  perform public.call_waiter();
  perform public.call_waiter();

  -- Guest 2 joins same table without a name, sees shared visit
  perform set_config('request.jwt.claims', json_build_object('sub', g2, 'role', 'authenticated')::text, true);
  res := public.join_table(slug6, '', null);
  assert (res->>'visit_id')::uuid = visit6 and (res->>'seq')::int = 2, 'second phone joins same visit as guest 2';
  assert (select count(*) from public.orders) = 1, 'guest 2 sees table orders';
  -- Guest 2 joining table 7 later must not see table 6 orders there; check isolation via a fresh user later

  -- Staff flow
  perform set_config('request.jwt.claims', json_build_object('sub', owner_id, 'role', 'authenticated')::text, true);
  assert (select count(*) from public.service_requests where visit_id = visit6 and resolved_at is null) = 1, 'duplicate waiter calls collapse to one';
  begin
    perform public.close_visit(visit6);
    assert false, 'close with open tickets should fail';
  exception when others then get stacked diagnostics err = message_text; assert err = 'OPEN_TICKETS', 'got ' || err; end;
  perform public.advance_order(order1, 'received');
  begin
    perform public.advance_order(order1, 'received');
    assert false, 'stale advance should fail';
  exception when others then get stacked diagnostics err = message_text; assert err = 'STALE', 'got ' || err; end;
  perform public.advance_order(order1, 'preparing');
  perform public.advance_order(order1, 'ready');
  begin
    perform public.close_visit(visit6);
    assert false, 'close unpaid should fail';
  exception when others then get stacked diagnostics err = message_text; assert err = 'UNPAID', 'got ' || err; end;
  perform public.record_payment(visit6, 'card');
  assert (select settled_total_fils from public.visits where id = visit6) = 8100, 'settled AED 81';
  perform public.close_visit(visit6);
  assert (select count(*) from public.service_requests where visit_id = visit6 and resolved_at is null) = 0, 'requests resolved on close';

  -- Closed visit: guest loses access and cannot order
  perform set_config('request.jwt.claims', json_build_object('sub', g1, 'role', 'authenticated')::text, true);
  assert (select count(*) from public.orders) = 0, 'guest cannot read closed visit orders';
  assert (public.guest_session(slug6)->>'ended')::boolean, 'session reports visit ended';
  begin
    perform public.place_order(gen_random_uuid(), '[]'::jsonb, null);
    assert false, 'closed visit order should fail';
  exception when others then get stacked diagnostics err = message_text; assert err = 'VISIT_CLOSED', 'got ' || err; end;

  -- Rejoin starts a fresh empty visit
  res := public.join_table(slug6, 'Sara', null);
  assert (res->>'visit_id')::uuid <> visit6, 'rejoin opens a new visit';
  assert (select count(*) from public.orders) = 0, 'new visit starts empty';

  -- Anonymous key (no user) can read menu but not orders
  execute 'set local role anon';
  perform set_config('request.jwt.claims', '{"role":"anon"}', true);
  assert (select count(*) from public.menu_items) = 6, 'anon reads menu';
  assert (select count(*) from public.orders) = 0, 'anon reads no orders';
  assert (public.table_info(slug7)->>'table_number')::int = 7, 'table_info resolves slug';

  raise exception 'ALL_TESTS_PASSED';
end $$;
