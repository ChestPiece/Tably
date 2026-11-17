# Brand directions (2026-11-16)

Brand exploration for the QR ordering platform. "ChestBest" was only a demo name: the brand is the
platform sold to restaurants, and it must sell premium, class and emotion, not "a food app".

## Decision
**Sufra (سفرة) is chosen.** It still needs modifications before it becomes the full brand guidelines.
Covers and Maître are kept for reference (Covers' precision may still inform the staff board).

## Files
| File | What |
|---|---|
| `index.html` | Comparison of the three directions + recommendation |
| `sufra.html` | **A · Sufra** (chosen): Gulf hospitality, bilingual lockup, majlis-arch mark that also frames the QR |
| `covers.html` | B · Covers: Swiss kitchen precision, condensed Archivo, red "pass light" dot, includes kitchen board |
| `maitre.html` | C · Maître: quiet luxury after dark, Cormorant italic, brass ring mark |
| `sufra-v2-options.html` | v2 options board: 3 type routes x 3 palettes (light + dark, EN/AR) on real-scale guest, staff and owner screens, redrawn mark. **Picked 2026-11-16: type B (Beiruti + IBM Plex Sans/Arabic) + palette 3 (Indigo and pearl).** |
| `sufra-v2.html` | **v2 brand guidelines (draft, awaiting approval):** idea, logo construction + lockups + clear space + misuse, colour tokens with live contrast + print starting values, EN/AR type scale, table card print spec (100 × 150 mm), embedded live product screens, voice EN/AR with microcopy, motion and states |
| `sufra-v2-app.html` | v2 clickable prototype mirroring the real app: guest (welcome, menu, item sheet, cart, tracker, bill), staff (board, tables, menu), owner (home, live board, orders, menu editor, tables & QR, team, settings). One shared in-page state; views: Guest + Staff split, Guest, Staff, Owner; EN/AR; light/dark. URL params: `view`, `lang`, `theme`, `embed=1`, `step`, `page` |
| `sufra-v2/tokens.css` | Single token source for both v2 pages (OKLCH colours light/dark, type, 4px spacing, radius, motion). Port this into the app after approval |
| `qr.js` | Draws a QR-looking placeholder (does not scan) |

View: `python -m http.server 4321` inside this folder, then open http://localhost:4321/
(`file://` links between pages also work in a normal browser).

## Sufra system as built (starting point)
- Mark: majlis arch = serving cloche, resting on a table line (SVG `<symbol id="arch">` in `sufra.html`).
- Lockup: "Sufra" in Gloock + "سفرة" in Reem Kufi 700, equal weight, divider bar between.
- Colour: Paper #F8F3EA (page), Sand #EFE6D6 (surfaces), Date #3B2418 (ink, buttons),
  Night #1F2C4C (headers), Saffron #C98A2B (accent, max ~10% of a surface). Ratio 45/25/15/10/5.
- Type: Gloock (Latin display), Reem Kufi (Arabic display), Readex Pro (body, both scripts).
- Touchpoints shown: arch-shaped table tent with QR, guest phone menu (sample venue "Bait Al Zaafaran").
- Voice: speak like a host ("Your table is set. Take your time."), never "AI", "seamless", "successfully!".

## v2 status (2026-11-16)
- **Approved.** Implementation spec for the app port lives in `docs/brand/sufra/` (README, tokens.css, mark.svg).
- Picked: type B (Beiruti for names + IBM Plex Sans/Arabic for UI), palette 3 Indigo and pearl. Mark redrawn on a 48-unit grid (arch + cloche + table line).
- Rules: no coloured side stripes on cards, no gradients/glows, arch only for mark, photo frames and floor markers; status always colour + word.
- Photos are Unsplash links for the sample venue only (credited in an HTML comment); each venue supplies its own.
- Still open: user approval of the guidelines, native Gulf Arabic copy review, wordmark lettering pass, Pantone match from a swatch book, trademark/domain check, then port tokens into the app.

## Open items for the next session (v1 notes)
- User's list of Sufra modifications (not given yet: ask first).
- Name check: trademark + domain for "Sufra" before committing.
- Full guidelines: logo construction grid and misuse examples, full Arabic type scale, staff board and
  owner admin in Sufra, print specs for table cards, dark mode, colour contrast matrix.
- Then port the tokens into the app (`app/globals.css`, `components/brand.tsx`, `.tastemaker/style-lock.md`).
- Contrast not yet measured for saffron on sand/paper (likely fails for text: keep saffron decorative).
- Not yet checked at phone width after the last edits.

Skills used: superpowers:brainstorming, brand, web-design-engineer, no-ai-design-slop.
