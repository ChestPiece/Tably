-- Scale fixes (2026-11-25).
-- 1. margin_report: the Profit page pulled every order line in the span to the browser and
--    summed there, and PostgREST caps a response at 1000 rows, so busy months under-counted.
--    The database now groups lines per venue hour/day, dish and price.
-- 2. Menu image policies: a folder name that is not a uuid raised a cast error inside the
--    policy instead of simply not matching.

create function public.margin_report(p_from timestamptz, p_to timestamptz, p_hourly boolean default false) returns json
language plpgsql stable security definer set search_path = '' as $$
declare
  rid uuid := (select restaurant_id from public.staff_members where user_id = (select auth.uid()) and role = 'owner' limit 1);
  tz text;
begin
  if rid is null then raise exception using message = 'FORBIDDEN'; end if;
  select timezone into tz from public.restaurants where id = rid;
  -- One row per (venue hour or day, dish, unit price, costed or not). Costed and uncosted lines
  -- stay apart so the page can sum known costs and still flag the dish as missing some.
  return coalesce((
    select json_agg(json_build_object(
      'created_at', g.first_at,
      'order_lines', json_build_array(json_build_object(
        'name', g.name, 'name_ar', g.name_ar, 'quantity', g.qty, 'unit_price_fils', g.unit_price_fils,
        'cost_fils', case when g.has_cost then g.cost end
      ))
    ))
    from (
      select min(o.created_at) as first_at, l.name, l.name_ar, l.unit_price_fils,
             coalesce(lc.has_cost, false) as has_cost,
             sum(l.quantity)::bigint as qty, sum(lc.cost_fils)::bigint as cost
      from public.orders o
      join public.order_lines l on l.order_id = o.id
      left join public.line_costs lc on lc.line_id = l.id
      where o.restaurant_id = rid and o.created_at >= p_from and o.created_at < p_to and o.status <> 'cancelled'
      group by date_trunc(case when p_hourly then 'hour' else 'day' end, o.created_at at time zone tz),
               l.name, l.name_ar, l.unit_price_fils, coalesce(lc.has_cost, false)
    ) g
  ), '[]'::json);
end $$;

revoke execute on function public.margin_report(timestamptz, timestamptz, boolean) from public, anon;
grant execute on function public.margin_report(timestamptz, timestamptz, boolean) to authenticated;

-- Menu images: owner of the restaurant whose id is the first folder; anything else just doesn't match.
create function private.folder_restaurant(p_name text) returns uuid
language sql stable set search_path = '' as $$
  select case when (storage.foldername(p_name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
              then ((storage.foldername(p_name))[1])::uuid end
$$;
grant execute on function private.folder_restaurant(text) to authenticated;

drop policy "owner reads menu images" on storage.objects;
drop policy "owner uploads menu images" on storage.objects;
drop policy "owner updates menu images" on storage.objects;
drop policy "owner deletes menu images" on storage.objects;
create policy "owner reads menu images" on storage.objects for select to authenticated
  using (bucket_id = 'menu-images' and private.is_owner(private.folder_restaurant(name)));
create policy "owner uploads menu images" on storage.objects for insert to authenticated
  with check (bucket_id = 'menu-images' and private.is_owner(private.folder_restaurant(name)));
create policy "owner updates menu images" on storage.objects for update to authenticated
  using (bucket_id = 'menu-images' and private.is_owner(private.folder_restaurant(name)))
  with check (bucket_id = 'menu-images' and private.is_owner(private.folder_restaurant(name)));
create policy "owner deletes menu images" on storage.objects for delete to authenticated
  using (bucket_id = 'menu-images' and private.is_owner(private.folder_restaurant(name)));
