"use client";
import dynamic from "next/dynamic";
import { Arch } from "@/components/app/arch";
import { Button } from "@/components/ui/button";
import { useVenue } from "@/lib/venue";
import { useLang } from "@/lib/i18n";
import { dayStats, ordersByHour, topDishes } from "@/lib/stats";
import { cn } from "@/lib/utils";
import { pick, type MenuItem, type Order, type TableRow, type Visit } from "@/lib/types";
import { FloorPlan } from "./FloorPlan";
import type { AdminProps } from "./AdminApp";
import { OrdersTable } from "./OrdersTable";
import { useProfit } from "./use-profit";

// Charts (recharts) load in their own chunk, after the numbers are on screen.
const HourChart = dynamic(() => import("./HourChart").then((m) => m.HourChart), { ssr: false, loading: () => <div className="h-full min-h-40" /> });
const StatusDonut = dynamic(() => import("./StatusDonut").then((m) => m.StatusDonut), { ssr: false, loading: () => <div className="h-28" /> });

/** White rounded panel on the tinted owner canvas. */
export const PANEL = "rounded-2xl bg-card p-6 ring-1 ring-border max-sm:p-4";
/** Bento cell: tighter panel whose content can scroll inside it. */
const BOX = cn(PANEL, "flex min-h-0 flex-col p-5 max-sm:p-4");

export type TodayData = { orders: Order[]; lastWeek: Order[]; openVisits: Visit[]; paidVisits: Visit[] };

export function OwnerHome({ sb, today, menu, tables, onOrders, onProfit }: Pick<AdminProps, "sb"> & { today: TodayData; menu: MenuItem[]; tables: TableRow[]; onOrders: (sel?: string) => void; onProfit: () => void }) {
  const { lang, t } = useLang();
  const venue = useVenue();
  const s = dayStats(today.orders, today.paidVisits);
  const profit = useProfit(sb, 1).rep;
  const top = topDishes(today.orders);
  const max = top[0]?.qty ?? 1;
  const money = (fils: number | null) => (fils === null ? "—" : venue.money(fils));
  const kpis: [string, string, React.ReactNode][] = [
    [t("kOrders"), String(s.orders), t("kOrdersD")],
    [t("kCollected"), money(s.collectedFils), t("kCollectedD")],
    [t("kProfit"), money(profit?.profit_fils ?? null), (
      <button key="p" type="button" onClick={onProfit} className="underline underline-offset-2 hover:text-foreground">
        {t("kProfitD")}
      </button>
    )],
    [t("kKitchen"), s.kitchenMedianMin === null ? "—" : `${s.kitchenMedianMin} ${t("minShort")}`, t("kKitchenD")],
  ];

  return (
    // From 1280px the bento fills the screen: two equal rows, each panel scrolls inside itself.
    <div className="flex flex-col gap-4 max-sm:gap-3 xl:min-h-0 xl:flex-1">
      {/* One panel, figures lead, hairlines between them (no icon tiles). */}
      <dl className="grid shrink-0 grid-cols-4 rounded-2xl bg-card ring-1 ring-border max-[1100px]:grid-cols-2">
        {kpis.map(([label, value, note]) => (
          <div key={label} className="flex min-w-0 flex-col border-border px-5 py-4 not-first:border-s max-[1100px]:nth-3:border-s-0 max-[1100px]:nth-[n+3]:border-t max-sm:px-4">
            <dt className="order-2 mt-1.5 text-sm font-medium">{label}</dt>
            <dd className="order-1 font-display text-[30px] leading-none font-semibold tracking-tight whitespace-nowrap tabular-nums max-sm:text-[26px]">{value}</dd>
            <dd className="order-3 text-[13px] text-muted-foreground">{note}</dd>
          </div>
        ))}
      </dl>

      <div className="grid gap-4 max-sm:gap-3 md:grid-cols-2 xl:min-h-0 xl:flex-1 xl:grid-cols-12 xl:grid-rows-[minmax(0,1fr)_minmax(0,1fr)]">
        <div className={cn(BOX, "md:col-span-2 xl:col-span-8")}>
          <HourChart fill today={ordersByHour(today.orders, venue.tz)} lastWeek={ordersByHour(today.lastWeek, venue.tz)} />
        </div>
        <div className={cn(BOX, "md:col-span-2 xl:col-span-4")}>
          <StatusDonut orders={today.orders} />
        </div>

        <section aria-labelledby="latest-h" className={cn(BOX, "md:col-span-2 xl:col-span-6")}>
          <div className="mb-3 flex shrink-0 items-baseline justify-between gap-3">
            <h2 id="latest-h" className="text-[15px] font-semibold">
              {t("latest")}
            </h2>
            <Button variant="link" size="xs" onClick={() => onOrders()}>
              {t("navOrders")}
            </Button>
          </div>
          <div className="relative min-h-0 flex-1 panel-scroll">
            <OrdersTable orders={today.orders.slice(0, 12)} empty="noOrdersToday" onOpen={onOrders} />
          </div>
        </section>
        <div className={cn(BOX, "xl:col-span-3")}>
          <FloorPlan tables={tables} visits={today.openVisits} />
        </div>
        <section aria-labelledby="top-h" className={cn(BOX, "xl:col-span-3")}>
          <h2 id="top-h" className="mb-2 shrink-0 text-[15px] font-semibold">
            {t("topDishes")}
          </h2>
          {top.length === 0 ? (
            <p className="grid flex-1 place-items-center py-6 text-sm text-text-2">{t("noOrdersToday")}</p>
          ) : (
            <ul className="relative min-h-0 flex-1 panel-scroll">
              {top.map((d, i) => {
                const img = menu.find((m) => m.name === d.name)?.image_url;
                return (
                  <li key={d.name} className="grid grid-cols-[32px_minmax(0,1fr)_auto] items-center gap-3 border-b py-2 text-sm last:border-b-0">
                    {img ? <Arch src={img} alt="" width={32} height={38} /> : <span aria-hidden className="h-[38px] w-8 rounded-arch bg-muted" />}
                    <div className="min-w-0">
                      <span className="block truncate">{pick(lang, d.name, d.name_ar)}</span>
                      <div className="mt-1.5 h-1 rounded-full bg-muted">
                        <i className={`block h-full rounded-full ${i === 0 ? "bg-ochre" : "bg-text-2"}`} style={{ width: `${Math.round((d.qty / max) * 100)}%` }} />
                      </div>
                    </div>
                    <em className="text-text-2 not-italic tabular-nums">{d.qty}</em>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
