import { test } from "node:test";
import assert from "node:assert/strict";
import { ageLevel, filsToInput, formatAge, formatMoney, MAX_FILS, parseFils, plural, tableLabel } from "./format.ts";

test("formatMoney en has number and AED", () => {
  const s = formatMoney(8100, "en");
  assert.match(s, /81\.00/);
  assert.match(s, /AED/);
});
test("formatMoney en without currency is bare", () => assert.equal(formatMoney(8100, "en", { currency: false }), "81.00"));
test("formatMoney ar uses Western digits", () => assert.match(formatMoney(8100, "ar"), /81.00/));
test("plural en one/other with #", () => {
  const f = { one: "1 order", other: "# orders" };
  assert.equal(plural("en", 1, f), "1 order");
  assert.equal(plural("en", 2, f), "2 orders");
});
test("plural ar two", () => assert.equal(plural("ar", 2, { two: "طلبان", other: "# طلبات" }), "طلبان"));
test("plural ar other uses Western digits", () => assert.equal(plural("ar", 11, { other: "# طلبا" }), "11 طلبا"));
test("ageLevel thresholds", () => {
  assert.equal(ageLevel(7 * 60e3), "fresh");
  assert.equal(ageLevel(8 * 60e3), "warn");
  assert.equal(ageLevel(15 * 60e3), "late");
});
test("formatAge en", () => {
  assert.equal(formatAge(30e3, "en"), "<1m");
  assert.equal(formatAge(7 * 60e3, "en"), "7m");
  assert.equal(formatAge(65 * 60e3, "en"), "1h 05m");
});
test("formatAge ar uses Western digits", () => assert.match(formatAge(7 * 60e3, "ar"), /7د/));
test("parseFils integer-safe", () => {
  assert.equal(parseFils("12.5"), 1250);
  assert.equal(parseFils("0.29"), 29);
  assert.equal(parseFils("١٢٫٥٠"), 1250);
  assert.equal(parseFils("7"), 700);
  assert.equal(parseFils("1.234"), null);
  assert.equal(parseFils(""), null);
  assert.equal(parseFils("-1"), null);
  assert.ok((parseFils("10000.01") ?? 0) > MAX_FILS);
  assert.equal(parseFils("10000"), MAX_FILS);
});
test("filsToInput round-trips", () => {
  assert.equal(filsToInput(1250), "12.50");
  assert.equal(filsToInput(5), "0.05");
  assert.equal(parseFils(filsToInput(8100)), 8100);
});
test("tableLabel en/ar", () => {
  assert.equal(tableLabel("en", 12), "T12");
  assert.equal(tableLabel("ar", 12), "ط 12");
});
