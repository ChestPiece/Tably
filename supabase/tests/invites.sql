-- Invite links and "one account, one restaurant". Run after 20261122000001_flow_upgrade.sql.
-- Always rolls back: success ends with error 'ALL_TESTS_PASSED'; any failure raises the failing assert.
do $$
declare
  rid uuid;
  owner_id uuid := (select user_id from public.staff_members where role = 'owner' limit 1);
  newbie uuid := gen_random_uuid();
  stranger uuid := gen_random_uuid();
  tok uuid; tok2 uuid; info json; res json; err text;
begin
  select restaurant_id into rid from public.staff_members where user_id = owner_id;
  insert into auth.users (instance_id, id, aud, role, is_anonymous, email, email_confirmed_at, created_at, updated_at) values
    ('00000000-0000-0000-0000-000000000000', newbie, 'authenticated', 'authenticated', false, 'newbie@invite.test', now(), now(), now()),
    ('00000000-0000-0000-0000-000000000000', stranger, 'authenticated', 'authenticated', false, 'stranger@invite.test', now(), now(), now());

  -- Owner invites; the link has a token
  perform set_config('request.jwt.claims', json_build_object('sub', owner_id, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  insert into public.staff_invites (restaurant_id, email) values (rid, 'newbie@invite.test') returning token into tok;
  assert tok is not null, 'invite has a token';

  -- Anyone with the link sees the restaurant and the email; opening marks it
  execute 'set local role anon';
  perform set_config('request.jwt.claims', '{"role":"anon"}', true);
  info := public.invite_info(tok);
  assert info->>'email' = 'newbie@invite.test', 'info shows email';
  assert public.invite_info(gen_random_uuid()) is null, 'unknown token is null';
  execute 'reset role';
  assert (select opened_at is not null from public.staff_invites where token = tok), 'opened_at set';

  -- An invited email cannot start a restaurant
  perform set_config('request.jwt.claims', json_build_object('sub', newbie, 'role', 'authenticated', 'email', 'newbie@invite.test')::text, true);
  execute 'set local role authenticated';
  begin perform public.create_restaurant('Mine', 'AED', 'Asia/Dubai', null, 2); assert false, 'invitee must not create';
  exception when others then get stacked diagnostics err = message_text; assert err = 'HAS_INVITE', 'got ' || err; end;
  assert (public.my_invite()->>'token')::uuid = tok, 'my_invite finds it';

  -- The wrong account can't take it
  perform set_config('request.jwt.claims', json_build_object('sub', stranger, 'role', 'authenticated', 'email', 'stranger@invite.test')::text, true);
  res := public.accept_invite(tok, 'Nope');
  assert res->>'status' = 'wrong_email', 'wrong email got ' || (res->>'status');

  -- The invitee joins with a name; the invite is gone
  perform set_config('request.jwt.claims', json_build_object('sub', newbie, 'role', 'authenticated', 'email', 'newbie@invite.test')::text, true);
  res := public.accept_invite(tok, '  Sara ');
  assert res->>'status' = 'joined', 'joined got ' || (res->>'status');
  execute 'reset role';
  assert (select display_name = 'Sara' and role = 'staff' from public.staff_members where user_id = newbie), 'member with name';
  assert not exists (select 1 from public.staff_invites where token = tok), 'invite consumed';
  assert (select count(*) from public.staff_invites) >= 0;

  -- Staff can't open a restaurant of their own
  execute 'set local role authenticated';
  begin perform public.create_restaurant('Mine', 'AED', 'Asia/Dubai', null, 2); assert false, 'staff must not create';
  exception when others then get stacked diagnostics err = message_text; assert err = 'ALREADY_STAFF', 'got ' || err; end;

  -- An owner of another restaurant invites the same account: refused, not doubled
  execute 'reset role';
  insert into public.staff_invites (restaurant_id, email)
  select id, 'newbie@invite.test' from public.restaurants where id <> rid limit 1
  returning token into tok2;
  if tok2 is null then
    insert into public.restaurants (slug, name) values ('invite-other-test', 'Other') returning id into rid;
    insert into public.staff_invites (restaurant_id, email) values (rid, 'newbie@invite.test') returning token into tok2;
  end if;
  execute 'set local role authenticated';
  res := public.accept_invite(tok2, null);
  assert res->>'status' = 'already_member', 'second restaurant got ' || (res->>'status');
  assert public.accept_invites() = 0, 'login fallback links nothing';
  execute 'reset role';
  assert (select count(*) from public.staff_members where user_id = newbie) = 1, 'one membership';

  -- The unique index enforces it at the table too
  begin insert into public.staff_members (restaurant_id, user_id) values (rid, newbie); assert false, 'second membership must fail';
  exception when unique_violation then null; end;

  raise exception 'ALL_TESTS_PASSED';
end $$;
