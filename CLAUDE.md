# Tably — QR table ordering

Tably is a dine-in QR ordering SaaS. A guest scans a table QR, enters an optional name and orders from the menu. Staff see orders live, move them through preparation, and handle waiter calls and bills. Owners run menu, tables, team and profit.

- **Product name: Tably** (logo `public/icon.svg` / `BrandMark`, landing at `/`).
- **Demo venue: ChestBest**, a fictional UAE burger place (EN + AR, AED). It lives only in seed data, demos and pilot docs. Never use it as the product name.
- **Visual system: Sufra v2**, warm editorial, locked in `design.md`.

Read first: `docs/TASKS.md` (remaining work, tick items as they land) and `docs/WORKING-DIRECTION.md` (which skills to use for which task).
Original spec: `docs/superpowers/specs/2026-11-16-qr-ordering-design.md`.

## Status
- Next.js 16 (App Router) + Supabase, deployed on Vercel. Guest app, staff board, owner admin, QR sheet, landing and self-serve sign-up are built. `tsc` + `eslint` clean; DB tests pass. Next: live E2E, design pass, accessibility.
- Supabase cloud project ref `xyptwnbukercpptbleei` (project-scoped MCP in `.mcp.json`). No Docker on this machine: no `supabase start`.
- Production: https://qr-restauratn-app.vercel.app (deploys from `main`). The GitHub repo is **public**: never commit passwords, keys or `.env*` (only `.env.example`).
- Logins are real emails only. No seed accounts. The owner is the account linked in `staff_members` (note at the top of `seed.sql`).
- Invites are `/join/<token>` links shared from the Team page. The app never emails them. Sign-up still needs the Supabase confirmation email, so custom SMTP must be set up first.
- Brand history: Sufra v2 port 2026-11-17 (spec `docs/brand/sufra/README.md`, reference `brand-demos/sufra-v2-app.html`, decisions `.superpowers/sdd/2026-11-16-sufra-port/progress.md`). Hallmark redesign 2026-11-17 locked the system in `design.md`.

## Stack and commands
- Next.js 16, React 19, TypeScript, Tailwind v4, shadcn/ui (radix-ui), `@supabase/ssr`, GSAP + Lenis (landing), recharts, sonner, vaul.
- `npm run dev` · `npm run build` · `npm run typecheck` · `npm run lint` · `npm test` (node --test on `lib/**/*.test.ts`).
- DB: migrations in `supabase/migrations/`, pgTAP-style tests in `supabase/tests/`. Apply with Supabase MCP `apply_migration`, check with `get_advisors`.

## Routes
- Public: `/` landing, `/login` (owner + staff, invite sign-up, forgot password), `/reset-password`, `/join/<token>`. `/staff/login` redirects to `/login`.
- Guest: `/t/[slug]` welcome, then `/t/[slug]/menu`, order tracker, table bill.
- Staff (login): `/staff` kitchen board ("Line + pass": `components/staff/Board.tsx`, `OrderCard.tsx`; mockups `brand-demos/kds/`), calls, tables and bills.
- Owner (login): `/admin` home, profit, menu (with dish costs), tables + QR sheet (`/admin/qr`), settings, team (invites, hourly rates, shifts). New accounts without membership go to `/admin/setup`.

