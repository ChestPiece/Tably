# Design — Tably (Sufra v2)

The locked design system for this app. Every page and component reads this file before it changes UI. Extend or amend this file when the system needs to grow; never override it per page. Tokens live once in `app/globals.css`. Replaces `.tastemaker/style-lock.md` (Hallmark redesign, 2026-11-17).

## Genre
Editorial, warm. The guest menu reads like a printed menu card. Staff and owner screens are dense working tools that share the same type and colour.

## Macrostructure family
- Guest (`/t/[slug]`): **Long Document**. One continuous menu, sticky category index, section heads over hairlines, dish rows with dotted leaders to the price. Bill and cart are receipts.
- Staff (`/staff`): **Workbench** in the ops shell (see "Ops shell"). Line + pass kitchen board (`components/staff/Board.tsx`), structure fixed by the KDS mockups in `brand-demos/kds/`.
- Owner (`/admin`): **Workbench** in the ops shell (see "Ops shell"). Panels on the paper canvas, figures lead, labels under them. No icon tiles.
- Public (`/`, `/login`): plain, left-biased, typography only.

## Theme (light; Tailwind names)
| Token | Value | Hex |
|---|---|---|
| background (paper) | oklch(96.4% 0.011 85) | #F6F3EB |
| card / popover | oklch(98.9% 0.006 85) | #FDFBF7 |
| secondary / muted / accent | oklch(93.2% 0.012 80) | #EDE8E0 |
| border (decorative only) | oklch(88.5% 0.014 80) | #DED8CF |
| foreground (ink) | oklch(22.2% 0.032 273) | indigo ink |
| text-2 | oklch(44.5% 0.025 65) | #5E5146 |
| muted-foreground / input | oklch(50.5% 0.025 65) | #6F6256 |
| primary / brand / ring | oklch(30.3% 0.087 270) | indigo |
| ochre (shapes) / ochre-text (words) | oklch(66% 0.12 81) / oklch(49.4% 0.094 81) | |
| destructive / danger-bg | oklch(49.4% 0.143 31) / oklch(92.5% 0.024 34) | |
| status new / cooking / ready | 42.5% 0.110 264 / 50.8% 0.104 72 / 47.3% 0.089 154 | |

Dark (staff default, owner toggle): indigo night, unchanged from Sufra v2 (`.dark` block in `app/globals.css`).

Rules: ochre never goes in `--accent`. Accent (ochre) under 5 % of any viewport. Status is one colour: 8px square + word (`StatusTag`). No surface gradients, glows, coloured side stripes, emoji, pure black or white.

## Contrast (measured, light)
fg/bg 15.6 · text-2/bg 6.9 · text-2/muted 6.3 · muted-fg/card 5.7 · muted-fg/muted 4.8 · primary/bg 12.4 · ochre-text/card 6.0 · ochre/card 3.05 (shape) · destructive/danger-bg 5.3 · status vs card 5.7–8.2. Text ≥ 4.5, shapes and focus ≥ 3. Border is decorative; inputs use `--input`.

## Typography
- Display Latin: **Fraunces** (variable, opsz axis), 600, roman. Venue names, dish names, section heads, table numbers, big figures. Guest pages and printed QR cards only.
- Owner and staff UI (2026-11-22): **Inter** for display and body (`components/ops-font.tsx`, set on `:root:not(:lang(ar))` by the admin and staff layouts). Figures are Inter semibold `tabular-nums`. Arabic keeps Beiruti / IBM Plex Sans Arabic.
- Display Arabic: **Beiruti** 700.
- Body: **IBM Plex Sans** 400/500/600 + **IBM Plex Sans Arabic**. Every interface word, prices (`tabular-nums`).
- Arabic picks its stacks by language: `:where(:lang(ar))` in `app/globals.css` swaps `--font-sans` / `--font-display`. Any Arabic text inside an English page needs `lang="ar"`, or it renders in the Latin font's Arial fallback.
- Arabic: line height 1.75, no tracking, never below 13px, no uppercase, no italics.
- Headings are always roman. No eyebrows over headings.

