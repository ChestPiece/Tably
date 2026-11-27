# Tably: Brand Kit + Menu Psychology — design

Date: 2026-11-27. Status: approved plan, Phase 1 next.

## Why

Restaurants buy a menu that feels like *their place* and visibly earns money. Today an owner can only set a logo (`restaurants.logo_url`). The `restaurants.accent` column exists (hex check, default `#e85d2a`) but no component reads it. There is no cover photo, no vibe choice, no upsell, no true "popular" signal and no after-visit loop.

Competitor research (27 Nov, rea captures):
- MenuTiger sells feature count; the owner designs everything.
- qlub (UAE) sells outcomes: "16 min saved per table", "300% more tips", "7X Google reviews".
- Owner.com ships one proven design: "performance beats endless customization".

## Decisions (Anas)

- Model: **brand on a proven frame.** The owner brings logo, colour, cover, words and a vibe. Layout, order of sections and selling mechanics stay ours.
- Audience: every dine-in restaurant type, so the frame flexes through vibes, not through layout editing.
- Psychology goals: bigger basket, faster ordering, return + reviews, owner "wow" in the sales demo.
- Brand setup: upload logo, colours auto-extracted, live phone preview.
- Upsell: owner picks pairings; empty slots fill from real co-order data.
- Return loop: rate the visit, Google review ask, remember the guest on this device, socials.
- Ship in phases, brand first.

Claude's calls (Anas said "you decide"): the brand kit is logo, one brand colour, cover photo, vibe preset, welcome note (EN/AR), Instagram handle.

## Goals / non-goals / anti-goals

Goals
- An owner gets a menu that looks like theirs in under 2 minutes, seen live on a phone preview.
- Every brand colour stays readable (contrast guard), so no owner can break the guest app.
- Every psychology feature traces to one principle (table below) and uses true data only.

Non-goals
- No layout editor, no per-section ordering, no custom CSS, no custom fonts upload.
- No white-label website, no own domain.
- Phase 1 does not touch ordering logic.

Anti-goals (failure even if it "works")
- Fake scarcity, fake "popular", countdowns, modal upsells, more than one nudge per step.
- Review gating: showing the Google link only to happy raters (Google bans it).
- Template tells from `design.md` (gradient blobs, glows, emoji labels).
- Owner or staff UI changing colour with the brand: brand applies to guest surfaces and printed QR cards only.

## Psychology map

| Principle | Where | Feature | Phase |
|---|---|---|---|
| IKEA / endowment | Owner setup | Own brand on a phone preview in under 2 minutes | 1 |
| Peak-end rule | End of visit | Branded thank-you screen, rating, socials | 3 |
| Social proof (true data) | Menu | "Popular" computed from the last 30 days, never typed | 2 |
| Von Restorff + serial position | Menu | One photo-led hero per category, placed first | 2 |
| Anchoring | Menu | Owner marks a signature dish, shown first in its category | 2 |
| Hick's law | Menu top | "Quick picks" row of top sellers | 2 |
| Default / reciprocity | Item sheet, cart | One "Goes well with" after add; one "Complete your meal" in cart | 2 |
| Recognition over recall | Return scan | "Welcome back, Sara. Order your usual?" | 3 |
| Zeigarnik / progress | Tracker | Existing status tracker stays | — |

## Phase 1: Brand kit

### Data
New migration `supabase/migrations/20261127000001_brand_kit.sql`, test `supabase/tests/brand_kit.sql`.

| Column on `restaurants` | Type / check |
|---|---|
| `accent` (exists) | reused as brand colour, `^#[0-9a-fA-F]{6}$` |
| `cover_url` | text null, `^https://`, length ≤ 500 |
| `vibe` | text not null default `'sufra'`, in (`sufra`,`bold`,`clean`,`classic`) |
| `welcome_note`, `welcome_note_ar` | text not null default `''`, length ≤ 280 |
| `instagram` | text not null default `''`, `^[A-Za-z0-9._]{0,30}$` (handle without `@`) |

