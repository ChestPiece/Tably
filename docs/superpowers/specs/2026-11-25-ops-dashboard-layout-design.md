# Ops dashboards: fit-to-screen layout (owner + staff)

Date: 2026-11-25. Status: built (phases 1-5), not committed. As-built rules live in `design.md` "Ops shell".

As-built differences:
- No `OpsShell.tsx`: the shell lives in `AdminApp.tsx` / `StaffBoard.tsx`; sidebar chrome is `components/ops/SidebarChrome.tsx`.
- The rail is `RailSlot` + `ResponsiveSheet rail` (`components/app/responsive-sheet.tsx`), 400px, shown only while a sheet is open.
- Rails built for Orders (detail, undo within 2 min, cancel), Menu, Tables (live visit, QR, actions) and Team (rate, shifts, remove). Staff Tables and Menu tabs have no rail (their cards already hold the actions).

## Why
The owner (`/admin`) and staff (`/staff`) dashboards work, but they read as stacked web pages, not a tool. Owner Home (1090px) and Settings (1425px) scroll at 1440x900. Other pages fit only because they are mostly empty space. The goal is a Volty-style three-pane flow: an icon-collapsible left nav, the main list, and a collapsible right detail rail. Every page fits one screen and scrolls only inside its own panels.

## Decisions (by Anas)
- There is one staff screen; kitchen is the staff board. No new route.
- Pages fit 100dvh, split into list + detail, with a collapsible right rail and an icon-collapsible left nav.
- Owner Home becomes a bento grid that fits the viewport.
- The right rail shows the **selected item's detail** and is hidden when nothing is selected.
- The collapse button sits in the **sidebar header, next to the venue name**.
- Colour: **keep Sufra, refine**. Owner stays light, staff stays dark. `design.md` gets extended, not replaced.

## Goals
- No page scroll on any `/admin?page=*` or `/staff` tab at 1280x800 and up. Panels scroll inside.
- Selecting a row never leaves the list: the detail opens in the rail.
- One header bar pattern and one shell for both roles.

## Non-goals
- No new routes, roles, DB changes or RPCs.
- No change to the guest app.
- Mobile layout below 1024px keeps today's pattern (owner `BottomNav`). The rail becomes a drawer there.

## Anti-goals (failure even if it works)
- AI-template tells: gradient blobs, glows, emoji labels, an eyebrow over every heading.
- New hues outside the Sufra tokens.
- Detail that needs a page change to reach.
- Empty states that look like loading forever.

## Live audit (1440x900)
| Page | Issue |
|---|---|
| Home | Scrolls. The hourly chart is an empty box at low volume, and the floor plan is mostly blank. Latest orders and top dishes sit below the fold. |
| Orders | Thin table on an empty canvas. Columns are spread far apart. There is no inline order detail. |
| Profit | Four "—" KPI cards and a paragraph. No chart or breakdown. |
| Menu | Good list, but an Edit button repeats on every row. |
| Tables & QR | One giant print-style arch card used as the management UI. |
| Settings | Scrolls. One long form. |
| Staff board | Empty columns show skeletons that look stuck. "Reconnecting" is only a dot. `?tab=` is not URL-driven. |
| Shell | The collapse icon is in the page title bar. The owner sidebar footer stacks 5 rows. The staff sidebar says "Owner" for staff. |

## Design

### Shell
- `components/ops/OpsShell.tsx` is an `h-dvh overflow-hidden` grid: sidebar, main, right rail. Main is `min-h-0 overflow-auto relative` (the sr-only gotcha). Both `AdminApp.tsx` and `StaffBoard.tsx` use it.
- `SidebarTrigger` moves into `SidebarHeader` beside the venue mark. In icon mode the mark is the expand button. Ctrl/Cmd+B, `SidebarRail` and the `sidebar_state` cookie stay.
- The sidebar footer becomes one user row with a dropdown: Theme, Arabic, Open kitchen or Admin, Sign out. It reuses `useOwnerActions()`, and `BottomNav`'s More sheet keeps using the same hook.
- Every page gets one 56px header bar: title, count, filters as a segmented control, primary action.