## Editorial vocabulary
- Hairline rules (`border-b`), double rule above totals (`border-t-[3px] border-double`).
- Dotted leader between a name and its price (`.leader`: flex-1 dotted bottom border).
- Left-biased headings. The welcome arch is the one centred composition.
- `rounded-arch` (999px 999px 8px 8px) only on the mark, dish photo frames, table markers, table cards.
- No card-in-card. One containment layer.

## Spacing and shape
Tailwind 4 pt scale. Radius sm 8 / md 12 / lg 16 / xl 24. Controls: 48px (`h-12`) guest + staff, 40px (`h-10`) owner. Elevation: `shadow-float` only (on dark it is a ring + dark shadow, never a glow).

## Motion
One curve `ease-sufra` cubic-bezier(0.2, 0, 0, 1); `duration-fast|base|slow` = 120/200/320ms; transform and opacity only; press scale .98. Reduced motion = short opacity fade (global rule). No scroll reveals.

## Microinteractions
Silent success. Toasts only for failures and async effects the guest cannot see. Undo over confirm for reversible steps (`revert_order`). Focus ring instant, 3px `--ring`.

## CTA voice
- Primary: filled indigo, `rounded-md`, 48px, verb-first label ("Open the menu", "Send order").
- Secondary: `variant="secondary"` (muted fill), same shape.
- Labels never wrap: shorten first, then `whitespace-nowrap`.

## Themes per surface
Guest `/t/*`: always light, no ThemeProvider. Staff: dark default, key `sufra-staff-theme`. Owner: light default, key `sufra-owner-theme`. `enableSystem={false}` everywhere.

## Venue brand (2026-11-27)
Guest pages and printed QR cards take the owner's brand; owner, staff, `/login` and `/join` never do. `brandTokens(accent, vibe)` (`lib/brand.ts`) sets `--brand`/`--primary`/`--ring`, `--on-brand`, `--brand-field`, `--brand-rule`, `--radius` and the vibe's display font. Any colour is darkened in OKLab until brand on cream >= 3:1 and text on brand >= 4.5:1. Vibes: Sufra (Fraunces/Beiruti, 12px), Bold (Bricolage Grotesque/Alexandria, 6px), Clean (Figtree/Readex Pro, 16px), Classic (Cormorant/Amiri, 4px). Ochre stays shape-only. Tokens go on the guest root and on `<html>` (portals). QR cards keep Fraunces/Plex and take only the colour + logo.

## Menu signals (2026-11-28)
- Chips on a dish: Popular (`bg-primary`, from real orders only), then the owner badge, then preset tags. Max 3 preset tags. No fake scarcity, no counts, no countdowns.
- Category hero = featured dish with a photo, else badge + photo. Signature dishes lead the rest of the section.
- Quick picks rail shows only with 3+ available picks.
- One nudge per step: a "Goes well with" toast after an add (once per dish per load, dismissed when the cart opens) and one "Complete your meal" row in the cart. Never a modal.