- Every row today holds the unused default orange `#e85d2a`; reading it would suddenly recolour every live venue. The migration sets `accent` to Sufra indigo `#1E2A5A` for all rows and changes the column default to `#1E2A5A`, so the current look is unchanged until an owner picks a colour. (Claude's call.)
- Owner writes go through the existing owner RLS update on `restaurants`, like the settings fields. Guests already read `restaurants` columns they need; the new columns are public brand data (no secrets).
- Storage: `menu-images` bucket, path `${rid}/cover-<uuid>.<ext>`, same upload code and 2 MB cap as `components/admin/LogoField.tsx`. No client-side resize: keep the 2 MB cap and `object-cover` (guest images do not use Next image optimisation today).

### Token engine — `lib/brand.ts` (+ `lib/brand.test.ts`)
`brandTokens(hex: string, vibe: Vibe): Record<string, string>` returns CSS custom properties set inline on the guest root:
- Colours: `--primary`, `--brand`, `--ring`, `--brand-field` (brand at low chroma, near-cream tint for chips/fields), `--brand-rule` (brand mixed toward the rule colour), `--on-brand` / `--primary-foreground` (cream or ink, whichever passes).
- Shape and type: `--radius` and the font variables for the vibe.
- Contrast guard in OKLCH: keep hue and chroma, move lightness until (a) the brand colour on cream `#F6F3EB` is ≥ 3:1 (buttons, rules, icons) and (b) `--on-brand` text on the brand colour is ≥ 4.5:1. Pale inputs get darker, neon gets darker, near-black stays.
- Any token in `app/globals.css` that is derived from `--primary` with `var()` must be re-declared in the returned object, because `var()` in a `:root` token resolves at `:root`.
- Ochre stays a shape-only accent and never follows the brand.
- Invalid hex returns the Sufra defaults.

### Palette from logo — `lib/palette.ts` (+ test)
`dominantColors(rgba: Uint8ClampedArray, max = 3): string[]`: skip transparent pixels (alpha < 128) and near-neutral pixels (low saturation, or very light/dark), bucket the rest to 4 bits per channel, return the top buckets' averages as hex, dropping colours too close to an earlier pick. `LogoField` draws the uploaded image to a 64×64 canvas (same-origin blob before upload, so no CORS taint), calls it, and shows the colours as swatches next to a hex input. A logo with no colour (black/white) shows no swatches.

### Vibes
Four presets: font pair + radius + photo shape. Declared in `app/layout.tsx` with `next/font`; only Sufra preloads (`preload: false` on the rest). Every vibe has an Arabic display pair. Arabic `.font-display` word-spacing rules stay.

| Vibe | Display (EN / AR) | Body | Radius | Feel |
|---|---|---|---|---|
| sufra | Fraunces / Beiruti | IBM Plex Sans / Plex Arabic | current | warm editorial (today) |
| bold | builder picks a heavy grotesk / matching Arabic | Plex | small | burgers, street food |
| clean | builder picks a neutral sans / matching Arabic | Plex | medium | cafés, healthy |
| classic | builder picks a classic serif / matching Arabic | Plex | small | fine dining |

Font choice for bold/clean/classic is left to the builder, checked against `design.md` (no template tells) and Google Fonts Arabic coverage.

### Guest surfaces
- `components/guest/GuestApp.tsx`: `style={brandTokens(restaurant.accent, restaurant.vibe)}` on the root. The realtime `restaurants` UPDATE already in that file makes changes live.
- `components/guest/Welcome.tsx`: cover photo band above the arch logo (none = current layout), welcome note under the tagline (AR when language is AR, falling back to EN via `pick`).
- `components/guest/Chrome.tsx`: small `VenueMark` beside the name.
- Instagram link (`instagram.com/<handle>`) in the table/bill view footer, opens in a new tab.
- `/admin/qr`: printed cards use the brand colour (through `brandTokens`) and the logo.

### Owner surfaces
- `components/admin/SettingsForm.tsx` gets a "Brand" section: logo (existing `LogoField` plus swatches), colour (swatches + hex input), vibe cards (4, each showing its type sample), cover upload, welcome note EN/AR (AR only when `second_lang = 'ar'`), Instagram.
- `components/admin/BrandPreview.tsx`: phone frame that renders the real `Welcome` and the first menu section with the draft (unsaved) values. Desktop: in the right rail (`ResponsiveSheet rail` / `RailSlot`). Mobile: a "Preview" toggle.
- `/admin/setup`: after `create_restaurant`, a brand step (logo, colour, vibe) with the same preview, skippable.

### Phase 1 done when
- `npm.cmd test`, `typecheck`, `lint` clean; `brand.test.ts` covers pale, neon, dark and invalid inputs; `palette.test.ts` covers a two-colour logo, a monochrome logo and a transparent logo.
- Migration applied, `brand_kit.sql` passes, `get_advisors` has no new warnings.
- Browser: logo upload shows swatches, preview updates live, save updates an open guest page without reload, EN + AR, pale colour stays readable, QR cards branded. `scripts/responsive-check.js` clean on welcome, menu, settings.

## Phase 2: Menu psychology (own plan later)
- Preset tags (Chef's pick, New, Spicy, Vegetarian, Signature) next to the free `badge`. "Popular" is automatic: top 2 per category over 30 days by a SQL function readable by guests (counts only, no money).
- `menu_items.featured` boolean drives the category hero; fallback is today's logic in `MenuView.tsx` (first item with badge + image).
- Quick picks row at the menu top, same SQL function.
- `item_pairings(item_id, pairs_with_id)` owner-set in `ItemEditor`; fallback function returns co-ordered items (60 days, minimum count). Shown once in `ItemSheet` after add and once in the cart for a missing drink/dessert category.
- Multi-select add-on groups with min/max; `place_order` recomputes prices (own migration + test).
- Owner home: average basket and suggestion attach rate.

## Phase 3: Return loop (own plan later)
- Thank-you screen after `close_visit` / `settle_bill`: logo, 1–5 rating, optional note, Google review button (`restaurants.google_review_url`) and Instagram, shown to everyone.
- `leave_feedback(p_visit, p_rating, p_note)` into `visit_feedback`; owner sees feedback, ratings ≤ 3 highlighted.
- Device memory: localStorage `tably-memory` keyed by slug (name + last lines). Next scan: "Welcome back" and one-tap "Order your usual" with available items only, plus "forget me". No server change.

## Builder check answers (Claude's calls, 27 Nov)
1. **Fonts vs Arabic.** `--font-display` / `--font-sans` stay non-inline so the `:lang(ar)` swap in `globals.css` keeps working. `brandTokens` sets only per-vibe source variables (Latin and Arabic display, e.g. `--vibe-display` / `--vibe-display-ar`); the `:root` and `:lang(ar)` rules read those with the Sufra fonts as fallback. New vibe fonts are declared in `app/layout.tsx` so their next/font variables exist on `<html>`.
2. **Portals.** Radix/vaul sheets and toasts render in `body`, outside the GuestApp root. `GuestApp` therefore writes the tokens onto `document.documentElement.style` in an effect and removes them on unmount. The `/t/[slug]` loading skeleton stays Sufra default.
3. Guest is always light; no guest surface uses `.dark`, so `.dark`'s `--primary` is irrelevant. `--brand`, `--brand-field`, `--brand-rule`, `--on-brand` already exist at `:root` as literal oklch; `brandTokens` overrides them. Only `--primary-foreground` (and admin-only `--sidebar-*`) derive by `var()`; re-declare `--primary-foreground`.
4. Realtime already merges `p.new`, so new columns update live. The owner preview uses draft state, never realtime.
5. **Preview.** Use the real `Welcome` / menu components if they take props cleanly inside a `VenueProvider` with the draft restaurant; otherwise extract the presentational part so guest and preview share it. Do not fork a copy.
6. `SettingsForm` saves an explicit column list: add the new fields there. The setup brand step updates `restaurants` directly, like `SetupWizard`. No RPC changes.
7. `lib/types.ts` `Restaurant` gains the new fields. No branding on `/join`, `/login` or closed-table pages in Phase 1.
8. **`/admin/qr`.** Widen its select to include `accent`, `logo_url`. Cards take the brand colour and logo; fonts stay Fraunces/Plex (printed-card reset), not the vibe.

## Left to the builder
- Exact OKLCH step and thresholds beyond the two ratios above.
- Bold/clean/classic font picks.
- Swatch, vibe card and preview frame visuals, within `design.md`.
