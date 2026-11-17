> **Superseded 2026-11-16** by `docs/superpowers/plans/2026-11-16-sufra-port.md` (Sufra v2 port). Kept for history only.

# ChestBest UI Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Take the guest, staff and owner UI from ~5/10 to ≥9/10: clean, fully responsive at any screen ratio, EN/AR, built on shadcn-compatible library components.

**Architecture:** Add a shadcn/ui component layer (Radix) in `components/ui`, rewrite tokens in `app/globals.css` as shadcn semantic variables (light + dark), then rebuild each surface (guest, staff, admin) on those components. Data layer (`lib/supabase/*`, Postgres functions, realtime) is unchanged. Pure helpers (money, plurals, ticket urgency) move to `lib/format.ts` with node tests.

**Tech Stack:** Next.js 16 App Router, React 19, Tailwind v4, shadcn/ui (Radix), vaul, sonner, next-themes, motion, lucide-react, Supabase JS.

**Spec:** `C:\Users\anas\.claude\plans\web-design-engineer-tastemaker-hallmark-vivid-nebula.md` (approved design plan, includes audit findings). Product spec: `docs/superpowers/specs/2026-11-16-qr-ordering-design.md`. Audit screenshots: `C:\Users\anas\AppData\Local\Temp\claude\56204c79c3e79bc8\0512cc0c-5943-402d-b1b8-e9a4ad7515c4\scratchpad\shots\`.

## Global Constraints
- Money is integer fils; format only through `formatMoney` (Task 2). Never floats in state.
- Every user-facing string has EN and AR in `lib/i18n.tsx` (staff + admin included). No hard-coded `"en"`.
- Logical CSS only (`ms-/me-/ps-/pe-/start/end/text-start`). No `left/right` utilities except physical geometry.
- Fonts: Bricolage Grotesque (headings, `font-heading`), Geist (body, `font-sans`, `tabular-nums` for money/timers), IBM Plex Sans Arabic (all Arabic, both scripts present in every page's stack). Arabic: `leading ≥ 1.4`, `tracking-normal`, no `uppercase`.
- Contrast: text pairs ≥ 4.5:1, UI boundaries/icons ≥ 3:1, both themes. Primary button fill must pass 4.5:1 with its label.
- Status colours (`--status-new|cooking|ready|served|cancelled`) are distinct from `--destructive` and `--primary`. Never encode state by colour alone: pair with icon or text.
- Touch targets ≥ 44px on guest and staff surfaces.
- No horizontal scroll at 320px; every layout works at 320, 390, 768, 1024, 1280, 1440, 1920 widths.
- Every destructive or money action goes through `ConfirmAction` (Task 4) or an undo toast.
- Library components are copied into `components/ui` and restyled to tokens; one icon family (lucide); no gradients, glows, emoji, uppercase eyebrows, italic headings.
- Motion: `transform`/`opacity` only, ≤ 300ms for UI, honour `prefers-reduced-motion`.
- Do not change migrations or Postgres functions. Do not commit unless the user asks (git needs `-c safe.directory=*`).
- **Dashboard look (user request 2026-11-16: "all the dashboards should have a proper clean dashboard look with no clutter").** Staff board, staff tables/menu and every admin page share one app shell modelled on shadcn's `dashboard-01` / `sidebar-07` blocks:
  - Shell and headings: compact header (h-14), page title as sentence-case `text-xl font-semibold` (not uppercase condensed display type), and a muted one-line description only where it adds information.
  - Type and colour: body `text-sm`, `muted-foreground` for secondary text. One primary action per view, in the header's `end` slot. Everything else is outline or ghost.
  - Containers and tables: cards with a 1px `border` and no heavy shadows; data in shadcn `Table` or list rows with hairline dividers.
  - Controls: status shown with `Badge` or `Switch`, never big coloured pill buttons. Tabs use the shadcn `Tabs` component, not underlined links.
  - Spacing: consistent `gap-4`/`gap-6` and `p-4`/`p-6` scale. Content uses the full width up to `max-w-7xl`, never a narrow centred column with dead gutters.
  - Banned: uppercase headings, leader dots, chunky black buttons, underlined text-link actions, decorative colour fills.
- **Guest menu taste (same request):**
  - The flame logo, the uppercase condensed headings ("THE SIGNATURE BURGER", "BURGERS", "TABLE 1", "ORDER #1"), the dotted price leaders, the giant hero card and the heavy black Menu/Our-table pill bar all go.
  - Replace them with a sentence-case Bricolage heading scale (section `text-xl font-semibold`, item `text-base font-semibold`) and prices in `font-medium tabular-nums` with currency.
  - The `+` sits on the photo corner only as a real 44px quick-add Button.
  - The view switch is a small segmented `Tabs` in the header.
- Skills each implementer loads first: `web-design-engineer`, `tastemaker`, `better-layout`, `better-typography`, `no-ai-design-slop`, `localization-design`, `responsive-design`, plus per-task ones named in the task.

## Review Focus
1. **PIN-required table with menu-first flow** — guest must still be blocked by PIN before `join_table` succeeds; menu may render read-only behind the PIN screen but ordering must not. Test lives in Task 5.
2. **Uncertain-submit retry** — the `cb-pending-<slug>` localStorage flow (same `requestId`, "Send again (it won't duplicate)") must survive the cart refactor. Test in Task 6.
3. **Arabic at 320px** — longest AR labels (`أرسل للمطبخ`, `أضف للطلب`, table chip, staff header) must not wrap buttons to two lines or push sticky offsets. Checked in Tasks 5, 6, 8.
4. **Ordering paused / visit closed while cart open** — realtime flips `ordering_paused` or closes visit; cart must disable send with a visible reason, not throw. Task 6.
5. **Dark theme status colours** — status chips, urgency borders and destructive buttons must pass contrast in dark mode on the board. Task 1 matrix + Task 8 screenshot check.

---

### Task 1: Foundation — shadcn, tokens, fonts, theme

**Skills:** `tastemaker` (Step 2 contrast + style lock), `better-colors`, `tailwindcss`, context7 for shadcn + Next 16.

**Files:**
- Create: `components.json`, `lib/utils.ts`, `components/theme-provider.tsx`, `.tastemaker/style-lock.md`
- Modify: `package.json`, `app/globals.css`, `app/layout.tsx`, `tsconfig.json` (add `"allowImportingTsExtensions": true`)

**Interfaces:**
- Produces: `cn(...classes)` in `lib/utils.ts`; Tailwind tokens `bg-background text-foreground bg-card bg-primary text-primary-foreground bg-muted text-muted-foreground border-border ring-ring bg-destructive bg-accent`, app tokens `bg-status-new|cooking|ready|served|cancelled` + `text-status-*-foreground`; font utilities `font-heading font-sans font-arabic`; `<ThemeProvider>`; `<Toaster>` mounted in root layout.

- [ ] **Step 1:** Run `npx shadcn@latest init --yes` (style new-york, base neutral, CSS vars, Tailwind v4, `components/ui`, aliases `@/components`, `@/lib/utils`). Then `npm i next-themes motion sonner`.
- [ ] **Step 2:** Add registries to `components.json`: `"@kokonutui": "https://kokonutui.com/r/{name}.json"`, `"@reui": "https://reui.io/r/{name}.json"`, `"@originui": "https://originui.com/r/{name}.json"`. Verify each with `curl -s <url with a known name> | head -c 200` returns JSON; if a URL returns HTML, find the correct one from the registry's docs and record it in the style lock.
- [ ] **Step 3:** Rewrite `app/globals.css` token block (keep `@import "tailwindcss"` and `@source not "../_legacy"` at top). Light: background warm off-white (~`#faf8f5`), card white, foreground warm charcoal (~`#1c1917`), muted-foreground ≥4.5:1 on background and card, primary = ember-deep family (~`#c2410c`, white label ≥4.5:1), accent/brand ember `#e85d2a` for non-text decoration only, border ≥3:1 for inputs (`--input`), softer `--border` for dividers. Dark: board-style warm near-black (`#14110e` family) with chalk foreground. Status tokens per Global Constraints. Remove old `paper/ink/board/chalk/st-*` tokens, `.leader`, `dialog.sheet` CSS once Tasks 5–11 stop using them (leave aliases until Task 11, then delete).
- [ ] **Step 4:** Run `python3 C:/Users/anas/.claude/skills/tastemaker/scripts/check_contrast.py --matrix text=.. bg=.. surface=.. primary=.. accent=.. border=.. on-primary=..` for light and dark, plus each status colour against its foreground. Adjust lightness until all text pairs ≥4.5:1 and UI ≥3:1. Write `.tastemaker/style-lock.md` (palette, fonts, radius `0.75rem` cards / `9999px` chips, spacing scale, motion `200ms cubic-bezier(0.22,1,0.36,1)`, contrast matrix, registry URLs).
- [ ] **Step 5:** `app/layout.tsx`: load `Bricolage_Grotesque` (`--font-heading`), `Geist` (`--font-sans`), `IBM_Plex_Sans_Arabic` weights 400/500/600/700 (`--font-arabic`). Stacks: sans = `var(--font-sans), var(--font-arabic), system-ui`; RTL swaps to arabic first. Wrap children in `ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}` and add `<Toaster richColors={false} position="bottom-center" />`. Keep the `lang` cookie / `dir` logic. Guest routes stay light (Task 5 forces it).
- [ ] **Step 6:** Verify: `npm run typecheck && npm run lint && npm run build` pass; open `/dev` at 390×844 and screenshot — page renders with new fonts, no console errors.

