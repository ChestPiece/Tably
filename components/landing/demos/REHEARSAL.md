# Rehearsal notes: landing demos

The three Stageshow demos on `/`. Each was filmed with
`.claude/skills/stageshow/scripts/film.mjs --gate` at the shown width (1280 page) and at `--width 390`.

## Framing (2026-11-21 reframe)
Anas asked for every device to be fully visible, not cut at the stage edge. So the demos use the gold `fade-crop` framing instead of bleeding off an edge:
- Each window sits in a mask wrapper (`.hd-mask`, `.bd-mask`, `.md-mask`). The window keeps its top and side shadows and fades into the paper at its foot.
- Phones are always whole. Their shadows are kept short (`0 24px 32px -16px`) so the stage's `overflow: hidden` never clips them.
- Hero wide: the phone (`top: 72px`) sits below the board's title bar and clears the traffic lights.
- Compact (≤440 hero/board, ≤640 menu): the window is on top inside a 16px gutter, and the phone sits whole below it, centred.

| Demo | Gold copied | 1280 | 390 |
|---|---|---|---|
| `HeroDemo` (hero) | `device-pair` + `fade-crop`, motion from `subscriptions` | framing lines only (see below) | framing lines only |
| `BoardDemo` (Team) | `choreography` / `reorder` + `fade-crop` | framing lines only | framing lines only |
| `MenuEditDemo` (Your restaurant) | `table-edit` plus a `device-pair` phone | framing lines only | framing lines only |

## What changed from the gold
- **Hero**
  - The guest phone adds a dish and sends the order.
  - The ticket flies to the kitchen board, the Line count rolls, and the ticket is marked ready and served.
  - Counts and the cart total are `Roll`, not `Count`. `Count` was flagged "appears with no entrance".
  - The ticket's Cancel is hidden because the ticket is too narrow for it.
  - Narrow columns show "Pass" instead of "At the pass" (`.lbl-long` / `.lbl-short`).
- **Board**
  - The Line + pass board: a ticket starts and is marked ready, a waiter call is answered, and the pass serves a plate.
  - The reset is a new order arriving.
  - The Line column is 252px, so the ticket's acts row (button plus Cancel) fits without a width jump.
- **Menu**
  - The owner double-clicks the burger price, types 34.00 and commits. The phone price rolls a beat later.
  - The lemonade's Available switch goes off and the phone marks it "Sold out".
  - `play="once"`: it ends on the result, which is also the poster.
  - Compact: the window shows only the two rows the story touches, with no fade. The phone (232 wide) sits whole below it.

## Gate lines accepted on purpose
These lines come from the gate's bleed rules. They conflict with the "fully visible" direction, so they stay:
- "whole but off center" and "nearly square": the window is meant to be whole, with the phone filling the other side.
- "ends 16px short of the edge" on compact windows: that is the gutter.
- "uneven gutters vs `.tl`": these are page-level.
- `td-ticket` "negative bottom padding": tickets run past the window foot, but only under the mask's fade, so it can't be seen.
- A hard edge on `ss-bar` while it moves: this is inside the fade band.

## Known false positives (not faults)
- **Six "kit override" lines on every demo.** Turbopack merges `kit/phone.css` into a shared chunk whose URL has no `/kit/`, so the film's kit-file skip misses it.
- **Sub-pixel `ss-roll__item` handoff shifts, and 0.8px settle snaps on Button and Roll.** These happen inside the kit.
- **An intermittent −2px relabel jump on the board.**

## Not done or not checked
- Light/dark and Safari were not checked. Reduced motion shows the poster through the kit and was not re-filmed.
