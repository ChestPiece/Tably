# Menu Psychology (Phase 2) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the guest menu sell more with true data: preset tags, an automatic "Popular" tag, a featured hero dish, signature dishes listed first, a Quick picks row, one pairing nudge, multi-select add-ons, and owner stats that show the money.

**Architecture:**
- Two migrations:
  - Signals: tags, featured, pairings, and `menu_signals`, a guest-readable function that returns item ids only.
  - Add-ons: `item_addons`, the add-on max, `place_order` v3 with add-ons and a `via` marker, and `menu_stats`, which is owner-only.
- Pure ranking and pricing helpers in `lib/menu.ts`, tested with node.
- Guest UI reads the signals once per load; owner UI edits through the existing RLS upserts.

**Tech Stack:** Next.js 16, React 19, Supabase (Postgres functions, RLS), Tailwind v4, sonner, `node --test`.

**Spec:** `docs/superpowers/specs/2026-11-27-brand-kit-menu-psychology-design.md` (Psychology map, Phase 2)

## Global Constraints
- Use true data only. "Popular" and Quick picks come from real orders (30 days); pairing fallback comes from co-orders (60 days). Never hand-typed.
- No fake scarcity, no countdowns, no modal upsells, at most one nudge per step.
- Guest strings come in EN + AR (Arabic shows only when `second_lang = 'ar'`). Use logical CSS. Guest controls are 48px; owner controls are 40px.
- Money is integer minor units. The server recomputes every price; the client `expected_price` is only a check.
- Order lines snapshot name, option, add-ons and price at order time.
- Guest writes go through Postgres functions only. Owner CRUD goes through RLS.
- `menu_signals` returns ids, never counts or money. `menu_stats` is owner-only.
- No template tells (`design.md`). Tags are text chips, never emoji.

## Review Focus
1. An add-on deleted or a max lowered while a guest has it in the cart. Expect a `PRICE_CHANGED` refusal, then a cart refresh that drops the stale line, not a crash. Covered by the `addons.sql` "stale add-on" case and the `reconcileCart` test.
2. A duplicate add-on id in one line. The server must reject it (`INVALID_LINES`), never charge twice. Covered by `addons.sql`.
3. A new venue with no orders. Signals are empty arrays: no Quick picks row, no Popular tags, no fallback pairs, and the menu looks exactly as it does today. Covered by the `menu_signals.sql` empty case and the `rankSection` test.
4. A pairing that points at a sold-out item, or at an item already in the cart. No nudge. Covered by the `pickNudge` test.
5. The same dish added twice with different add-ons. These must stay two cart lines with their own prices. Covered by the `lineKey` test.

---

### Task 1: Signals migration (tags, featured, pairings, menu_signals)

**Files:**
- Create: `supabase/migrations/20261128000001_menu_signals.sql`
- Test: `supabase/tests/menu_signals.sql`

**Interfaces:**
- Produces:
  - `menu_items.tags text[] not null default '{}'`, checked `tags <@ array['chef','new','spicy','veg','signature']` and `cardinality(tags) <= 3`.
  - `menu_items.featured boolean not null default false`.
  - `item_pairings(item_id uuid, pairs_with_id uuid, restaurant_id uuid)`:
    - primary key `(item_id, pairs_with_id)`
    - check `item_id <> pairs_with_id`
    - both foreign keys reference `menu_items`, on delete cascade
    - RLS: select `to anon, authenticated using (true)`; insert and delete for `private.is_owner(restaurant_id)`
  - `public.menu_signals(p_restaurant uuid) returns json`, as `{"popular": uuid[], "quick": uuid[], "pairs": {"<item_id>": uuid[]}}`:
    - `stable security definer set search_path = ''`
    - granted to anon, authenticated
    - `popular`: top 2 items per category by quantity sold in 30 days, among non-cancelled orders, and only items with at least 3 units sold.
    - `quick`: top 6 available items overall by the same measure, with the same minimum of 3.
    - `pairs`: for each item, up to 3 other items found in the same orders over 60 days, at least 3 times.

