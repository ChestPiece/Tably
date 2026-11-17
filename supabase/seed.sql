-- ChestBest demo seed: restaurant, menu, 12 tables, owner + staff login.
-- Dev logins (username field maps to <name>@chestbest.test):
--   anasowner / anas123   (owner)
--   anasstaff / anas123   (staff)
-- Change before sharing a public deploy.

do $$
declare
  rid uuid;
  c_burgers uuid; c_chicken uuid; c_sides uuid; c_drinks uuid;
  it uuid;
  owner_id uuid := '00000000-0000-4000-8000-0000000000a1';
  staff_id uuid := '00000000-0000-4000-8000-0000000000a2';
  photo text := 'https://images.unsplash.com/%s?auto=format&fit=crop&w=900&q=80';
begin
  insert into public.restaurants (slug, name, name_ar, tagline, tagline_ar)
  values ('chestbest', 'ChestBest', 'تشست بست', 'Flame-grilled. Made when you order.', 'مشوي على اللهب. يُحضّر عند طلبك.')
  returning id into rid;

  insert into public.categories (restaurant_id, name, name_ar, position) values (rid, 'Burgers', 'برجر', 1) returning id into c_burgers;
  insert into public.categories (restaurant_id, name, name_ar, position) values (rid, 'Chicken & bites', 'دجاج ومقبلات', 2) returning id into c_chicken;
  insert into public.categories (restaurant_id, name, name_ar, position) values (rid, 'Sides', 'أطباق جانبية', 3) returning id into c_sides;
  insert into public.categories (restaurant_id, name, name_ar, position) values (rid, 'Drinks', 'مشروبات', 4) returning id into c_drinks;

  -- Burgers share the same three options
  insert into public.menu_items (restaurant_id, category_id, name, name_ar, description, description_ar, price_fils, image_url, badge, badge_ar, position)
  values (rid, c_burgers, 'The Signature Burger', 'برجر سيغنتشر',
    'Flame-grilled beef, melted cheddar, crisp lettuce and our house sauce.', 'لحم بقري مشوي وجبنة شيدر وخس مقرمش مع صلصتنا الخاصة.',
    2800, format(photo, 'photo-1568901346375-23c9450c58cd'), 'Bestseller', 'الأكثر طلباً', 1) returning id into it;
  insert into public.item_options (item_id, restaurant_id, name, name_ar, price_fils, position) values
    (it, rid, 'Classic', 'كلاسيك', 0, 1), (it, rid, 'Extra cheese', 'جبنة إضافية', 300, 2), (it, rid, 'Make it a meal · fries + drink', 'وجبة مع بطاطس ومشروب', 1200, 3);

  insert into public.menu_items (restaurant_id, category_id, name, name_ar, description, description_ar, price_fils, image_url, position)
  values (rid, c_burgers, 'Crispy Chicken Burger', 'برجر الدجاج المقرمش',
    'Golden fried chicken, crunchy slaw and spicy mayo.', 'دجاج ذهبي مقرمش مع سلطة الملفوف والمايونيز الحار.',
    2600, format(photo, 'photo-1606755962773-d324e0a13086'), 2) returning id into it;
  insert into public.item_options (item_id, restaurant_id, name, name_ar, price_fils, position) values
    (it, rid, 'Classic', 'كلاسيك', 0, 1), (it, rid, 'Extra cheese', 'جبنة إضافية', 300, 2), (it, rid, 'Make it a meal · fries + drink', 'وجبة مع بطاطس ومشروب', 1200, 3);

  insert into public.menu_items (restaurant_id, category_id, name, name_ar, description, description_ar, price_fils, image_url, badge, badge_ar, position)
  values (rid, c_burgers, 'Double Smash', 'دبل سماش',
    'Two smashed patties, double cheese, pickles, caramelised onions.', 'قطعتان من اللحم مع جبنة مضاعفة ومخلل وبصل مكرمل.',
    3600, format(photo, 'photo-1550547660-d9450f859349'), 'Big appetite', 'للجوع الكبير', 3) returning id into it;
  insert into public.item_options (item_id, restaurant_id, name, name_ar, price_fils, position) values
    (it, rid, 'Classic', 'كلاسيك', 0, 1), (it, rid, 'Extra cheese', 'جبنة إضافية', 300, 2), (it, rid, 'Make it a meal · fries + drink', 'وجبة مع بطاطس ومشروب', 1200, 3);

  insert into public.menu_items (restaurant_id, category_id, name, name_ar, description, description_ar, price_fils, image_url, badge, badge_ar, position)
  values (rid, c_chicken, 'Hotshots', 'هوت شوتس',
    'Bite-sized crispy chicken with a little heat.', 'قطع دجاج مقرمشة صغيرة بلمسة حارة.',
    1800, format(photo, 'photo-1562967914-608f82629710'), 'To share', 'للمشاركة', 1) returning id into it;
  insert into public.item_options (item_id, restaurant_id, name, name_ar, price_fils, position) values
    (it, rid, 'Original', 'أصلي', 0, 1), (it, rid, 'Extra spicy', 'حار جداً', 0, 2);

  insert into public.menu_items (restaurant_id, category_id, name, name_ar, description, description_ar, price_fils, image_url, position)
  values (rid, c_sides, 'Golden Fries', 'بطاطس ذهبية',
    'Crisp and lightly salted.', 'بطاطس مقرمشة مع رشة ملح.',
    1000, format(photo, 'photo-1573080496219-bb080dd4f877'), 1) returning id into it;
  insert into public.item_options (item_id, restaurant_id, name, name_ar, price_fils, position) values
    (it, rid, 'Regular', 'عادي', 0, 1), (it, rid, 'Large', 'كبير', 400, 2);

  insert into public.menu_items (restaurant_id, category_id, name, name_ar, description, description_ar, price_fils, image_url, position)
  values (rid, c_drinks, 'Ice-cold Cola', 'كولا باردة',
    'Served ice cold. 330 ml.', 'تُقدّم باردة. ٣٣٠ مل.',
    700, format(photo, 'photo-1622483767028-3f66f32aef97'), 1) returning id into it;
  insert into public.item_options (item_id, restaurant_id, name, name_ar, price_fils, position) values
    (it, rid, 'Regular', 'عادي', 0, 1), (it, rid, 'Zero sugar', 'بدون سكر', 0, 2);

  insert into public.tables (restaurant_id, number) select rid, n from generate_series(1, 12) n;

  -- Dev staff logins
  insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
    confirmation_token, email_change, email_change_token_new, recovery_token)
  values
    ('00000000-0000-0000-0000-000000000000', owner_id, 'authenticated', 'authenticated', 'anasowner@chestbest.test',
     extensions.crypt('anas123', extensions.gen_salt('bf')), now(),
     '{"provider":"email","providers":["email"]}', '{"name":"Owner"}', now(), now(), '', '', '', ''),
    ('00000000-0000-0000-0000-000000000000', staff_id, 'authenticated', 'authenticated', 'anasstaff@chestbest.test',
     extensions.crypt('anas123', extensions.gen_salt('bf')), now(),
     '{"provider":"email","providers":["email"]}', '{"name":"Staff"}', now(), now(), '', '', '', '')
  on conflict (id) do nothing;

  insert into auth.identities (provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
  values
    (owner_id::text, owner_id, json_build_object('sub', owner_id::text, 'email', 'anasowner@chestbest.test', 'email_verified', true), 'email', now(), now(), now()),
    (staff_id::text, staff_id, json_build_object('sub', staff_id::text, 'email', 'anasstaff@chestbest.test', 'email_verified', true), 'email', now(), now(), now())
  on conflict do nothing;

  insert into public.staff_members (restaurant_id, user_id, role, display_name) values
    (rid, owner_id, 'owner', 'Owner'), (rid, staff_id, 'staff', 'Front desk');
end $$;
