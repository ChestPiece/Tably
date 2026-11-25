import { test } from "node:test";
import assert from "node:assert/strict";
import { ageLevel, cached, currencyDigits, formatAge, formatClock, formatMoney, MAX_MINOR, minorToInput, parseMinor, plural, tableLabel } from "./format.ts";

test("formatMoney en has number and AED", () => {
  const s = formatMoney(8100, "en", "AED");
  assert.match(s, /81\.00/);
  assert.match(s, /AED/);
});
test("formatMoney bare has no currency", () => assert.equal(formatMoney(8100, "en", "AED", { bare: true }), "81.00"));
test("formatMoney ar uses Western digits", () => assert.match(formatMoney(8100, "ar", "AED"), /81.00/));
test("formatMoney KWD has 3 decimals", () => assert.match(formatMoney(1250, "en", "KWD"), /1\.250/));
test("formatMoney JPY has no decimals", () => {
  const s = formatMoney(500, "en", "JPY");
  assert.match(s, /500/);
  assert.doesNotMatch(s, /\./);
});
test("currencyDigits per currency", () => {
  assert.equal(currencyDigits("USD"), 2);
  assert.equal(currencyDigits("KWD"), 3);
  assert.equal(currencyDigits("JPY"), 0);
});
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
test("parseMinor integer-safe (2 decimals)", () => {
  assert.equal(parseMinor("12.5", 2), 1250);
  assert.equal(parseMinor("0.29", 2), 29);
  assert.equal(parseMinor("١٢٫٥٠", 2), 1250);
  assert.equal(parseMinor("7", 2), 700);
  assert.equal(parseMinor("1.234", 2), null);
  assert.equal(parseMinor("", 2), null);
  assert.equal(parseMinor("-1", 2), null);
  assert.ok((parseMinor("10000.01", 2) ?? 0) > MAX_MINOR);
  assert.equal(parseMinor("10000", 2), MAX_MINOR);
});
test("parseMinor 3 and 0 decimals", () => {
  assert.equal(parseMinor("1.25", 3), 1250);
  assert.equal(parseMinor("1.250", 3), 1250);
  assert.equal(parseMinor("1.2501", 3), null);
  assert.equal(parseMinor("500", 0), 500);
  assert.equal(parseMinor("1.5", 0), null);
});
test("minorToInput round-trips", () => {
  assert.equal(minorToInput(1250, 2), "12.50");
  assert.equal(minorToInput(5, 2), "0.05");
  assert.equal(minorToInput(1250, 3), "1.250");
  assert.equal(minorToInput(500, 0), "500");
  assert.equal(parseMinor(minorToInput(8100, 2), 2), 8100);
});
test("tableLabel en/ar", () => {
  assert.equal(tableLabel("en", 12), "T12");
  assert.equal(tableLabel("ar", 12), "ط 12");
});

test("formatClock uses the venue zone, not the machine's", () => {
  assert.match(formatClock("2026-11-25T10:05:00Z", "en", "Asia/Dubai"), /2:05/);
  assert.match(formatClock("2026-11-25T10:05:00Z", "en", "UTC"), /10:05/);
  assert.equal(formatClock(null, "en", "UTC"), "");
});
test("cached formatters are reused", () => assert.equal(cached("k", () => ({})), cached("k", () => ({}))));
