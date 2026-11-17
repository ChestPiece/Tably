-- Preset staff roles. 'staff' stays as the front desk / counter role (full board access).
-- Enum values must be committed before any function or row can use them, so this is its own migration.
alter type public.staff_role add value if not exists 'kitchen';
alter type public.staff_role add value if not exists 'waiter';
