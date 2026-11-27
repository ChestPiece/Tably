-- A star tap sends no note (p_note null): keep the saved note. A sent note (even blank) replaces it.
-- Before, a guest who rescanned and re-tapped a star wiped the note they had written. Test: feedback.sql.
create or replace function public.leave_feedback(p_visit uuid, p_rating int, p_note text) returns void
language plpgsql security definer set search_path = '' as $$
declare
  rid uuid;
begin
  if p_rating is null or p_rating not between 1 and 5 then raise exception using message = 'INVALID_RATING'; end if;
  select v.restaurant_id into rid from public.visits v join public.visit_guests vg on vg.visit_id = v.id
  where v.id = p_visit and vg.user_id = auth.uid() and v.closed_at > now() - interval '24 hours';
  if rid is null then raise exception using message = 'FORBIDDEN'; end if;
  insert into public.visit_feedback (visit_id, restaurant_id, user_id, rating, note)
  values (p_visit, rid, auth.uid(), p_rating, left(nullif(btrim(p_note), ''), 500))
  on conflict (visit_id, user_id) do update set rating = excluded.rating,
    note = case when p_note is null then public.visit_feedback.note else excluded.note end, created_at = now();
end $$;
