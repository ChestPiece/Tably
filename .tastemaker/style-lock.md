# Sufra v2 style lock

Source: `docs/brand/sufra/tokens.css` + README mapping. Tokens live once in `app/globals.css` (oklch). Prototype `brand-demos/sufra-v2-app.html` wins visually.

## Fonts
- Display (`font-display`, `--nf-display`): Beiruti 500/700. Venue names, dish names, table numbers, big numbers only.
- UI (`font-sans`, `--nf-sans`): IBM Plex Sans 400/500/600. Every interface word, prices, figures, `tabular-nums`.
- Arabic (`font-arabic`, `--nf-arabic`): IBM Plex Sans Arabic 400-700; RTL puts it first in the sans stack. Line height 1.75, no tracking, never below 13px, no uppercase, no italics.

## Colour (Tailwind names; light / dark)
| Token | Light | Dark |
|---|---|---|
| background | #F4F4F1 | #0F1220 |
| card / popover | #FBFBFD | #161A2B |
| secondary / muted / accent | #EAEAEC | #1E2336 |
| foreground | #161A2A | #ECEDF3 |
| text-2 (secondary body, raw var `--text-2`) | #4F5468 | #AEB2C3 |
| muted-foreground | #5F6477 | #888DA2 |
| border | #DCDCE1 | #2A3048 |
| input (field boundary, = text-3) | #5F6477 | #888DA2 |
| primary / on-primary (only filled button) | #1E2A5A / #F4F4F1 | #DCDFF0 / #141830 |
| ring | #1E2A5A | #D2A64C (ochre) |
| brand / on-brand / brand-field / brand-rule | indigo #1E2A5A, #F4F4F1, #2D3A67, rule | same brand, on-brand #ECEDF3 |
| ochre (shapes) / ochre-text (words) | #B98B2E / #7D5B14 | #D2A64C / #D2A64C |
| destructive / danger-bg | #A3392A / #F6E1DC | #F09080 / #3D211D |
| status-new / cooking / ready | #2F4B8A / #8A5A0D / #2C6A44 | #9DB3EA / #E4B566 / #86C79C |
| status-served / cancelled | text-2 / text-3 | text-2 / text-3 |
| scrim, photo-scrim, on-photo | oklch alpha tokens | same, darker |

Ochre never goes in `--accent`. Status is a single colour: always 8px square + word (`StatusTag`). No fills with `-foreground`.

## Shape, motion, controls
- Radius: sm 8 / md 12 / lg 16 / xl 24 (`--radius: 12px`); `rounded-arch` (999px 999px 8px 8px) only on the mark, dish photo frames, table markers, table cards.
- Motion: one curve `ease-sufra` (cubic-bezier(0.2,0,0,1)); `duration-fast|base|slow` = 120/200/320ms; transform/opacity only; press scale .98; reduced motion = short fade.
- Controls: 48px (`h-12`) guest + staff, 40px (`h-10`) owner. Elevation: `shadow-float`.
- Rules: no surface gradients, glows, coloured side stripes, italic headings, emoji. Logical CSS only. Table label `T12` / `ط 12` (NBSP).

## Themes
- Guest `/t/*`: no ThemeProvider, always light. Staff: dark default, key `sufra-staff-theme`. Owner: light default, key `sufra-owner-theme`. `enableSystem={false}` everywhere.

## Contrast (measured, full list in `contrast-matrix.txt`)
Text >= 4.5, UI shapes/focus >= 3. Light: fg/bg 15.7, text-2/bg 6.8, muted/card 5.8, input/card 5.8, ochre-text/card 6.1, ochre/card 3.0 (shape), status vs card 5.8-8.3, destructive/danger-bg 5.3, on-primary/primary 12.4, on-brand/brand 12.4, on-brand/brand-field 10.0. Dark: ochre/bg 8.3, status vs card 8.3-9.1, destructive/danger-bg 6.3, on-brand/brand 11.7, on-brand/brand-field 9.4, input/card 5.2. Border/line is decorative (1.2-1.4), never the only boundary of a control (inputs use `--input`).

## Legacy aliases
Removed 2026-11-17. No ChestBest-era token names remain in `app/globals.css`.

## Registries (components.json)
- `@kokonutui`: https://kokonutui.com/r/{name}.json; `@reui`: https://reui.io/r/{name}.json (depends on `@base-ui/*`, not Radix); working origin registry: https://coss.com/origin/r/{name}.json.