- [ ] **Step 1: Write `supabase/tests/menu_signals.sql`.** It is a `do $$` block that ends with `raise exception 'ALL_TESTS_PASSED'`. Inside the block, insert a restaurant, a category, items A, B, C and D, a table, a visit, a guest and orders. Assert:
  - The new restaurant has no orders yet, so `menu_signals` returns `popular = '[]'` and `quick = '[]'`, and `pairs` returns `{}`.
  - After 3 orders containing A+B, plus 1 order containing C: `popular` holds A and B but not C, and `pairs->A` holds B.
  - A cancelled order with D × 5 still leaves D out of `popular`.
  - The tag `'spicy'` is accepted, `'hot'` raises check_violation, and four tags raise check_violation.
  - Inserting the pairing `(A, A)` raises check_violation.
- [ ] **Step 2: Apply the migration (Supabase MCP `apply_migration`, or Anas runs it in the dashboard), then run the test with `execute_sql`.** Expected: `ALL_TESTS_PASSED`.

### Task 2: Add-ons migration (item_addons, place_order v3, menu_stats)

**Files:**
- Create: `supabase/migrations/20261128000002_addons.sql`
- Test: `supabase/tests/addons.sql`

**Interfaces:**
- Produces:
  - `item_addons(id uuid pk default gen_random_uuid(), item_id, restaurant_id, name text, name_ar text default '', price_fils int >= 0, position int default 0)`:
    - item_id references `menu_items`, on delete cascade
    - RLS copies `item_options`: readable by all, owner writes
  - `menu_items.addon_max smallint not null default 0`, with `check (addon_max between 0 and 10)`.
  - `order_lines.addons jsonb not null default '[]'`, holding `[{name, name_ar, price_fils}]`.
  - `order_lines.via text`, with `check (via in ('pairing','quick','usual'))`.
  - `place_order(p_request_id, p_lines, p_note, p_visit)`: same signature, `create or replace`. Each line may carry:
    - `addon_ids`: a JSON array of uuid strings, missing means `[]`. It must contain distinct ids, all belonging to the item, with count ≤ `addon_max`; otherwise raise `INVALID_LINES`. An id that no longer exists raises `PRICE_CHANGED`.
    - `via`: one of the three values, or null; any other value is stored as null.
    - The price check becomes: `unit = item + option + sum(addon prices)`.
    - Everything else stays byte-for-byte the 20261125 version.
  - `public.menu_stats(p_from timestamptz, p_to timestamptz) returns json`, as `{"orders": int, "avg_basket_fils": int, "lines": int, "suggested_lines": int}`:
    - owner-only, like `margin_report`
    - counts non-cancelled orders of the caller's restaurant
    - `suggested_lines` counts lines with `via = 'pairing'`

- [ ] **Step 1: Write `supabase/tests/addons.sql`.** Cover:
  - A line with 2 add-ons (prices 300 + 200) on an item of 1000 with `expected_price` 1500 succeeds. The line snapshots both add-on names and `unit_price_fils` = 1500.
  - Ids that repeat (the same add-on id twice) raise `INVALID_LINES`.
  - 3 add-ons when `addon_max` = 2 raise `INVALID_LINES`.
  - An add-on id belonging to another item raises `INVALID_LINES`.
  - A deleted add-on id raises `PRICE_CHANGED`.
  - A line without `addon_ids` still works, so old clients keep ordering.
  - `via = 'pairing'` is stored, and `via = 'x'` is stored as null.
  - Called as the owner, `menu_stats` returns `suggested_lines = 1`. Called as a guest, it raises.
- [ ] **Step 2: Apply the migration, run the test.** Expected: `ALL_TESTS_PASSED`. Also re-run `supabase/tests/review_fixes.sql`, which still passes.

### Task 3: Pure menu helpers

**Files:**
- Create: `lib/menu.ts`, `lib/menu.test.ts`

