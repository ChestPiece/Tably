-- Waiter / bill requests: on my way, the 15 s nudge, the guest's payment method, settle.
-- Run after 20261122000001_flow_upgrade.sql. Always rolls back: success ends with error 'ALL_TESTS_PASSED'.
do $$
declare
  rid uuid;
  owner_id uuid := (select user_id from public.staff_members where role = 'owner' limit 1);
  g uuid := gen_random_uuid();
  g2 uuid := gen_random_uuid();
  crew uuid := gen_random_uuid();
  slug text := 'reqtest01';
  slug2 text := 'reqtest02';
  visit uuid; req uuid; bill uuid; err text; s json;
begin
  select restaurant_id into rid from public.staff_members where user_id = owner_id;
  insert into auth.users (instance_id, id, aud, role, is_anonymous, email, created_at, updated_at) values
    ('00000000-0000-0000-0000-000000000000', g, 'authenticated', 'authenticated', true, null, now(), now()),
    ('00000000-0000-0000-0000-000000000000', g2, 'authenticated', 'authenticated', true, null, now(), now()),
    ('00000000-0000-0000-0000-000000000000', crew, 'authenticated', 'authenticated', false, 'crew@reqtest.test', now(), now());
  insert into public.staff_members (restaurant_id, user_id, role, display_name) values (rid, crew, 'staff', 'Sara');
  insert into public.tables (restaurant_id, number, qr_slug) values (rid, 998, slug), (rid, 997, slug2);

  -- Guest calls a waiter; asks for the bill by card
  perform set_config('request.jwt.claims', json_build_object('sub', g, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  visit := (public.join_table(slug, 'Ali', null)->>'visit_id')::uuid;
  perform public.call_waiter();
  perform public.request_bill('card');
  select id into req from public.service_requests where visit_id = visit and kind = 'waiter';
  select id into bill from public.service_requests where visit_id = visit and kind = 'bill';
  assert (select pay_method = 'card' from public.service_requests where id = bill), 'method stored';
  perform public.request_bill('cash');
  assert (select pay_method = 'cash' from public.service_requests where id = bill), 'method changed on the open request';
  perform public.request_bill();
  assert (select pay_method = 'cash' from public.service_requests where id = bill), 'no method keeps the last';
  begin perform public.request_bill('crypto'); assert false, 'bad method must fail';
  exception when others then get stacked diagnostics err = message_text; assert err = 'INVALID_METHOD', 'got ' || err; end;

  -- Too soon to nudge
  assert not public.nudge_request(req), 'no nudge before 15 s';
  execute 'reset role';
  update public.service_requests set created_at = now() - interval '20 seconds' where id = req;
  execute 'set local role authenticated';

  -- Another table's guest can't nudge it
  perform set_config('request.jwt.claims', json_build_object('sub', g2, 'role', 'authenticated')::text, true);
  perform public.join_table(slug2, 'Other', null);
  assert not public.nudge_request(req), 'stranger cannot nudge';
  assert not exists (select 1 from public.service_requests where id = req), 'stranger cannot read it';

  -- Own guest nudges once
  perform set_config('request.jwt.claims', json_build_object('sub', g, 'role', 'authenticated')::text, true);
  assert public.nudge_request(req), 'nudge after 15 s';
  assert not public.nudge_request(req), 'only one nudge';

  -- Guests can't acknowledge
  begin perform public.acknowledge_request(req); assert false, 'guest must not ack';
  exception when others then null; end;

  -- Staff: on my way, the guest sees the name
  perform set_config('request.jwt.claims', json_build_object('sub', crew, 'role', 'authenticated')::text, true);
  perform public.acknowledge_request(req);
  perform set_config('request.jwt.claims', json_build_object('sub', g, 'role', 'authenticated')::text, true);
  assert (select ack_name = 'Sara' and acknowledged_at is not null from public.service_requests where id = req), 'guest sees Sara';

  -- Staff settle the bill: paid and the table closes
  perform set_config('request.jwt.claims', json_build_object('sub', crew, 'role', 'authenticated')::text, true);
  perform public.resolve_request(req);
  perform public.settle_bill(visit, 'card');
  execute 'reset role';
  assert (select paid_at is not null and closed_at is not null and payment_method = 'card' from public.visits where id = visit), 'settled and closed';
  assert (select resolved_at is not null from public.service_requests where id = bill), 'bill resolved';

  -- The guest's phone learns it was paid
  perform set_config('request.jwt.claims', json_build_object('sub', g, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  s := public.guest_session(slug);
  assert (s->>'ended')::boolean and s->>'paid_method' = 'card', 'guest_session shows paid by card';

  raise exception 'ALL_TESTS_PASSED';
end $$;
