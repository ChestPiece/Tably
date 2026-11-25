# Tably — agent instructions

Tably is a QR table ordering SaaS (Next.js 16 + Supabase, Vercel). "ChestBest" is only the demo venue in seed data and demos, never the product name.

- Project context, data rules, UI rules and gotchas: `CLAUDE.md`. Read it first.
- Which skill to use for which task: `docs/WORKING-DIRECTION.md`.
- Remaining work: `docs/TASKS.md`. Design system: `design.md`.
- Public repo: never commit passwords, keys or `.env*` (only `.env.example`). Commit only when the user asks.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