**Interfaces:**
- Consumes: `MenuItem` with `tags: string[]`, `featured: boolean`, `addon_max: number`, `item_addons: ItemAddon[]` (Task 4 types).
- Produces:
  - `type Signals = { popular: string[]; quick: string[]; pairs: Record<string, string[]> }` and `NO_SIGNALS`.
  - `rankSection(items: MenuItem[]): { hero: MenuItem | null; rest: MenuItem[] }`:
    - hero is the first `featured` item that has an image; otherwise the first item with a badge and an image (today's rule); otherwise null.
    - rest is the remaining items, with `signature`-tagged items first; the order is otherwise stable.
  - `lineKey(itemId: string, optionId: string | null, addonIds: string[]): string`, where add-on order does not matter.
  - `unitPrice(item: MenuItem, optionId: string | null, addonIds: string[]): number`.
  - `pickNudge(itemIds: string[], cartItemIds: Set<string>, owner: Map<string, string[]>, signals: Signals, menu: MenuItem[]): MenuItem | null`:
    - candidates are the owner pairings first, then `signals.pairs`, taken in `itemIds` order
    - returns the first candidate that is available and not already in the cart

- [ ] **Step 1: Write the tests in `lib/menu.test.ts`:**
  - `rankSection prefers featured`
  - `rankSection falls back to badge+image`
  - `rankSection puts signature first`
  - `rankSection with no signals keeps order`
  - `lineKey ignores add-on order`, which also checks that different add-ons give different keys
  - `unitPrice sums option and add-ons`, using 1000 + option 250 + add-ons 300/200 = 1750
  - `pickNudge skips sold-out and in-cart`
  - `pickNudge prefers owner pairing`
- [ ] **Step 2: Run `npm.cmd test`.** Expected: FAIL, because `lib/menu.ts` does not exist yet.
- [ ] **Step 3: Implement `lib/menu.ts`.**
- [ ] **Step 4: Run `npm.cmd test`.** Expected: all pass.

### Task 4: Guest menu — tags, Popular, hero, Quick picks

**Files:**
- Modify: `lib/types.ts` (`MenuItem` gains `tags`, `featured`, `addon_max`, `item_addons`; new `ItemAddon`; `OrderLine` gains `addons`, `via`; `MENU_SELECT = "*, item_options(*), item_addons(*)"`)
- Modify: `app/t/[slug]/page.tsx` (order `item_addons` by position, like options)
- Modify: `components/guest/GuestApp.tsx`:
  - after menu load, call `sb.rpc("menu_signals", { p_restaurant })` and keep the result as `Signals`
  - on error, use `NO_SIGNALS`
- Modify: `components/guest/MenuView.tsx`:
  - `rankSection` per category
  - tag chips plus a "Popular" chip on rows and on the hero
  - a Quick picks rail above the first section, only when `quick.length >= 3`
  - quick picks use the existing `DishRow` add path
  - the rail is horizontal, with `scroll-cue` and `snap-x`, and cards are 48px tap targets
- Modify: `lib/i18n.tsx`. Guest keys:
  - `quickPicks`: "Quick picks", "اختيارات سريعة"
  - `tagPopular`: "Popular", "الأكثر طلبًا"
  - `tagChef`: "Chef's pick", "اختيار الشيف"
  - `tagNew`: "New", "جديد"
  - `tagSpicy`: "Spicy", "حار"
  - `tagVeg`: "Vegetarian", "نباتي"
  - `tagSignature`: "Signature", "طبق مميز"

- [ ] **Step 1:** Update types and selects, then run `npm.cmd run typecheck`. Expected: clean.
- [ ] **Step 2:** Implement the signals fetch and the MenuView changes.
- [ ] **Step 3:** Run `npm.cmd run typecheck`, `npm.cmd run lint` and `npm.cmd test`. Expected: clean.

### Task 5: Guest add-ons and add-on display on every line view

**Files:**
- Modify: `components/guest/GuestApp.tsx`:
  - `CartLine` gains `addonIds: string[]` and `via?: "pairing" | "quick" | "usual"`
  - the key is `lineKey`, the price is `unitPrice`
  - the stored-cart rebuild drops lines whose add-ons no longer exist (`reconcileCart`)
  - the `place_order` payload sends `addon_ids` and `via`
- Modify: `components/guest/ItemSheet.tsx`:
  - a checkbox group under the option radios when `item_addons.length > 0`
  - the legend reads `t("addOns")` plus "up to {n}"
  - unchecked boxes are disabled at the max
  - `onAdd(item, optionId, addonIds, qty)`
- Modify `CartSheet.tsx`, `TableView.tsx`, `OrderCard.tsx` and `OwnerOrders.tsx`: show the add-on names after the option, comma-joined, using the snapshot (`l.addons`) on order lines and `item_addons` on cart lines.
- Modify `lib/menu.ts` and its test: `reconcileCart(lines: CartLine-like[], menu: MenuItem[])` keeps a line only when its option and every add-on still exist, and recomputes `unit`. Add the test `reconcileCart drops stale add-on`.
- i18n: `addOns`: "Add-ons", "إضافات"; `upTo`: "up to {n}", "حتى {n}".

- [ ] **Step 1:** Write the `reconcileCart` test, run it, and watch it fail. Then implement it and watch it pass.
- [ ] **Step 2:** Implement the UI changes.
- [ ] **Step 3:** Run typecheck, lint and test. Expected: clean.

### Task 6: One pairing nudge per step

**Files:**
- Modify: `components/guest/GuestApp.tsx`:
  - load owner pairings: `sb.from("item_pairings").select("item_id, pairs_with_id").eq("restaurant_id", rid)`, building a `Map<string, string[]>`
  - after an add that was not itself a nudge, call `pickNudge([added.id], …)`
  - each source item is nudged at most once per page load (keep a `Set`)
  - when a pick comes back, show a sonner toast, `t("goesWell")`, with the item name and an action "Add · price"
  - the action quick-adds a simple item with `via: "pairing"`, or opens the sheet for an item with options; the sheet carries `via` into the add
- Modify: `components/guest/CartSheet.tsx`:
  - one row below the lines: `t("completeMeal")`, then the item name, price and an Add button
  - its source is `pickNudge(cart item ids, …)`, and it is hidden when null or when the cart is locked
- i18n:
  - `goesWell`: "Goes well with", "يليق معه"
  - `completeMeal`: "Complete your meal", "أكمل وجبتك"

- [ ] **Step 1:** Implement.
- [ ] **Step 2:** Run typecheck, lint and test. Expected: clean.

### Task 7: Owner item editor — tags, featured, add-ons, pairings

**Files:**
- Create: `components/admin/ItemExtras.tsx`, owner UI in English only, with these exports:
  - `TagsField({ value, onChange })`: 5 toggle chips, max 3
  - `PairingsField({ itemId, menu, value, onChange })`: a list of up to 3 other items, picked from a select
  - `AddonsField({ addons, max, onChange, onMax })`: rows of name, Arabic name when `ar`, price and remove, plus "Add add-on" and a max select from 0 to 10
- Modify: `components/admin/ItemEditor.tsx`:
  - a Featured switch, `TagsField` and `AddonsField` in the details column, and `PairingsField` below them
  - save upserts `tags`, `featured` and `addon_max` on the item
  - save replaces `item_addons` the same way as `item_options` (delete missing, upsert kept)
  - save replaces `item_pairings` for this item (delete all rows for `item_id`, insert the current ones)
- Modify: `components/admin/MenuAdmin.tsx`. The query includes `item_addons(*)` and pairings, if it does not already use `MENU_SELECT`.

- [ ] **Step 1:** Implement.
- [ ] **Step 2:** Run typecheck and lint. Expected: clean.

### Task 8: Owner home stats

**Files:**
- Modify: `components/admin/OwnerHome.tsx`:
  - add a panel with "Average order" (`money(avg_basket_fils)`) and "Added from suggestions" (`suggested_lines` / `lines` as a %, plus a count)
  - the period is today, via `dayRange(today, tz)`
  - call `sb.rpc("menu_stats", { p_from, p_to })`
  - hide the panel when `orders = 0`

- [ ] **Step 1:** Implement.
- [ ] **Step 2:** Run typecheck and lint. Expected: clean.

### Task 9: Verify and document

- [ ] Run `npm.cmd test`, typecheck, lint and build. All should be green.
- [ ] Re-run `menu_signals.sql`, `addons.sql`, `review_fixes.sql` and `ordering_flow.sql` (insert tables 6 and 7 inside the block). All should return `ALL_TESTS_PASSED`. Then run `get_advisors`.
- [ ] Browser check, then restore the test venue after:
  - owner sets tags, featured, 2 add-ons with max 2, and 1 pairing
  - guest sees the chips and the hero
  - guest adds the dish with add-ons and the price matches
  - the toast nudge appears once, and the cart row appears
  - the order shows add-ons on the board and the bill
  - owner home stats update
  - check Arabic and 375 / 812×375
- [ ] Docs:
  - `CLAUDE.md` Data rules: new columns and functions, `place_order` add-ons
  - `docs/TASKS.md`
  - `design.md`: Tags / nudge rules
