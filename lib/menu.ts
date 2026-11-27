// Menu psychology helpers (spec 2026-11-27, Phase 2): section order, cart pricing, one nudge.
import { pick, type Lang, type MenuItem, type OrderLine } from "./types.ts";

/** menu_signals(): item ids ranked from real orders. Empty for a new venue. */
export type Signals = { popular: string[]; quick: string[]; pairs: Record<string, string[]> };
export const NO_SIGNALS: Signals = { popular: [], quick: [], pairs: {} };

export type Via = "pairing" | "quick" | "usual";
// addonIds is optional: carts saved before add-ons existed have none.
export type CartLine = { key: string; itemId: string; optionId: string | null; addonIds?: string[]; quantity: number; unit: number; via?: Via };

/** Hero = first featured dish with a photo, else today's badge + photo rule. Signature dishes lead the rest. */
export function rankSection(items: MenuItem[]): { hero: MenuItem | null; rest: MenuItem[] } {
  const hero = items.find((i) => i.featured && i.image_url) ?? items.find((i) => i.badge && i.image_url) ?? null;
  const rest = items.filter((i) => i !== hero);
  const sig = (i: MenuItem) => (i.tags?.includes("signature") ? 0 : 1);
  return { hero, rest: rest.map((i, n) => [i, n] as const).sort((a, b) => sig(a[0]) - sig(b[0]) || a[1] - b[1]).map(([i]) => i) };
}

/** No choices to make: the row's Add button can put it straight in the cart. */
export const isSimple = (i: MenuItem) => i.item_options.length === 0 && !((i.item_addons?.length ?? 0) && i.addon_max);

/** "Large, Cheese, Bacon": the option and add-ons an order line snapshotted. */
export const lineExtras = (lang: Lang, l: Pick<OrderLine, "option_name" | "option_name_ar" | "addons">) =>
  [l.option_name ? pick(lang, l.option_name, l.option_name_ar) : "", ...(l.addons ?? []).map((a) => pick(lang, a.name, a.name_ar))].filter(Boolean).join(", ");

export const lineKey = (itemId: string, optionId: string | null, addonIds: string[]) =>
  `${itemId}:${optionId ?? "-"}:${[...addonIds].sort().join(",")}`;

export function unitPrice(item: MenuItem, optionId: string | null, addonIds: string[]): number {
  const opt = item.item_options.find((o) => o.id === optionId)?.price_fils ?? 0;
  return item.price_fils + opt + (item.item_addons ?? []).filter((a) => addonIds.includes(a.id)).reduce((s, a) => s + a.price_fils, 0);
}

/** First available dish paired with one of itemIds that is not in the cart: owner pairings before co-orders. */
export function pickNudge(itemIds: string[], inCart: Set<string>, owner: Map<string, string[]>, signals: Signals, menu: MenuItem[]): MenuItem | null {
  const byId = new Map(menu.map((i) => [i.id, i]));
  for (const id of itemIds) {
    for (const cand of [...(owner.get(id) ?? []), ...(signals.pairs[id] ?? [])]) {
      const it = byId.get(cand);
      if (it?.available && !inCart.has(cand)) return it;
    }
  }
  return null;
}

/** Keep lines whose dish, option and every add-on still exist (within the max); re-price and merge (max 20). */
export function reconcileCart(lines: CartLine[], menu: MenuItem[]): CartLine[] {
  const out = new Map<string, CartLine>();
  for (const l of lines) {
    const item = menu.find((i) => i.id === l.itemId);
    if (!item?.available) continue;
    if (l.optionId ? !item.item_options.some((o) => o.id === l.optionId) : item.item_options.length > 0) continue;
    const addonIds = l.addonIds ?? [];
    if (addonIds.length > (item.addon_max ?? 0) || !addonIds.every((a) => (item.item_addons ?? []).some((x) => x.id === a))) continue;
    const key = lineKey(l.itemId, l.optionId, addonIds);
    const hit = out.get(key);
    out.set(key, { ...l, addonIds, key, unit: unitPrice(item, l.optionId, addonIds), quantity: Math.min(20, (hit?.quantity ?? 0) + l.quantity) });
  }
  return [...out.values()];
}
