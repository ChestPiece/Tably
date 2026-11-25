"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { staffClient } from "@/lib/supabase/browser";
import { applyChange, type Change } from "@/lib/live";
import { ORDER_SELECT, type Order, type Visit } from "@/lib/types";
import type { TodayData } from "./OwnerHome";

/**
 * Owner page live data. Orders and visits patch from the realtime payload (no server
 * round trip per event). Team changes are rare and re-fetch the page (debounced 300 ms).
 * `paused` (the Live board page, which runs its own feed) skips the subscription.
 */
export function useOwnerLive(rid: string, initial: TodayData, paused: boolean) {
  const router = useRouter();
  const [today, setToday] = useState(initial);
  // A server refresh (after a mutation) hands in new props: they win.
  const [seen, setSeen] = useState(initial);
  if (seen !== initial) {
    setSeen(initial);
    setToday(initial);
  }

  useEffect(() => {
    if (paused) return;
    const sb = staffClient();
    let timer: number | undefined;
    let first = true;
    const kick = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => router.refresh(), 300);
    };
    const filter = `restaurant_id=eq.${rid}`;
    const ch = sb
      .channel(`owner-${rid}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "orders", filter }, async (p) => {
        // The payload has no lines; they commit with the order, so one row fetch gets them.
        const { data } = await sb.from("orders").select(ORDER_SELECT).eq("id", p.new.id).order("position", { referencedTable: "order_lines" }).maybeSingle();
        if (data) setToday((d) => ({ ...d, orders: [data as Order, ...d.orders.filter((o) => o.id !== data.id)] }));
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "orders", filter }, (p) =>
        setToday((d) => (d.orders.some((o) => o.id === p.new.id) ? { ...d, orders: applyChange(d.orders, p as unknown as Change<Order>) } : d)),
      )
      .on("postgres_changes", { event: "*", schema: "public", table: "visits", filter }, (p) =>
        setToday((d) => {
          const c = p as unknown as Change<Visit>;
          return {
            ...d,
            openVisits: applyChange(d.openVisits, c, (v) => !v.closed_at),
            // A payment arriving live is today's. ponytail: closing a tab paid before midnight would count it here until the next refresh.
            paidVisits: applyChange(d.paidVisits, c, (v) => !!v.paid_at),
          };
        }),
      )
      .on("postgres_changes", { event: "*", schema: "public", table: "staff_members", filter }, kick)
      .on("postgres_changes", { event: "*", schema: "public", table: "staff_invites", filter }, kick)
      .subscribe((s) => {
        // A reconnect (not the first join) may have missed events: catch up once.
        if (s === "SUBSCRIBED" && !first) kick();
        if (s === "SUBSCRIBED") first = false;
      });
    return () => {
      window.clearTimeout(timer);
      sb.removeChannel(ch);
    };
  }, [rid, router, paused]);

  return today;
}