### Task 2: Format helpers + i18n plumbing (TDD)

**Skills:** `superpowers:test-driven-development`, `localization-design`.

**Files:**
- Create: `lib/format.ts`, `lib/format.test.ts`
- Modify: `lib/i18n.tsx` (add `useFormat()` or expose `lang` already present; add `plural` keys), `lib/types.ts` (re-export `money` from format or remove after callers move), `package.json` script `"test": "node --test lib/"`

**Interfaces:**
- Produces:
  - `formatMoney(fils: number, lang: Lang, opts?: { currency?: boolean }): string` — `Intl.NumberFormat(lang === "ar" ? "ar-AE" : "en-AE", { style: currency ? "currency" : "decimal", currency: "AED", minimumFractionDigits: 2 })`. Default `currency: true`.
  - `plural(lang: Lang, n: number, forms: Partial<Record<Intl.LDMLPluralRule, string>> & { other: string }): string` using `Intl.PluralRules`.
  - `ageLevel(ms: number): "fresh" | "warn" | "late"` — warn at ≥ 8 min, late at ≥ 15 min.
  - `formatAge(ms: number, lang: Lang): string` — `"<1m"`/`"7m"`/`"1h 05m"`, Arabic via `Intl.NumberFormat("ar-AE")` digits.

- [ ] **Step 1: Write failing tests** in `lib/format.test.ts` (import from `./format.ts`):
  - `formatMoney(8100, "en")` contains `"81.00"` and `"AED"`; `formatMoney(8100, "en", { currency: false }) === "81.00"`; `formatMoney(8100, "ar")` contains `"٨١"`.
  - `plural("en", 1, { one: "1 order", other: "# orders" })` → `"1 order"`; n=2 → `"2 orders"` (`#` replaced by n); `plural("ar", 2, { two: "طلبان", other: "# طلبات" })` → `"طلبان"`.
  - `ageLevel(7*60e3) === "fresh"`, `ageLevel(8*60e3) === "warn"`, `ageLevel(15*60e3) === "late"`.
  - `formatAge(30e3,"en") === "<1m"`, `formatAge(7*60e3,"en") === "7m"`, `formatAge(65*60e3,"en") === "1h 05m"`.
