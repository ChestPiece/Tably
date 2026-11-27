import { test } from "node:test";
import assert from "node:assert/strict";
import { SUFRA_BRAND, VIBES, brandTokens, contrast } from "./brand.ts";

const CREAM = "#F6F3EB";

test("contrast follows WCAG", () => {
  assert.ok(Math.abs(contrast("#000000", "#ffffff") - 21) < 0.05);
  assert.equal(contrast(CREAM, CREAM), 1);
});

test("every brand colour stays readable", () => {
  for (const x of ["#1E2A5A", "#FFF5CC", "#39FF14", "#E85D2A", "#000000", "#FFFFFF"]) {
    const t = brandTokens(x, "sufra");
    assert.ok(contrast(t["--brand"], CREAM) >= 3, `${x}: brand on cream ${contrast(t["--brand"], CREAM)}`);
    assert.ok(contrast(t["--on-brand"], t["--brand"]) >= 4.5, `${x}: text on brand ${contrast(t["--on-brand"], t["--brand"])}`);
    assert.equal(t["--primary"], t["--brand"]);
    assert.equal(t["--ring"], t["--brand"]);
    assert.equal(t["--primary-foreground"], t["--on-brand"]);
  }
});

test("Sufra indigo passes through unchanged", () => {
  assert.equal(brandTokens("#1E2A5A", "sufra")["--brand"], "#1e2a5a");
});

test("invalid hex falls back to Sufra", () => {
  const sufra = brandTokens(SUFRA_BRAND, "sufra");
  for (const x of ["red", "#fff", ""]) assert.deepEqual(brandTokens(x, "sufra"), sufra);
});

test("vibe sets radius and display font", () => {
  const t = brandTokens("#E85D2A", "bold");
  assert.equal(t["--radius"], VIBES.bold.radius);
  assert.equal(t["--nf-display"], VIBES.bold.display);
  assert.equal(t["--nf-display-ar"], VIBES.bold.displayAr);
});

test("Sufra never re-declares its own font sources (var() cycle)", () => {
  const t = brandTokens(SUFRA_BRAND, "sufra");
  assert.equal(t["--nf-display"], undefined);
  assert.equal(t["--nf-display-ar"], undefined);
});

