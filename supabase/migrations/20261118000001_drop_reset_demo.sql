-- Nothing in the app calls it; a wipe-everything RPC has no place in production.
drop function if exists public.reset_demo(uuid);
