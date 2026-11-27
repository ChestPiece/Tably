-- Menu signals (20261128000001_menu_signals.sql): tags, pairings, popular / quick / pairs from real orders.
-- Always rolls back: success ends with error 'ALL_TESTS_PASSED'; any failure raises the failing assert.
-- Uses its own throwaway restaurant, so live orders never change the counts.
do $$
declare
  rid uuid;
  g uuid := gen_random_uuid();
  cat uuid; a uuid; b uuid; c uuid; d uuid; tbl uuid; visit uuid; guest uuid; o uuid;
  s json; i int;
begin
  insert into public.restaurants (slug, name, name_ar) values ('sigtest01', 'Sig test', 'Sig') returning id into rid;
  insert into public.categories (restaurant_id, name) values (rid, 'Mains') returning id into cat;
  insert into public.menu_items (restaurant_id, category_id, name, price_fils, position) values (rid, cat, 'A', 1000, 1) returning id into a;
  insert into public.menu_items (restaurant_id, category_id, name, price_fils, position) values (rid, cat, 'B', 1000, 2) returning id into b;
  insert into public.menu_items (restaurant_id, category_id, name, price_fils, position) values (rid, cat, 'C', 1000, 3) returning id into c;
  insert into public.menu_items (restaurant_id, category_id, name, price_fils, position) values (rid, cat, 'D', 1000, 4) returning id into d;
  insert into public.tables (restaurant_id, number) values (rid, 1) returning id into tbl;
  insert into auth.users (instance_id, id, aud, role, is_anonymous, created_at, updated_at)
  values ('00000000-0000-0000-0000-000000000000', g, 'authenticated', 'authenticated', true, now(), now());
  insert into public.visits (restaurant_id, table_id, table_number) values (rid, tbl, 1) returning id into visit;
  insert into public.visit_guests (visit_id, restaurant_id, user_id, seq) values (visit, rid, g, 1) returning id into guest;

  -- No orders yet: empty signals
  s := public.menu_signals(rid);
  assert s->>'popular' = '[]' and s->>'quick' = '[]' and s->>'pairs' = '{}', 'empty venue: ' || s;

  -- 3 orders with A+B, 1 with C
  for i in 1..3 loop
    insert into public.orders (restaurant_id, visit_id, guest_id, request_id, number, table_number, guest_seq)
    values (rid, visit, guest, gen_random_uuid(), i, 1, 1) returning id into o;
    insert into public.order_lines (order_id, visit_id, restaurant_id, item_id, name, name_ar, unit_price_fils, quantity)
    values (o, visit, rid, a, 'A', 'A', 1000, 1), (o, visit, rid, b, 'B', 'B', 1000, 1);
  end loop;
  insert into public.orders (restaurant_id, visit_id, guest_id, request_id, number, table_number, guest_seq)
  values (rid, visit, guest, gen_random_uuid(), 4, 1, 1) returning id into o;
  insert into public.order_lines (order_id, visit_id, restaurant_id, item_id, name, name_ar, unit_price_fils, quantity)
  values (o, visit, rid, c, 'C', 'C', 1000, 1);
  -- A cancelled order of 5 D never counts
  insert into public.orders (restaurant_id, visit_id, guest_id, request_id, number, table_number, guest_seq, status)
  values (rid, visit, guest, gen_random_uuid(), 5, 1, 1, 'cancelled') returning id into o;
  insert into public.order_lines (order_id, visit_id, restaurant_id, item_id, name, name_ar, unit_price_fils, quantity)
  values (o, visit, rid, d, 'D', 'D', 1000, 5);

  -- Guests (anon) can call it
  execute 'set local role anon';
  s := public.menu_signals(rid);
  execute 'reset role';
  assert (s->'popular')::jsonb ? a::text and (s->'popular')::jsonb ? b::text, 'A and B popular: ' || s;
  assert not (s->'popular')::jsonb ? c::text, 'C below 3 sold: ' || s;
  assert not (s->'popular')::jsonb ? d::text, 'cancelled D not popular: ' || s;
  assert (s->'pairs'->(a::text))::jsonb ? b::text, 'A pairs with B: ' || s;
  assert jsonb_array_length((s->'quick')::jsonb) = 2, 'quick has A, B: ' || s;

  -- Sold-out drops from quick, stays popular
  update public.menu_items set available = false where id = a;
  s := public.menu_signals(rid);
  assert not (s->'quick')::jsonb ? a::text and (s->'popular')::jsonb ? a::text, 'sold-out A: ' || s;

  -- Tags: presets only, at most 3
  update public.menu_items set tags = '{spicy}' where id = a;
  begin
    update public.menu_items set tags = '{hot}' where id = a;
    assert false, 'unknown tag must fail';
  exception when check_violation then null; end;
  begin
    update public.menu_items set tags = '{chef,new,spicy,veg}' where id = a;
    assert false, 'four tags must fail';
  exception when check_violation then null; end;

  -- Pairings: never with itself
  insert into public.item_pairings (item_id, pairs_with_id, restaurant_id) values (a, b, rid);
  begin
    insert into public.item_pairings (item_id, pairs_with_id, restaurant_id) values (a, a, rid);
    assert false, 'self pairing must fail';
  exception when check_violation then null; end;

  -- Guests read pairings but cannot write them
  perform set_config('request.jwt.claims', json_build_object('sub', g, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  assert (select count(*) from public.item_pairings where item_id = a) = 1, 'guest reads pairing';
  begin
    insert into public.item_pairings (item_id, pairs_with_id, restaurant_id) values (b, c, rid);
    assert false, 'guest insert must fail';
  exception when insufficient_privilege then null; end;
  execute 'reset role';

  raise exception 'ALL_TESTS_PASSED';
end $$;
