"use client";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { Button } from "@/components/ui/button";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useVenue } from "@/lib/venue";
import { errorText, useLang, type Key } from "@/lib/i18n";
import { dishMargins, salesCostSeries, type CostOrder } from "@/lib/stats";
import { pick } from "@/lib/types";
import { cn } from "@/lib/utils";
import type { AdminProps } from "./AdminApp";
import { spanRange, useProfit, type Report } from "./use-profit";

type Span = 1 | 7 | 30;
const SPANS: [Span, Key][] = [[1, "today"], [7, "last7"], [30, "last30"]];

/** Order lines in the span, grouped by the database per venue hour/day, dish and price, with snapshotted costs (owner only). */
function useCostOrders(sb: AdminProps["sb"], days: number) {
  const { tz } = useVenue();
  const { lang } = useLang();
  const [rows, setRows] = useState<CostOrder[] | null>(null);
  useEffect(() => {
    const { from, to } = spanRange(days, tz);
    let live = true;
    sb.rpc("margin_report", { p_from: from, p_to: to, p_hourly: days === 1 }).then(({ data, error }) => {
      if (!live) return;
      if (error) toast.error(errorText(lang, error)); // otherwise a failure reads as "no sales"
      setRows((data ?? []) as CostOrder[]);
    });
    return () => void (live = false);
  }, [sb, days, tz, lang]);
  return rows;
}

export function ProfitPage({ sb, onMenu }: Pick<AdminProps, "sb"> & { onMenu: () => void }) {
  const { lang, t } = useLang();
  const [days, setDays] = useState<Span>(7);
  const cur = useProfit(sb, days);
  const orders = useCostOrders(sb, days);
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
    // From 1280px the page fits the screen: KPIs on top, chart and dish table share the rest and scroll inside.
    <div className="flex flex-col gap-4 max-sm:gap-3 xl:min-h-0 xl:flex-1">
      <div className="flex shrink-0 flex-wrap items-center gap-x-4 gap-y-2">
        <ToggleGroup type="single" variant="segmented" value={String(days)} onValueChange={(v) => v && setDays(Number(v) as Span)} aria-label={t("pRange")}>
          {SPANS.map(([d, k]) => (
            <ToggleGroupItem key={d} value={String(d)} className="h-9 px-4 whitespace-nowrap">
              {t(k)}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
        {r && r.missing_cost_lines > 0 && (
          <p role="note" className="flex flex-wrap items-center gap-x-2 text-sm text-muted-foreground">
            {t("pMissing").replace("{n}", String(r.missing_cost_lines))}
            <Button variant="link" size="xs" className="px-0" onClick={onMenu}>
              {t("pSetCosts")}
            </Button>
          </p>
        )}
      </div>

      <dl className="grid shrink-0 grid-cols-4 rounded-2xl bg-card ring-1 ring-border max-[1100px]:grid-cols-2" aria-busy={!r}>
        {cards.map(([label, k, note]) => {
          const v = r?.[k] ?? null;
          const d = v !== null && p ? v - p[k] : null;
          return (
            <div key={k} className="flex min-w-0 flex-col border-border px-5 py-4 not-first:border-s max-[1100px]:nth-3:border-s-0 max-[1100px]:nth-[n+3]:border-t max-sm:px-4">
              <dt className="order-2 mt-1.5 text-sm font-medium">{t(label)}</dt>
              <dd className={`order-1 font-display text-[30px] leading-none font-semibold tracking-tight whitespace-nowrap tabular-nums max-sm:text-[24px] ${k === "profit_fils" && v !== null && v < 0 ? "text-destructive" : ""}`}>
                {v === null ? "—" : money(v)}
              </dd>
              <dd className="order-3 text-[13px] text-muted-foreground">{note}</dd>
              {d !== null && (
                <dd className="order-4 text-[13px] text-muted-foreground tabular-nums">
                  <span className={d === 0 ? "" : good(k, d) ? "text-status-ready" : "text-destructive"}>
                    {d > 0 ? "+" : d < 0 ? "−" : ""}
                    {money(Math.abs(d))}
                  </span>{" "}
                  {t(days === 1 ? "vsYesterday" : "vsPrev")}
                </dd>
              )}
            </div>
          );
        })}
      </dl>

      <div className="grid gap-4 max-sm:gap-3 xl:min-h-0 xl:flex-1 xl:grid-cols-2 2xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <SalesCostChart orders={orders} days={days} />
        <DishMargins orders={orders} />
      </div>
      <p className="shrink-0 text-[13px] text-muted-foreground">{t("pHow")}</p>
    </div>
  );
}

const BOX = "flex min-h-0 flex-col rounded-2xl bg-card p-5 ring-1 ring-border max-sm:p-4";

/** Bars, not lines: each bucket is its own total. Order value is what guests ordered, so it can differ from paid sales. */
function SalesCostChart({ orders, days }: { orders: CostOrder[] | null; days: number }) {
  const { lang, t } = useLang();
  const { tz, digits, money } = useVenue();
  const config = { sales: { label: t("pOrderValue"), color: "var(--primary)" }, cost: { label: t("pFood"), color: "var(--ochre)" } } satisfies ChartConfig;
  const data = salesCostSeries(orders ?? [], tz, days);
  const locale = lang === "ar" ? "ar-AE-u-nu-latn" : "en-AE";
  const day = new Intl.DateTimeFormat(locale, days === 7 ? { weekday: "short", timeZone: "UTC" } : { day: "numeric", month: "short", timeZone: "UTC" });
  const label = (k: string) => {
    if (days === 1) return `${k.padStart(2, "0")}:00`;
    const [y, m, d] = k.split("-").map(Number);
    return day.format(Date.UTC(y, m - 1, d));
  };
  const compact = new Intl.NumberFormat(locale, { notation: "compact", maximumFractionDigits: 1 });
  const empty = orders !== null && !data.some((b) => b.sales);
  return (
    <section aria-labelledby="pc-h" className={BOX}>
      <div className="mb-3 flex shrink-0 flex-wrap items-baseline justify-between gap-3">
        <h2 id="pc-h" className="text-[15px] font-semibold">{t("pChart")}</h2>
        <div className="flex gap-4 text-sm text-text-2">
          {(["sales", "cost"] as const).map((k) => (
            <span key={k} className="inline-flex items-center gap-2">
              <i aria-hidden className="size-2.5 rounded-[3px]" style={{ background: config[k].color }} />
              {config[k].label}
            </span>
          ))}
        </div>
      </div>
      <div className="relative min-h-0 flex-1" dir="ltr">
        <ChartContainer config={config} className="aspect-[640/240] w-full xl:aspect-auto xl:h-full">
          <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -12 }} barGap={2} accessibilityLayer>
            <CartesianGrid vertical={false} />
            <XAxis dataKey="key" tickLine={false} axisLine={false} tickMargin={8} minTickGap={12} tickFormatter={label} />
            <YAxis tickLine={false} axisLine={false} width={48} tickFormatter={(v: number) => compact.format(v / 10 ** digits)} />
            {!empty && (
              <ChartTooltip
                cursor={{ fill: "var(--muted)" }}
                content={
                  <ChartTooltipContent
                    labelFormatter={(_, p) => label(String(p?.[0]?.payload?.key ?? ""))}
                    formatter={(v, n) => (
                      <span className="flex w-full justify-between gap-4">
                        <span className="text-muted-foreground">{config[n as "sales" | "cost"].label}</span>
                        <b className="font-medium tabular-nums">{money(Number(v))}</b>
                      </span>
                    )}
                  />
                }
              />
            )}
            <Bar dataKey="sales" fill="var(--color-sales)" radius={[3, 3, 0, 0]} maxBarSize={22} isAnimationActive={false} />
            <Bar dataKey="cost" fill="var(--color-cost)" radius={[3, 3, 0, 0]} maxBarSize={22} isAnimationActive={false} />
          </BarChart>
        </ChartContainer>
        {empty && <p className="absolute inset-0 grid place-items-center text-sm text-text-2">{t("pNoOrders")}</p>}
      </div>
    </section>
  );
}

