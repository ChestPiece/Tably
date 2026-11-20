# Self-serve multi-restaurant Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:executing-plans (Anas prefers inline execution). Steps use checkbox (`- [ ]`) syntax.

**Goal:** Any restaurant, in any country, signs up, runs a short setup and goes live. The UAE assumptions (AED, Asia/Dubai, required Arabic) are removed.

**Architecture:** The DB is already tenant-scoped (every table has `restaurant_id`, RLS goes through `private.is_staff/is_owner`, and `tables.qr_slug` is globally unique), so QR codes cannot collide across restaurants. We add per-restaurant `timezone` and `second_lang` columns, plus a `create_restaurant` RPC. The client reads currency, time zone and second language from a `VenueProvider` context.

**Tech Stack:** Next.js 16, Supabase (Postgres RLS + RPC), `node --test`, pgTAP-style DO-block tests.

**Spec:** `C:\Users\anas\.claude\plans\ok-so-claude-i-snazzy-sparrow.md` (Phase 3).

## Global Constraints
- Money is integer minor units. Never floats. Existing `*_fils` column names stay; only their meaning widens to "minor units of the restaurant currency".
- The minor-unit exponent comes from `Intl.NumberFormat("en", { style: "currency", currency }).resolvedOptions().maximumFractionDigits` (JPY 0, USD 2, KWD 3).
- The per-price cap stays at 1,000,000 minor units (DB check). The UI says "too high" without naming a currency.
- English is always the main language. `second_lang` is `'ar'` or null. Arabic fields are optional (`''`) and fall back to English through `pick()`.
- All writes go through RPC or owner RLS. `create_restaurant` is `security definer` with `search_path = ''` and an `auth.uid()` check, and is granted to `authenticated` only.
- Beta limit: one owned restaurant per user, marked with a `ponytail:` comment.

## Review Focus
1. A DST time zone (America/New_York, 2026-03-08 is 23 h long): `dayRange` must start at local midnight. Test in `lib/stats.test.ts`.
2. A 3-decimal currency (KWD): `parseMinor("1.250", 3) === 1250`, and `"1.25"` gives 1250 as well. A 0-decimal currency (JPY): `parseMinor("1.5", 0) === null`.
3. A user with no restaurant signs in: they go to `/admin/setup`, not "no access". An invited staff member still lands on `/staff`.
4. Owner A cannot read B's tables, orders, costs, report or menu writes, and a guest at A's table cannot see B's orders: `self_serve.sql`.
5. A restaurant with Arabic off where the guest's `lang` cookie is `ar`: the guest page switches to English and shows no language toggle.

---

### Task 1: Money per currency
**Files:**
- Modify: `lib/format.ts`, `lib/format.test.ts`
- Create: `lib/venue.tsx`
- Modify the `formatMoney` / `parseFils` / `filsToInput` / `MAX_FILS` call sites (`components/guest/*`, `components/admin/*`, `components/staff/TablesView.tsx`)

**Produces:**
- `currencyDigits(currency: string): number`
- `formatMoney(minor: number, lang: Lang, currency: string, opts?: { bare?: boolean }): string`
- `parseMinor(input: string, digits: number): number | null`
- `minorToInput(minor: number, digits: number): string`
- `MAX_MINOR = 1_000_000`
- `useVenue(): { currency; tz; secondLang: "ar" | null; digits; money(minor, opts?) }` and `<VenueProvider restaurant>`

- [ ] Tests:
  - `formatMoney(8100,"en","AED")` matches `/AED/` and `/81\.00/`.
  - `formatMoney(1250,"en","KWD")` matches `/1\.250/`.
  - `formatMoney(500,"en","JPY")` matches `/500/` with no `.`.
  - `parseMinor("12.5",2)===1250`, `parseMinor("1.25",3)===1250`, `parseMinor("1.5",0)===null`, `parseMinor("500",0)===500`.
  - `minorToInput(1250,3)==="1.250"` and `minorToInput(500,0)==="500"`.
  - Keep the existing Arabic-digit and round-trip cases.
- [ ] Run `node --test lib/format.test.ts`: it fails.
- [ ] Implement, then run again: it passes.

### Task 2: Time zone per restaurant
**Files:**
- Modify: `lib/stats.ts`, `lib/stats.test.ts`, `lib/supabase/server.ts` (`getStaff` also returns `timezone` through the `restaurants(timezone)` embed)
- Modify: `app/admin/page.tsx`, `components/admin/{AdminApp,OrdersTable,TeamAdmin,OwnerHome,ProfitPage}.tsx`, `components/staff/{StaffBoard,StaffToday}.tsx`, `components/guest/TableView.tsx`

**Produces:** `dayRange(date: Date, tz: string)` (DST-correct; the tz argument is required), `ordersByHour(orders, tz)`. `VENUE_TZ` is removed.

- [ ] Tests:
  - The Dubai case stays.
  - `dayRange(new Date("2026-03-08T12:00:00Z"),"America/New_York")` gives start `2026-03-08T05:00:00.000Z` and end `2026-03-09T04:00:00.000Z`.
