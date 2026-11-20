-- Automatic costs for the owner's profit report. Nothing here is entered per day:
--   food cost: the owner sets a cost once per dish / option; every order line snapshots it (line_costs)
--   wages:     the staff "Shift mode" switch clocks in / out (shifts) at the member's hourly rate (staff_pay)
-- Costs, rates and the report are owner-only. Guests read menu_items and their own order_lines, so costs live apart.

-- ---------------------------------------------------------------- food cost

create table public.item_costs (
  restaurant_id uuid not null references public.restaurants on delete cascade,
  item_id uuid not null references public.menu_items on delete cascade,
  option_id uuid references public.item_options on delete cascade, -- null = the dish itself; set = extra cost of that option
  cost_fils integer not null check (cost_fils between 0 and 1000000),
  constraint item_costs_one unique nulls not distinct (item_id, option_id)
);
create index item_costs_restaurant_idx on public.item_costs (restaurant_id);
create index item_costs_option_idx on public.item_costs (option_id);
alter table public.item_costs enable row level security;
create policy "owner manages" on public.item_costs for all to authenticated
  using (private.is_owner(restaurant_id)) with check (private.is_owner(restaurant_id));

create table public.line_costs (
  line_id uuid primary key references public.order_lines on delete cascade,
  restaurant_id uuid not null references public.restaurants on delete cascade,
  cost_fils integer not null, -- (dish cost + option cost) x quantity at order time
  has_cost boolean not null    -- false when the dish had no cost set: the report counts these
);
create index line_costs_restaurant_idx on public.line_costs (restaurant_id);
alter table public.line_costs enable row level security;
create policy "owner reads" on public.line_costs for select to authenticated using (private.is_owner(restaurant_id));

-- Snapshot on insert, so later cost changes never rewrite past orders. A trigger keeps place_order untouched.
create function private.snapshot_line_cost() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  base integer;
  extra integer;
begin
  select cost_fils into base from public.item_costs where item_id = new.item_id and option_id is null;
  if new.option_id is not null then
    select cost_fils into extra from public.item_costs where item_id = new.item_id and option_id = new.option_id;
  end if;
  insert into public.line_costs (line_id, restaurant_id, cost_fils, has_cost)
  values (new.id, new.restaurant_id, (coalesce(base, 0) + coalesce(extra, 0)) * new.quantity, base is not null);
  return null;
end $$;
create trigger order_lines_snapshot_cost after insert on public.order_lines
  for each row execute function private.snapshot_line_cost();

-- ---------------------------------------------------------------- wages

create table public.staff_pay (
  restaurant_id uuid not null references public.restaurants on delete cascade,
  user_id uuid not null references auth.users on delete cascade,
  hourly_rate_fils integer not null default 0 check (hourly_rate_fils between 0 and 10000000),
  primary key (restaurant_id, user_id)
);
create index staff_pay_user_idx on public.staff_pay (user_id);
alter table public.staff_pay enable row level security;
create policy "owner manages" on public.staff_pay for all to authenticated
  using (private.is_owner(restaurant_id)) with check (private.is_owner(restaurant_id));

create table public.shifts (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants on delete cascade,
  user_id uuid not null references auth.users on delete cascade,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  rate_fils integer not null default 0, -- hourly rate at clock-in
  check (ended_at is null or ended_at >= started_at)
);
create unique index shifts_one_open on public.shifts (restaurant_id, user_id) where ended_at is null;
create index shifts_range_idx on public.shifts (restaurant_id, started_at);
create index shifts_user_idx on public.shifts (user_id);
alter table public.shifts enable row level security;
create policy "owner or self reads" on public.shifts for select to authenticated
  using (user_id = (select auth.uid()) or private.is_owner(restaurant_id));
create policy "owner fixes hours" on public.shifts for update to authenticated
  using (private.is_owner(restaurant_id)) with check (private.is_owner(restaurant_id));

-- A forgotten clock-out counts at most 14 hours.
create function private.shift_end(s public.shifts) returns timestamptz
language sql stable set search_path = '' as $$
  select coalesce(s.ended_at, least(now(), s.started_at + interval '14 hours'))
$$;

-- ponytail: one venue per member (first membership); pass a restaurant id if staff ever work at two venues.
create function public.clock_in() returns void
language plpgsql security definer set search_path = '' as $$
declare
  rid uuid := (select restaurant_id from public.staff_members where user_id = (select auth.uid()) order by created_at limit 1);
begin
  if rid is null then raise exception using message = 'FORBIDDEN'; end if;
  update public.shifts set ended_at = least(now(), started_at + interval '14 hours')
  where restaurant_id = rid and user_id = (select auth.uid()) and ended_at is null;
  insert into public.shifts (restaurant_id, user_id, rate_fils)
  values (rid, (select auth.uid()), coalesce((select hourly_rate_fils from public.staff_pay where restaurant_id = rid and user_id = (select auth.uid())), 0));
end $$;

create function public.clock_out() returns void
language plpgsql security definer set search_path = '' as $$
begin
  update public.shifts set ended_at = least(now(), started_at + interval '14 hours')
  where user_id = (select auth.uid()) and ended_at is null;
end $$;

-- ---------------------------------------------------------------- report

-- Sales = tables paid in [p_from, p_to). Food cost = lines of non-cancelled orders placed in the range.
-- Wages = the part of each shift inside the range x its rate.
create function public.profit_report(p_from timestamptz, p_to timestamptz) returns json
language plpgsql stable security definer set search_path = '' as $$
declare
  rid uuid := (select restaurant_id from public.staff_members where user_id = (select auth.uid()) and role = 'owner' limit 1);
  sales bigint; paid integer; food bigint; missing integer; wages bigint;
begin
  if rid is null then raise exception using message = 'FORBIDDEN'; end if;
  select coalesce(sum(settled_total_fils), 0), count(*) into sales, paid
  from public.visits where restaurant_id = rid and paid_at >= p_from and paid_at < p_to;
  select coalesce(sum(lc.cost_fils), 0), count(*) filter (where not lc.has_cost) into food, missing
  from public.line_costs lc
  join public.order_lines l on l.id = lc.line_id
  join public.orders o on o.id = l.order_id
  where lc.restaurant_id = rid and o.created_at >= p_from and o.created_at < p_to and o.status <> 'cancelled';
  select coalesce(round(sum(
    extract(epoch from least(private.shift_end(s), p_to) - greatest(s.started_at, p_from)) * s.rate_fils / 3600
  )), 0) into wages
  from public.shifts s
  where s.restaurant_id = rid and s.started_at < p_to and private.shift_end(s) > p_from;
  return json_build_object(
    'sales_fils', sales, 'food_cost_fils', food, 'wages_fils', wages, 'profit_fils', sales - food - wages,
    'missing_cost_lines', missing, 'paid_visits', paid
  );
end $$;

revoke execute on function public.clock_in(), public.clock_out(), public.profit_report(timestamptz, timestamptz) from public, anon;
grant execute on function public.clock_in(), public.clock_out(), public.profit_report(timestamptz, timestamptz) to authenticated;
revoke execute on function private.snapshot_line_cost() from public;
