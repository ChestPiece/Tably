-- Daily cleanup of anonymous guest accounts that never joined a table.
-- Accounts that joined a visit stay: deleting them would cascade to visit_guests and orders,
-- and wipe the restaurant's order history.
-- ponytail: guests who ordered are kept forever; detach orders from guests before deleting those.
create extension if not exists pg_cron;

select cron.schedule('tably-cleanup', '0 3 * * *', $$
  delete from auth.users u
  where u.is_anonymous
    and u.created_at < now() - interval '30 days'
    and not exists (select 1 from public.visit_guests g where g.user_id = u.id)
$$);