- [ ] Two-pass offset: `midnight(y, m, d) = guess - offsetAt(guess - offsetAt(guess))`. The end is the next calendar day's midnight.

### Task 3: DB migration `supabase/migrations/20261121000001_self_serve.sql` + `supabase/tests/self_serve.sql`
- `restaurants`:
  - Add `timezone text not null default 'UTC'`, with a validation trigger against `pg_timezone_names`. Checks cannot use subqueries.
  - Add `second_lang text check (second_lang in ('ar'))`.
  - Add a `currency ~ '^[A-Z]{3}$'` check.
  - Backfill existing rows to `Asia/Dubai` and `'ar'`.
- `name_ar` on restaurants, categories, menu_items and item_options: replace the `length between 1 and N` check with `length <= N` and add `default ''`.
- `create_restaurant(p_name text, p_currency text, p_timezone text, p_second_lang text, p_tables int) returns uuid`:
  - Refuses anonymous users, users without a confirmed email (`AUTH_REQUIRED`) and users who already own a restaurant (`ALREADY_OWNER`).
  - `p_tables` must be between 1 and 50.
  - The slug comes from the name plus `private.new_slug()`.
  - Inserts a category named "Menu" (Arabic "القائمة" when `second_lang = 'ar'`, else `''`), the owner's `staff_members` row, and tables 1 to N.
- Drop `home_table_slug()` (`/` stops using it in the landing phase; until then the home page falls back to the "scan your table" text).
- Cleanup: `pg_cron` job `tably-cleanup` runs daily at 03:00 UTC. It deletes anonymous `auth.users` older than 30 days that have no open visit. If the extension cannot be created, the job ships in a separate migration file for the dashboard.
- Test (rolled-back DO block, ending with `ALL_TESTS_PASSED`):
  - `create_restaurant` happy path.
  - Duplicate refused.
  - Anonymous user refused.
  - Owner B sees 0 rows of A's tables, orders and item_costs; `profit_report` covers only B; B's update to A's menu_items affects 0 rows.
  - A guest at an A table cannot read B orders.

### Task 4: Optional Arabic
- `Restaurant` type: add `timezone: string; second_lang: "ar" | null`.
- `SettingsForm`:
  - Add a currency field (3-letter, uppercase) with a warning that existing prices keep their numbers.
  - Add a time zone select (`Intl.supportedValuesOf("timeZone")`).
  - Add an Arabic on/off switch. The Arabic fields show only when it is on, and Arabic is not required.
- `ItemEditor` and `MenuAdmin`: the Arabic tab and fields show only when Arabic is on. Arabic is required only when it is on. New categories get `name_ar: ''` when Arabic is off.
- Guest (`Chrome.tsx` toggle, `GuestApp.tsx`): with no second language, hide the toggle, and if `lang === "ar"` call `toggle()` once.

### Task 5: Sign-up, setup and checklist
- `/signup`: the `/login` page with an `?owner=1` mode. Sign-up copy reads "Create your restaurant account". `enter()`: no membership and not invited sends the user to `/admin/setup` instead of signing them out.
- `/admin/setup` (server page: no staff membership, redirect to `/login`; already a member, redirect to `/admin`) with the client `components/admin/SetupWizard.tsx`, one form:
  - Restaurant name.
  - Currency, pre-filled from a small country map using `navigator.language` region, with an editable select of common ISO codes plus a free 3-letter input.
  - Time zone, pre-filled from `Intl.DateTimeFormat().resolvedOptions().timeZone`.
  - Arabic menu switch.
  - Number of tables (1–50, default 5).
  - It calls `create_restaurant`, then `router.replace("/admin")`.
- `OwnerHome` "Get live" card, hidden when every item is done:
  1. Add dishes (`menu.length > 0`).
  2. Print table QR codes (a link to `/admin/qr`; it has no tick).
  3. Place a test order (`restaurant.order_counter > 0`).
  4. Invite your team (`team.length > 1 || invites.length > 0`).
- `/terms` and `/privacy`: plain pages in `app/(public)`, linked from the sign-up form.

### Task 6: Verify
- `npm run typecheck`, `npm run lint`, `node --test lib/*.test.ts`, `npm run build`.
- Run `self_serve.sql`, `ordering_flow.sql`, `staff_roles.sql` and `costs.sql` through `execute_sql`, then `get_advisors` for security and performance.
- Browser:
  - Sign up a new owner (needs a confirmed email; or confirm through SQL for a test user), run the setup in KWD, add a dish, open the table link as a guest and order.
  - Board shows the order; prices show 3 decimals.
  - Check the console.

## Out of this plan (manual, for Anas)
- Custom SMTP (Resend) in Supabase Auth.
- Turnstile captcha: enable it in Supabase Auth plus add the widget. Not built here, because turning on the Supabase setting without the widget breaks every sign-in.
