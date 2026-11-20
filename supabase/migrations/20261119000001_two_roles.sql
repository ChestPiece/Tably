-- Two roles only: owner and staff. Kitchen and waiter accounts become staff (full board).
-- The enum keeps its old values (dropping enum values means rebuilding the type); the checks block new use.
update public.staff_members set role = 'staff' where role in ('kitchen', 'waiter');
update public.staff_invites set role = 'staff' where role in ('kitchen', 'waiter');
alter table public.staff_members add constraint staff_members_two_roles check (role in ('owner', 'staff'));
alter table public.staff_invites add constraint staff_invites_two_roles check (role in ('owner', 'staff'));
