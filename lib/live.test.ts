import { test } from "node:test";
import assert from "node:assert/strict";
import { applyChange } from "./live.ts";

type R = { id: string; status: string; lines?: number[] };
const base: R[] = [{ id: "a", status: "received", lines: [1] }, { id: "b", status: "ready" }];

test("insert appends", () => assert.deepEqual(applyChange(base, { eventType: "INSERT", new: { id: "c", status: "received" }, old: {} }).map((r) => r.id), ["a", "b", "c"]));
test("update merges and keeps nested fields", () => {
  const out = applyChange(base, { eventType: "UPDATE", new: { id: "a", status: "preparing" }, old: {} });
  assert.deepEqual(out[0], { id: "a", status: "preparing", lines: [1] });
  assert.equal(out[1], base[1]);
});
test("update of an unknown row adds it", () => assert.equal(applyChange(base, { eventType: "UPDATE", new: { id: "z", status: "x" }, old: {} }).length, 3));
test("delete removes by old id", () => assert.deepEqual(applyChange(base, { eventType: "DELETE", new: {}, old: { id: "a" } }).map((r) => r.id), ["b"]));
test("keep=false removes", () => {
  const out = applyChange(base, { eventType: "UPDATE", new: { id: "b", status: "served" }, old: {} }, (r) => r.status !== "served");
  assert.deepEqual(out.map((r) => r.id), ["a"]);
});
test("keep=false on unknown row is a no-op", () => {
  const out = applyChange(base, { eventType: "INSERT", new: { id: "q", status: "served" }, old: {} }, (r) => r.status !== "served");
  assert.equal(out, base);
});
test("missing id is a no-op", () => assert.equal(applyChange(base, { eventType: "DELETE", new: {}, old: {} }), base));
