# Sufra v2 Port Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
> On approval, copy this file to `docs/superpowers/plans/2026-11-16-sufra-port.md` and mark `docs/superpowers/plans/2026-11-16-ui-redesign.md` as superseded (one line at its top).

## Context
The user designed the approved **Sufra v2** brand and a clickable prototype of all three apps (artifact https://claude.ai/artifact/HiLitP5oS3EFFTwwgM5Ri5, local copies `brand-demos/sufra-v2.html`, `brand-demos/sufra-v2-app.html`, `brand-demos/sufra-v2/tokens.css`). The app still runs the ChestBest ember/cream tokens from the earlier shadcn redesign, which stopped mid Task 11. This plan ports the app to the Sufra look on the existing shadcn component layer, and adds the owner pages the prototype has but the app lacks (Home dashboard, Orders, embedded Live board).

User decisions (2026-11-16):
- Full owner port: Home (KPIs, by-hour chart, floor plan, latest orders, top dishes), Orders, Live board, plus Menu/Tables/Team/Settings.
- Keep the ChestBest seed as the venue. Sufra is the platform brand (staff/owner chrome, login, table-card footer, "Served by Sufra" on welcome). No DB changes.
- Guest menu follows the prototype, including the featured photo card (overrides the earlier "remove hero card" feedback).
- Old redesign Task 11 is folded in: this plan supersedes the old one.

**Goal:** Guest, staff and owner apps match `sufra-v2-app.html` screen by screen, in EN/AR, light/dark, on shadcn components restyled to Sufra tokens.

**Architecture:** Swap the shadcn semantic tokens in `app/globals.css` to Sufra values (mapping table in `docs/brand/sufra/README.md`), restyle the shared `components/ui` + `components/app` layer once, then port each surface. Data layer, migrations and RPCs stay unchanged. New owner widgets read existing tables through RLS; pure aggregation lives in `lib/stats.ts` with node tests.

**Tech Stack:** Next.js 16 App Router, React 19, Tailwind v4, shadcn/ui (Radix), vaul, sonner, next-themes, lucide-react, recharts via shadcn `chart`, Supabase JS.

**Spec:** `docs/brand/sufra/README.md` (tokens, mapping, rules, port checklist) + `brand-demos/sufra-v2-app.html` (target look per screen; CSS lines 19-395, render functions lines 622-887) + `brand-demos/sufra-v2.html` sections 5 (table card), 7 (voice + microcopy table), 8 (motion/states). Product spec: `docs/superpowers/specs/2026-11-16-qr-ordering-design.md`.

## Global Constraints
- The prototype is the visual source of truth. Where it conflicts with `.superpowers/sdd/2026-11-16-ui-redesign/common.md` or the old plan's Global Constraints, the prototype wins (featured card, underline tabs, Beiruti headings, no coloured ticket edges).
- Tokens only from `docs/brand/sufra/tokens.css` via the README mapping. Ochre goes into `--ochre` / `--ochre-text`, never shadcn `--accent`. No new hues.
- Fonts: Beiruti 500/700 (`font-display`: venue, dish names, table numbers, big numbers), IBM Plex Sans 400/500/600 (`font-sans`: every interface word, prices, figures, `tabular-nums`), IBM Plex Sans Arabic 400-700. Two families only. Arabic line height 1.75, never below 13px, no letter-spacing, no uppercase, no italics.
- Shape: `rounded-arch` (`999px 999px 8px 8px`) only on the mark, dish photo frames, table markers and table cards. Else radius sm 8 / md 12 / lg 16 / xl 24.
- Controls: 48px (`h-12`) on guest and staff, 40px (`h-10`) on owner. Indigo `--primary` is the only filled button. Secondary = surface fill + 1px line.
- Motion: one curve `cubic-bezier(0.2,0,0,1)`; 120ms press/hover/toggle (press scale .98), 200ms state change, 320ms sheets/drawers; transform/opacity only; reduced motion = short fade.
- Status always colour + word (8px square + label, `StatusTag`). Late = "· Late" in words. No coloured side stripes, gradients on surfaces (photo scrim excepted), glows, emoji.
- Table label: `T12` EN, `ط 12` AR (NBSP). Numbers and the mark never mirror in RTL. Logical CSS only.
- Every user-facing string EN + AR in `lib/i18n.tsx`; copy follows the voice rules and microcopy table in `sufra-v2.html` §7 (never "successfully", "Oops", "AI", "seamless").
- Contrast: text ≥ 4.5:1, UI shapes/focus ≥ 3:1, both themes; re-measure every new pair with `tastemaker/scripts/check_contrast.py`.
- Money integer fils via `formatMoney`; Western digits in both languages.
- No horizontal scroll at 320px; layouts hold at 320, 390, 768, 1024, 1280, 1440.
- No migrations, no RPC changes, no git commits (snapshot via shadow repo, see Execution). Subagents: `model: "sonnet"`, medium effort.
- Skills each implementer invokes first: `web-design-engineer`, `tastemaker`, `ui-ux-pro-max` (`--stack shadcn` / `nextjs` lookups), `no-ai-design-slop`, `localization-design`, plus per-task skills named below. Use context7 for shadcn, next-themes, recharts, Next 16 APIs.

## Review Focus
1. **Theme leakage between surfaces** — guest must stay light even after staff picked dark in the same browser; staff defaults to dark, owner to light. Test in Task 1 (open `/t/x`, `/staff`, `/admin` in one browser after toggling).
2. **Arabic at 320px** — longest AR labels (welcome button, "View order" bar, staff tabs with counts, owner KPI row) must not wrap or overflow. Checked in Tasks 4, 7, 9.
3. **Uncertain-submit retry + paused/closed while cart open** — `cb-pending-<slug>` flow and disabled Send with visible reason must survive the cart restyle. Task 5.
4. **Owner Home with no data** — new venue / quiet day: KPIs show 0 / "—", chart and top dishes show empty states, never NaN or a crash. Unit tests in Task 2, screenshot in Task 9.
5. **Timezone day boundary** — "today" and by-hour buckets use `Asia/Dubai`, not server UTC; an order at 01:30 Dubai counts in today and hour 1. Unit test in Task 2.

---

### Task 1: Foundation — tokens, fonts, per-surface theme

**Skills:** `better-colors`, `dark-mode-design`, `tailwindcss`.

**Files:**
- Modify: `app/globals.css`, `app/layout.tsx`, `components/theme-provider.tsx`, `components/ui/sonner.tsx`, `.tastemaker/style-lock.md`, `.tastemaker/contrast-matrix.txt`
- Create: `app/staff/layout.tsx`, `app/admin/layout.tsx`

**Interfaces:**
- Produces Tailwind utilities: shadcn set re-valued; new `bg-ochre text-ochre-text bg-brand text-on-brand bg-brand-field border-brand-rule bg-status-new|cooking|ready text-status-*` (status tokens now single colours, no `-foreground` fills), `bg-danger-bg`, `bg-scrim`, `shadow-float`; `font-display font-sans font-arabic`; `rounded-arch`; `ease-sufra duration-fast|base|slow` (120/200/320).

- [ ] **Step 1:** Rewrite the `:root` / `.dark` blocks in `app/globals.css` with the README mapping table (light + dark), add `--ochre`, `--ochre-text`, `--brand`, `--on-brand`, `--brand-field`, `--brand-rule`, `--status-*`, `--danger-bg`, `--scrim`, `--photo-scrim`, `--on-photo`, `--shadow-float`; `--radius: 12px`. `--input`: start from `--text-3`, keep only if ≥ 3:1 on `--card`. Delete all ChestBest tokens, `.leader`, `dialog.sheet` and other legacy CSS (grep `components app` first; anything still used gets ported in its task, not kept). Map sidebar tokens: `--sidebar` = `--background`.
- [ ] **Step 2:** `app/layout.tsx`: `Beiruti` (subsets arabic+latin, weights 500/700, `--nf-display`), `IBM_Plex_Sans` (400/500/600, `--nf-sans`), keep `IBM_Plex_Sans_Arabic` (`--nf-arabic`). `metadata.title` template `%s · Sufra`, default "Sufra"; `themeColor` `#F4F4F1`. Remove the root `ThemeProvider` (keep `Toaster` + `LangProvider`).
- [ ] **Step 3:** Per-surface theme: `app/staff/layout.tsx` wraps children in `ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false} storageKey="sufra-staff-theme"`; `app/admin/layout.tsx` same with `defaultTheme="light"`, `storageKey="sufra-owner-theme"`. Guest routes have no provider and never get `.dark`. Bind `components/ui/sonner.tsx` to `useTheme` with a `"light"` fallback. Verify next-themes behaviour with context7 before writing.
- [ ] **Step 4:** Run `check_contrast.py --matrix` for light and dark (text, bg, surface, surface-2, primary, on-primary, ochre, ochre-text, line, input, each status vs card, destructive vs danger-bg, on-brand vs brand/brand-field). Fix only `--input` if needed. Rewrite `.tastemaker/style-lock.md` for Sufra (palette, fonts, radii, motion, control heights, contrast summary) and regenerate `contrast-matrix.txt`.
- [ ] **Step 5:** Verify: `npm run typecheck && npm run lint && npm run build` pass; `/dev`, `/t/<slug>`, `/staff/login`, `/admin` render with Plex + Beiruti, no console errors; Review Focus 1 check passes (toggle staff to light/dark, guest stays light, owner keeps its own choice).

### Task 2: Pure helpers — table label + owner stats (TDD)

**Skills:** `superpowers:test-driven-development`.

**Files:**
- Modify: `lib/format.ts`, `lib/format.test.ts`
- Create: `lib/stats.ts`, `lib/stats.test.ts`

**Interfaces:**
- Produces:
  - `tableLabel(lang: Lang, n: number): string` → `"T12"` / `"ط\u00A012"`.
  - `VENUE_TZ = "Asia/Dubai"`; `dayRange(date: Date, tz?: string): { start: string; end: string }` ISO bounds of that local day.
  - `dayStats(orders: Order[], visits: Visit[]): { orders: number; collectedFils: number; avgTicketFils: number | null; kitchenMedianMin: number | null }` — orders = non-cancelled count; collected = sum `settled_total_fils` of visits with `paid_at`; avg = collected / paid visits (null if none); kitchen median = median minutes `ready_at − created_at` (rounded, null if none).
  - `ordersByHour(orders: Order[], tz?: string): number[]` — length 24, non-cancelled counts by local hour (`Intl.DateTimeFormat` `hourCycle: "h23"`).
  - `topDishes(orders: Order[], n = 5): { name: string; name_ar: string; qty: number }[]` — sums `order_lines.quantity` by `name` over non-cancelled orders, desc, ties by name.

- [ ] **Step 1: Write failing tests** in `lib/format.test.ts` (`tableLabel("en",12) === "T12"`, `tableLabel("ar",12) === "ط\u00A012"`) and `lib/stats.test.ts`:
  - `dayStats([], [])` deep-equals `{ orders: 0, collectedFils: 0, avgTicketFils: null, kitchenMedianMin: null }`.
  - 3 orders (one cancelled), 2 paid visits settled 8100 and 4500 → `orders 2, collectedFils 12600, avgTicketFils 6300`; ready deltas 6, 9, 14 min → `kitchenMedianMin 9`.
  - `ordersByHour` with an order at `2026-11-16T21:30:00Z` → index 1 is 1 (01:30 Dubai, Review Focus 5); cancelled orders not counted.
  - `dayRange(new Date("2026-11-16T21:30:00Z")).start === "2026-11-16T20:00:00.000Z"`.
  - `topDishes` merges two orders' "Signature" lines (2 + 1) → first `{ name: "Signature", qty: 3 }`; excludes cancelled.
- [ ] **Step 2:** `npm test` → FAIL (functions not defined).
- [ ] **Step 3:** Implement in `lib/format.ts` / `lib/stats.ts` with stdlib `Intl` only.
- [ ] **Step 4:** `npm test` → PASS; `npm run typecheck` passes.

### Task 3: Shared component layer + brand mark

**Skills:** `interfaces-that-feel`, `better-accessibility`, `icon-system`.

**Files:**
- Modify: `components/brand.tsx`, `public/icon.svg`, `public/favicon.svg`, `components/ui/{button,input,textarea,select,switch,tabs,toggle-group,dialog,alert-dialog,sheet,drawer,radio-group,table,sidebar,badge}.tsx`, `components/app/{status-badge,quantity-stepper,responsive-sheet,empty-state}.tsx`, `app/dev/ui/*`
- Create: `components/app/arch.tsx`

**Interfaces:**
- Consumes: Task 1 tokens; `tableLabel`.
- Produces:
  - `BrandMark({ className })` — Sufra mark from `docs/brand/sufra/mark.svg` (`currentColor`, never mirrored). `BrandLockup({ size?: "sm"|"md", order?: "en-first"|"ar-first", className })` — mark + "Sufra" | divider | "سفرة" in `font-display` 700; AR UI uses `ar-first`.
  - `Button` variants: `default` (indigo, h-12, scale .98 on press), `secondary` (card + border, hover `bg-muted`), `ghost`, `link` (text-2 underline offset 3), `destructive`; sizes `default` h-12, `sm` h-10, `xs` h-8 rounded-sm, `icon` 40px. Owner screens pass `size="sm"`.
  - `Input/Textarea/SelectTrigger`: h-12 (`size="sm"` h-10), hover border text-3, `aria-invalid` border destructive, focus ring 2px `--ring`.
  - `Switch`: 40×24 track, indigo when on, thumb RTL-aware; optional visible label slot.
  - `Tabs` gets `variant="underline"` (inset 2px bottom bar on selected, used by guest categories and staff header) and `ToggleGroup` gets `variant="segmented"` (surface-2 track, selected = card + line ring, used by owner filters).
  - `StatusTag({ status, late?, label? })` replaces the old badge: 8px rounded-sm square in `--status-*` / `--ochre` / `--primary` + word.
  - `Arch({ src, alt, width, height, className })` — returns `null` when `src` is falsy; `rounded-arch overflow-hidden bg-muted`, `next/image` cover.
  - `QuantityStepper({ value, onChange, min, filled? })` — 40px, `filled` = indigo fill.
  - `ResponsiveSheet`: bottom sheet radius-xl top + 40×4 grab bar + `shadow-float`, rise 320ms; side variant 440px from inline-end with header/body/footer hairlines.
  - Dialog/AlertDialog: radius-xl, p-6, `shadow-float`, scrim `--scrim`.

- [ ] **Step 1:** Restyle each primitive to the prototype CSS (`sufra-v2-app.html` lines 39-88, 187-211, 268-274). Keep Radix behaviour and existing props.
- [ ] **Step 2:** Swap `BrandMark`/`BrandLockup` and both public icons (indigo mark on pearl).
- [ ] **Step 3:** Update `/dev/ui` preview to show every variant in light + dark + AR.
- [ ] **Step 4:** Verify: typecheck/lint pass; screenshot `/dev/ui` 1280 light, dark, AR; every state (hover, focus, pressed, disabled, invalid) visible; contrast of each new pair re-measured.

### Task 4: Guest welcome + menu

**Skills:** `form-design`, `responsive-design`.

**Files:** Modify `components/guest/{Welcome,Chrome,MenuView,GuestApp}.tsx`, `lib/i18n.tsx`.

**Interfaces:** Consumes `Arch`, `Button`, `Tabs variant="underline"`, `QuantityStepper filled`, `BrandMark`, `tableLabel`, `formatMoney`.

- [ ] **Step 1: Welcome** (prototype `welcomeV`, CSS lines 107-122): full-height `bg-brand text-on-brand`, arch frame 248×304 (`bg-brand-field`; shows the first featured dish photo if one exists), 296px `brand-rule` table line, venue name Beiruti 40 (`name_ar` in AR), "Table 6 · Welcome" line, form pinned to bottom: name field (optional hint), PIN field only when `pin_required` with hint/error kept in reserved space, paused note on `brand-field`, full-width pearl-on-indigo "Open the menu" button, foot "Served by Sufra" with mark. Language switch = small ghost button top-end.
- [ ] **Step 2: Header** (`gHead`): sticky, venue name Beiruti 22, "Table 6" small text-2, receipt icon button (40px) when the guest has orders; category `Tabs variant="underline"` horizontally scrollable; paused banner `bg-muted` rounded-md.
- [ ] **Step 3: Menu body** (`menuV`, `dishRow`, CSS 133-153): featured card = first item with a non-null `badge` in the category (200px photo, bottom photo-scrim, Beiruti 22 name + price); rows: name Beiruti 19, description 14 text-2, price `tabular-nums`, control = `secondary xs` "+ Add" (opens sheet if item has options), `filled` stepper once a simple item is in cart, "Sold out today" word when unavailable (row greyed, photo grayscale); `Arch` 80×96 at row end, no placeholder when no photo. Sticky footer: 56px indigo bar "View order · 3 items" + total.
- [ ] **Step 4:** Copy from §7 microcopy (welcome, name hint, wrong code, paused). Verify at 390×844 EN + AR and 320 wide: matches prototype frames, no overflow (Review Focus 2), console clean.

### Task 5: Guest item sheet + cart

**Files:** Modify `components/guest/{ItemSheet,CartSheet,GuestApp}.tsx`, `lib/i18n.tsx`.

- [ ] **Step 1: Item sheet** (`itemSheet`, CSS 189-205): bottom `ResponsiveSheet`, close icon top-end, hero `Arch` 184×224 centred, Beiruti 28 name, description, options as bordered 48px radio rows (`RadioGroup`; checked = ink ring; extra price end-aligned), note textarea, footer stepper + full "Add · AED 42" button.
- [ ] **Step 2: Cart sheet** (`cartSheet`, CSS 206-209): title "Your order", lines (Beiruti 18 name, option · note small, amount, stepper, "Remove" link), empty text, total row, paused note, footer "Keep browsing" secondary + "Send to the kitchen · total" primary, disabled with visible reason when paused/closed.
- [ ] **Step 3:** Keep the `cb-pending-<slug>` uncertain-submit retry ("Send again (it won't duplicate)") and success-is-silent rule (cart closes, tracker shows). Verify Review Focus 3 manually: pause ordering from owner while cart open → Send disabled with note; network-fail path shows retry.

### Task 6: Guest tracker + bill + ended states

**Files:** Modify `components/guest/{TableView,GuestApp}.tsx`, `lib/i18n.tsx`.

- [ ] **Step 1: Tracker** (`trackV`, CSS 155-185): "Order 2 · sent 7:42 PM" small; Title-1 Beiruti headline per status (§7 copy: "Your order is with the kitchen", "The kitchen is preparing it", "It is ready and on its way to you", "Enjoy your meal", cancelled reason); 4-step vertical timeline (done = ink dot + check, now = ochre ring + dot with sub-note, wait = muted), times `tabular-nums`; per-order blocks with `StatusTag` and lines (32×38 arch thumbs); table total; actions grid: "Order more" wide primary, "Call a waiter" (disabled → "Someone is on their way") and "Ask for the bill" secondary with icons.
- [ ] **Step 2: Bill view:** lines, table total, `bg-muted` note (bill vs paid copy), back button (icon flips in RTL).
- [ ] **Step 3:** Visit-ended and invalid-link states restyled to the same frame. Verify full guest flow EN + AR at 390×844.

### Task 7: Staff shell + live board

**Skills:** `dark-mode-design`, `number-details`.

**Files:** Modify `components/staff/{StaffHeader,StaffBoard,Board,OrderCard,CallsTray,CancelOrderDialog}.tsx`, `lib/i18n.tsx`.

**Interfaces:** Produces `Board` usable with `embedded` (no header/tabs) for Task 10: `StaffBoard({ ..., embedded?: boolean })`.

- [ ] **Step 1: Header** (`s-top`, CSS 215-226): 60px card bar: mark + venue name, `Tabs variant="underline"` Board / Tables / Menu with counts, end: "Live" dot label, "Shift on" switch (chime + wake lock), overflow menu (theme, language, sign out). Paused banner below. At ≤900px venue name and Live label hide.
- [ ] **Step 2: Calls row** (CSS 227-231): one chip per request: table label Beiruti 20, "Wants the bill" / "Wants a waiter", since, small primary "Done".
- [ ] **Step 3: Columns + tickets** (CSS 232-253, `ticket`): New / Preparing / Ready with counts and §7 empty copy; ticket = card radius-lg p-4: table Beiruti 36, guest name ellipsis, age end-aligned (late: destructive colour + "· Late"), lines qty-first (28px qty column, option/note small), kitchen note on `bg-danger-bg`, one full-width action (Start / Mark ready = primary, Served = secondary), footer clock + "Cancel" link. Fresh tickets fade in with `bg-muted` that clears after 4s. Remove the old coloured start-edge border. Keep ≥ 4 tickets per column at 1440×847.
- [ ] **Step 4: Cancel dialog** (`cancelDlg`): radio reasons Sold out / Kitchen closing / Guest asked, stored in English; "Keep order" secondary + "Cancel order" primary.
- [ ] **Step 5:** Verify 1280×800 dark (default) + light, EN + AR, 768 and 390 (columns stack); late ticket and dialog screenshotted.

### Task 8: Staff tables, menu toggles, login

**Files:** Modify `components/staff/{TablesView,MenuToggles}.tsx`, `app/staff/login/page.tsx`, `lib/i18n.tsx`.

- [ ] **Step 1: Tables** (`visitCard`, CSS 255-261): auto-fill grid min 260px; card: table Beiruti 40 + `StatusTag` (Seated = primary, Bill asked = ochre, Paid · Cash/Card = ready), meta line (guests · orders · since), amount 26px, "In the kitchen" in cooking colour, Cash / Card secondary with icons + "Close table" primary wide, disabled rules unchanged (via `ConfirmAction`).
- [ ] **Step 2: Menu toggles** (`mlist`): max-w 720 bordered list, sold-out note above, name (strikethrough + muted when off), switch with "Available" / "Sold out" word.
- [ ] **Step 3: Login:** centred card on `bg-background`, `BrandLockup md`, fields h-12, primary submit; existing sign-in/sign-up modes and errors kept.
- [ ] **Step 4:** Verify payment → close flow at 1280×800, AR, 390.

### Task 9: Owner shell + Home dashboard

**Skills:** `dataviz`, `data-visualization`, `information-architecture`.

**Files:**
- Modify: `app/admin/page.tsx`, `components/admin/{AdminApp,AdminSidebar}.tsx`, `lib/i18n.tsx`
- Create: `components/admin/OwnerHome.tsx`, `components/admin/HourChart.tsx`, `components/admin/FloorPlan.tsx`, `components/admin/OrdersTable.tsx`, `components/admin/use-live-refresh.ts`, `components/ui/chart.tsx` (shadcn `chart`, adds `recharts`)
- Delete: `components/admin/TodayStats.tsx` (replaced by KPI row)

**Interfaces:**
- Consumes: `dayStats`, `ordersByHour`, `topDishes`, `dayRange`, `tableLabel`, `StatusTag`, `Arch`.
- Produces: `OwnerPage = "home" | "board" | "orders" | "menu" | "tables" | "team" | "settings"`, read from `?page=` (default `home`) and set with `router.replace`; `OrdersTable({ orders, compact? })`; `useLiveRefresh(rid)` subscribes to `orders` + `visits` changes and calls `router.refresh()` debounced 1s.

- [ ] **Step 1: Data** in `app/admin/page.tsx`: add today's orders (`dayRange(now)`), same-weekday-last-week orders (counts only via `ordersByHour`), open visits, today's paid visits. Read-only, RLS staff policies.
- [ ] **Step 2: Sidebar** (`sb`, CSS 277-291) on shadcn `Sidebar` (248px): venue block (mark + venue name + "Owner"), Home, Live board (live count), Orders; group label "Venue": Menu, Tables & QR, Team, Settings; footer: avatar initial + name + role, theme, language, "Open kitchen board". ≤900px: horizontal scroll nav per prototype or shadcn mobile sheet (keep the existing trigger).
- [ ] **Step 3: Page header** (`om-h`): h1 Plex 600 28px, one muted line, actions end. Home actions: "Taking orders" switch (writes `restaurants.ordering_paused`, inverted) + "Print table cards" secondary → `?page=tables`.
- [ ] **Step 4: Home body** (`homeP`, CSS 297-330): KPI row separated by hairlines (Orders today, Collected AED, Average ticket, Kitchen time `n min`; "—" when null) 4 cols → 2 at ≤1100; grid 1.7fr/1fr: `HourChart` (shadcn ChartContainer + recharts LineChart, today = foreground solid, last week = muted dashed, x domain = active hours ±1 or 11-23 when empty, 12px Latin axis labels, `direction: ltr`) and `FloorPlan` (SVG grid of arch markers by table number: filled primary = seated, ochre = bill asked, outline = free, table number labels, legend); second grid: latest 6 orders `OrdersTable compact` with "Orders" link, top dishes list (40×48 arch thumb, name, 4px bar, first bar ochre, qty). Empty states for each widget (Review Focus 4).
- [ ] **Step 5:** Verify 1440×900, 1024, 768, 390, light/dark, EN/AR; empty venue screenshot; KPI numbers match a manual SQL check via `execute_sql`.

### Task 10: Owner Orders + Live board

**Files:** Create `components/admin/OwnerOrders.tsx`; modify `components/admin/AdminApp.tsx`, `components/staff/StaffBoard.tsx`, `app/admin/page.tsx`, `lib/i18n.tsx`.

- [ ] **Step 1: Orders** (`ordersP`): segmented filter All / In the kitchen / Served / Cancelled (URL `?filter=`), `OrdersTable` full columns Table (Beiruti), Guest, Status, Items, Placed, Total; guest/items/placed columns hide ≤900px; today's orders, newest first; empty state.
- [ ] **Step 2: Live board** (`board` page): header + bordered radius-lg frame, height `calc(100dvh - header)`, rendering `StaffBoard embedded` (board only, actions live, owner can advance/cancel per existing RLS).
- [ ] **Step 3:** Verify both pages update live when a guest orders.

### Task 11: Owner Menu, Tables & QR, Team, Settings, print sheet, /dev, legacy cleanup

**Skills:** `form-design`, `error-handling-ux`.

**Files:** Modify `components/admin/{MenuAdmin,ItemsTable,ItemEditor,TablesAdmin,TeamAdmin,SettingsForm}.tsx`, `app/admin/qr/{page,PrintButton}.tsx`, `app/dev/*`, `lib/i18n.tsx`. Start from the partial old-Task-11 working tree (shadow `0599814`); review it, keep what fits.

- [ ] **Step 1: Menu** (`menuP`, `drawer`): table rows = 36×44 arch thumb, EN name 500 + AR small, category, price, availability switch, "Edit" secondary xs; "Add dish" primary in header. Editor = side `ResponsiveSheet` 440px (header/body/footer hairlines): EN/AR name and description (AR fields `dir="rtl"`), price AED, category, photo upload, options, featured tag (`badge`, label "Featured tag", explains it puts the dish in the photo card), Cancel + Save. Carry ledger R13 fixes (44px option buttons, discard-unsaved confirm, visible reason on disabled category delete, rename reset on failure, price cap).
- [ ] **Step 2: Tables & QR** (`tablesP`, CSS 333-344): grid of tent cards (arch top, number Beiruti 44, `طاولة n`, 116px QR in ink, EN + AR scan CTA, table code when `pin_required`, Sufra foot); per-card overflow menu: set code, new link (`ConfirmAction`), delete; "Add table" + "Print table cards" in header.
- [ ] **Step 3: Print sheet** `/admin/qr`: table card per `sufra-v2.html` §5 (100×150 mm tent, 50 mm arch radius, 3 mm inner hairline, 32 mm QR indigo on pearl, venue name low, Sufra foot), three per A4, `@media print` only shows cards.
- [ ] **Step 4: Team** (`teamP`): member list with initial avatars and roles, pending invites with Cancel link, invite form (email + Invite, error under field, reserved space).
- [ ] **Step 5: Settings** (`settingsP`): 2-column form (name EN/AR, tagline EN/AR, service mode select), switch rows "Pause ordering" and "Require table code" with descriptions, Save → "Saved" with check for 2.5s (no toast).
- [ ] **Step 6:** `/dev` launcher restyled to plain owner look; `/dev` and `/dev/ui` still 404 in production. Grep for any leftover ChestBest token classes (`paper|ink|board|chalk|ember|st-`) → zero hits.
- [ ] **Step 7:** Verify each page 1440 / 768 / 390, EN/AR, light/dark; print preview of `/admin/qr`.

### Task 12: Copy, docs, full verification

**Skills:** `superpowers:verification-before-completion`, `accessibility-audit`, `audit-ai-design-slop`.

**Files:** Modify `lib/i18n.tsx`, `CLAUDE.md` (UI rules + status), `docs/brand/sufra/README.md` ("Ported 2026-11-xx"), `docs/TASKS.md`, `.tastemaker/style-lock.md`, `.tastemaker/decisions.log`.

- [ ] **Step 1:** Voice pass over every i18n string against §7 say/never-say lists; Arabic flagged for native review in TASKS.md.
- [ ] **Step 2:** Gates: `npm run typecheck`, `npm run lint`, `npm test`, `npm run build` all pass. `python C:/Users/anas/.claude/skills/tastemaker/scripts/anti_slop_scan.py app components` and `audit_motion.py app components` → no HIGH findings.
- [ ] **Step 3:** Side-by-side visual check: serve `brand-demos/` (`python -m http.server 4321`) and compare each prototype view (`?view=guest|staff|owner`) with the app at the same viewport; list and fix any drift.
- [ ] **Step 4:** Live E2E (headless Chrome via CDP or ego-browser; Playwright MCP is often locked): run `docs/TASKS.md` §1 flow end to end — guest 390×844 EN then AR, staff 1280×800 dark, owner 1440×900 — screenshot + zero console errors at each step. Tick TASKS.md items that pass.
- [ ] **Step 5:** Update docs listed above; record keep/reject question for the user in `.tastemaker/decisions.log`.

---

## Execution
- Subagent-driven (`superpowers:subagent-driven-development`), implementers and reviewers on `model: "sonnet"` medium; escalation Opus low only.
- New ledger `.superpowers/sdd/2026-11-16-sufra-port/` (progress.md, common.md derived from Global Constraints above, reviewer templates copied from the old folder). Snapshots with a copy of `snap.sh` / `pkg.sh`; CRLF → LF before each snapshot. No git commits.
- Order: 1 → 2 → 3, then guest (4, 5, 6), staff (7, 8), owner (9, 10, 11), then 12. Guest and staff/owner groups are independent after Task 3 but share `lib/i18n.tsx`, so run sequentially.

## Verification (end to end)
- Commands: `npm run typecheck && npm run lint && npm test && npm run build`.
- Browser: guest 390×844 + 320, staff 1280×800 + 768, owner 1440×900 + 1024 + 390; EN and AR; staff/owner light and dark; screenshots compared to the prototype; console clean.
- Data: one full order → prepare → ready → served → bill → pay → close cycle with the owner Home KPIs and Orders page reflecting it live.
