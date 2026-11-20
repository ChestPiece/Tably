# ChestBest — QR table ordering

Dine-in ordering app. Guest scans a table QR, enters an optional name, orders from the menu; staff see orders live, move them through preparation, handle waiter calls and bills. Fictional UAE burger brand "ChestBest", English + Arabic (RTL), prices in AED.

Design spec (source of truth): `docs/superpowers/specs/2026-11-16-qr-ordering-design.md`.

## Status (2026-11-17)
- **Remaining work lives in `docs/TASKS.md`.** Read it first, tick items as they land.
- Rebuilt on **Next.js 16 (App Router) + Supabase, deploying to Vercel**. Guest app, staff board, owner admin and QR sheet are built; `tsc` + `eslint` clean; DB flow test passes. Next: live E2E, design pass, accessibility, deploy.
- **Brand:** "ChestBest" is the demo venue name. **Sufra (سفرة) v2 is ported (2026-11-17)** across guest, staff, owner and QR print. Spec: `docs/brand/sufra/README.md`. Visual reference: `brand-demos/sufra-v2-app.html`. Port decisions: `.superpowers/sdd/2026-11-16-sufra-port/progress.md`. **Hallmark redesign (2026-11-17): warm editorial, system locked in `design.md`.**
- Supabase cloud project ref `xyptwnbukercpptbleei` (project-scoped MCP in `.mcp.json`). No Docker on this machine: no `supabase start`.
- Production: https://qr-restauratn-app.vercel.app (Vercel, deploys from `main`). The GitHub repo is **public**: never commit passwords, keys or `.env*` (only `.env.example`).
- Logins are real emails only. The owner is the account linked in `staff_members` (see the note at the top of `seed.sql`). Staff join through an invite on the Team page. There are no seed accounts.
- Invites: the app never emails them. The owner shares `/login?invite=<email>` from the Team page dialog; sign-up still needs the Supabase confirmation email, so custom SMTP must be set up first.

## Gotchas
- PowerShell blocks `npm.ps1`: use `npm.cmd run dev` (or `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned`).
- Tailwind v4 runs through the `@tailwindcss/turbopack` loader rule in `next.config.ts`; there is no `postcss.config`. Remove that rule and every page goes unstyled. Keep its `condition: { not: "foreign" }`, or `next/font` CSS fails with "Can't resolve @vercel/turbopack-next/internal/font/google/font".
- Next 16 uses `proxy.ts`, not `middleware.ts`. Read `node_modules/next/dist/docs` before using Next APIs (see `AGENTS.md`).
- Guest Supabase client uses localStorage key `cb-guest`; staff use `@supabase/ssr` cookies. Both work in one browser.
- Owner admin CRUD (menu, tables, settings) writes directly through RLS; guest and order-flow writes go through RPCs only.
- Staff and owner UI are English-only for now; guest UI is EN + AR.
- `apply_migration` via MCP may be declined; the user then runs SQL in the dashboard. `execute_sql` works for reads and tests.
- The live DB may not match `seed.sql` (owner deletes tables). `ordering_flow.sql` needs tables 6 and 7: insert them inside the test block (it rolls back).
- Realtime cannot filter DELETE events, so the board does not see bulk deletes until reload.
- Password reset emails link to `/reset-password`. Supabase Auth "Site URL" and "Redirect URLs" must list the production domain, or links point at localhost. The page also accepts `?token_hash=…&type=recovery` (works across devices if the email template uses it).
- `/` is the landing page (2026-11-21): static markup in `components/landing/markup.ts` (from `brand-demos/tably/landing-a.html`), CSS scoped to `.tl` in `landing.css`, GSAP + Lenis motion in `LandingMotion.tsx`. `HOME_TABLE_SLUG` is gone. Brand mark = `public/icon.svg` / `BrandMark`.
- Owner admin below `lg` uses a bottom tab bar (`components/admin/BottomNav.tsx`: Home, Board, Orders, Menu, More sheet), not the sidebar sheet. Sidebar footer and More sheet share `useOwnerActions()` in `AdminSidebar.tsx`. Cards use `PANEL` from `OwnerHome.tsx`.
- Global element styles in `app/globals.css` go in `@layer base`. An unlayered `p { text-wrap: … }` beat `truncate` / `whitespace-nowrap` everywhere.
- `sr-only` spans are absolutely positioned: give every scroll container `relative`, or they leak page scroll.
- Arabic fonts are chosen by language: `:where(:lang(ar))` in `app/globals.css` swaps `--font-sans` / `--font-display`. next/font's "<font> Fallback" face is local Arial over all of Unicode (Turbopack ignores `adjustFontFallback: false`), so Arabic inside an English page needs `lang="ar"` or it renders in Arial.
- Beiruti's space is 0.11em, so Arabic `.font-display` gets `word-spacing: 0.12em` (globals.css). Leader rows (`.leader`) use `items-baseline-last` so the dots sit on a wrapped name's last line.
- Dev only: the Turbopack Tailwind loader can miss a new `@utility` class used in TSX until `globals.css` content changes (touch is not enough). Prod build is fine.

