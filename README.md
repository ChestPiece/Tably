# ChestBest — UAE QR ordering sales demo

A fictional restaurant demonstration with English/Arabic mobile ordering, an automatically accepted kitchen queue, visit settlement, configurable menus, and downloadable table QR codes. Built with React, TypeScript, Vinext, and Cloudflare D1.

## Run locally

Requires Node 22.13+ and npm. Install with `npm ci`. Run `npm run build` to emit the local Worker configuration, then apply the initial migration:

```powershell
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0000_modern_dracula.sql
```

Use the actual generated SQL filename in `drizzle/` if it differs. Run `npm run dev` and open its printed loopback URL. Local D1 persists in `.wrangler/state`; production uses a separate managed D1 database. Seed menu data is inserted only when the restaurant state does not exist.

## Three demo views

- `/?table=6` — guest menu and order tracking.
- `/?view=staff` — live kitchen board, assistance, payment recording, and table closure.
- `/?view=owner` — menu editor, categories, restaurant settings, QR downloads, and totals.

Open guest and staff views in separate browser windows. Add two signature burgers, one hotshots and one cola: the base sample total is AED 81.00. Submit; the staff board shows a queued ticket within the two-second polling interval. Enable sound on the staff screen (browsers require a gesture). Advance through preparing, ready, and served. Record simulated cash/card payment under Tables & settlement, then close the visit. The old guest page can no longer access its orders; a new visit starts empty.

## Checks

```text
node --test tests/core.test.mjs
npx tsc --noEmit
npm run build
```

## Data and reliability

`lib/actions.ts` owns validated business transitions. Prices are integer fils. Orders hold snapshots of names, options, unit prices, quantities and service style. `POST /api/restaurant` applies commands using D1 compare-and-swap version updates with bounded retry, so parallel phones cannot overwrite orders. Stable per-submission request IDs make retries idempotent. The browser persists an uncertain submission and locks cart edits until it can retry safely.

Visits have opaque guest tokens. Guest reads expose only their active visit. Closing a visit revokes its token; table numbers alone do not return orders. Staff APIs intentionally expose restaurant-wide operational data inside this owner-private demonstration. Guest preference/cart storage is device-local; shared orders, menu settings and visits live in D1.

## Demo boundaries

This is not a production ordering service. The hosted Site is owner-private by default, so scanning its QR requires authorized Site access. QR codes use the current origin; localhost codes cannot be scanned from a separate phone. Do not make this demo public without adding server-enforced staff authorization and anti-abuse controls.

No online payments, payment gateway, tax invoices, POS sync, inventory accounting, push/SMS notifications, or production staff authentication. Guest updates require the page to remain open. All dashboard totals are all-time demo totals. Payment buttons only record a simulation; they never charge money. Illustrative food photography comes from Unsplash and does not represent verified ingredients. Confirm allergies with staff.

The single versioned D1 JSON document is deliberately simple for a small sales demo, not a high-volume production storage design. A live pilot should use normalized orders/visits, scoped staff roles, table session verification, request limits, monitoring, backup and retention policy, POS reconciliation, and a failure/escalation procedure. See `docs/PILOT.md` for the commercial validation script.
