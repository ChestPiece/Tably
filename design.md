# Design — ChestBest (Sufra)

The locked design system for this app. Every page and component reads this file before it changes UI. Extend or amend this file when the system needs to grow; never override it per page. Tokens live once in `app/globals.css`. Replaces `.tastemaker/style-lock.md` (Hallmark redesign, 2026-11-17).

## Genre
Editorial, warm. The guest menu reads like a printed menu card. Staff and owner screens are dense working tools that share the same type and colour.

## Macrostructure family
- Guest (`/t/[slug]`): **Long Document**. One continuous menu, sticky category index, section heads over hairlines, dish rows with dotted leaders to the price. Bill and cart are receipts.
- Staff (`/staff`): **Workbench**. Line + pass kitchen board (`components/staff/Board.tsx`), structure fixed by the KDS mockups in `brand-demos/kds/`.
- Owner (`/admin`): **Workbench**. Panels on the paper canvas, figures lead, labels under them. No icon tiles.
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
