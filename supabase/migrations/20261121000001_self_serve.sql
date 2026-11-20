-- Self-serve sign-up: any restaurant, any country.
-- Each restaurant has its own currency, time zone and optional second menu language (Arabic for now).
-- Money columns keep their *_fils names but now mean "minor units of the restaurant currency".

-- ---------------------------------------------------------------- restaurant settings

alter table public.restaurants
  add column timezone text not null default 'UTC',
  add column second_lang text check (second_lang in ('ar')),
  add constraint restaurants_currency_check check (currency ~ '^[A-Z]{3}$');

-- Everything created before today is in the UAE with an Arabic menu.
update public.restaurants set timezone = 'Asia/Dubai', second_lang = 'ar';

-- Checks cannot run subqueries, so the time zone is validated by a trigger.
create function private.check_timezone() returns trigger
language plpgsql set search_path = '' as $$
begin
  if not exists (select 1 from pg_catalog.pg_timezone_names where name = new.timezone) then
    raise exception using message = 'INVALID_TIMEZONE';
  end if;
  return new;
end $$;
revoke execute on function private.check_timezone() from public;

create trigger restaurants_timezone before insert or update of timezone on public.restaurants
  for each row execute function private.check_timezone();

-- ---------------------------------------------------------------- Arabic is optional

alter table public.restaurants drop constraint restaurants_name_ar_check,
  add constraint restaurants_name_ar_check check (length(name_ar) <= 60),
  alter column name_ar set default '';
alter table public.categories drop constraint categories_name_ar_check,
  add constraint categories_name_ar_check check (length(name_ar) <= 60),
  alter column name_ar set default '';
alter table public.menu_items drop constraint menu_items_name_ar_check,
  add constraint menu_items_name_ar_check check (length(name_ar) <= 80),
  alter column name_ar set default '';
alter table public.item_options drop constraint item_options_name_ar_check,
  add constraint item_options_name_ar_check check (length(name_ar) <= 100),
  alter column name_ar set default '';

-- ---------------------------------------------------------------- create_restaurant

-- A signed-in owner with a confirmed email creates their restaurant: owner membership,
-- one "Menu" category and tables 1..p_tables. QR slugs stay random and globally unique.
create function public.create_restaurant(p_name text, p_currency text, p_timezone text, p_second_lang text, p_tables integer)
returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := (select auth.uid());
  clean text := btrim(coalesce(p_name, ''));
  base text;
  rid uuid;
begin
  if uid is null or not exists (
    select 1 from auth.users where id = uid and not is_anonymous and email_confirmed_at is not null
  ) then
    raise exception using message = 'AUTH_REQUIRED';
  end if;
  -- ponytail: one owned restaurant per user in the beta; lift this with a restaurant switcher.
  if exists (select 1 from public.staff_members where user_id = uid and role = 'owner') then
    raise exception using message = 'ALREADY_OWNER';
  end if;
  if length(clean) not between 1 and 60
     or coalesce(p_currency, '') !~ '^[A-Z]{3}$'
     or not exists (select 1 from pg_catalog.pg_timezone_names where name = p_timezone)
     or (p_second_lang is not null and p_second_lang <> 'ar')
     or coalesce(p_tables, 0) not between 1 and 50 then
    raise exception using message = 'INVALID_INPUT';
  end if;

  base := left(btrim(regexp_replace(lower(clean), '[^a-z0-9]+', '-', 'g'), '-'), 30);
  if base = '' then base := 'r'; end if;

  insert into public.restaurants (slug, name, name_ar, currency, timezone, second_lang)
  values (base || '-' || left(private.new_slug(), 6), clean, '', p_currency, p_timezone, p_second_lang)
  returning id into rid;
  insert into public.staff_members (restaurant_id, user_id, role) values (rid, uid, 'owner');
  insert into public.categories (restaurant_id, name, name_ar) values (rid, 'Menu', case when p_second_lang = 'ar' then 'القائمة' else '' end);
  insert into public.tables (restaurant_id, number) select rid, n from generate_series(1, p_tables) n;
  return rid;
end $$;

revoke execute on function public.create_restaurant(text, text, text, text, integer) from public, anon;
grant execute on function public.create_restaurant(text, text, text, text, integer) to authenticated;

-- ---------------------------------------------------------------- test-phase home page

-- It exposed one restaurant's table to anyone. The landing page replaces it.
drop function public.home_table_slug();
