# Working direction — which skills for which task

Invoke the listed skills with the Skill tool **before** starting the task. Process skills come first, then domain skills. Project rules in `CLAUDE.md` and `design.md` win over any skill.

## Always on
- `ponytail` — simplest change that works; reuse existing helpers (`useVenue`, `ResponsiveSheet`, `PANEL`, `pick`, `dayRange`).
- `karpathy-guidelines` — surgical diffs, state assumptions.
- `superpowers:verification-before-completion` — run the checks before saying done.

## Task map

| Task | Skills (in order) | Notes |
|---|---|---|
| New feature or behaviour change | `superpowers:brainstorming` → `superpowers:writing-plans` → `superpowers:executing-plans` or `superpowers:subagent-driven-development` | Specs go in `docs/superpowers/specs/`, plans in `docs/superpowers/plans/`. |
| Bug or failing test | `superpowers:systematic-debugging` → `superpowers:test-driven-development` | Reproduce first. Fix the shared function, not one caller. |
| DB schema, RPC, RLS, migration | `supabase:supabase` + `supabase:supabase-postgres-best-practices` + `superpowers:test-driven-development` | New migration in `supabase/migrations/`, test in `supabase/tests/`. Run `get_advisors` after. |
| Auth, sessions, invites, reset password | `supabase:supabase` | Guest = anonymous user + `cb-guest`; staff = `@supabase/ssr` cookies. |
| Next.js routing, `proxy.ts`, server actions | `context7` MCP docs + `node_modules/next/dist/docs` | Next 16 differs from training data (see `AGENTS.md`). |
| Guest, staff or owner UI | `web-design-engineer` (lead) + `inspo` MCP references → `no-ai-design-slop` gate | Follow `design.md`. Do not invent new tokens. |
| Restyle or "looks AI-made" cleanup | `unslop` or `hallmark` (audit) → `no-ai-design-slop` | Keep Sufra v2 direction. |
| Forms (menu editor, setup, login, team) | `form-design` + `error-handling-ux` + `ux-writing` | 48px guest/staff, 40px owner controls. |
| Loading, empty, error states | `loading-states` + `error-handling-ux` + `feedback-patterns` | |
| Arabic / RTL / locale formats | `localization-design` | Logical CSS only; `lang="ar"` on Arabic text inside English pages. |
| Accessibility pass | `better-accessibility` + `accessibility-audit` | Reduced motion = opacity fade. |
| Kitchen board, status flows | `state-machine` + `web-design-engineer` | Status order: received, preparing, ready, served, cancelled. |
| Owner profit and charts | `dataviz` + `data-visualization` | recharts is installed. Money via `useVenue().money`. |
| Landing page `/` | `landing-page-design` + `gsap` + `stageshow` (project skill, faux product UI demos) | Markup in `components/landing/markup.ts`, CSS scoped `.tl`. |
| Motion and micro-interactions | `motion-design` + `micro-interaction-spec` + `optimize-web-animations` | GSAP + Lenis already installed. |
| Copy (guest, staff, owner, landing) | `ux-writing` + `better-writing` | Every guest string in EN and AR. |
| Browser QA / E2E | `gstack-qa` or `ego-browser`, built-in browser for quick checks | Dev server `npm.cmd run dev` (launch config `tably`). Guest 390x844, staff 1280x800. Screenshot + console check each step. |
| Design QA before ship | `design-qa-checklist` + `gstack-design-review` | |
| Code review | `superpowers:requesting-code-review` or `code-review` | Then `superpowers:receiving-code-review` for feedback. |
| Security check | `security-review` + Supabase `get_advisors` | Public repo: no secrets. |
| Performance | `performance-profiling` | |
| Deploy (Vercel) | `gstack-land-and-deploy` | Deploys from `main`. Commit only when the user asks. |
| Docs, README, portfolio | `documentation-template` + `better-writing` + `humanizer:humanizer` | Product name is Tably; ChestBest is the demo venue only. |
| Pilot / sales material | `presentation-deck` or `slides` | Source: `docs/PILOT.md`. |

## Subagents
Sonnet medium or Opus low only. Name the skills above in each brief and tell the agent to invoke them first.
