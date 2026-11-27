import { test } from "node:test";
import assert from "node:assert/strict";
import { NO_SIGNALS, lineKey, pickNudge, rankSection, reconcileCart, unitPrice } from "./menu.ts";
import type { MenuItem } from "./types.ts";

const item = (id: string, over: Partial<MenuItem> = {}): MenuItem => ({
  id, restaurant_id: "r", category_id: "c", name: id, name_ar: "", description: "", description_ar: "",
  price_fils: 1000, image_url: null, available: true, badge: null, badge_ar: null, position: 0,
  tags: [], featured: false, addon_max: 0, item_options: [], item_addons: [], ...over,
});
const img = "https://x/y.jpg";
const ids = (xs: MenuItem[]) => xs.map((x) => x.id);

test("rankSection prefers featured", () => {
  const r = rankSection([item("a", { badge: "Hot", image_url: img }), item("b", { featured: true, image_url: img }), item("c")]);
  assert.equal(r.hero?.id, "b");
  assert.deepEqual(ids(r.rest), ["a", "c"]);
});

test("rankSection falls back to badge+image", () => {
  const r = rankSection([item("a", { featured: true }), item("b", { badge: "New", image_url: img })]);
  assert.equal(r.hero?.id, "b");
});

test("rankSection puts signature first", () => {
  const r = rankSection([item("a"), item("b", { tags: ["signature"] }), item("c"), item("d", { tags: ["spicy", "signature"] })]);
  assert.equal(r.hero, null);
  assert.deepEqual(ids(r.rest), ["b", "d", "a", "c"]);
});

test("rankSection with no signals keeps order", () => {
  assert.deepEqual(ids(rankSection([item("a"), item("b"), item("c")]).rest), ["a", "b", "c"]);
});

test("lineKey ignores add-on order", () => {
  assert.equal(lineKey("i", null, ["x", "y"]), lineKey("i", null, ["y", "x"]));
  assert.notEqual(lineKey("i", null, ["x"]), lineKey("i", null, ["y"]));
  assert.notEqual(lineKey("i", "o", []), lineKey("i", null, []));
});

test("unitPrice sums option and add-ons", () => {
  const it = item("i", {
    item_options: [{ id: "o", item_id: "i", restaurant_id: "r", name: "L", name_ar: "", price_fils: 250, position: 0 }],
    item_addons: [
      { id: "x", item_id: "i", restaurant_id: "r", name: "Cheese", name_ar: "", price_fils: 300, position: 0 },
      { id: "y", item_id: "i", restaurant_id: "r", name: "Bacon", name_ar: "", price_fils: 200, position: 1 },
    ],
  });
  assert.equal(unitPrice(it, "o", ["x", "y"]), 1750);
  assert.equal(unitPrice(it, null, []), 1000);
});

test("pickNudge skips sold-out and in-cart", () => {
  const menu = [item("a"), item("b", { available: false }), item("c"), item("d")];
  const owner = new Map([["a", ["b", "c", "d"]]]);
  assert.equal(pickNudge(["a"], new Set(["a", "c"]), owner, NO_SIGNALS, menu)?.id, "d");
  assert.equal(pickNudge(["a"], new Set(["a", "c", "d"]), owner, NO_SIGNALS, menu), null);
});

test("pickNudge prefers owner pairing", () => {
  const menu = [item("a"), item("b"), item("c")];
  const signals = { ...NO_SIGNALS, pairs: { a: ["c"] } };
  assert.equal(pickNudge(["a"], new Set(["a"]), new Map([["a", ["b"]]]), signals, menu)?.id, "b");
  assert.equal(pickNudge(["a"], new Set(["a"]), new Map(), signals, menu)?.id, "c");
  assert.equal(pickNudge(["a"], new Set(["a"]), new Map(), NO_SIGNALS, menu), null);
});

test("reconcileCart drops stale add-on", () => {
  const menu = [item("i", {
    addon_max: 1,
    item_addons: [{ id: "x", item_id: "i", restaurant_id: "r", name: "Cheese", name_ar: "", price_fils: 300, position: 0 }],
  })];
  const out = reconcileCart([
    { key: "k1", itemId: "i", optionId: null, addonIds: ["x"], quantity: 2, unit: 999 },
    { key: "k2", itemId: "i", optionId: null, addonIds: ["gone"], quantity: 1, unit: 1300 },
    { key: "k3", itemId: "i", optionId: null, quantity: 1, unit: 1000 },
  ], menu);
  assert.deepEqual(out.map((l) => [l.addonIds, l.unit, l.quantity]), [[["x"], 1300, 2], [[], 1000, 1]]);
  // A lowered max drops lines over it
  assert.equal(reconcileCart([{ key: "k", itemId: "i", optionId: null, addonIds: ["x"], quantity: 1, unit: 1300 }], [{ ...menu[0], addon_max: 0 }]).length, 0);
});
