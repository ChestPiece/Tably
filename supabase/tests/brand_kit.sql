-- Brand kit columns on restaurants. Run after 20261127000001_brand_kit.sql.
-- Always rolls back: success ends with error 'ALL_TESTS_PASSED'; any failure raises the failing assert.
do $$
declare
  rid uuid := (select id from public.restaurants limit 1);
  ok boolean;
begin
  assert not exists (select 1 from public.restaurants where accent <> '#1E2A5A'), 'existing venues reset to Sufra indigo';
  assert (select column_default from information_schema.columns
          where table_schema = 'public' and table_name = 'restaurants' and column_name = 'accent') = '''#1E2A5A''::text',
    'accent default is Sufra indigo';
  assert (select vibe from public.restaurants where id = rid) = 'sufra', 'vibe defaults to sufra';

  -- Each bad value must raise a check_violation; each good one must pass.
  begin update public.restaurants set vibe = 'neon' where id = rid; ok := true; exception when check_violation then ok := false; end;
  assert not ok, 'unknown vibe rejected';
  update public.restaurants set vibe = 'bold' where id = rid;

  begin update public.restaurants set cover_url = 'http://x.test/a.jpg' where id = rid; ok := true; exception when check_violation then ok := false; end;
  assert not ok, 'http cover rejected';
  begin update public.restaurants set cover_url = 'https://x.test/' || repeat('a', 490) where id = rid; ok := true; exception when check_violation then ok := false; end;
  assert not ok, 'cover over 500 chars rejected';
  update public.restaurants set cover_url = 'https://x.test/a.jpg' where id = rid;

  begin update public.restaurants set welcome_note = repeat('a', 281) where id = rid; ok := true; exception when check_violation then ok := false; end;
  assert not ok, 'note over 280 rejected';
  update public.restaurants set welcome_note = repeat('a', 280), welcome_note_ar = repeat('ب', 280) where id = rid;

  begin update public.restaurants set instagram = '@chestbest' where id = rid; ok := true; exception when check_violation then ok := false; end;
  assert not ok, 'handle with @ rejected';
  begin update public.restaurants set instagram = repeat('a', 31) where id = rid; ok := true; exception when check_violation then ok := false; end;
  assert not ok, 'handle over 30 rejected';
  update public.restaurants set instagram = 'chest.best_1' where id = rid;

  raise exception 'ALL_TESTS_PASSED';
end $$;
