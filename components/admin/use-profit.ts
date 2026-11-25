"use client";
// Profit report hook, kept apart from ProfitPage so the owner home can use it without pulling in recharts.
import { useEffect, useState } from "react";
import { useVenue } from "@/lib/venue";
import { dayRange } from "@/lib/stats";
import type { AdminProps } from "./AdminApp";

export type Report = { sales_fils: number; food_cost_fils: number; wages_fils: number; profit_fils: number; missing_cost_lines: number; paid_visits: number };

/** [from, to) covering the last `days` venue days, ending at the end of today; `back` shifts it one span earlier. */
export function spanRange(days: number, tz: string, back = 0) {
  const last = Date.now() - back * days * 864e5;
  return { from: dayRange(new Date(last - (days - 1) * 864e5), tz).start, to: dayRange(new Date(last), tz).end };
}

export function useProfit(sb: AdminProps["sb"], days: number, back = 0) {
  const { tz } = useVenue();
  const [rep, setRep] = useState<Report | null>(null);
  const [err, setErr] = useState<unknown>(null);
  useEffect(() => {
    const { from, to } = spanRange(days, tz, back);
    let live = true; // a quick range switch must not let the older reply land last
    sb.rpc("profit_report", { p_from: from, p_to: to }).then(({ data, error }) => {
      if (!live) return;
      setErr(error);
      if (!error) setRep(data as Report);
    });
    return () => void (live = false);
  }, [sb, days, back, tz]);
  return { rep, err };
}