## Data rules
- Money = integer minor units of the restaurant's `currency` (columns keep `*_fils` names). Never floats. Digits come from `Intl` (`currencyDigits`: JPY 0, USD 2, KWD 3). Format with `useVenue().money`.
- Every table has `restaurant_id`. One account = one restaurant.
- Guest and order-flow writes go through Postgres functions only (`join_table`, `place_order`, `call_waiter`, `request_bill`, `advance_order`, `revert_order`, `cancel_order`, `resolve_request`, `settle_bill`, `set_item_available`, `record_payment`, `close_visit`). Server recomputes prices. Owner admin CRUD (menu, tables, settings) writes directly through RLS.
- RLS on every table. Guests are Supabase anonymous users and read only their own visit.
- Order lines snapshot name, option and price at order time.
- Orders auto-accept. Status: received, preparing, ready, served; or cancelled with reason. `revert_order` undoes one step within 2 minutes, never after payment.
- QR links use random per-table slugs, never sequential table numbers.
- Review fixes (`20261125000001_review_fixes.sql`, test `review_fixes.sql`): guest RPCs take the visit explicitly: `place_order(p_request_id, p_lines, p_note, p_visit)`, `call_waiter(p_visit)`, `request_bill(p_method, p_visit)`. `place_order` locks the visit, then checks idempotency and `VISIT_CLOSED`; bad lines raise `INVALID_LINES`. Order numbers live in `private.order_counters` (not on `restaurants`, so an order doesn't wake every guest). `join_table` locks a table after 5 wrong PINs for 15 min (`PIN_LOCKED`); misses return `{error}` json, because a raise would roll back the miss count. `invite_info` is read-only; `accept_invite` sets `opened_at`.
- Profit page reads `margin_report(from, to, hourly)` (owner-only, grouped in SQL; `20261125000002_margin_report.sql`), never raw order lines (PostgREST caps at 1000 rows).
- Two roles only: `owner` and `staff`. The `staff_role` enum still holds `kitchen`/`waiter`, but a check constraint blocks them (`20261119000001_two_roles.sql`). Staff do everything on the board and see no costs, pay or profit; they do see bill totals, because they settle bills. Test: `staff_roles.sql`.
- Self-serve (`20261121000001_self_serve.sql`): `/admin/setup` calls `create_restaurant` (confirmed email, one owned restaurant per user in beta). Each restaurant has `timezone` and optional `second_lang` (`'ar'` or null). Arabic names are optional (`''` falls back to English via `pick`). Test: `self_serve.sql`. Anonymous-user cleanup cron: `20261121000002_cleanup_cron.sql`.
- Profit (`20261119000002_profit.sql`): owner sets cost per dish/option (`item_costs`); a trigger snapshots each line's cost into `line_costs`. Staff "Shift mode" = `clock_in()` / `clock_out()` into `shifts` at the `staff_pay` rate (forgotten clock-out caps at 14 h). `profit_report(from, to)` is owner-only. Costs, pay and report never reach guests or staff. Test: `costs.sql`.
- Flow upgrade (spec `docs/superpowers/specs/2026-11-22-flow-upgrade-design.md`, migration `20261122000001_flow_upgrade.sql`): `/join/<token>` invites; service requests have ack / nudge / `pay_method`; staff settle bills with `settle_bill`; `restaurants.logo_url` (no logo = monogram `VenueMark`). Tests: `invites.sql`, `requests_flow.sql`.

- Brand kit (spec `docs/superpowers/specs/2026-11-27-brand-kit-menu-psychology-design.md`, migration `20261127000001_brand_kit.sql`): `accent` (hex, default `#1E2A5A`), `vibe` (sufra/bold/clean/classic), `cover_url`, `welcome_note`/`_ar` (<= 280), `instagram` (handle). Colour comes through `brandTokens` (`lib/brand.ts`, contrast guard), logo swatches from `dominantColors` (`lib/palette.ts`). Settings has a live phone preview (`BrandFields.tsx`). Test: `brand_kit.sql`.
- Menu psychology (plan `docs/superpowers/plans/2026-11-28-menu-psychology.md`, migrations `20261128000001_menu_signals.sql`, `20261128000002_addons.sql`): `menu_items.tags` (preset chef/new/spicy/veg/signature, max 3), `featured` (category hero), `addon_max`; `item_addons` (multi-pick, priced); `item_pairings` (owner "goes well with", max 3 in UI). `menu_signals(restaurant)` returns real-data `popular` (top 2 per category, 30 days, >= 3 sold), `quick` (top 6) and co-ordered `pairs`; "Popular" is never typed by hand. `place_order` lines take `addon_ids` (duplicate/foreign id = `INVALID_LINES`, missing or over max = `PRICE_CHANGED`) and `via` (pairing/quick/usual); lines snapshot `addons` jsonb. `menu_stats(from, to)` owner-only: avg basket, suggested lines. Client helpers in `lib/menu.ts` (`rankSection`, `pickNudge`, `reconcileCart`, `lineExtras`). Tests: `menu_signals.sql`, `addons.sql`, `lib/menu.test.ts`.

- Return loop (plan `docs/superpowers/plans/2026-11-28-return-loop.md`, migration `20261128000003_feedback.sql`): `restaurants.google_review_url` (https, <= 500); `visit_feedback` (one row per guest per visit, owner reads only); guests write through `leave_feedback(p_visit, p_rating, p_note)` (`INVALID_RATING`; `FORBIDDEN` unless they sat at that visit and it closed in the last 24 h; `p_note` null keeps the saved note, `20261128000006_feedback_keep_note.sql`). `guest_session` also returns `last_visit` and `rating`. Thank-you screen = `ClosedVisit` in `Welcome.tsx`; Google link shows to every rater (no review gating). Owner reads `/admin?page=feedback` (`FeedbackPage.tsx`, 30 days, <= 3 flagged). Device memory: localStorage `tably-memory` = `{[restaurantSlug]: Usual}` saved on each order (`lib/memory.ts`), plus `cb-name`; "Forget me" clears both. Tests: `feedback.sql`, `lib/memory.test.ts`.
- Child tables reach `menu_items` through ONE composite FK `(item_id, restaurant_id)` (`20261128000004_tenant_fks.sql`, `…05_tenant_fks_embed.sql`). Never add a second FK from `item_options`/`item_addons` to `menu_items`: PostgREST embeds become ambiguous (PGRST201) and every guest menu renders empty. Test: `tenant_fks.sql`.

## UI rules
- Every user-facing guest string has EN and AR (Arabic shows only when `second_lang = 'ar'`). Staff and owner UI are English-only for now. Use logical CSS (`ms-`, `me-`, `start`, `end`); `dir` is set on `<html>`.
- Tokens and rules: `design.md` (source of truth), `docs/brand/sufra/README.md`. Cream `#F6F3EB`, indigo `#1E2A5A`, ochre for shapes only. Guest: Fraunces + Beiruti display, IBM Plex body. Owner and staff: Inter (`components/ops-font.tsx`); `/admin/qr` resets to Fraunces/Plex for printed cards.
- Guest: always light, mobile-first, thumb-zone actions, 48px controls. Staff: dark default with light toggle, 48px. Owner: light default with dark toggle, plain and dense, 40px controls.
- Owner and staff run in the fit-to-screen ops shell (2026-11-25): no page scroll at 1280x800+, detail in the right rail (`ResponsiveSheet rail` + `RailSlot`), view state in the URL (`?page=`/`?sel=`, staff `?tab=`). Rules in `design.md` "Ops shell".
- Responsive on every ratio, landscape included: rules in `design.md` "Responsive" (`fit:` / `short:` variants, container queries inside the ops shell, `scroll-cue` on horizontal rails, safe-area insets). Check with `scripts/responsive-check.js`.
- Reduced motion = short opacity fade (global rule in `app/globals.css`), not `transition: none`.
- All clocks format in the restaurant's `timezone` (`useVenue().tz`, `getStaff().timezone`), never the browser zone. `dayRange(date, tz)` is DST-safe.
- No AI-template tells: no gradient blobs, glows, emoji labels, uppercase eyebrow over every heading, filler taglines.

## Gotchas
- PowerShell blocks `npm.ps1`: use `npm.cmd run dev` (or `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned`).
- Tailwind v4 runs through the `@tailwindcss/turbopack` loader rule in `next.config.ts`; no `postcss.config`. Remove that rule and every page goes unstyled. Keep its `condition: { not: "foreign" }`, or `next/font` CSS fails with "Can't resolve @vercel/turbopack-next/internal/font/google/font".
- Dev only: the Turbopack Tailwind loader can miss a new `@utility` class used in TSX until `globals.css` content changes (touch is not enough). Prod build is fine.
- Next 16 uses `proxy.ts`, not `middleware.ts`. Read `node_modules/next/dist/docs` before using Next APIs (see `AGENTS.md`).
- Guest Supabase client uses localStorage key `cb-guest`; staff use `@supabase/ssr` cookies. Both work in one browser. Do not rename the key (logs guests out).
- `apply_migration` via MCP may be declined; then the user runs SQL in the dashboard. `execute_sql` works for reads and tests.
- Live DB may not match `seed.sql` (owner deletes tables). `ordering_flow.sql` needs tables 6 and 7: insert them inside the test block (it rolls back).
- Realtime patches local state from the payload with `applyChange` (`lib/live.ts`), never refetch-all per event. Payload rows have no joins: an order INSERT fetches that one order with its lines; UPDATEs merge over the old row so `order_lines` survive. Full reload only on reconnect or visibility resync (guarded by a load sequence).
- Root `app/layout.tsx` must not call `cookies()` (keeps `/`, `/privacy`, `/terms` static). Language comes from `CookieLang` in the `app/t`, `app/admin`, `app/staff` layouts and the `app/(public)/(lang)` group (login, join, reset-password, signup); an inline script in `<head>` sets `lang`/`dir` from the cookie for static pages.
- Realtime cannot filter DELETE events, so the board misses bulk deletes until reload.
- Password reset links go to `/reset-password`. Supabase Auth "Site URL" and "Redirect URLs" must list the production domain, or links point at localhost. The page also accepts `?token_hash=…&type=recovery` (works across devices if the email template uses it).
- Landing `/`: static markup in `components/landing/markup.ts` (from `brand-demos/tably/landing-a.html`), CSS scoped to `.tl` in `landing.css`, GSAP + Lenis in `LandingMotion.tsx`. `HOME_TABLE_SLUG` is gone.
- Owner admin below `lg` uses a bottom tab bar (`components/admin/BottomNav.tsx`: Home, Board, Orders, Menu, More sheet), not the sidebar sheet. Sidebar footer and More sheet share `useOwnerActions()` in `AdminSidebar.tsx`. Cards use `PANEL` from `OwnerHome.tsx`.
- Global element styles in `app/globals.css` go in `@layer base`. An unlayered `p { text-wrap: … }` beat `truncate` / `whitespace-nowrap` everywhere.
- `sr-only` spans are absolutely positioned: give every scroll container `relative`, or they leak page scroll.
- Arabic fonts switch by language: `:where(:lang(ar))` in `globals.css` swaps `--font-sans` / `--font-display`. next/font's "<font> Fallback" face is local Arial over all Unicode (Turbopack ignores `adjustFontFallback: false`), so Arabic inside an English page needs `lang="ar"` or it renders in Arial.
- Beiruti's space is 0.11em, so Arabic `.font-display` gets `word-spacing: 0.12em`. Leader rows (`.leader`) use `items-baseline-last` so dots sit on a wrapped name's last line.
- `ResponsiveSheet` `full` = right side panel on desktop (`grid` = wide, for `BulkDishes`), Drawer below 768px. Ctrl/Cmd+Enter clicks the submit or `data-primary` button.

## Working rules
- Pick skills per `docs/WORKING-DIRECTION.md`.
- Commit only when the user asks. Git needs `-c safe.directory=*` (repo owned by Codex sandbox user).
- Subagents: Sonnet medium or Opus low only.