- [ ] **Step 2:** Run `node --test lib/` → FAIL (module missing).
- [ ] **Step 3:** Implement `lib/format.ts` per Interfaces.
- [ ] **Step 4:** Run `node --test lib/` → PASS. `npm run typecheck` passes.
- [ ] **Step 5:** Replace every `money(` call site (`grep -rn "money(" components app`) with `formatMoney(fils, lang)`; delete `money` from `lib/types.ts`. Typecheck passes.

### Task 3: Brand mark

**Skills:** `tastemaker` (`references/logo-sourcing.md`), `brand`.

**Files:**
- Create: `public/brand/mark.svg`, `components/brand.tsx`, favicon files in `public/` (`favicon.ico`, `icon.svg`, `apple-touch-icon.png`)
- Modify: `app/layout.tsx` metadata icons, `public/favicon.svg` (replace)

**Interfaces:**
- Produces: `<BrandMark className? />` (SVG, `currentColor` + primary), `<BrandLockup size?: "sm" | "md" />` (mark + "ChestBest" in `font-heading`; Arabic name from restaurant when `lang==="ar"` via prop `nameAr?`).

- [ ] **Step 1:** Draw a geometric mark from primitives (e.g. stacked bun/patty arcs forming a chest/shield silhouette, ember on charcoal). No letter-in-a-box, no flame icon. Validate with `python3 C:/Users/anas/.claude/skills/tastemaker/scripts/validate_assets.py public/brand/mark.svg`.
- [ ] **Step 2:** Export favicons with `scripts/export_favicons.py` (if cairo missing, ship `icon.svg` + keep SVG favicon and say so).
- [ ] **Step 3:** Build `components/brand.tsx`; verify mark legible at 20px and 64px in a screenshot on light and dark backgrounds.

### Task 4: Shared component layer

