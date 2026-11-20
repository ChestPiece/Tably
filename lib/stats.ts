import type { Order, Visit } from "./types.ts";

const live = (orders: Order[]) => orders.filter((o) => o.status !== "cancelled");

const parts = (d: Date, tz: string) => {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", {
      timeZone: tz, hourCycle: "h23", year: "numeric", month: "numeric", day: "numeric",
      hour: "numeric", minute: "numeric", second: "numeric",
    }).formatToParts(d).map((x) => [x.type, +x.value]),
  );
  return p as Record<"year" | "month" | "day" | "hour" | "minute" | "second", number>;
};

/** Milliseconds the zone is ahead of UTC at instant `t`. */
const offsetAt = (t: number, tz: string) => {
  const p = parts(new Date(t), tz);
  return Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second) - Math.floor(t / 1000) * 1000;
};

/** UTC instant of local midnight on y-m-d in tz. Two passes so DST days (23 h / 25 h) land right. */
const midnight = (y: number, m: number, d: number, tz: string) => {
  const guess = Date.UTC(y, m - 1, d);
  return guess - offsetAt(guess - offsetAt(guess, tz), tz);
};

/** ISO bounds of the venue's local day containing `date`. */
export function dayRange(date: Date, tz: string): { start: string; end: string } {
  const p = parts(date, tz);
  return { start: new Date(midnight(p.year, p.month, p.day, tz)).toISOString(), end: new Date(midnight(p.year, p.month, p.day + 1, tz)).toISOString() };
}

export function dayStats(orders: Order[], visits: Visit[]) {
  const paid = visits.filter((v) => v.paid_at);
  const collectedFils = paid.reduce((s, v) => s + (v.settled_total_fils ?? 0), 0);
  const mins = live(orders)
    .filter((o) => o.ready_at)
    .map((o) => (Date.parse(o.ready_at!) - Date.parse(o.created_at)) / 60e3)
    .sort((a, b) => a - b);
  const mid = mins.length >> 1;
  const median = mins.length === 0 ? null : Math.round(mins.length % 2 ? mins[mid] : (mins[mid - 1] + mins[mid]) / 2);
  return {
    orders: live(orders).length,
    collectedFils,
    avgTicketFils: paid.length ? Math.round(collectedFils / paid.length) : null,
    kitchenMedianMin: median,
  };
}

export function ordersByHour(orders: Order[], tz: string): number[] {
  const out = new Array<number>(24).fill(0);
  for (const o of live(orders)) out[parts(new Date(o.created_at), tz).hour]++;
  return out;
}

export function topDishes(orders: Order[], n = 5) {
  const m = new Map<string, { name: string; name_ar: string; qty: number }>();
  for (const o of live(orders))
    for (const l of o.order_lines) {
      const d = m.get(l.name) ?? { name: l.name, name_ar: l.name_ar, qty: 0 };
      d.qty += l.quantity;
      m.set(l.name, d);
    }
  return [...m.values()].sort((a, b) => b.qty - a.qty || a.name.localeCompare(b.name)).slice(0, n);
}
