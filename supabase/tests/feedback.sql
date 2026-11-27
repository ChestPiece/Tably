-- Return loop feedback (20261128000003_feedback.sql).
-- Always rolls back: success ends with error 'ALL_TESTS_PASSED'; any failure raises the failing assert.
do $$
declare
  rid uuid;
  g1 uuid := gen_random_uuid();
  g2 uuid := gen_random_uuid();
  stranger uuid := gen_random_uuid();
  boss uuid := gen_random_uuid();
  visit uuid; old_visit uuid; err text; s json; n int;
begin
  insert into public.restaurants (slug, name, name_ar, google_review_url) values ('fbtest01', 'FB test', 'FB', 'https://g.page/r/test') returning id into rid;
  insert into auth.users (instance_id, id, aud, role, is_anonymous, email, created_at, updated_at) values
    ('00000000-0000-0000-0000-000000000000', g1, 'authenticated', 'authenticated', true, null, now(), now()),
    ('00000000-0000-0000-0000-000000000000', g2, 'authenticated', 'authenticated', true, null, now(), now()),
    ('00000000-0000-0000-0000-000000000000', stranger, 'authenticated', 'authenticated', true, null, now(), now()),
    ('00000000-0000-0000-0000-000000000000', boss, 'authenticated', 'authenticated', false, 'boss@fbtest.test', now(), now());
  insert into public.staff_members (restaurant_id, user_id, role) values (rid, boss, 'owner');
  insert into public.tables (restaurant_id, number, qr_slug) values (rid, 1, 'fbtest01t');

  -- Two guests join one table
  execute 'set local role authenticated';
  perform set_config('request.jwt.claims', json_build_object('sub', g1, 'role', 'authenticated')::text, true);
  visit := (public.join_table('fbtest01t', 'Ada', null)->>'visit_id')::uuid;
  perform set_config('request.jwt.claims', json_build_object('sub', g2, 'role', 'authenticated')::text, true);
  perform public.join_table('fbtest01t', 'Bo', null);

  -- Open visit: not yet
  begin
    perform public.leave_feedback(visit, 5, null);
    assert false, 'open visit must fail';
  exception when others then get stacked diagnostics err = message_text; assert err = 'FORBIDDEN', 'open got ' || err; end;

  execute 'reset role';
  update public.visits set closed_at = now() where id = visit;
  execute 'set local role authenticated';

  -- guest_session tells the phone which visit to rate
  s := public.guest_session('fbtest01t');
  assert (s->>'last_visit')::uuid = visit and s->>'rating' is null, 'session before rating: ' || s;

  -- Guest 2 rates, then changes their mind; a long note is cut
  perform public.leave_feedback(visit, 2, '  Cold fries  ');
  perform public.leave_feedback(visit, 3, repeat('x', 2000));
  s := public.guest_session('fbtest01t');
  assert (s->>'rating')::int = 3, 'session after rating: ' || s;

  -- Guest 1 rates too: second row
  perform set_config('request.jwt.claims', json_build_object('sub', g1, 'role', 'authenticated')::text, true);
  perform public.leave_feedback(visit, 5, 'Lovely');
  -- A star tap after a rescan sends no note: the saved note stays
  perform public.leave_feedback(visit, 4, null);

  -- Bad rating
  begin
    perform public.leave_feedback(visit, 0, null);
    assert false, 'rating 0 must fail';
  exception when others then get stacked diagnostics err = message_text; assert err = 'INVALID_RATING', 'rating got ' || err; end;

  -- Guests cannot read feedback
  select count(*) into n from public.visit_feedback;
  assert n = 0, 'guest reads ' || n;

  -- A stranger cannot rate
  perform set_config('request.jwt.claims', json_build_object('sub', stranger, 'role', 'authenticated')::text, true);
  begin
    perform public.leave_feedback(visit, 1, null);
    assert false, 'stranger must fail';
  exception when others then get stacked diagnostics err = message_text; assert err = 'FORBIDDEN', 'stranger got ' || err; end;

  -- Owner reads both rows
  perform set_config('request.jwt.claims', json_build_object('sub', boss, 'role', 'authenticated')::text, true);
  select count(*) into n from public.visit_feedback where visit_id = visit;
  assert n = 2, 'owner reads ' || n;
  assert (select rating = 3 and length(note) = 500 from public.visit_feedback where visit_id = visit and user_id = g2), 'g2 row updated and cut';
  assert (select rating = 4 and note = 'Lovely' from public.visit_feedback where visit_id = visit and user_id = g1), 'null note keeps the saved note';

  -- Older than 24 h: too late
  execute 'reset role';
  update public.visits set closed_at = now() - interval '25 hours' where id = visit;
  execute 'set local role authenticated';
  perform set_config('request.jwt.claims', json_build_object('sub', g1, 'role', 'authenticated')::text, true);
  begin
    perform public.leave_feedback(visit, 4, null);
    assert false, 'old visit must fail';
  exception when others then get stacked diagnostics err = message_text; assert err = 'FORBIDDEN', 'old got ' || err; end;

  raise exception 'ALL_TESTS_PASSED';
end $$;