**Skills:** `form-design`, `loading-states`, `better-accessibility`, `tastemaker` (`references/component-sourcing.md` restyle rules).

**Files:**
- Create (via CLI): `components/ui/{button,input,textarea,label,field,select,switch,checkbox,radio-group,tabs,toggle-group,badge,card,dialog,drawer,sheet,alert-dialog,alert,skeleton,scroll-area,separator,tooltip,sidebar,table,sonner,avatar,collapsible,dropdown-menu}.tsx`
- Create: `components/app/responsive-sheet.tsx`, `components/app/confirm-action.tsx`, `components/app/status-badge.tsx`, `components/app/empty-state.tsx`, `components/app/quantity-stepper.tsx`, `hooks/use-media-query.ts`

**Interfaces:**
- Produces:
  - `ResponsiveSheet({ open, onOpenChange, title, description?, children, footer?, side?: "bottom" | "right" })` — Drawer (vaul, drag handle, swipe dismiss) below 768px, Dialog (or right Sheet when `side="right"`) at ≥768px; body scrolls, `footer` sticky with safe-area padding; title wired via `aria-labelledby`.
  - `ConfirmAction({ trigger, title, description, confirmLabel, cancelLabel, tone?: "default" | "destructive", onConfirm: () => Promise<void> | void })` — AlertDialog, confirm button shows spinner and disables while pending.
  - `StatusBadge({ status: OrderStatus, lang })` — icon + text + status colour.
  - `EmptyState({ icon, title, body?, action? })`.
  - `QuantityStepper({ value, min?, max?, onChange, labels: { decrease, increase, remove? } })` — 44px buttons, numeric display does not mirror in RTL (`dir="ltr"` on the control), at `value===min` with `labels.remove` the minus becomes a trash button calling `onChange(0)`. Source pattern from Origin UI number field if its registry resolves; otherwise shadcn Button group.
  - `useMediaQuery(query: string): boolean`.
- [ ] **Step 1:** `npx shadcn@latest add <list> --yes`. Pull Origin UI number-input/file-upload/timeline and ReUI data-grid (`npx shadcn@latest add @reui/data-grid --yes` or the name the registry lists) only into `components/ui`; if a registry item drags in a second icon set or conflicting `button.tsx`, keep shadcn's and adapt.
- [ ] **Step 2:** Restyle pass on every file in `components/ui`: tokens only (no `zinc/slate/neutral-*` literals), radius from lock, 44px default `size` for Button `lg` used on guest/staff, focus ring `ring-ring` visible on both themes, no `transition-all`.
- [ ] **Step 3:** Build the five `components/app/*` wrappers + `use-media-query`.
- [ ] **Step 4:** Create a dev-only preview at `app/dev/ui/page.tsx` (404 in production like `/dev`) rendering every wrapper and Button/Badge/StatusBadge variant in light and dark. Screenshot at 390 and 1280; check focus rings with Tab.
- [ ] **Step 5:** Run `python3 C:/Users/anas/.claude/skills/tastemaker/scripts/audit_motion.py components/ui components/app` and `anti_slop_scan.py` on same; fix HIGH. Typecheck, lint pass.

### Task 5: Guest shell + menu (menu-first)

**Skills:** `form-design`, `loading-states`, `fitts-law`, `navigation-patterns`.

**Files:**
- Modify: `components/guest/GuestApp.tsx`, `components/guest/Chrome.tsx` (rename content to header only), `components/guest/MenuView.tsx`, `components/guest/Welcome.tsx` (PIN gate + ClosedVisit only), `app/t/[slug]/page.tsx`, `lib/i18n.tsx`
- Create: `components/guest/MenuItemCard.tsx`

**Interfaces:**
- Consumes: Task 1 tokens, Task 2 `formatMoney`, Task 3 `BrandLockup`, Task 4 `EmptyState`, `Skeleton`, `Tabs`, `ToggleGroup`, `Badge`.
- Produces: `GuestApp` phases `"boot" | "pin" | "in" | "closed"`; `join(name?: string, pin?: string): Promise<Me>` inside GuestApp (wraps `sb.rpc("join_table", { p_slug, p_name, p_pin })`), reused by Task 6 for name-at-checkout; `MenuItemCard({ item, lang, onOpen, onQuickAdd? , variant: "row" | "tile" })`.

