-- An invite only links an account whose email is confirmed. Otherwise anyone could
-- sign up with an invited address (if confirmation is ever off) and take that role.
create or replace function public.accept_invites() returns integer
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := auth.uid();
  mail text := lower(auth.jwt() ->> 'email');
  linked integer;
begin
  if uid is null or mail is null or coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) then return 0; end if;
  if not exists (select 1 from auth.users where id = uid and email_confirmed_at is not null) then return 0; end if;
  insert into public.staff_members (restaurant_id, user_id, role)
  select restaurant_id, uid, role from public.staff_invites where email = mail
  on conflict (restaurant_id, user_id) do nothing;
  get diagnostics linked = row_count;
  delete from public.staff_invites where email = mail;
  return linked;
end $$;
