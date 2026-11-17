# ChestBest — remaining tasks

Updated 2026-11-17. Tick items here as they land. Plan: `docs/superpowers/specs/2026-11-16-qr-ordering-design.md`.

## Done so far
- [x] Supabase schema, RLS, RPCs, realtime (`supabase/migrations/20261116000001_ordering_schema.sql`), seed, SQL flow test (`supabase/tests/ordering_flow.sql` → `ALL_TESTS_PASSED`)
- [x] Guest app (`/t/[slug]`), staff board (`/staff`), owner admin (`/admin`, `/admin/qr`), dev launcher (`/dev`)
- [x] Staff sign-up mode on `/staff/login` (for invited staff)
- [x] `tsc` and `eslint` clean
- [x] Tailwind wired via `@tailwindcss/turbopack` loader in `next.config.ts` (pages were unstyled before)
- [x] Smoke check in browser (390x844): `/dev` → owner sign-in → T6 welcome → menu, no console errors
- [x] Sufra v2 brand port, all surfaces (plan `docs/superpowers/plans/2026-11-16-sufra-port.md`, ledger `.superpowers/sdd/2026-11-16-sufra-port/progress.md`)
- [x] Partial live E2E 2026-11-17: guest T1 order → staff start/ready/served → call waiter resolved → cancel with reason → owner Orders view; fixed guest clock using browser timezone instead of `VENUE_TZ`

## 1. End-to-end test (live Playwright, guest 390x844, staff 1280x800)
- [ ] Guest "Sara" at T6 orders 2× Signature + Hotshots + Cola = AED 81
- [ ] Staff board chimes, ticket shows "Sara" + "New table"
- [x] Advance received → preparing → ready → served; guest tracker updates live
- [ ] Second guest "Ali" joins T6, orders; table bill shows both
- [ ] Call waiter + Request bill appear on staff board; resolve them
- [ ] Staff records card payment, closes table; old guest link shows "visit ended"
- [ ] Cancel-with-reason path; ordering paused path; table PIN on path
- [ ] Repeat guest flow in Arabic (RTL layout check)
- [ ] Owner admin: add/edit item with photo upload, sold-out toggle, add table, new link, QR sheet print view, staff invite + sign-up
- [ ] Screenshot + console check at every step

## 2. Design fixes found in baseline
- [x] Remove the featured card on the menu (repeats first list item and the welcome photo)
- [x] Remove uppercase "BESTSELLER" eyebrow over the featured title (banned pattern)
- [ ] Replace the cola photo (shows real Coca-Cola branding)
- [ ] Arabic language toggle on welcome is not using the Arabic font

## 3. Design pass (per screen group: guest, staff, owner)
Skills: `web-design-engineer` (lead), `no-ai-design-slop` (gate), `localization-design`, `better-typography`, `dark-mode-design` (staff), `number-details`, `form-design`, `loading-states`, `error-handling-ux`, `interfaces-that-feel`. Inspo MCP: one `recommend` + 1–2 `search_screens` + 3–5 `get_screen` per group.
- [x] Guest: welcome, menu, item sheet, cart, order tracker, table bill, ended/paused states
- [x] Staff: login, live board, calls panel, tables & bills
- [x] Owner: menu admin, tables, QR sheet, settings, staff invites
- [ ] Loading, empty and error states on every screen

## 4. Accessibility
- [ ] `accessibility-audit` on all three surfaces (focus order, labels, contrast, dialog focus trap, reduced motion)

## 5. Ship
- [x] `npm run build` passes
- [ ] Vercel deploy; env: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `NEXT_PUBLIC_SITE_URL`
- [ ] Add the Vercel URL to Supabase Auth redirect/site URLs
- [ ] Confirm `/dev` 404s in production
- [ ] Print QR sheet from the deployed site, scan with a real phone, run full flow
- [ ] Change seed passwords before anything public (`anas123` is demo-only)
- [ ] Optional: Turnstile captcha on anonymous sign-in

## 6. Cleanup
- [x] Delete `_legacy/` (2026-11-17)
- [ ] Commit (only when the user asks)
