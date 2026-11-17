# ChestBest — QR table ordering

Dine-in ordering app. Guest scans a table QR, enters an optional name, orders from the menu; staff see orders live, move them through preparation, handle waiter calls and bills. Fictional UAE burger brand "ChestBest", English + Arabic (RTL), prices in AED.

Design spec (source of truth): `docs/superpowers/specs/2026-11-16-qr-ordering-design.md`.

## Status (2026-11-17)
- **Remaining work lives in `docs/TASKS.md`.** Read it first, tick items as they land.
- Rebuilt on **Next.js 16 (App Router) + Supabase, deploying to Vercel**. Guest app, staff board, owner admin, QR sheet and `/dev` launcher are built; `tsc` + `eslint` clean; DB flow test passes. Next: live E2E, design pass, accessibility, deploy.
- **Brand:** "ChestBest" is the demo venue name. **Sufra (سفرة) v2 is ported (2026-11-17)** across guest, staff, owner, QR print and `/dev`. Spec: `docs/brand/sufra/README.md`. Visual reference: `brand-demos/sufra-v2-app.html`. Port decisions: `.superpowers/sdd/2026-11-16-sufra-port/progress.md`.
- Old OpenAI Sites demo (vinext + Cloudflare D1) was copied to `_legacy/` for reference only. Do not extend or import from it; delete once done.
- Supabase cloud project ref `xyptwnbukercpptbleei` (project-scoped MCP in `.mcp.json`). No Docker on this machine: no `supabase start`.
- Seed logins (demo only, change before anything public): owner `anasowner` / `anas123`, staff `anasstaff` / `anas123`. Usernames map to `<name>@chestbest.test` via `toEmail()`.

## Gotchas
- PowerShell blocks `npm.ps1`: use `npm.cmd run dev` (or `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned`).
- Tailwind v4 runs through the `@tailwindcss/turbopack` loader rule in `next.config.ts`; there is no `postcss.config`. Remove that rule and every page goes unstyled. `_legacy/` is excluded with `@source not` in `app/globals.css`.
- Next 16 uses `proxy.ts`, not `middleware.ts`. Read `node_modules/next/dist/docs` before using Next APIs (see `AGENTS.md`).
- Guest Supabase client uses localStorage key `cb-guest`; staff use `@supabase/ssr` cookies. Both work in one browser.
- Owner admin CRUD (menu, tables, settings) writes directly through RLS; guest and order-flow writes go through RPCs only.
- Staff and owner UI are English-only for now; guest UI is EN + AR.
- `apply_migration` via MCP may be declined; the user then runs SQL in the dashboard. `execute_sql` works for reads and tests.

## Target stack and commands
- Next.js latest, TypeScript, Tailwind v4, shadcn/ui, `@supabase/ssr`.
- `npm run dev` · `npm run build` · `npm run typecheck` · `npm run lint`
- DB: migrations in `supabase/migrations/`, tests in `supabase/tests/` (pgTAP). Apply with Supabase MCP `apply_migration`, check with `get_advisors`.

## Routes
- Guest: `/t/[slug]` welcome → `/t/[slug]/menu`, order tracker, table bill.
- Staff (login): `/staff` live board, calls, tables & bills.
- Owner (login): `/admin` menu, tables + QR sheet, settings, staff invites.
- Dev only: `/dev` table links + one-click owner/staff sign-in + reset. Must 404 in production.

## Data rules
- Money is integer fils. Never floats.
- Every table has `restaurant_id` (tenant-ready for future self-serve sign-up).
- All writes go through Postgres functions (`join_table`, `place_order`, `call_waiter`, `request_bill`, `advance_order`, `cancel_order`, `resolve_request`, `record_payment`, `close_visit`). Server recomputes prices.
- RLS on every table. Guests are Supabase anonymous users and read only their own visit.
- Order lines snapshot name/option/price at order time.
- Orders auto-accept. Status: received → preparing → ready → served, or cancelled with reason.
- QR links use random per-table slugs, never sequential table numbers.

## UI rules
- Every user-facing string has EN and AR. Use logical CSS (`ms-`, `me-`, `start`, `end`), `dir` set on `<html>`.
- Brand is Sufra v2 (pearl `#F4F4F1`, indigo `#1E2A5A`, ochre for shapes only). Tokens and rules: `.tastemaker/style-lock.md`, `docs/brand/sufra/README.md`.
- Guest: always light, mobile-first, thumb-zone actions, 48px controls. Staff: dark default with light toggle, 48px. Owner: light default with dark toggle, plain and dense, 40px controls.
- Reduced motion = short opacity fade (global rule in `app/globals.css`), not `transition: none`.
- Guest, staff and owner clocks all format in `VENUE_TZ` (`lib/stats.ts`), never the browser zone.
- No AI-template tells: no gradient blobs, glows, emoji labels, uppercase eyebrow over every heading, filler taglines.

## Skills per task
- UI: `web-design-engineer` (lead) + Inspo MCP references first; gate with `no-ai-design-slop`; `localization-design` for RTL; `form-design`, `loading-states`, `error-handling-ux`, `better-accessibility`.
- DB: `supabase:supabase`, `supabase:supabase-postgres-best-practices`, `superpowers:test-driven-development`.
- Testing: live Playwright MCP against the dev server (guest 390x844, staff 1280x800), screenshots + console check each step.
- Process: `superpowers:writing-plans`, `superpowers:subagent-driven-development`, `superpowers:verification-before-completion`.

## Working rules
- Commit only when the user asks. Git needs `-c safe.directory=*` (repo owned by Codex sandbox user).
- Subagents: Sonnet medium or Opus low only.