## Target stack and commands
- Next.js latest, TypeScript, Tailwind v4, shadcn/ui, `@supabase/ssr`.
- `npm run dev` · `npm run build` · `npm run typecheck` · `npm run lint`
- DB: migrations in `supabase/migrations/`, tests in `supabase/tests/` (pgTAP). Apply with Supabase MCP `apply_migration`, check with `get_advisors`.

## Routes
- Guest: `/t/[slug]` welcome → `/t/[slug]/menu`, order tracker, table bill.
- Staff (login): `/staff` kitchen board ("Line + pass": `components/staff/Board.tsx`, `OrderCard.tsx`; mockups in `brand-demos/kds/`), calls, tables & bills.
- Owner (login): `/admin` home, profit, menu (with dish costs), tables + QR sheet, settings, team (invites, hourly rates, shifts).
- Public: `/` table QR + order button, `/login` (owner and staff, sign-up for invites, forgot password), `/reset-password`. `/staff/login` redirects to `/login`.

## Data rules
- Money is integer minor units of the restaurant's `currency` (columns keep the `*_fils` names). Never floats. Digits come from `Intl` (`currencyDigits`: JPY 0, USD 2, KWD 3); format with `useVenue().money`.
- Every table has `restaurant_id` (tenant-ready for future self-serve sign-up).
- All writes go through Postgres functions (`join_table`, `place_order`, `call_waiter`, `request_bill`, `advance_order`, `revert_order`, `cancel_order`, `resolve_request`, `set_item_available`, `record_payment`, `close_visit`). Server recomputes prices.
- Self-serve (2026-11-21, `20261121000001_self_serve.sql`): new accounts with no membership go to `/admin/setup`, which calls `create_restaurant` (confirmed email, one owned restaurant per user in the beta). Each restaurant has `timezone` and optional `second_lang` (`'ar'` or null); Arabic names are optional (`''` falls back to English via `pick`). Test: `supabase/tests/self_serve.sql`. Anonymous-user cleanup cron: `20261121000002_cleanup_cron.sql`.
- Two roles only (2026-11-17): `owner` and `staff`. The `staff_role` enum still holds `kitchen`/`waiter`, but a check constraint blocks them (`20261119000001_two_roles.sql`). Staff do everything on the board and see no money. Test: `supabase/tests/staff_roles.sql`.
- Profit is automatic (`20261119000002_profit.sql`): owner sets a cost per dish/option (`item_costs`); a trigger snapshots each order line's cost into `line_costs`. Staff "Shift mode" = `clock_in()` / `clock_out()` into `shifts` at the rate in `staff_pay` (forgotten clock-out caps at 14 h). `profit_report(from, to)` is owner-only. Costs, pay and the report never reach guests or staff. Test: `supabase/tests/costs.sql`.
- `revert_order` undoes one step within 2 minutes, never after payment.
- RLS on every table. Guests are Supabase anonymous users and read only their own visit.
- Order lines snapshot name/option/price at order time.
- Orders auto-accept. Status: received → preparing → ready → served, or cancelled with reason.
- QR links use random per-table slugs, never sequential table numbers.

## UI rules
- Every user-facing string has EN and AR (guest Arabic only shows when the restaurant has `second_lang = 'ar'`). Use logical CSS (`ms-`, `me-`, `start`, `end`), `dir` set on `<html>`.
- Brand is Sufra v2, warm editorial (cream `#F6F3EB`, indigo `#1E2A5A`, ochre for shapes only, Fraunces + Beiruti display, IBM Plex body). Tokens and rules: `design.md` (source of truth), `docs/brand/sufra/README.md`.
- Guest: always light, mobile-first, thumb-zone actions, 48px controls. Staff: dark default with light toggle, 48px. Owner: light default with dark toggle, plain and dense, 40px controls.
- Reduced motion = short opacity fade (global rule in `app/globals.css`), not `transition: none`.
- Guest, staff and owner clocks all format in the restaurant's `timezone` (`useVenue().tz`, `getStaff().timezone`), never the browser zone. `dayRange(date, tz)` is DST-safe.
- No AI-template tells: no gradient blobs, glows, emoji labels, uppercase eyebrow over every heading, filler taglines.

## Skills per task
- UI: `web-design-engineer` (lead) + Inspo MCP references first; gate with `no-ai-design-slop`; `localization-design` for RTL; `form-design`, `loading-states`, `error-handling-ux`, `better-accessibility`.
- DB: `supabase:supabase`, `supabase:supabase-postgres-best-practices`, `superpowers:test-driven-development`.
- Testing: live Playwright MCP against the dev server (guest 390x844, staff 1280x800), screenshots + console check each step.
- Process: `superpowers:writing-plans`, `superpowers:subagent-driven-development`, `superpowers:verification-before-completion`.

## Working rules
- Commit only when the user asks. Git needs `-c safe.directory=*` (repo owned by Codex sandbox user).
- Subagents: Sonnet medium or Opus low only.
