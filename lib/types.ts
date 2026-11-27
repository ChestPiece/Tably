export type Lang = "en" | "ar";
export type Vibe = "sufra" | "bold" | "clean" | "classic";
export type OrderStatus = "received" | "preparing" | "ready" | "served" | "cancelled";

export type Restaurant = {
  id: string; slug: string; name: string; name_ar: string; tagline: string; tagline_ar: string;
  currency: string; timezone: string; second_lang: "ar" | null; accent: string; service_mode: "table" | "counter"; ordering_paused: boolean; pin_required: boolean;
  logo_url: string | null; cover_url: string | null; vibe: Vibe; welcome_note: string; welcome_note_ar: string; instagram: string;
  google_review_url: string | null;
};
export type Category = { id: string; restaurant_id: string; name: string; name_ar: string; position: number };
export type ItemOption = { id: string; item_id: string; restaurant_id: string; name: string; name_ar: string; price_fils: number; position: number };
export type ItemAddon = { id: string; item_id: string; restaurant_id: string; name: string; name_ar: string; price_fils: number; position: number };
export type MenuTag = "chef" | "new" | "spicy" | "veg" | "signature";
export const MENU_TAGS: MenuTag[] = ["chef", "new", "spicy", "veg", "signature"];
export type MenuItem = {
  id: string; restaurant_id: string; category_id: string; name: string; name_ar: string; description: string; description_ar: string;
  price_fils: number; image_url: string | null; available: boolean; badge: string | null; badge_ar: string | null; position: number;
  tags: MenuTag[]; featured: boolean; addon_max: number;
  item_options: ItemOption[]; item_addons: ItemAddon[];
};
export type OrderLine = {
  id: string; order_id: string; name: string; name_ar: string; option_name: string | null; option_name_ar: string | null;
  unit_price_fils: number; quantity: number; position: number;
  addons: { name: string; name_ar: string; price_fils: number }[]; via: "pairing" | "quick" | "usual" | null;
};
export type Order = {
  id: string; restaurant_id: string; visit_id: string; guest_id: string; number: number; table_number: number;
  guest_name: string | null; guest_seq: number; status: OrderStatus; total_fils: number; note: string | null;
  cancel_reason: string | null; is_first_of_visit: boolean; created_at: string; preparing_at: string | null;
  ready_at: string | null; served_at: string | null; cancelled_at: string | null; order_lines: OrderLine[];
};
export type Visit = {
  id: string; restaurant_id: string; table_id: string; table_number: number; opened_at: string; closed_at: string | null;
  bill_requested_at: string | null; paid_at: string | null; payment_method: "cash" | "card" | null; settled_total_fils: number | null; guest_count: number;
};
export type ServiceRequest = {
  id: string; visit_id: string; table_number: number; guest_name: string | null; guest_seq: number | null;
  kind: "waiter" | "bill"; created_at: string; resolved_at: string | null;
  acknowledged_at: string | null; ack_name: string | null; nudged_at: string | null; pay_method: "cash" | "card" | null;
};
export type TableRow = { id: string; restaurant_id: string; number: number; qr_slug: string; pin: string | null };

export const pick = (lang: Lang, en: string, ar: string | null | undefined) => (lang === "ar" && ar ? ar : en);

export const MENU_SELECT = "*, item_options(*), item_addons(*)";
export const ORDER_SELECT = "*, order_lines(*)";

export type StaffRole = "owner" | "staff";
/** Mirrors private.require_role in the staff RPCs. "staff" is the front desk / counter role. */