### Right rail
- Selection lives in the URL as `?sel=<id>`, next to `?page=`.
- The rail is 360px wide, closes with its own button and Esc, and remembers open/closed in a cookie.
- Below `xl` the rail renders through `ResponsiveSheet` (`full`).
- Rail content per page:
  - Orders: lines, status timeline, cancel/revert.
  - Tables: QR, live visit, bill.
  - Menu: `ItemEditor` inline.
  - Team: member, rate, shifts.
- Home and Profit have no rail.

### Owner pages
- **Home**: bento grid inside 100dvh.
  - A compact KPI row (72px tiles).
  - `HourChart` (2/3) beside `FloorPlan` scaled to fit (1/3).
  - Latest orders (inner scroll; a click opens Orders with `sel`), then the status donut and top dishes as a tight list.
  - A low-volume chart shows a text empty state.
- **Orders**: 44px rows, sticky header, columns packed to the start. A row click opens the rail.
- **Profit**: KPI row, a sales-vs-cost chart (`components/ui/chart.tsx`), and a per-dish margin table. The empty state says that costs and Shift mode fill it.
- **Menu**: a row click opens the rail editor. The per-row Edit buttons go. Category chips stay.
- **Tables**: a grid of small table tiles showing number, status and seated/bill. A click opens the rail. The print look stays on `/admin/qr`.
- **Team**: list + rail.
- **Settings**: a left section nav (General, Ordering, Branding, Language) with one section visible at a time.

### Staff screen
- The board columns fill the height and scroll inside. Each column has a real empty state ("Nothing on the line"). Skeletons show only on first load.
- `CallsTray` is a pinned strip at the top of the board.
- The top bar shows a Live / Reconnecting chip.
- Tabs are driven by `?tab=`. The sidebar role label reads correctly ("Staff" for staff users).
- Today, Tables and Menu use the same list + rail pattern. Controls stay 48px.

### Visual refinement
- Hairline `ring-1 ring-border` surfaces and fewer nested cards. Dense panels use `rounded-xl`.
- Tabular numerals for money and times, and an 8px grid.
- No new hues. Derive tints from the oklch tokens in `app/globals.css`.
- Add to `design.md`: shell anatomy, the rail spec, density rules and the empty-state rule.

## Build order (each phase shippable)
1. Shell, sidebar-header trigger and footer menu (both roles).
2. The right rail, with Orders, Menu, Tables and Team wired to `?sel=`.
3. Owner Home bento, Profit and Settings.
4. Staff board and tabs.
5. Polish and the `design.md` update.

## Reuse
- `components/ui/sidebar.tsx`
- `ResponsiveSheet`
- `PANEL` (`OwnerHome.tsx`)
- `useOwnerActions()` (`AdminSidebar.tsx`)
- `useVenue().money/tz`, `pick`, `dayRange`
- `ItemEditor`, `FloorPlan`, `HourChart`
- `components/ui/chart.tsx`, `useIsMobile`, `BottomNav.tsx`

## Verification
- Run `typecheck`, `lint` and `test`.
- In the browser, check every owner page and staff tab at 1440x900 and 1280x800. The test is `scrollHeight === innerHeight`.
- Collapse works via the button, Ctrl/Cmd+B and the rail, and survives a reload.
- The rail opens on a row click and closes with Esc, and `?sel=` round-trips.
- Below 1024px, `BottomNav` and the drawer rail work. Check one page in RTL.
- Check reduced motion and both themes for both roles.
- Run `design-qa-checklist` + `no-ai-design-slop` with screenshots.

## Left to the builder
Exact tile sizes, chart types inside the Home bento, and the dropdown component choice (shadcn `DropdownMenu` is already available).
