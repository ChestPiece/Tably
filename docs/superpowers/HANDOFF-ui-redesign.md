# Handoff: ChestBest UI redesign (continue here)

Start a new Claude Code session in this folder and say:
"Read docs/superpowers/HANDOFF-ui-redesign.md and continue the UI redesign."

## What to run
- Skill: `superpowers:subagent-driven-development` on plan `docs/superpowers/plans/2026-11-16-ui-redesign.md`.
- Ledger (source of truth for progress and rulings): `.superpowers/sdd/2026-11-16-ui-redesign/progress.md`. Read it first; do not redo tasks marked complete.
- Shared brief for every implementer: `.superpowers/sdd/2026-11-16-ui-redesign/common.md` (rules, locked design, global constraints, user feedback).
- Reviewer templates: `reviewer-template.md`, `rereview-template.md` in the same folder.
- Subagents: Sonnet medium only (`model: "sonnet"`, `effort: "medium"`).

## No commits
The user forbids git commits. Progress is snapshotted in a private shadow repo:
- `bash .superpowers/sdd/2026-11-16-ui-redesign/snap.sh "Task N"` (prints sha)
- `bash .superpowers/sdd/2026-11-16-ui-redesign/pkg.sh BASE HEAD OUTFILE` (review diff)
- Before each snapshot, normalize CRLF to LF: `grep -rlU $'\x0d' app components hooks lib` and fix any hits with `sed -i 's/\x0d$//'`.

## Status (2026-11-16)
Tasks 1, 2, 3 and 4 are complete and reviewed.

**Task 8 (kitchen board):** built, review found issues, and fix round 1 was interrupted by a rate limit. Shadow head is `a343f3c`. The fix-round-1 list is in the ledger (Ruling R11 plus findings I1–I3):
- warn/late uses a start-edge border only
- the header at 768 does not collide
- the AR mobile tabs use `dir=ltr` on TabsList
- the action button uses tonal `secondary`
- the "New table" badge moves into the card body
- `pb-4` on the scroll columns
- cancel presets are stored in English

Re-dispatch these to a fresh implementer with the task-8 brief and report, then run a scoped re-review against base `a343f3c`.

**Remaining tasks, in order (Ruling R10):** 9, 10, 11, then 5, 6, 7, then 12.

## User feedback to honour (already in common.md and the plan)
- All dashboards (staff and admin) get a clean shadcn `dashboard-01`/`sidebar-07` look with no clutter. No uppercase headings, no chunky black buttons, no giant pill toggles.
- The guest menu removes:
  - the flame logo
  - uppercase condensed headings
  - dotted price leaders
  - the hero card
  - the heavy black bottom bar
- Kitchen tickets stay compact: at least 4 per column at 1440×847.
- Playwright MCP is often locked; use headless Chrome via CDP (see task-1 report) or ego-browser.
