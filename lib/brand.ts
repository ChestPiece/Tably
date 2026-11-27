// Venue brand: turns the owner's colour + vibe into CSS custom properties for guest pages and QR cards.
// The guard keeps any colour readable: brand on cream >= 3:1, text on brand >= 4.5:1 (spec 2026-11-27).
import type { Vibe } from "./types";

export const SUFRA_BRAND = "#1E2A5A";
const CREAM = "#F6F3EB";
const INK = "#1F2547";

export const VIBES: Record<Vibe, { label: string; radius: string; display: string; displayAr: string }> = {
  sufra: { label: "Sufra — warm editorial", radius: "12px", display: "var(--nf-display)", displayAr: "var(--nf-display-ar)" },
  bold: { label: "Bold — loud and hungry", radius: "6px", display: "var(--nf-bold)", displayAr: "var(--nf-bold-ar)" },
  clean: { label: "Clean — light and calm", radius: "16px", display: "var(--nf-clean)", displayAr: "var(--nf-clean-ar)" },
  classic: { label: "Classic — fine dining", radius: "4px", display: "var(--nf-classic)", displayAr: "var(--nf-classic-ar)" },
};

type Rgb = [number, number, number];
const HEX = /^#[0-9a-fA-F]{6}$/;

const toRgb = (hex: string): Rgb => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255) as Rgb;
const toHex = (rgb: Rgb) => "#" + rgb.map((c) => Math.round(Math.min(1, Math.max(0, c)) * 255).toString(16).padStart(2, "0")).join("");
const lin = (c: number) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const gam = (c: number) => (c <= 0.0031308 ? 12.92 * c : 1.055 * Math.max(0, c) ** (1 / 2.4) - 0.055);

const luminance = (hex: string) => {
  const [r, g, b] = toRgb(hex).map(lin);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

/** WCAG contrast ratio of two #rrggbb colours. */
export function contrast(a: string, b: string): number {
  const [x, y] = [luminance(a), luminance(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
}

// OKLab (Björn Ottosson). Changing only L keeps hue and chroma.
function toLab(hex: string): Rgb {
  const [r, g, b] = toRgb(hex).map(lin);
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return [
    0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  ];
}
function fromLab([L, a, b]: Rgb): string {
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
  return toHex([
    gam(4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s),
    gam(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s),
    gam(-0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s),
  ]);
}

const readable = (hex: string) => contrast(hex, CREAM) >= 3 && Math.max(contrast(CREAM, hex), contrast(INK, hex)) >= 4.5;

export function brandTokens(hex: string, vibe: Vibe): Record<`--${string}`, string> {
  if (!HEX.test(hex)) hex = SUFRA_BRAND;
  const v = VIBES[vibe] ?? VIBES.sufra;
  const [L0, a, b] = toLab(hex);
  let brand = hex.toLowerCase();
  // Darken in 0.01 steps until both ratios pass; black always passes, so this ends.
  for (let L = L0; !readable(brand); L -= 0.01) brand = fromLab([Math.max(0, L), a, b]);
  const onBrand = contrast(CREAM, brand) >= 4.5 ? CREAM : INK;
  // Field and rule step away from the brand toward its text colour (Sufra: 30.3 -> 36 -> 48).
  const [L] = toLab(brand);
  const dir = onBrand === CREAM ? 1 : -1;
  return {
    "--brand": brand,
    "--primary": brand,
    "--ring": brand,
    "--on-brand": onBrand,
    "--primary-foreground": onBrand,
    "--brand-field": fromLab([L + dir * 0.06, a * 0.9, b * 0.9]),
    "--brand-rule": fromLab([L + dir * 0.18, a * 0.8, b * 0.8]),
    "--radius": v.radius,
    // Sufra's sources are the next/font vars themselves; re-declaring them would be a var() cycle.
    ...(vibe === "sufra" ? {} : { "--nf-display": v.display, "--nf-display-ar": v.displayAr }),
    // Safe on <html>: every descendant re-matches :where(:lang(ar)) and rebuilds these from --nf-*-ar.
    "--font-display": `${v.display}, ui-serif, Georgia, serif`,
    "--font-sans": "var(--nf-sans), system-ui, sans-serif",
  };
}