## Ops shell (owner + staff, 2026-11-25)
Spec: `docs/superpowers/specs/2026-11-25-ops-dashboard-layout-design.md`.
- **Fit the screen.** The shell is `h-dvh overflow-hidden`: sidebar, main, right rail. Only panels scroll, never the page. Owner Home (once first-run steps are done) and Profit fill the height under the `fit:` variant (1280px wide **and** 760px tall; `fit` in `AdminApp.tsx`). Never gate fill-the-height layout on width alone: 1280x720 and 1366x768 laptops are below the gate and their pages stack and scroll inside main, like everything under 1280px. The owner Board page fills main with `flex-1` (no `100dvh` maths). Check with `scripts/responsive-check.js`.
- **Sidebar.** Icon-collapsible. The collapse button sits in the header beside the venue name (`components/ops/SidebarChrome.tsx`); collapsed, the mark expands it. Ctrl/Cmd+B and the edge rail also toggle. The footer is one user row with a menu (theme, Arabic, switch app, sign out). Owner below `lg` uses `BottomNav`.
- **Right rail = selected item's detail.** 400px `<aside>` (`RailSlot`), hidden while empty. Sheets opt in with `ResponsiveSheet rail` and portal into it from 1280px; below that they stay sheets/drawers. Used by Orders (detail, undo last step within 2 min, cancel; `?sel=`), Menu (`ItemEditor`), Tables (live visit, QR, actions) and Team (rate, shifts, remove). Home and Profit have no rail.
- **URL state.** Owner: `?page=`, `?filter=`, `?sel=`. Staff: `?tab=` (`STAFF_TABS`; Board is bare `/staff`). Reload and back land on the same view.
- **Owner Home bento.** 12 columns: hourly chart (8) + status donut (4); latest orders (6, rows open Orders with `sel`) + floor (3) + top dishes (3). Panels use `PANEL`, one containment layer.
- **Density.** Owner: 40px controls, 44px table rows, sticky table heads. Staff: 48px everywhere, calls strip included. Short labels (legends, chips, times) never wrap: `whitespace-nowrap` and let the row wrap instead.
- **Empty, loading, failed are three different states.** Skeletons only before the first load. Empty = an `EmptyState` or a dashed block saying what fills it. Failed first load = `EmptyState` with a WifiOff icon and Try again, never a false "All clear".
- **Connection status** is a pill in the staff top bar: neutral "Live", ochre "Reconnecting" with a pulsing dot (reduced motion: no pulse).
- **Counts** use singular and plural keys (`dishOne` / `dishes`), never "1 dishes".

## Responsive (2026-11-27)
Every screen ratio must hold: 320x568, 375x667, 390x844, 844x390 landscape, 768x1024, 1024x768, 1024x1366, 1280x720, 1366x768, 1440x900, 1920x1080, 2560x1440, plus RTL at 390 and 1280.
- **Height-aware gates** (custom variants in `app/globals.css`): `fit:` = min-width 1280 and min-height 760, the only gate for fill-the-screen layouts. `short:` = max-height 520 (landscape phones, tiny windows): shrink chrome and media, never hide actions.
- **Sheets.** `ResponsiveSheet` is a Drawer below 768px wide **or** 600px tall, so landscape phones never get a squeezed dialog. Side sheets open from the inline end (left in Arabic). Bottom sheets cap at 85dvh and scroll. Every sheet footer pads `env(safe-area-inset-bottom)`.
- **Container queries for anything inside the ops shell.** The sidebar (248px) and rail (400px) eat width, so the viewport lies about the space a component has. KPI rows (`@3xl` = 4 columns), the kitchen board (pass column from `@min-[800px]`, to-cook totals from `@min-[1040px]`) and Staff Today use `@container`. KPI figures are `truncate` with `clamp(20px,4cqi,30px)`.
- **Horizontal rails** (category tabs, filter chips, calls strip, settings nav below `lg`) get `scroll-cue`: the trailing inline edge fades, so hidden chips read as "more this way".
- **Safe areas.** `viewportFit: cover` is on, so sticky or fixed chrome pads its `env(safe-area-inset-*)` edge: guest header (top), cart bar and sheet footers (bottom).
- **Long words** break (`overflow-wrap: break-word` on `body`); give flex text `min-w-0`.
- Check: paste `scripts/responsive-check.js` in the console at each size. It lists elements past the viewport edge, page scroll on fit pages, and primary buttons outside the viewport.

## Exports
### tokens.css (canonical: `app/globals.css` `:root`)
```css
:root {
  --background: oklch(96.4% 0.011 85);
  --card: oklch(98.9% 0.006 85);
  --secondary: oklch(93.2% 0.012 80);
  --border: oklch(88.5% 0.014 80);
  --foreground: oklch(22.2% 0.032 273);
  --text-2: oklch(44.5% 0.025 65);
  --muted-foreground: oklch(50.5% 0.025 65);
  --primary: oklch(30.3% 0.087 270);
  --ochre: oklch(66% 0.12 81);
  --ochre-text: oklch(49.4% 0.094 81);
  --font-display: "Fraunces", ui-serif, Georgia, serif;
  --font-sans: "IBM Plex Sans", system-ui, sans-serif;
  --ease-sufra: cubic-bezier(0.2, 0, 0, 1);
}
```
