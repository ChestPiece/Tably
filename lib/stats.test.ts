import { test } from "node:test";
import assert from "node:assert/strict";
import { dayRange, dayStats, ordersByHour, topDishes } from "./stats.ts";
import type { Order, Visit } from "./types.ts";

const mk = (o: Partial<Order>, lines: { name: string; name_ar?: string; quantity: number }[] = []) =>
  ({ status: "served", created_at: "2026-11-16T08:00:00Z", ready_at: null,
    order_lines: lines.map((l) => ({ name_ar: "", ...l })), ...o }) as unknown as Order;
const visit = (paid_at: string | null, settled_total_fils: number | null) =>
  ({ paid_at, settled_total_fils }) as Visit;

test("dayStats empty is zeros and nulls, never NaN", () => {
  assert.deepEqual(dayStats([], []), { orders: 0, collectedFils: 0, avgTicketFils: null, kitchenMedianMin: null });
});
test("dayStats counts, collected, avg, median", () => {
  const t = "2026-11-16T08:00:00Z";
  const at = (m: number) => new Date(Date.parse(t) + m * 60e3).toISOString();
  const orders = [
    mk({ ready_at: at(6) }), mk({ ready_at: at(9) }),
    mk({ ready_at: at(14) }), mk({ status: "cancelled", ready_at: at(99) }),
  ].slice(0, 3);
  orders.push(mk({ status: "cancelled" }));
  const visits = [visit("2026-11-16T09:00:00Z", 8100), visit("2026-11-16T10:00:00Z", 4500), visit(null, 999)];
  assert.deepEqual(dayStats(orders, visits), { orders: 3, collectedFils: 12600, avgTicketFils: 6300, kitchenMedianMin: 9 });
});
test("dayStats excludes cancelled from orders count", () => {
  const s = dayStats([mk({}), mk({}), mk({ status: "cancelled" })], []);
  assert.equal(s.orders, 2);
});
test("ordersByHour uses Dubai hour", () => {
  const h = ordersByHour([mk({ created_at: "2026-11-16T21:30:00Z" }), mk({ created_at: "2026-11-16T21:30:00Z", status: "cancelled" })], "Asia/Dubai");
  assert.equal(h.length, 24);
  assert.equal(h[1], 1);
  assert.equal(h.reduce((a, b) => a + b, 0), 1);
});
test("dayRange is the Dubai local day", () => {
  const r = dayRange(new Date("2026-11-16T21:30:00Z"), "Asia/Dubai");
  assert.equal(r.start, "2026-11-16T20:00:00.000Z");
  assert.equal(r.end, "2026-11-17T20:00:00.000Z");
});
test("dayRange handles a DST day (New York spring forward, 23 h)", () => {
  const r = dayRange(new Date("2026-03-08T12:00:00Z"), "America/New_York");
  assert.equal(r.start, "2026-03-08T05:00:00.000Z");
  assert.equal(r.end, "2026-03-09T04:00:00.000Z");
});
test("dayRange handles a DST day (New York fall back, 25 h)", () => {
  const r = dayRange(new Date("2026-11-01T12:00:00Z"), "America/New_York");
  assert.equal(r.start, "2026-11-01T04:00:00.000Z");
  assert.equal(r.end, "2026-11-02T05:00:00.000Z");
});
test("topDishes merges, sorts, excludes cancelled", () => {
  const top = topDishes([
    mk({}, [{ name: "Signature", quantity: 2 }, { name: "Fries", quantity: 2 }]),
    mk({}, [{ name: "Signature", quantity: 1 }]),
    mk({ status: "cancelled" }, [{ name: "Signature", quantity: 10 }]),
  ]);
  assert.equal(top[0].name, "Signature");
  assert.equal(top[0].qty, 3);
  assert.equal(top[1].name, "Fries");
  assert.equal(topDishes([]).length, 0);
});
