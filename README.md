<p align="center">
  <img src="public/icon.svg" alt="Tably" width="72" height="72">
</p>

<h1 align="center">Tably</h1>

<p align="center">QR table ordering for dine-in restaurants.<br>Guests scan, order from their phone, and the food comes to the table.</p>

<p align="center">
  <a href="https://qr-restauratn-app.vercel.app">Live demo</a>
</p>

---

Each table gets its own QR code. A guest scans it, types an optional name, and orders from the menu on their phone. The order shows up on the kitchen board straight away. Staff move it through preparation, answer waiter calls and settle the bill. The owner edits the menu, prints the QR cards, invites staff and sees profit per day.

The demo venue is ChestBest, a made-up burger place in the UAE with prices in AED and an Arabic menu.

## What it does

### For guests
- Scan the table QR and start ordering. No app, no account.
- Menu in English, with Arabic (right to left) when the restaurant turns it on.
- Live order tracker: received, preparing, ready, served.
- Call a waiter or ask for the bill (cash or card) from the phone.
- Several guests at one table share one bill.

### For staff
- Kitchen board with the oldest tickets first, a "to cook" total per dish and a pass list for ready orders.
- A sound when a new order comes in.
- Undo a status change within 2 minutes.
- Waiter calls and bill requests in one list, with acknowledge and nudge.
- Clock in and out for shifts.
- Dark mode by default, light mode toggle.

### For owners
- Menu editor with photos, options, sold-out toggle and bulk add (grid or pasted list).
- Tables with random QR links and a printable QR card sheet.
- Team page: invite staff with a `/join/<token>` link, set hourly rates, see shifts.
- Profit report: set a cost per dish, and every order line keeps its cost at the time of sale.
- Restaurant name, logo, currency, timezone and an optional second menu language.

## How it works

```
Guest phone ──scan──> /t/<slug> ──place_order()──> Postgres
                                                     │
Kitchen board  <──────── Supabase Realtime ──────────┘
(/staff)                                             │
Owner admin (/admin) ──── menu, tables, team ────────┘
```

- **Guests** sign in as Supabase anonymous users and can read only their own visit.
- **Order writes** go through Postgres functions (`place_order`, `advance_order`, `call_waiter`, `settle_bill` and others). The server recomputes every price, so the client can't change what an order costs.
- **Row Level Security** is on for every table. Every row has a `restaurant_id`, so one database serves many restaurants.
- **Money** is stored as integers in the currency's minor unit (fils, cents). Decimal places come from `Intl`, so JPY, USD and KWD all format correctly.
- **Times** show in the restaurant's timezone, not the browser's.

## Tech stack

| Part | Choice |
|---|---|
| Framework | Next.js 16 (App Router), React 19, TypeScript |
| Styling | Tailwind CSS v4, shadcn/ui, Radix |
| Backend | Supabase (Postgres, Auth, Realtime, Storage, pg_cron) |
| Motion | GSAP and Lenis (landing page only) |
| Hosting | Vercel |

## Run it locally

You need Node 20 or newer and a Supabase project.

1. Clone and install:
   ```bash
   git clone https://github.com/ChestPiece/chestbest-demo.git tably
   cd tably
   npm install
   ```
2. Copy the env file and fill it in:
   ```bash
   cp .env.example .env.local
   ```
   | Variable | What it is |
   |---|---|
   | `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL |
   | `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | The project's publishable (anon) key |
   | `NEXT_PUBLIC_SITE_URL` | Public URL used in QR codes |
   | `NEXT_PUBLIC_SUPPORT_EMAIL` | Shown on the legal pages and footer |
3. Apply the SQL files in `supabase/migrations/` to your project in name order (Supabase CLI `supabase db push`, or paste them into the SQL editor). Optionally run `supabase/seed.sql` for the demo menu.
4. Start the dev server:
   ```bash
   npm run dev
   ```
   Open http://localhost:3000. Sign up at `/signup`, confirm your email, and the setup page creates your restaurant.

On Windows PowerShell, use `npm.cmd run dev` if `npm.ps1` is blocked.

### Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Dev server |
| `npm run build` | Production build |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint |
| `npm test` | Unit tests in `lib/` |

Database tests live in `supabase/tests/` (ordering flow, invites, requests, roles, costs, self-serve). Each one runs inside a transaction that rolls back.

## Routes

| Path | Who | What |
|---|---|---|
| `/` | Public | Landing page |
| `/t/<slug>` | Guest | Table welcome, menu, order tracker, bill |
| `/login`, `/signup` | Owner, staff | Sign in, sign up, reset password |
| `/join/<token>` | Staff | Accept a team invite |
| `/staff` | Staff | Kitchen board, calls, tables and bills |
| `/admin` | Owner | Home, menu, tables, team, profit, settings |
| `/admin/qr` | Owner | Printable QR card sheet |

## Project layout

```
app/            Routes (guest, staff, admin, public)
components/     UI, split by area: guest, staff, admin, landing
lib/            Supabase clients, money and time helpers, i18n
supabase/       Migrations, seed and SQL tests
docs/           Design specs, brand notes, task list
design.md       Design tokens and rules
```

## Status

Beta. Guest ordering, the kitchen board, owner admin and self-serve sign-up work end to end. Open work is tracked in [`docs/TASKS.md`](docs/TASKS.md). The design spec is in [`docs/superpowers/specs/`](docs/superpowers/specs/).

Before using it in a real restaurant, plan how it fits with your POS and payment terminal, and what staff do if the connection drops.
