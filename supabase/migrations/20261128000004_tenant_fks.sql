-- Options, add-ons and pairings must point at dishes of the same restaurant as the row.
-- RLS checks only restaurant_id, so without these an owner could hang an add-on on another venue's dish.
alter table public.menu_items add constraint menu_items_id_restaurant_key unique (id, restaurant_id);

alter table public.item_options add constraint item_options_item_restaurant_fkey
  foreign key (item_id, restaurant_id) references public.menu_items (id, restaurant_id) on delete cascade;
alter table public.item_addons add constraint item_addons_item_restaurant_fkey
  foreign key (item_id, restaurant_id) references public.menu_items (id, restaurant_id) on delete cascade;
alter table public.item_pairings add constraint item_pairings_item_restaurant_fkey
  foreign key (item_id, restaurant_id) references public.menu_items (id, restaurant_id) on delete cascade;
alter table public.item_pairings add constraint item_pairings_pair_restaurant_fkey
  foreign key (pairs_with_id, restaurant_id) references public.menu_items (id, restaurant_id) on delete cascade;
