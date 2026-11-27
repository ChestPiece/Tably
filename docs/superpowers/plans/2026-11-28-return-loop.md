# Return Loop (Phase 3) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** After the visit ends, the guest sees a branded thank-you screen where they can rate the visit, leave a Google review and follow on Instagram. The owner reads the feedback. On a later scan the phone remembers the guest: "Welcome back" and "Order your usual".

**Architecture:**
- One migration adds:
  - `restaurants.google_review_url`
  - the `visit_feedback` table, guest writes through the `leave_feedback` RPC only
  - a `guest_session` that also returns the last closed visit id and its rating
- Device memory is client-only: localStorage `tably-memory`, plus pure helpers in `lib/memory.ts` that reuse `reconcileCart`.
- The owner gets a Feedback page in the admin shell.

**Tech Stack:** Next.js 16, React 19, Supabase (RLS, security definer RPCs), sonner, node --test.

**Spec:** `docs/superpowers/specs/2026-11-27-brand-kit-menu-psychology-design.md` (Phase 3)

## Global Constraints
- Every guest string needs EN + AR. Staff and owner UI are English only. Use logical CSS.
- The Google review button is shown to every guest, whatever their rating. Never gate reviews.
- A low rating is shown to the owner privately, as a highlight in admin.
- Guest writes go through Postgres functions only. RLS is on every table, and guests never read `visit_feedback`.
- Device memory never leaves the phone. "Forget me" clears it.
- No AI-template tells (no emoji, no gradient, no glow).
- Guest controls are 48px.

## Review Focus
1. A guest rates twice, or two guests at one table each rate. Each guest gets one row per visit, and a second rating updates it. Pinned in `feedback.sql`.
2. Someone rates a visit they were not at, or a visit closed more than 24 h ago. The function raises `FORBIDDEN`. Pinned in `feedback.sql`.
3. The "usual" holds a dish that is now sold out or deleted, or an add-on that is gone. Those lines drop out, and if nothing is left, the card is not shown. Pinned in `memory.test.ts`.
4. A rating outside 1–5, or a note of 2,000 characters. The function raises `INVALID_RATING`, and the note is cut to 500 characters. Pinned in `feedback.sql`.
5. The phone is offline or the RPC fails on submit. The rating stays in place with an error toast, and nothing is lost.

---

### Task 1: Feedback migration
**Files:**
- Create `supabase/migrations/20261128000003_feedback.sql`
- Create `supabase/tests/feedback.sql`

**Produces:**
- `restaurants.google_review_url text`: null, or `https://` with at most 500 characters.
- `visit_feedback(id, visit_id, restaurant_id, user_id, rating smallint 1..5, note text <= 500, created_at)`, unique on `(visit_id, user_id)`. RLS lets the owner select. There are no other policies, and the table is added to realtime.
- `leave_feedback(p_visit uuid, p_rating int, p_note text) returns void`:
  - security definer
  - the caller must be a `visit_guests` member of a visit closed within the last 24 h; otherwise it raises `FORBIDDEN`
  - an out-of-range rating raises `INVALID_RATING`
  - it upserts and trims the note
  - granted to authenticated
- `guest_session` (create or replace) adds `last_visit` (uuid) and `rating` (int or null) to the closed-visit branch.

- [ ] Write the test: rate, re-rate (updates), second guest (second row), stranger (`FORBIDDEN`), rating 0 (`INVALID_RATING`), long note (500), guest select (0 rows), owner select (2 rows), and that `guest_session` returns the rating.
- [ ] Apply the migration, run the test. Expected: `ALL_TESTS_PASSED`.

### Task 2: lib/memory.ts
**Files:**
- Create `lib/memory.ts`
- Create `lib/memory.test.ts`

**Produces:**
- `type Usual = { itemId: string; optionId: string | null; addonIds: string[]; quantity: number }[]`
- `toUsual(lines: CartLine[]): Usual`
- `usualCart(u: Usual, menu: MenuItem[]): CartLine[]`: built on `reconcileCart`, with every line's `via` set to `"usual"`.

- [ ] Tests:
  - a round trip keeps add-ons
  - a sold-out item is dropped
  - a gone add-on drops the line
  - the price is re-priced
  - an empty usual gives `[]`
- [ ] Implement, then run `npm.cmd test`. Expected: all pass.

### Task 3: Thank-you screen
**Files:**
- Modify `components/guest/Welcome.tsx` (`ClosedVisit`)
- Modify `components/guest/GuestApp.tsx`
- Modify `lib/i18n.tsx`
- Modify `lib/types.ts` (`Restaurant.google_review_url`)

**What it does:**
- `ClosedVisit` takes `restaurant`, `lastVisit`, `rating` and `onRate(rating, note)`.
- It shows:
  - the VenueMark
  - the paid or closed heading
  - a 5-button rating radio group (48px)
  - once a rating is picked, an optional note and a Send button
  - after sending, the thanks line
- The Google review link (`target=_blank rel=noopener`) shows whenever a URL exists, before and after rating.
- The Instagram link shows if the venue has a handle.
- `GuestApp` keeps `{ paid_method, last_visit, rating }` from `guest_session`.

- [ ] Implement, typecheck and lint.

### Task 4: Remember the guest
**Files:**
- Modify `components/guest/GuestApp.tsx`
- Modify `components/guest/Welcome.tsx`
- Modify `components/guest/MenuView.tsx`

**Storage:** `tably-memory` = `{ [restaurantSlug]: Usual }`. The name stays in `cb-name`.

**What it does:**
- A successful order saves `toUsual(sent lines)`.
- `Welcome` shows "Welcome back, {name}" when `cb-name` is set, with a "Forget me" button that clears `cb-name` and this venue's usual.
- The menu shows an "Order your usual" card above Quick picks when:
  - the cart is empty
  - the visit has no orders yet
  - `usualCart` is not empty
- One tap fills the cart and opens it.

- [ ] Implement, typecheck and lint.

### Task 5: Owner side
**Files:**
- Modify `components/admin/SettingsForm.tsx` (Google review URL field, added to the explicit save list)
- Create `components/admin/FeedbackPage.tsx`
- Modify `AdminSidebar.tsx` (page `feedback`)
- Modify `AdminApp.tsx`

**The Feedback page:**
- shows the last 30 days, newest first
- each row: stars, note, table, time in the venue timezone
- `rating <= 3` gets the warning surface
- summary line: average and count

- [ ] Implement, typecheck and lint.

### Task 6: Verify and document
- [ ] Run `npm.cmd test`, typecheck, lint and build. Run `get_advisors`.
- [ ] Browser check:
  - close a test visit, rate it, and check the Google button shows
  - owner Feedback page
  - Welcome back
  - Order your usual
  - Forget me
  - EN/AR, 375 and 812×375
- [ ] Update `CLAUDE.md` Data rules and `docs/TASKS.md`.
