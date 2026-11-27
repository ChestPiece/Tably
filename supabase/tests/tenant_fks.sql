-- Options, add-ons and pairings must point at dishes of their own restaurant (20261128000004_tenant_fks.sql).
-- Always rolls back: success ends with error 'ALL_TESTS_PASSED'.
do $$
declare
  ra uuid; rb uuid; boss uuid := gen_random_uuid();
  cat_a uuid; cat_b uuid; dish_a uuid; dish_a2 uuid; dish_b uuid; err text;
begin
  insert into public.restaurants (slug, name, name_ar) values ('tfka01', 'A', 'A') returning id into ra;
  insert into public.restaurants (slug, name, name_ar) values ('tfkb01', 'B', 'B') returning id into rb;
  insert into auth.users (instance_id, id, aud, role, is_anonymous, email, created_at, updated_at) values
    ('00000000-0000-0000-0000-000000000000', boss, 'authenticated', 'authenticated', false, 'boss@tfk.test', now(), now());
  insert into public.staff_members (restaurant_id, user_id, role) values (ra, boss, 'owner');
  insert into public.categories (restaurant_id, name) values (ra, 'A') returning id into cat_a;
  insert into public.categories (restaurant_id, name) values (rb, 'B') returning id into cat_b;
  insert into public.menu_items (restaurant_id, category_id, name, price_fils) values (ra, cat_a, 'A1', 100) returning id into dish_a;
  insert into public.menu_items (restaurant_id, category_id, name, price_fils) values (ra, cat_a, 'A2', 100) returning id into dish_a2;
  insert into public.menu_items (restaurant_id, category_id, name, price_fils) values (rb, cat_b, 'B1', 100) returning id into dish_b;

  execute 'set local role authenticated';
  perform set_config('request.jwt.claims', json_build_object('sub', boss, 'role', 'authenticated')::text, true);

  -- Own dish: fine
  insert into public.item_addons (item_id, restaurant_id, name, price_fils) values (dish_a, ra, 'Cheese', 10);
  insert into public.item_pairings (item_id, pairs_with_id, restaurant_id) values (dish_a, dish_a2, ra);

  -- Owner A puts an add-on on B's dish under A's id
  begin
    insert into public.item_addons (item_id, restaurant_id, name, price_fils) values (dish_b, ra, 'Evil', 999);
    assert false, 'foreign add-on must fail';
  exception when foreign_key_violation then null; end;
  begin
    insert into public.item_options (item_id, restaurant_id, name, price_fils) values (dish_b, ra, 'Evil', 999);
    assert false, 'foreign option must fail';
  exception when foreign_key_violation then null; end;
  begin
    insert into public.item_pairings (item_id, pairs_with_id, restaurant_id) values (dish_b, dish_a, ra);
    assert false, 'foreign pairing item must fail';
  exception when foreign_key_violation then null; end;
  begin
    insert into public.item_pairings (item_id, pairs_with_id, restaurant_id) values (dish_a, dish_b, ra);
    assert false, 'foreign pairing target must fail';
  exception when foreign_key_violation then null; end;

  -- One FK per child to menu_items, or PostgREST embeds (menu_items -> item_options/item_addons) become ambiguous
  assert (select count(*) from pg_constraint where contype = 'f' and confrelid = 'public.menu_items'::regclass
          and conrelid in ('public.item_options'::regclass, 'public.item_addons'::regclass)) = 2, 'one FK each for options and add-ons';

  raise exception 'ALL_TESTS_PASSED';
end $$;
