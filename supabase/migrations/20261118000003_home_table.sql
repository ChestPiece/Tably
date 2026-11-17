-- Test-phase home page: slug of the first table (lowest number, oldest restaurant).
-- Lets "/" show a working QR without pinning a slug in env that breaks when the owner replaces a link.
create function public.home_table_slug() returns text
language sql stable security definer set search_path = '' as $$
  select t.qr_slug
  from public.tables t join public.restaurants r on r.id = t.restaurant_id
  order by r.created_at, t.number
  limit 1
$$;

revoke execute on function public.home_table_slug() from public;
grant execute on function public.home_table_slug() to anon, authenticated;
