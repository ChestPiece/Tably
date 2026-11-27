// Dominant brand colours from a logo's RGBA pixels (canvas getImageData). Pure, so it is testable in node.
// ponytail: coarse 4-bit buckets, no k-means; good enough for logos with a few flat colours.

const hex = (n: number) => Math.round(n).toString(16).padStart(2, "0");

/** Up to `max` non-neutral colours, most frequent first, as lowercase #rrggbb. */
export function dominantColors(rgba: Uint8ClampedArray, max = 3): string[] {
  const buckets = new Map<number, [count: number, r: number, g: number, b: number]>();
  for (let i = 0; i < rgba.length; i += 4) {
    const [r, g, b, a] = [rgba[i], rgba[i + 1], rgba[i + 2], rgba[i + 3]];
    if (a < 128) continue;
    const hi = Math.max(r, g, b) / 255, lo = Math.min(r, g, b) / 255, l = (hi + lo) / 2;
    const s = hi === lo ? 0 : (hi - lo) / (1 - Math.abs(2 * l - 1));
    if (s < 0.2 || l < 0.08 || l > 0.95) continue;
    const key = ((r >> 4) << 8) | ((g >> 4) << 4) | (b >> 4);
    const e = buckets.get(key) ?? [0, 0, 0, 0];
    buckets.set(key, [e[0] + 1, e[1] + r, e[2] + g, e[3] + b]);
  }
  const picks: [number, number, number][] = [];
  for (const [n, r, g, b] of [...buckets.values()].sort((x, y) => y[0] - x[0])) {
    const c: [number, number, number] = [r / n, g / n, b / n];
    if (picks.some((p) => Math.hypot(p[0] - c[0], p[1] - c[1], p[2] - c[2]) < 48)) continue;
    picks.push(c);
    if (picks.length === max) break;
  }
  return picks.map((c) => "#" + c.map(hex).join(""));
}
