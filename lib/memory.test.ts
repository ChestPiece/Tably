import { test } from "node:test";
import assert from "node:assert/strict";
import { toUsual, usualCart } from "./memory.ts";
import type { MenuItem } from "./types.ts";

const item = (id: string, over: Partial<MenuItem> = {}): MenuItem => ({
  id, restaurant_id: "r", category_id: "c", name: id, name_ar: "", description: "", description_ar: "",
  price_fils: 1000, image_url: null, available: true, badge: null, badge_ar: null, position: 0,
  tags: [], featured: false, addon_max: 0, item_options: [], item_addons: [], ...over,
});
const cheese = { id: "x", item_id: "a", restaurant_id: "r", name: "Cheese", name_ar: "", price_fils: 300, position: 0 };

test("usual round trip keeps add-ons and re-prices", () => {
  const menu = [item("a", { addon_max: 1, item_addons: [cheese], price_fils: 1200 })];
  const u = toUsual([{ key: "k", itemId: "a", optionId: null, addonIds: ["x"], quantity: 2, unit: 1300, via: "pairing" }]);
  assert.deepEqual(u, [{ itemId: "a", optionId: null, addonIds: ["x"], quantity: 2 }]);
  const cart = usualCart(u, menu);
  assert.equal(cart.length, 1);
  assert.equal(cart[0].unit, 1500);
  assert.equal(cart[0].quantity, 2);
  assert.equal(cart[0].via, "usual");
});

test("usual drops sold-out dishes and gone add-ons", () => {
  const menu = [item("a"), item("b", { available: false })];
  const u = [
    { itemId: "a", optionId: null, addonIds: ["gone"], quantity: 1 },
    { itemId: "b", optionId: null, addonIds: [], quantity: 1 },
    { itemId: "deleted", optionId: null, addonIds: [], quantity: 1 },
  ];
  assert.deepEqual(usualCart(u, menu), []);
});

test("empty usual gives an empty cart", () => {
  assert.deepEqual(usualCart([], [item("a")]), []);
});

test("corrupt memory reads as empty and saving still works", async () => {
  const { loadUsual, saveUsual } = await import("./memory.ts");
  const store = new Map<string, string>();
  (globalThis as { localStorage?: unknown }).localStorage = {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, v),
  };
  for (const bad of ['"5"', "[]", '{"s":{}}', '{"s":"x"}', '{"s":[null,{"itemId":1}]}']) {
    store.set("tably-memory", bad);
    assert.deepEqual(loadUsual("s"), [], bad);
    assert.doesNotThrow(() => saveUsual("s", [{ itemId: "a", optionId: null, addonIds: [], quantity: 1 }]), bad);
    assert.equal(loadUsual("s").length, 1, bad);
  }
});
