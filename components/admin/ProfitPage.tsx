"use client";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useVenue } from "@/lib/venue";
import { errorText, useLang, type Key } from "@/lib/i18n";
import { dayRange } from "@/lib/stats";
import type { AdminProps } from "./AdminApp";

export type Report = { sales_fils: number; food_cost_fils: number; wages_fils: number; profit_fils: number; missing_cost_lines: number; paid_visits: number };
type Span = 1 | 7 | 30;
const SPANS: [Span, Key][] = [[1, "today"], [7, "last7"], [30, "last30"]];

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
    sb.rpc("profit_report", { p_from: from, p_to: to }).then(({ data, error }) => (error ? setErr(error) : setRep(data as Report)));
  }, [sb, days, back, tz]);
  return { rep, err };
}

export function ProfitPage({ sb, onMenu }: Pick<AdminProps, "sb"> & { onMenu: () => void }) {
  const { lang, t } = useLang();
  const [days, setDays] = useState<Span>(7);
  const cur = useProfit(sb, days);
  const prev = useProfit(sb, days, 1);
  const { money } = useVenue();

  if (cur.err) return <p className="text-sm text-destructive">{errorText(lang, cur.err)}</p>;
  const r = cur.rep;
  const p = prev.rep;
  const margin = r && r.sales_fils > 0 ? Math.round((r.profit_fils / r.sales_fils) * 100) : null;
  const cards: [Key, keyof Report, string?][] = [
    ["pSales", "sales_fils", r ? t("pPaidTables").replace("{n}", String(r.paid_visits)) : undefined],
    ["pFood", "food_cost_fils", t("pFoodD")],
    ["pWages", "wages_fils", t("pWagesD")],
    ["pProfit", "profit_fils", margin === null ? undefined : `${t("marginLabel")} ${margin}%`],
  ];
  // Costs going up is bad, sales/profit going up is good.
  const good = (k: keyof Report, d: number) => (k === "food_cost_fils" || k === "wages_fils" ? d < 0 : d > 0);

  return (
    <div className="flex flex-col gap-5 max-sm:gap-3">
      <ToggleGroup type="single" variant="outline" value={String(days)} onValueChange={(v) => v && setDays(Number(v) as Span)} aria-label={t("pRange")} className="self-start">
        {SPANS.map(([d, k]) => (
          <ToggleGroupItem key={d} value={String(d)} className="h-10 px-4">
            {t(k)}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>

      <dl className="grid grid-cols-4 rounded-2xl bg-card ring-1 ring-border max-[1100px]:grid-cols-2" aria-busy={!r}>
        {cards.map(([label, k, note]) => {
          const v = r?.[k] ?? null;
          const d = v !== null && p ? v - p[k] : null;
          return (
            <div key={k} className="flex min-w-0 flex-col border-border px-6 py-5 not-first:border-s max-[1100px]:nth-3:border-s-0 max-[1100px]:nth-[n+3]:border-t max-sm:px-4 max-sm:py-4">
              <dt className="order-2 mt-2 text-sm font-medium">{t(label)}</dt>
              <dd className={`order-1 font-display text-[32px] leading-none font-semibold whitespace-nowrap tabular-nums max-sm:text-[24px] ${k === "profit_fils" && v !== null && v < 0 ? "text-destructive" : ""}`}>
                {v === null ? "—" : money(v)}
              </dd>
              <dd className="order-3 mt-0.5 text-[13px] text-muted-foreground">{note}</dd>
              {d !== null && (
                <dd className="order-4 mt-2 text-[13px] tabular-nums">
                  <span className={d === 0 ? "text-muted-foreground" : good(k, d) ? "text-status-ready" : "text-destructive"}>
                    {d > 0 ? "+" : d < 0 ? "−" : ""}
                    {money(Math.abs(d))}
                  </span>{" "}
                  <span className="text-muted-foreground">{t(days === 1 ? "vsYesterday" : "vsPrev")}</span>
                </dd>
              )}
            </div>
          );
        })}
      </dl>

      {r && r.missing_cost_lines > 0 && (
        <p role="note" className="flex flex-wrap items-center gap-x-2 rounded-2xl bg-card px-6 py-4 text-sm ring-1 ring-border max-sm:px-4">
          {t("pMissing").replace("{n}", String(r.missing_cost_lines))}
          <Button variant="link" size="xs" className="px-0" onClick={onMenu}>
            {t("pSetCosts")}
          </Button>
        </p>
      )}
      <p className="text-sm text-muted-foreground">{t("pHow")}</p>
    </div>
  );
}
