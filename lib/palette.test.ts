import { test } from "node:test";
import assert from "node:assert/strict";
import { dominantColors } from "./palette.ts";

const px = (parts: [string, number, number?][]) => {
  const out: number[] = [];
  for (const [hex, n, alpha = 255] of parts)
    for (let i = 0; i < n; i++) out.push(...[1, 3, 5].map((j) => parseInt(hex.slice(j, j + 2), 16)), alpha);
  return new Uint8ClampedArray(out);
};
const near = (a: string, b: string) => [1, 3, 5].every((j) => Math.abs(parseInt(a.slice(j, j + 2), 16) - parseInt(b.slice(j, j + 2), 16)) <= 16);

test("two-colour logo gives both, most frequent first", () => {
  const c = dominantColors(px([["#E85D2A", 70], ["#1E2A5A", 30]]));
  assert.equal(c.length, 2);
  assert.ok(near(c[0], "#e85d2a"), c[0]);
  assert.ok(near(c[1], "#1e2a5a"), c[1]);
});

test("black and white logo gives nothing", () => {
  assert.deepEqual(dominantColors(px([["#000000", 50], ["#FFFFFF", 50]])), []);
});

test("transparent pixels are ignored", () => {
  assert.deepEqual(dominantColors(px([["#E85D2A", 50, 0]])), []);
});

test("near-identical colours merge", () => {
  assert.equal(dominantColors(px([["#E85D2A", 50], ["#EA602C", 50]])).length, 1);
});

test("max limits the count", () => {
  const c = dominantColors(px([["#E85D2A", 70], ["#1E2A5A", 30]]), 1);
  assert.equal(c.length, 1);
  assert.ok(near(c[0], "#e85d2a"));
});
