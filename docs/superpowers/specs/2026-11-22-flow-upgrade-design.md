# Flow upgrade (2026-11-22)

Owner, staff and guest gaps found by Anas testing as a new owner. Decisions are his; build notes are mine.

## Decisions
- Invites: share link only (copy, WhatsApp, QR). Link is `/join/<token>`; the token is the secret, the email is locked on the page.
- One account = one restaurant, owner or staff, never both (unique `staff_members.user_id`; `create_restaurant` raises `ALREADY_STAFF` / `HAS_INVITE`).
- Waiter / bill: live steps. Sent (15 s ring) → "On my way" with staff name → nudge if nobody answers in 15 s (board chimes again) → done.
- Bill: guest picks cash or card. Staff tap "Paid by <method>" (`settle_bill` records payment and closes the visit). Guest sees "Paid, thank you".
- Logo: upload in Settings and the setup wizard; no logo = name monogram. Never a dish photo on the welcome page.
- Add several dishes: grid plus paste box (`lib/parse-dishes.ts`).
- Inter for owner and staff UI; Fraunces stays on guest pages and printed QR cards.
- Modals: create/edit flows open as a right side panel on desktop (full screen below 768px), short tasks stay centred dialogs; hairline footer, Ctrl/Cmd+Enter submits.

## Files
- DB: `supabase/migrations/20261122000001_flow_upgrade.sql`, tests `supabase/tests/invites.sql`, `supabase/tests/requests_flow.sql`.
- Invites: `components/admin/TeamAdmin.tsx`, `app/(public)/join/[token]/page.tsx`, `components/admin/InvitedCard.tsx`, `app/admin/setup/page.tsx`.
- Requests: `components/guest/TableView.tsx`, `components/staff/CallsTray.tsx`, `components/staff/StaffBoard.tsx`.
- Logo: `components/admin/LogoField.tsx`, `SettingsForm.tsx`, `SetupWizard.tsx`, `components/brand.tsx` (`VenueMark`), `components/guest/Welcome.tsx`.
- Bulk: `components/admin/BulkDishes.tsx`, `lib/parse-dishes.ts` (+ test).
- Type / modals: `components/ops-font.tsx`, `components/app/responsive-sheet.tsx`, `components/ui/dialog.tsx`, `components/admin/ItemEditor.tsx`.

## My calls
- Staff bill chips show method but no total (staff see no money).
- Nudge fires once per request, client-side when the ring ends; the server enforces the 15 s and once-only rule.
- Wizard uploads the logo after `create_restaurant` (storage folder is the restaurant id); a failed upload does not block setup.
