-- Automatic costs, shifts and the owner's profit report (migration 20261119000002).
-- Always rolls back: success ends with error 'ALL_TESTS_PASSED'; any failure raises the failing assert.
-- The live DB has real orders today, so money checks compare the report before and after this test's own data.
do $$
declare
  rid uuid;
  owner_id uuid := (select user_id from public.staff_members where role = 'owner' limit 1);
  g uuid := gen_random_uuid();
  crew uuid := gen_random_uuid();
  slug text := 'costtest01';
  item uuid; opt uuid; price int;
  visit uuid; o1 uuid; o2 uuid; err text;
  t0 timestamptz := now() - interval '3 hours';
  t1 timestamptz := now() + interval '1 hour';
  before json; after json; half_before json; half_after json;
begin
  select restaurant_id into rid from public.staff_members where user_id = owner_id;
  insert into auth.users (instance_id, id, aud, role, is_anonymous, email, created_at, updated_at) values
    ('00000000-0000-0000-0000-000000000000', g, 'authenticated', 'authenticated', true, null, now(), now()),
    ('00000000-0000-0000-0000-000000000000', crew, 'authenticated', 'authenticated', false, 'crew@costtest.test', now(), now());
  insert into public.staff_members (restaurant_id, user_id, role) values (rid, crew, 'staff');
  insert into public.tables (restaurant_id, number, qr_slug) values (rid, 998, slug);
  update public.restaurants set ordering_paused = false where id = rid;
  select i.id, o.id, i.price_fils + o.price_fils into item, opt, price
  from public.menu_items i join public.item_options o on o.item_id = i.id
  where i.restaurant_id = rid and i.available limit 1;

  -- Owner baseline, then costs: dish 1000 fils + option 500 fils
  perform set_config('request.jwt.claims', json_build_object('sub', owner_id, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  before := public.profit_report(t0, t1);
  half_before := public.profit_report(now() - interval '1 hour', t1);
  delete from public.item_costs where item_id = item;
  insert into public.item_costs (restaurant_id, item_id, option_id, cost_fils) values (rid, item, null, 1000), (rid, item, opt, 500);
  insert into public.staff_pay (restaurant_id, user_id, hourly_rate_fils) values (rid, crew, 2500);

  -- Guest: 2x the dish with the option (cost 3000), then a cancelled order (no cost)
  perform set_config('request.jwt.claims', json_build_object('sub', g, 'role', 'authenticated')::text, true);
  visit := (public.join_table(slug, 'Cost', null)->>'visit_id')::uuid;
  o1 := (public.place_order(gen_random_uuid(), json_build_array(json_build_object('item_id', item, 'option_id', opt, 'quantity', 2, 'expected_price', price))::jsonb, null)->>'order_id')::uuid;
  o2 := (public.place_order(gen_random_uuid(), json_build_array(json_build_object('item_id', item, 'option_id', opt, 'quantity', 1, 'expected_price', price))::jsonb, null)->>'order_id')::uuid;
  assert (select count(*) from public.item_costs) = 0, 'guest must not read item costs';
  assert (select count(*) from public.line_costs) = 0, 'guest must not read line costs';
  begin perform public.profit_report(t0, t1); assert false, 'guest must not read the report';
  exception when others then get stacked diagnostics err = message_text; assert err = 'FORBIDDEN', 'guest report got ' || err; end;

  -- Staff: no costs, no rates, no report; clock in / out works
  perform set_config('request.jwt.claims', json_build_object('sub', crew, 'role', 'authenticated')::text, true);
  assert (select count(*) from public.line_costs) = 0, 'staff must not read line costs';
  assert (select count(*) from public.staff_pay) = 0, 'staff must not read pay';
  begin perform public.profit_report(t0, t1); assert false, 'staff must not read the report';
  exception when others then get stacked diagnostics err = message_text; assert err = 'FORBIDDEN', 'staff report got ' || err; end;
  perform public.cancel_order(o2, 'Test');
  perform public.record_payment(visit, 'cash');
  perform public.clock_in();
  perform public.clock_in();
  assert (select count(*) from public.shifts where user_id = crew and ended_at is null) = 1, 'one open shift';
  assert (select rate_fils from public.shifts where user_id = crew and ended_at is null) = 2500, 'rate snapshotted';
  perform public.clock_out();
  assert (select count(*) from public.shifts where user_id = crew and ended_at is null) = 0, 'clock out closes';

  -- Forgotten clock-out: a shift started 20 h ago closes at +14 h on the next clock-in
  execute 'reset role';
  delete from public.shifts where user_id = crew;
  insert into public.shifts (restaurant_id, user_id, started_at, rate_fils) values (rid, crew, now() - interval '20 hours', 0);
  execute 'set local role authenticated';
  perform public.clock_in();
  assert (select ended_at = started_at + interval '14 hours' from public.shifts where user_id = crew and rate_fils = 0), 'capped at 14 h';
  perform public.clock_out();

  -- A 2 h shift at 2500 fils/h ending now = 5000 fils wages
  execute 'reset role';
  delete from public.shifts where user_id = crew;
  insert into public.shifts (restaurant_id, user_id, started_at, ended_at, rate_fils) values (rid, crew, now() - interval '2 hours', now(), 2500);
  execute 'set local role authenticated';

  -- Owner: report deltas match this test's data exactly
  perform set_config('request.jwt.claims', json_build_object('sub', owner_id, 'role', 'authenticated')::text, true);
  assert (select cost_fils from public.line_costs lc join public.order_lines l on l.id = lc.line_id where l.order_id = o1) = 3000, 'line cost snapshot';
  after := public.profit_report(t0, t1);
  assert (after->>'sales_fils')::int - (before->>'sales_fils')::int = price * 2, 'sales delta ' || after::text;
  assert (after->>'food_cost_fils')::int - (before->>'food_cost_fils')::int = 3000, 'food cost delta (cancelled excluded) ' || after::text;
  assert (after->>'wages_fils')::int - (before->>'wages_fils')::int = 5000, 'wages delta ' || after::text;
  assert (after->>'profit_fils')::int = (after->>'sales_fils')::int - (after->>'food_cost_fils')::int - (after->>'wages_fils')::int, 'profit = sales - costs';
  half_after := public.profit_report(now() - interval '1 hour', t1);
  assert (half_after->>'wages_fils')::int - (half_before->>'wages_fils')::int = 2500, 'only the hour inside the range counts';

  -- Cost changes later do not rewrite the past; a dish without cost is counted as missing
  update public.item_costs set cost_fils = 9999 where item_id = item and option_id is null;
  assert (public.profit_report(t0, t1)->>'food_cost_fils')::int = (after->>'food_cost_fils')::int, 'snapshot survives cost change';
  delete from public.item_costs where item_id = item;
  execute 'reset role';
  update public.visits set paid_at = null, settled_total_fils = null, payment_method = null where id = visit; -- reopen the bill
  execute 'set local role authenticated';
  perform set_config('request.jwt.claims', json_build_object('sub', g, 'role', 'authenticated')::text, true);
  perform public.place_order(gen_random_uuid(), json_build_array(json_build_object('item_id', item, 'option_id', opt, 'quantity', 1, 'expected_price', price))::jsonb, null);
  perform set_config('request.jwt.claims', json_build_object('sub', owner_id, 'role', 'authenticated')::text, true);
  assert (public.profit_report(t0, t1)->>'missing_cost_lines')::int = (before->>'missing_cost_lines')::int + 1, 'missing cost counted';

  raise exception 'ALL_TESTS_PASSED';
end $$;