/** Margin = (order value - food cost) / order value. Unknown when any line of the dish had no cost. */
function DishMargins({ orders }: { orders: CostOrder[] | null }) {
  const { lang, t } = useLang();
  const { money } = useVenue();
  const rows = dishMargins(orders ?? []);
  const th = "sticky top-0 border-b bg-card pb-2 text-start text-sm font-medium whitespace-nowrap text-muted-foreground";
  return (
    <section aria-labelledby="dm-h" className={BOX}>
      <h2 id="dm-h" className="mb-3 shrink-0 text-[15px] font-semibold">{t("pDishes")}</h2>
      {orders !== null && rows.length === 0 ? (
        <p className="grid flex-1 place-items-center py-8 text-sm text-text-2">{t("pNoOrders")}</p>
      ) : (
        <div className="relative min-h-0 flex-1 panel-scroll">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr>
                <th className={th}>{t("pDish")}</th>
                <th className={cn(th, "ps-3 text-end")}>{t("pSold")}</th>
                <th className={cn(th, "ps-3 text-end")}>{t("pOrderValue")}</th>
                <th className={cn(th, "ps-3 text-end")}>{t("marginLabel")}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((d) => {
                const pct = d.missing || !d.sales ? null : Math.round(((d.sales - d.cost) / d.sales) * 100);
                return (
                  <tr key={d.name} className="border-b last:border-b-0">
                    <td className="max-w-0 truncate py-2">{pick(lang, d.name, d.name_ar)}</td>
                    <td className="py-2 ps-3 text-end tabular-nums">{d.qty}</td>
                    <td className="py-2 ps-3 text-end whitespace-nowrap tabular-nums">{money(d.sales)}</td>
                    <td className={cn("py-2 ps-3 text-end whitespace-nowrap tabular-nums", pct === null ? "text-muted-foreground" : pct < 0 && "text-destructive")}>
                      {pct === null ? <span title={t("pNoCost")}>—<span className="sr-only">{t("pNoCost")}</span></span> : `${pct}%`}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
