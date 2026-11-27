-- Add-ons, place_order v3 and menu_stats (20261128000002_addons.sql).
-- Always rolls back: success ends with error 'ALL_TESTS_PASSED'; any failure raises the failing assert.
-- Uses its own throwaway restaurant and owner.
do $$
declare
  rid uuid;
  g uuid := gen_random_uuid();
  boss uuid := gen_random_uuid();
  cat uuid; dish uuid; other uuid; ad1 uuid; ad2 uuid; ad3 uuid; foreign_ad uuid;
  visit uuid; o uuid; err text; s json;
  line jsonb;
begin
  insert into public.restaurants (slug, name, name_ar) values ('addtest01', 'Add test', 'Add') returning id into rid;
  insert into auth.users (instance_id, id, aud, role, is_anonymous, email, created_at, updated_at) values
    ('00000000-0000-0000-0000-000000000000', g, 'authenticated', 'authenticated', true, null, now(), now()),
    ('00000000-0000-0000-0000-000000000000', boss, 'authenticated', 'authenticated', false, 'boss@addtest.test', now(), now());
  insert into public.staff_members (restaurant_id, user_id, role) values (rid, boss, 'owner');
  insert into public.categories (restaurant_id, name) values (rid, 'Mains') returning id into cat;
  insert into public.menu_items (restaurant_id, category_id, name, price_fils, addon_max) values (rid, cat, 'Burger', 1000, 2) returning id into dish;
  insert into public.menu_items (restaurant_id, category_id, name, price_fils) values (rid, cat, 'Fries', 500) returning id into other;
  insert into public.item_addons (item_id, restaurant_id, name, price_fils, position) values (dish, rid, 'Cheese', 300, 1) returning id into ad1;
  insert into public.item_addons (item_id, restaurant_id, name, price_fils, position) values (dish, rid, 'Bacon', 200, 2) returning id into ad2;
  insert into public.item_addons (item_id, restaurant_id, name, price_fils, position) values (dish, rid, 'Egg', 100, 3) returning id into ad3;
  insert into public.item_addons (item_id, restaurant_id, name, price_fils) values (other, rid, 'Dip', 100) returning id into foreign_ad;
  insert into public.tables (restaurant_id, number, qr_slug) values (rid, 1, 'addtest01t');

  perform set_config('request.jwt.claims', json_build_object('sub', g, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  visit := (public.join_table('addtest01t', 'Ada', null)->>'visit_id')::uuid;

  -- Two add-ons: 1000 + 300 + 200, snapshotted on the line, via stored
  o := (public.place_order(gen_random_uuid(), jsonb_build_array(jsonb_build_object(
    'item_id', dish, 'option_id', null, 'quantity', 1, 'expected_price', 1500, 'addon_ids', jsonb_build_array(ad1, ad2), 'via', 'pairing')), null, visit)->>'order_id')::uuid;
  execute 'reset role';
  select to_jsonb(l) into line from public.order_lines l where order_id = o;
  assert (line->>'unit_price_fils')::int = 1500, 'unit 1500: ' || line;
  assert line->'addons' = '[{"name":"Cheese","name_ar":"","price_fils":300},{"name":"Bacon","name_ar":"","price_fils":200}]'::jsonb, 'snapshot: ' || line;
  assert line->>'via' = 'pairing', 'via stored';
  assert (select total_fils from public.orders where id = o) = 1500, 'total 1500';
  execute 'set local role authenticated';

  -- Same add-on twice: forged
  begin
    perform public.place_order(gen_random_uuid(), jsonb_build_array(jsonb_build_object(
      'item_id', dish, 'option_id', null, 'quantity', 1, 'expected_price', 1600, 'addon_ids', jsonb_build_array(ad1, ad1))), null, visit);
    assert false, 'duplicate add-on must fail';
  exception when others then get stacked diagnostics err = message_text; assert err = 'INVALID_LINES', 'dup got ' || err; end;

  -- Over the max: stale cart, refresh
  begin
    perform public.place_order(gen_random_uuid(), jsonb_build_array(jsonb_build_object(
      'item_id', dish, 'option_id', null, 'quantity', 1, 'expected_price', 1600, 'addon_ids', jsonb_build_array(ad1, ad2, ad3))), null, visit);
    assert false, 'over max must fail';
  exception when others then get stacked diagnostics err = message_text; assert err = 'PRICE_CHANGED', 'max got ' || err; end;

  -- Another dish's add-on: forged
  begin
    perform public.place_order(gen_random_uuid(), jsonb_build_array(jsonb_build_object(
      'item_id', dish, 'option_id', null, 'quantity', 1, 'expected_price', 1100, 'addon_ids', jsonb_build_array(foreign_ad))), null, visit);
    assert false, 'foreign add-on must fail';
  exception when others then get stacked diagnostics err = message_text; assert err = 'INVALID_LINES', 'foreign got ' || err; end;

  -- Deleted add-on: stale cart
  begin
    perform public.place_order(gen_random_uuid(), jsonb_build_array(jsonb_build_object(
      'item_id', dish, 'option_id', null, 'quantity', 1, 'expected_price', 1300, 'addon_ids', jsonb_build_array(gen_random_uuid()))), null, visit);
    assert false, 'missing add-on must fail';
  exception when others then get stacked diagnostics err = message_text; assert err = 'PRICE_CHANGED', 'missing got ' || err; end;

  -- Bad add-on id text: coded error
  begin
    perform public.place_order(gen_random_uuid(), '[{"item_id":"00000000-0000-0000-0000-000000000000","option_id":null,"quantity":1,"expected_price":1000,"addon_ids":["nope"]}]'::jsonb, null, visit);
    assert false, 'bad add-on id must fail';
  exception when others then get stacked diagnostics err = message_text; assert err = 'INVALID_LINES', 'bad id got ' || err; end;

  -- Old clients (no addon_ids) still order; unknown via becomes null
  o := (public.place_order(gen_random_uuid(), jsonb_build_array(jsonb_build_object(
    'item_id', other, 'option_id', null, 'quantity', 2, 'expected_price', 500, 'via', 'x')), null, visit)->>'order_id')::uuid;
  execute 'reset role';
  assert (select via is null and addons = '[]'::jsonb from public.order_lines where order_id = o), 'old client line';

  -- menu_stats: owner only
  execute 'set local role authenticated';
  begin
    perform public.menu_stats(now() - interval '1 hour', now() + interval '1 hour');
    assert false, 'guest must not read stats';
  exception when others then get stacked diagnostics err = message_text; assert err = 'FORBIDDEN', 'stats got ' || err; end;
  perform set_config('request.jwt.claims', json_build_object('sub', boss, 'role', 'authenticated')::text, true);
  s := public.menu_stats(now() - interval '1 hour', now() + interval '1 hour');
  execute 'reset role';
  assert (s->>'orders')::int = 2 and (s->>'lines')::int = 2 and (s->>'suggested_lines')::int = 1, 'stats: ' || s;
  assert (s->>'avg_basket_fils')::int = 1250, 'avg (1500+1000)/2: ' || s;

  raise exception 'ALL_TESTS_PASSED';
end $$;
