// Device memory (spec 2026-11-27, Phase 3): the guest's last order, kept only on this phone.
import { lineKey, reconcileCart, type CartLine } from "./menu.ts";
import type { MenuItem } from "./types.ts";

export type Usual = { itemId: string; optionId: string | null; addonIds: string[]; quantity: number }[];

export const toUsual = (lines: CartLine[]): Usual =>
  lines.map((l) => ({ itemId: l.itemId, optionId: l.optionId, addonIds: l.addonIds ?? [], quantity: l.quantity }));

/** Today's cart for the usual: unavailable dishes and stale choices drop out, prices come from the menu. */
export const usualCart = (u: Usual, menu: MenuItem[]): CartLine[] =>
  reconcileCart(u.map((l) => ({ ...l, key: lineKey(l.itemId, l.optionId, l.addonIds), unit: 0, via: "usual" as const })), menu);

// localStorage "tably-memory" = { [restaurantSlug]: Usual }. Browser only; storage errors mean "no memory".
const KEY = "tably-memory";
const readAll = (): Record<string, Usual> => {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) ?? "{}");
    return v && typeof v === "object" && !Array.isArray(v) ? v : {};
  } catch {
    return {};
  }
};
// Anything hand-edited or from an older build is dropped line by line, never thrown in the render path.
export const loadUsual = (slug: string): Usual => {
  const u: unknown = readAll()[slug];
  return Array.isArray(u)
    ? u.filter((l) => l && typeof l.itemId === "string" && Number.isInteger(l.quantity) && l.quantity > 0)
        .map((l) => ({ itemId: l.itemId, optionId: typeof l.optionId === "string" ? l.optionId : null, addonIds: Array.isArray(l.addonIds) ? l.addonIds.filter((x: unknown) => typeof x === "string") : [], quantity: l.quantity }))
    : [];
};
export function saveUsual(slug: string, u: Usual | null) {
  const all = readAll();
  if (u?.length) all[slug] = u;
  else delete all[slug];
  try {
    localStorage.setItem(KEY, JSON.stringify(all));
  } catch {}
}
