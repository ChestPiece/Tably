-- 20261128000004 added composite (item_id, restaurant_id) FKs next to the old item_id FKs.
-- Two FKs to menu_items make PostgREST embeds like menu_items(item_options(*)) ambiguous (PGRST201),
-- which blanked every guest menu. The composite FKs already cascade, so the single-column ones go.
alter table public.item_options drop constraint item_options_item_id_fkey;
alter table public.item_addons drop constraint item_addons_item_id_fkey;
alter table public.item_pairings drop constraint item_pairings_item_id_fkey;
alter table public.item_pairings drop constraint item_pairings_pairs_with_id_fkey;
