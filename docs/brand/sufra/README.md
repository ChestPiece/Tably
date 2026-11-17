# Sufra (سفرة) brand: implementation spec

Approved direction, 2026-11-16. This folder is what the app port builds from.
**Ported 2026-11-17.** The app runs Sufra v2 end to end (guest, staff, owner, QR print, `/dev`). Plan: `docs/superpowers/plans/2026-11-16-sufra-port.md`; decisions: `.superpowers/sdd/2026-11-16-sufra-port/progress.md`.

## Files here
| File | Use |
|---|---|
| `tokens.css` | Source of truth for colour (light + dark), type, spacing, radius, motion. Copy of `brand-demos/sufra-v2/tokens.css` |
| `mark.svg` | The mark (48-unit grid, `currentColor`). Replaces the burger in `components/brand.tsx` |
| `README.md` | This spec: mapping into the app, rules, port checklist |

Visual references (open with `python -m http.server 4321` in `brand-demos/`):
- `brand-demos/sufra-v2.html`: full guidelines (logo, colour, type, table card, voice, motion)
- `brand-demos/sufra-v2-app.html`: clickable guest / staff / owner prototype, the target look for each screen
- Published preview (private): https://claude.ai/artifact/HiLitP5oS3EFFTwwgM5Ri5

## The system in one screen
- **Name:** Sufra · سفرة. Each venue keeps its own name on guest screens; Sufra is the platform brand (owner/staff chrome, table card footer, login).
- **Type:** Beiruti (display: venue names, dish names, big numbers) + IBM Plex Sans / IBM Plex Sans Arabic (every interface word). Two families only.
- **Colour:** Indigo `#1E2A5A` is the one action colour. Pearl `#F4F4F1` page. Ochre `#B98B2E` for shapes only (use `--accent-text` `#7D5B14` for ochre words). Dark theme in `tokens.css`.
- **Shape:** the arch (`--radius-arch`) only for the mark, dish photo frames and table markers. Everything else uses sm 8 / md 12 / lg 16 / xl 24.
- **Motion:** one curve `cubic-bezier(0.2,0,0,1)`, 120 / 200 / 320 ms, reduced-motion respected.
- **Touch:** 48px controls on guest and staff, 40px on owner desktop.

## Mapping into the app (shadcn token names in `app/globals.css`)
shadcn uses `--accent` for hover backgrounds, so Sufra's ochre must **not** go into `--accent`. Give it its own name.

| App token | Light | Dark | From Sufra |
|---|---|---|---|
| `--background` | `oklch(96.6% 0.004 106)` | `oklch(18.7% 0.029 274)` | `--bg` |
| `--foreground`, `--card-foreground`, `--popover-foreground`, `--secondary-foreground`, `--accent-foreground` | `oklch(22.2% 0.032 273)` | `oklch(94.7% 0.008 279)` | `--text` |
| `--card`, `--popover` | `oklch(99.4% 0.003 270)` | `oklch(22.3% 0.034 273)` | `--surface` |
| `--secondary`, `--muted`, `--accent` | `oklch(93.8% 0.003 286)` | `oklch(26.1% 0.037 272)` | `--surface-2` |
| `--muted-foreground` | `oklch(50.6% 0.031 274)` | `oklch(64.6% 0.032 275)` | `--text-3` (use `--text-2` for secondary body) |
| `--border` | `oklch(89.6% 0.007 286)` | `oklch(31.5% 0.044 273)` | `--line` |
| `--input` | check ≥ 3:1 against `--card`; start from `--text-3` | same | (new) |
| `--primary` | `oklch(30.3% 0.087 270)` | `oklch(90.6% 0.023 278)` | `--primary` |
| `--primary-foreground` | `oklch(96.6% 0.004 106)` | `oklch(21.9% 0.047 275)` | `--on-primary` |
| `--ring` | `oklch(30.3% 0.087 270)` | `oklch(74.8% 0.119 83)` | `--focus` |
| `--brand` | `oklch(30.3% 0.087 270)` | same | `--brand` (+ `--on-brand`, `--brand-field`, `--brand-rule`) |
| `--ochre` (new) / `--ochre-text` (new) | `--accent` / `--accent-text` values | dark values | Sufra `--accent*` |
| `--destructive` | `oklch(49.4% 0.143 31)` | `oklch(75.0% 0.120 30)` | `--st-danger` (+ `--st-danger-bg`) |
| `--status-new` / `-cooking` / `-ready` | `--st-new` / `--st-cook` / `--st-ready` | dark values | status tokens |
| `--status-served`, `--status-cancelled` | keep neutral: `--text-2` / `--text-3` | same | (not in Sufra; status always shows a word too) |
| `--scrim` | `--scrim` | `--scrim` | |
| `--radius` | `12px` | | `--radius-md` |

Also add to `@theme`: `--font-display`, `--font-ui`, the type scale, `--ease`, `--dur-*`, `--radius-arch`.

## Fonts (`app/layout.tsx`)
Replace Bricolage_Grotesque + Geist with `next/font/google`:
- `Beiruti` (subsets `arabic`, `latin`; weights 500, 700) → `--nf-display`
- `IBM_Plex_Sans` (weights 400, 500, 600) → `--nf-sans`
- keep `IBM_Plex_Sans_Arabic` (400, 500, 600, 700) → `--nf-arabic`

Verify `Beiruti` is exported by `next/font/google` in the installed Next version before writing the import.
Arabic body line height 1.75 (`:lang(ar)` / `[dir=rtl]`), never below 13px.

## Rules that must survive the port
- No gradients on surfaces, no glows, no coloured side stripes on cards or tickets, no italic headings, no emoji.
- Status is always colour **and** a word. Late tickets say "Late · 14 min" in words, not only red.
- Ochre is never body text on light. Indigo is the only filled button colour.
- Logical CSS only (`ms-`/`me-`/`start`/`end`). The mark and numbers never mirror in RTL.
- Table labels: `T12` in English, `ط 12` in Arabic (NBSP between).
- Voice: speak like a host. Never "AI", "seamless", "successfully!", "Oops". EN/AR say / never-say lists and microcopy table are in `sufra-v2.html` section 7.
- Contrast: text ≥ 4.5:1, UI shapes and focus ≥ 3:1, both themes. Re-measure any new pair.

## Port checklist (done 2026-11-17)
1. `app/globals.css`: apply the mapping table, light `:root` and `.dark`.
2. `app/layout.tsx`: fonts above; `metadata.title` and `themeColor` (`#F4F4F1`).
3. `components/brand.tsx`: swap the burger for `mark.svg` paths; lockup "Sufra" / "سفرة" in `font-display`.
4. `public/icon.svg`: the mark in indigo on pearl.
5. Staff board: light + dark toggle (prototype has both); remove any coloured left borders on `OrderCard`.
6. Owner admin: left sidebar + Home (prototype `view=owner`) is a layout change, plan it as its own task.
7. `.tastemaker/style-lock.md` and the root `CLAUDE.md` UI rules: replace ember/cream wording with Sufra.
8. Verify: `npm run typecheck`, `npm run lint`, Playwright guest 390×844 + staff 1280×800 in EN/AR, light/dark, zero console errors.

## Still open (not blockers for the port)
Native Gulf Arabic copy review · wordmark lettering pass · Pantone match from a swatch book · trademark and domain check for "Sufra".