- [ ] **Step 1:** Flow: on boot call `join()` with no name; if `pinRequired` and no stored session for this visit, phase `"pin"` shows `Welcome` PIN form only (menu not orderable). On `BAD_PIN` show field error. Keep `ClosedVisit`.
- [ ] **Step 2:** Header = one sticky element (`sticky top-0`, measured with a ref into CSS var `--header-h`): `BrandLockup`, table chip (`<bdi>`), language ToggleGroup (EN | ع), segmented Tabs Menu / Our table (with order-count badge), and on Menu view the category Tabs row with edge fade + scroll snapping. Scroll-spy: IntersectionObserver with `rootMargin: -(header height) 0 -60% 0`; last category activates at page bottom; tap scrolls with `scroll-margin-top: var(--header-h)`. Remove `top-[61px]`, the `120` offset, the dark bottom nav and the duplicate hero.
- [ ] **Step 3:** Layout: <768 single column `max-w-2xl` list of `MenuItemCard variant="row"` (112px square photo with skeleton, name `font-heading`, 2-line description, `formatMoney`, quick-add `+` Button only when `item_options.length===0`, otherwise "Customise" affordance; sold-out shows Badge and disables). ≥768: two-pane — sticky category rail (`start`) + `grid-cols-[repeat(auto-fill,minmax(15rem,1fr))]` of `variant="tile"` (4:3 photo). ≥1024 reserves `aside` column (`22rem`) for the cart (filled in Task 6). Images use `sizes` matching layout (`112px` row, `(min-width:768px) 33vw, 100vw` tile).
- [ ] **Step 4:** States: boot = header + 4 card skeletons; paused/error = shadcn `Alert` with recovery text and dismiss button (keyboard reachable); offline banner; toasts via `sonner` (`toast()`), remove the hand-rolled toast.
- [ ] **Step 5:** Force light theme on guest routes (`ThemeProvider` `forcedTheme="light"` wrapper in `app/t/[slug]/page.tsx` or class on container).
- [ ] **Step 6: Verify (Review Focus 1, 3):** Playwright on `/dev` → table link: 320×640, 390×844, 768×1024, 1024×768, 1440×900, EN + AR. Check: no horizontal scroll (`document.documentElement.scrollWidth === innerWidth`), header never wraps, category tab matches section in view after scrolling to 3 positions, quick add adds without sheet. Set a table PIN via admin settings, open link: PIN screen shows, wrong PIN errors, correct PIN reaches menu. Console clean. Typecheck/lint pass.

### Task 6: Guest item sheet + cart + checkout name

**Skills:** `form-design`, `error-handling-ux`, `feedback-patterns`.

**Files:**
- Modify: `components/guest/ItemSheet.tsx`, `components/guest/CartSheet.tsx`, `components/guest/GuestApp.tsx`, `lib/i18n.tsx`
- Create: `components/guest/CartPanel.tsx` (shared body used by Drawer on phone and `aside` ≥1024)

**Interfaces:**
- Consumes: Task 4 `ResponsiveSheet`, `QuantityStepper`, `RadioGroup`, `Field`, `Input`, `Textarea`; Task 5 `join(name?)`.
- Produces: `CartPanel({ lines, menu, lang, note, onNote, name, onName, onQty, onSend, sending, pendingRetry, disabledReason?: string })`.

- [ ] **Step 1:** ItemSheet on `ResponsiveSheet`: 16:10 photo with skeleton, name, description, options as `RadioGroup` cards (selected = border-primary + check icon), `QuantityStepper`, sticky footer Button "Add to order · {formatMoney(total)}" (label never wraps at 320 AR: single line, `min-w-0`, stepper compact). On add: close sheet, `toast(t("added"))` with "View order" action.
- [ ] **Step 2:** `CartPanel`: lines with `QuantityStepper` (`labels.remove` → trash at qty 1), option names, line totals; Field "Your name" (prefilled from `me.display_name`, optional, `autoComplete="given-name"`), Field note; total row; payAfter text; sticky send Button. Send = if name changed `await join(name)`, then existing `place_order` with stored `requestId`. Keep `cb-pending-<slug>` retry exactly as today (Review Focus 2). When `restaurant.ordering_paused` or visit closed: send disabled + `disabledReason` shown above button (Review Focus 4).
- [ ] **Step 3:** Phone: floating cart bar (count + total, `bottom` with safe-area, primary fill) opens `ResponsiveSheet` with `CartPanel`. ≥1024: `CartPanel` in sticky `aside` (`top: var(--header-h)`), no floating bar. 768–1023: floating bar + right `Sheet`.
- [ ] **Step 4: Verify:** Playwright: add 2 Signature + Hotshots + Cola → total AED 81.00 on 390 and 1440 (AR too). At 320×640 AR the Add and Send buttons are single-line and visible without scrolling the sheet. Simulate network failure on send (Playwright `route` abort on `/rest/v1/rpc/place_order`) → retry label appears, retry succeeds once, only one order created. Toggle pause in admin while cart open → send disabled with reason. Console clean.

