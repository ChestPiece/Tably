import type { Order, Visit } from "./types.ts";

export const VENUE_TZ = "Asia/Dubai";

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

/** ISO bounds of the local day containing `date`. ponytail: fixed-offset zones only (Dubai has no DST); DST zones would need a second pass. */
export function dayRange(date: Date, tz = VENUE_TZ): { start: string; end: string } {
  const p = parts(date, tz);
  const offset = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second) - Math.floor(date.getTime() / 1000) * 1000;
  const start = Date.UTC(p.year, p.month - 1, p.day) - offset;
  return { start: new Date(start).toISOString(), end: new Date(start + 864e5).toISOString() };
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

export function ordersByHour(orders: Order[], tz = VENUE_TZ): number[] {
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
