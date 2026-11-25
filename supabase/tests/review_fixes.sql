-- Review fixes (20261125000001_review_fixes.sql): PIN lockout, order counter off restaurants,
-- place_order on a closed visit, bad ids, requests aimed at a visit.
-- Always rolls back: success ends with error 'ALL_TESTS_PASSED'; any failure raises the failing assert.
do $$
declare
  rid uuid;
  owner_id uuid := (select user_id from public.staff_members where role = 'owner' limit 1);
  g uuid := gen_random_uuid();
  cat uuid; dish uuid; t1 uuid;
  slug text := 'revtest01'; slug2 text := 'revtest02';
  res json; visit uuid; visit2 uuid; n1 int; n2 int; err text; i int;
begin
  select restaurant_id into rid from public.staff_members where user_id = owner_id;
  insert into auth.users (instance_id, id, aud, role, is_anonymous, created_at, updated_at)
  values ('00000000-0000-0000-0000-000000000000', g, 'authenticated', 'authenticated', true, now(), now());
  insert into public.categories (restaurant_id, name) values (rid, 'Rev test') returning id into cat;
  insert into public.menu_items (restaurant_id, category_id, name, price_fils) values (rid, cat, 'Rev dish', 1000) returning id into dish;
  insert into public.tables (restaurant_id, number, qr_slug, pin) values (rid, 996, slug, '4321') returning id into t1;
  insert into public.tables (restaurant_id, number, qr_slug) values (rid, 995, slug2);
  update public.restaurants set pin_required = true, ordering_paused = false where id = rid;

  perform set_config('request.jwt.claims', json_build_object('sub', g, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';

  -- Wrong PIN returns an error (not a raise), and the 5th miss locks the table
  for i in 1..4 loop
    res := public.join_table(slug, 'Ali', '0000');
    assert res->>'error' = 'BAD_PIN', 'miss ' || i || ' got ' || coalesce(res->>'error', 'joined');
  end loop;
  res := public.join_table(slug, 'Ali', '0000');
  assert res->>'error' = 'PIN_LOCKED', '5th miss locks, got ' || coalesce(res->>'error', 'joined');
  res := public.join_table(slug, 'Ali', '4321');
  assert res->>'error' = 'PIN_LOCKED', 'right PIN still locked';
  execute 'reset role';
  update public.tables set pin_locked_until = null where id = t1;
  execute 'set local role authenticated';
  res := public.join_table(slug, 'Ali', '4321');
  visit := (res->>'visit_id')::uuid;
  assert visit is not null, 'right PIN joins after lock';
  execute 'reset role';
  assert (select pin_fails = 0 from public.tables where id = t1), 'success clears misses';

  -- Order numbers come from private.order_counters and keep counting
  execute 'set local role authenticated';
  res := public.place_order(gen_random_uuid(), json_build_array(json_build_object('item_id', dish, 'option_id', null, 'quantity', 1, 'expected_price', 1000))::jsonb, null);
  n1 := (res->>'number')::int;
  res := public.place_order(gen_random_uuid(), json_build_array(json_build_object('item_id', dish, 'option_id', null, 'quantity', 2, 'expected_price', 1000))::jsonb, null, visit);
  n2 := (res->>'number')::int;
  assert n2 = n1 + 1, 'counter increments: ' || n1 || ' then ' || n2;

  -- A bad id is a coded error, not a cast error
  begin
    perform public.place_order(gen_random_uuid(), '[{"item_id":"nope","option_id":null,"quantity":1,"expected_price":1000}]'::jsonb, null);
    assert false, 'bad id must fail';
  exception when others then get stacked diagnostics err = message_text; assert err = 'INVALID_LINES', 'got ' || err; end;

  -- Second table: requests aimed at a visit land on that visit, not the latest join
  visit2 := (public.join_table(slug2, 'Ali', null)->>'visit_id')::uuid;
  perform public.call_waiter(visit);
  perform public.request_bill('cash', visit);
  execute 'reset role';
  assert (select count(*) from public.service_requests where visit_id = visit) = 2, 'both requests on visit 1';
  assert not exists (select 1 from public.service_requests where visit_id = visit2), 'none on visit 2';

  -- Ordering into a closed visit is refused
  update public.visits set closed_at = now() where id = visit;
  execute 'set local role authenticated';
  begin
    perform public.place_order(gen_random_uuid(), json_build_array(json_build_object('item_id', dish, 'option_id', null, 'quantity', 1, 'expected_price', 1000))::jsonb, null, visit);
    assert false, 'closed visit must refuse';
  exception when others then get stacked diagnostics err = message_text; assert err = 'VISIT_CLOSED', 'got ' || err; end;

  -- Guests cannot reach the counter table
  begin
    perform 1 from private.order_counters;
    assert false, 'guest must not read counters';
  exception when insufficient_privilege then null; end;

  raise exception 'ALL_TESTS_PASSED';
end $$;