### Task 7: Guest "Our table" view

**Skills:** `feedback-patterns`, `loading-states`, `state-machine`.

**Files:**
- Modify: `components/guest/TableView.tsx`, `lib/i18n.tsx`
- Create: `components/guest/OrderTracker.tsx`

**Interfaces:**
- Consumes: Task 4 `StatusBadge`, `ConfirmAction`, `EmptyState`, `Collapsible`; Task 2 `formatMoney`, `plural`.
- Produces: `OrderTracker({ status: OrderStatus, lang })` — 3 steps Received → Preparing → Ready, each step done (check icon), current (filled + label bold + "now" text), next (outline); served = all done + "Served"; cancelled = Alert with reason.

- [ ] **Step 1:** Header row: title "Our table" (h1), guest chips (Avatar initials + name in `<bdi>`, "(you)"), wraps instead of truncating.
- [ ] **Step 2:** Active orders first as Cards with `OrderTracker`; served orders in a `Collapsible` "Earlier orders (n)". Mine marked with "You" badge, not ring only.
- [ ] **Step 3:** Bill card: per-guest subtotals, table total (`formatMoney`), paid state. Actions: "Call waiter" (Button, toast "Waiter on the way", disabled while open request) and "Ask for the bill" through `ConfirmAction`.
- [ ] **Step 4:** Empty: `EmptyState` with "Browse the menu" Button switching view.
- [ ] **Step 5: Verify:** Playwright with 2 guests at one table (two browser contexts): both see each other's orders, subtotals add to total; advance order from staff → tracker updates live; 320 + 1440, EN + AR; console clean.

### Task 8: Staff shell + live board

**Skills:** `navigation-patterns`, `loading-states`, `better-accessibility`, `dark-mode-design`.

**Files:**
- Modify: `components/staff/StaffBoard.tsx` (becomes shell + data hooks only), `app/staff/page.tsx`, `lib/i18n.tsx` (all staff strings EN/AR, `errorText(lang, e)`)
- Create: `components/staff/StaffHeader.tsx`, `components/staff/Board.tsx`, `components/staff/OrderCard.tsx`, `components/staff/CallsTray.tsx`, `components/staff/CancelOrderDialog.tsx`

**Interfaces:**
- Consumes: Task 2 `ageLevel`, `formatAge`, `plural`; Task 4 `StatusBadge`, `ConfirmAction`, `ScrollArea`, `Tabs`, `DropdownMenu`, `Skeleton`; existing realtime + sound + wake-lock logic in `StaffBoard.tsx` (move, don't rewrite).
- Produces: `OrderCard({ order, now, lang, onAdvance, onCancel, busy })`, `CallsTray({ requests, lang, onResolve, layout: "rail" | "strip" })`.

- [ ] **Step 1:** `StaffHeader`: h1 brand lockup + "Kitchen", Tabs (Board / Tables / Menu with counts), sound status pill (off = warning tone "Sound off — tap to start shift"), connection pill, theme toggle, lang toggle, account DropdownMenu (Admin link for owner, sign out). Below 768 secondary items collapse into the DropdownMenu; header is one row at 390.
- [ ] **Step 2:** `Board`: container `h-[calc(100dvh-var(--header-h))]`. ≥640: `grid-cols-3` columns, each column header (status icon, name, count) + own `ScrollArea`. <640: horizontal snap columns (`snap-x`, each `85vw`) with count Tabs to jump. Stage order New → Cooking → Ready in both directions (`dir="ltr"` on the grid container only; card content follows page dir). ≥1280 `CallsTray layout="rail"` as 4th fixed column; below that `layout="strip"` sticky under header. Empty column: quiet line; whole board empty: `EmptyState` "All clear".
- [ ] **Step 3:** `OrderCard`: table number large `font-heading tabular-nums`, order #, guest name `<bdi>`, "New table" Badge (≥13px), age = clock icon + `formatAge`; `warn` → amber border + "Waiting" text, `late` → destructive border + "Late" text + icon (Review Focus 5). Lines: qty × name at 18px, options/modifiers same size `font-medium` (not muted), note in highlighted block. One full-width primary Button for next action (`advance_order`), Cancel in card DropdownMenu → `CancelOrderDialog` (RadioGroup reasons + optional textarea, destructive confirm).
- [ ] **Step 3b (user request 2026-11-16: "make the kitchen dashboard look more good and reduce their size so they adjust more properly in the screen"):** Compact density. At 1440×847 a column must show at least 4 typical tickets (2 lines each) without scrolling, versus ~2.5 today. Specifics:
  - The card header is one row: table number (`text-2xl`), `#order · guest`, a "New table" badge and the age, with the age pinned to `end`.
  - Card padding is `p-3` with an 8px gap between items.
  - Line items are 15–16px with the modifier on the same line or directly under it, no extra row gap.
  - The action row has the primary next-step Button (`h-11` = 44px, not full-card-height chunky) and Cancel as an icon/overflow, never as an underlined text link.
  - Inside each column, tickets flow in a container-query grid (`@container`; `grid-cols-[repeat(auto-fill,minmax(17rem,1fr))]`). Wide columns (≥1920, or when the calls rail is hidden) therefore fit 2 tickets per row.
  - Column headers are compact (icon + name + count pill, `text-sm` semibold, not huge uppercase).
  - The empty column is a quiet one-line state, not a tall dashed box.
  - Card status is shown by a 3px `start` border plus a header tint. There is no large coloured fill button per status: the primary action uses `--primary`. Status colour appears only in the border, badge and column icon.
  - The verify step screenshots 1440×847 and counts the visible tickets.
- [ ] **Step 4:** `aria-live="polite"` visually-hidden announcer: "New order, table {n}". First-load skeleton (3 columns × 2 card skeletons) until first fetch resolves. Errors → `toast.error(errorText(lang, e))`.
- [ ] **Step 5: Verify:** Playwright 1280×800, 768×1024, 390×844, 1920×1080, light + dark, EN + AR: place 6 orders from a guest context → each column scrolls independently, calls tray stays visible while scrolling, header single row at all widths, no horizontal page scroll, new order announces (check live region text). Run contrast check on dark status colours. Console clean.

### Task 9: Staff tables, menu toggles, login

**Skills:** `form-design`, `error-handling-ux`.

**Files:**
- Create: `components/staff/TablesView.tsx`, `components/staff/MenuToggles.tsx`
- Modify: `components/staff/StaffBoard.tsx` (wire views), `app/staff/login/page.tsx`, `lib/i18n.tsx`

**Interfaces:**
- Consumes: Task 4 `ConfirmAction`, `Switch`, `Card`, `Badge`, `Field`, `Input`; Task 3 `BrandLockup`.

- [ ] **Step 1:** `TablesView`: responsive card grid (`auto-fill minmax(16rem,1fr)`), per table: number, guests, `plural` orders, total, bill-requested Badge, Cash / Card via `ConfirmAction` whose description shows `formatMoney(total)`, Close via `ConfirmAction`; disabled Close shows reason text ("Unpaid" / "Tickets still in kitchen").
- [ ] **Step 2:** `MenuToggles`: list grouped by category, each row name + `Switch` with `aria-label` "{name} available".
- [ ] **Step 3:** Login: centered Card with `BrandLockup`, lang toggle, Field email + password (show/hide toggle button), error via `Field` error linked with `aria-describedby`; keep the sign-up path (invited staff may need it — check how invites are accepted before touching it) but demote it to a secondary "Have an invite? Create account" link.
- [ ] **Step 4: Verify:** Playwright: record card payment on a table → confirm dialog shows amount, cancel does nothing, confirm updates; close table. Login wrong password shows linked error. 390 + 1280, EN + AR, dark + light.

### Task 10: Owner admin shell + menu management

**Skills:** `form-design`, `data-visualization` (stat cards only), `information-architecture`.

**Files:**
- Modify: `components/admin/AdminApp.tsx` (shell + data), `components/admin/MenuAdmin.tsx`, `app/admin/page.tsx`, `lib/i18n.tsx` (all admin strings EN/AR)
- Create: `components/admin/AdminSidebar.tsx`, `components/admin/TodayStats.tsx`, `components/admin/ItemEditor.tsx`, `components/admin/ItemsTable.tsx`

**Interfaces:**
- Consumes: Task 4 `Sidebar`, `Sheet`, data-grid (ReUI) or `Table`, `ConfirmAction`, `Switch`, `Field`, file-upload; Task 2 `formatMoney`, `plural`.
- Produces: `ItemEditor({ item: MenuItem | null, categories, lang, onSaved, onDeleted })` in a right `Sheet` (full-screen Drawer <768) with sticky footer (Cancel, Save; Save disabled until dirty; spinner while saving).

- [ ] **Step 1:** Shell: shadcn `Sidebar` (collapsible to icons) with Menu / Tables & QR / Settings / Team + theme + lang + "Open kitchen board" link; <1024 `SidebarTrigger` opens it as Sheet. Content full width with `max-w-7xl` and page header (h1 + primary action).
- [ ] **Step 2:** `TodayStats`: 2–3 stat Cards from data the existing query already returns (orders count, revenue via `formatMoney`). No invented metrics.
- [ ] **Step 3:** Menu: categories as a sidebar list within the page (≥1024) or Select (<1024) with add / rename inline (`Input`, save on Enter/blur with spinner + toast) / delete via `ConfirmAction` destructive. Items: `ItemsTable` (photo, name EN/AR, price `formatMoney`, options count, availability `Switch` with aria-label, actions menu) — ≥640 table, <640 stacked cards. Delete item via `ConfirmAction` (replace native `confirm()`).
- [ ] **Step 4:** `ItemEditor`: Fields name/name_ar (`dir="rtl"` on AR inputs), description/description_ar (`Textarea` auto rows 3), price (AED input, stored fils), category Select, badge EN/AR, image file-upload dropzone with preview, options editor (rows stack <640), sticky footer.
- [ ] **Step 5: Verify:** Playwright 1920, 1280, 768, 390, EN + AR, light + dark: edit item price → saved toast, value shows in guest menu; delete category asks confirmation; no wrapped price at 390; Save visible without scrolling at 1280×800.

### Task 11: Admin tables/QR, settings, team, dev pages; remove legacy CSS

**Skills:** `form-design`, `better-accessibility`.

**Files:**
- Modify: `components/admin/TablesAdmin.tsx`, `components/admin/AdminApp.tsx` (settings + team sections → own files if >150 lines: `components/admin/SettingsForm.tsx`, `components/admin/TeamAdmin.tsx`), `app/admin/qr/page.tsx`, `app/admin/qr/PrintButton.tsx`, `app/dev/page.tsx`, `app/dev/DevSignIn.tsx`, `app/page.tsx`, `app/globals.css`
- Delete: `components/Sheet.tsx` (after `grep -rn "components/Sheet"` is empty)

- [ ] **Step 1:** Tables: table/list with number, slug, PIN `Input` (fixed width via `w-24`, no `w-full` conflict), regenerate slug + delete via `ConfirmAction`; "Add table" Button; link to QR sheet.
- [ ] **Step 2:** QR page: screen layout Card grid with BrandLockup per card, Arabic line same size as English; print CSS unchanged in behaviour (3 per row) — verify with Playwright `emulateMedia({ media: "print" })` screenshot.
- [ ] **Step 3:** Settings: Fields + `Switch` (pause ordering, PIN required) with descriptions; Save with pending state + toast. Team: Table of members (`plural`, role Badge), remove via `ConfirmAction`, invite Field + Button with pending state.
- [ ] **Step 4:** `/dev` and `/` restyle with Cards and Buttons (no uppercase eyebrow). Remove old tokens/aliases, `.leader`, `dialog.sheet`, `flash`/`sheet-up` keyframes from `globals.css` once `grep` shows no users.
- [ ] **Step 5: Verify:** typecheck, lint, build; Playwright pass on every admin tab at 390 + 1280; print emulation screenshot of QR sheet.

### Task 12: Full verification and re-audit

**Skills:** `superpowers:verification-before-completion`, `better-interface`, `accessibility-audit`.

- [ ] **Step 1:** `npm test && npm run typecheck && npm run lint && npm run build` — all pass.
- [ ] **Step 2:** `python3 C:/Users/anas/.claude/skills/tastemaker/scripts/anti_slop_scan.py app components` and `audit_motion.py app components` — no HIGH; contrast matrix re-run for both themes.
- [ ] **Step 3:** Spec E2E (two Playwright contexts, guest 390×844 + staff 1280×800): `/dev` → table 6 → add 2 Signature + Hotshots + Cola → AED 81.00 → name "Sara" at checkout → staff board shows ticket "Sara" + "New table" within ~1s → advance to served → guest tracker updates → second guest "Ali" orders → bill shows both + subtotals → request bill → staff records card + closes → old guest link shows visit ended. Repeat in Arabic. Screenshot each step; console clean.
- [ ] **Step 4:** Re-run both audit subagents (Sonnet, effort medium, read-only) with the original guest and staff/admin briefs. If either scores < 9/10, fix HIGH/MEDIUM findings and repeat Step 1–4.
- [ ] **Step 5:** Append `.tastemaker/log.json` entry and `.tastemaker/decisions.log` pending-review lines; update project `CLAUDE.md` Status + UI rules (fonts, component layer, token names).
