"use client";
import { ChartNoAxesColumn, ReceiptText, Timer, Wallet, type LucideIcon } from "lucide-react";
import { Cell, Pie, PieChart } from "recharts";
import { Arch } from "@/components/app/arch";
import { Button } from "@/components/ui/button";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { formatMoney } from "@/lib/format";
import { useLang, type Key } from "@/lib/i18n";
import { dayStats, ordersByHour, topDishes } from "@/lib/stats";
import { pick, type MenuItem, type Order, type OrderStatus, type TableRow, type Visit } from "@/lib/types";
import { FloorPlan } from "./FloorPlan";
import { HourChart } from "./HourChart";
import { OrdersTable } from "./OrdersTable";

/** White rounded panel on the tinted owner canvas. */
export const PANEL = "rounded-2xl bg-card p-6 ring-1 ring-border max-sm:p-4";

export type TodayData = { orders: Order[]; lastWeek: Order[]; openVisits: Visit[]; paidVisits: Visit[] };

export function OwnerHome({ today, menu, tables, onOrders }: { today: TodayData; menu: MenuItem[]; tables: TableRow[]; onOrders: () => void }) {
  const { lang, t } = useLang();
  const s = dayStats(today.orders, today.paidVisits);
  const top = topDishes(today.orders);
  const max = top[0]?.qty ?? 1;
  const money = (fils: number | null) => (fils === null ? "—" : formatMoney(fils, lang));
  const kpis: [LucideIcon, string, string, string][] = [
    [ReceiptText, t("kOrders"), String(s.orders), t("kOrdersD")],
    [Wallet, t("kCollected"), money(s.collectedFils), t("kCollectedD")],
    [ChartNoAxesColumn, t("kAvg"), money(s.avgTicketFils), t("kAvgD")],
    [Timer, t("kKitchen"), s.kitchenMedianMin === null ? "—" : `${s.kitchenMedianMin} ${t("minShort")}`, t("kKitchenD")],
  ];

  return (
    <div className="flex flex-col gap-5 max-sm:gap-3">
      <dl className="grid grid-cols-4 gap-5 max-[1100px]:grid-cols-2 max-sm:gap-3">
        {kpis.map(([Icon, label, value, note]) => (
          <div key={label} className={`${PANEL} flex items-start gap-4 max-sm:flex-col max-sm:gap-3`}>
            <span aria-hidden className="grid size-11 shrink-0 place-items-center rounded-xl bg-secondary text-primary [&_svg]:size-5">
              <Icon />
            </span>
            <div className="flex min-w-0 flex-col">
              <dt className="order-2 mt-2 text-sm font-medium">{label}</dt>
              <dd className="order-1 text-[28px] leading-none font-semibold whitespace-nowrap tabular-nums max-sm:text-[22px]">{value}</dd>
              <dd className="order-3 mt-0.5 text-[13px] text-muted-foreground">{note}</dd>
            </div>
          </div>
        ))}
      </dl>

      <div className="grid grid-cols-3 gap-5 max-[1100px]:grid-cols-1 max-sm:gap-3">
        <div className={`${PANEL} col-span-2 max-[1100px]:col-span-1`}>
          <HourChart today={ordersByHour(today.orders)} lastWeek={ordersByHour(today.lastWeek)} />
        </div>
        <div className={PANEL}>
          <StatusDonut orders={today.orders} />
        </div>
      </div>

      <div className="grid grid-cols-3 items-start gap-5 max-[1100px]:grid-cols-1 max-sm:gap-3">
        <section aria-labelledby="latest-h" className={`${PANEL} col-span-2 max-[1100px]:col-span-1`}>
          <div className="mb-4 flex items-baseline justify-between gap-3">
            <h2 id="latest-h" className="text-[15px] font-semibold">
              {t("latest")}
            </h2>
            <Button variant="link" size="xs" onClick={onOrders}>
              {t("navOrders")}
            </Button>
          </div>
          <OrdersTable orders={today.orders.slice(0, 6)} />
        </section>
        <div className="flex flex-col gap-5 max-sm:gap-3">
          <section aria-labelledby="top-h" className={PANEL}>
            <h2 id="top-h" className="mb-4 text-[15px] font-semibold">
              {t("topDishes")}
            </h2>
            {top.length === 0 ? (
              <p className="py-8 text-center text-sm text-text-2">{t("noOrdersToday")}</p>
            ) : (
              <ul>
                {top.map((d, i) => {
                  const img = menu.find((m) => m.name === d.name)?.image_url;
                  return (
                    <li key={d.name} className="grid grid-cols-[40px_minmax(0,1fr)_auto] items-center gap-3 border-b py-3 text-sm last:border-b-0 last:pb-0">
                      {img ? <Arch src={img} alt="" width={40} height={48} /> : <span aria-hidden className="h-12 w-10 rounded-arch bg-muted" />}
                      <div className="min-w-0">
                        <span className="block truncate">{pick(lang, d.name, d.name_ar)}</span>
                        <div className="mt-2 h-1 rounded-full bg-muted">
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
          <div className={PANEL}>
            <FloorPlan tables={tables} visits={today.openVisits} />
          </div>
        </div>
      </div>
    </div>
  );
}

const STATUS: [OrderStatus, Key, string][] = [
  ["received", "st_received", "var(--status-new)"],
  ["preparing", "st_preparing", "var(--status-cooking)"],
  ["ready", "st_ready", "var(--status-ready)"],
  ["served", "st_served", "var(--status-served)"],
  ["cancelled", "st_cancelled", "var(--status-cancelled)"],
];

/** Today's orders by status: donut plus a legend that carries the counts (colour never alone). */
function StatusDonut({ orders }: { orders: Order[] }) {
  const { t } = useLang();
  const data = STATUS.map(([id, key, color]) => ({ id, label: t(key), color, n: orders.filter((o) => o.status === id).length }));
  const config: ChartConfig = Object.fromEntries(data.map((d) => [d.id, { label: d.label, color: d.color }]));
  const total = orders.length;
  // Empty day: one muted ring so the card keeps its shape.
  const slices = total ? data.filter((d) => d.n) : [{ id: "none", label: "", color: "var(--muted)", n: 1 }];
  return (
    <section aria-labelledby="mix-h">
      <h2 id="mix-h" className="mb-4 text-[15px] font-semibold">
        {t("statusMix")}
      </h2>
      <div className="flex flex-col items-center gap-6 max-[1100px]:flex-row max-sm:gap-5">
        <div className="relative size-40 shrink-0 max-sm:size-32">
          <ChartContainer config={config} className="aspect-square size-full">
            <PieChart>
              {total > 0 && <ChartTooltip content={<ChartTooltipContent nameKey="id" hideLabel />} />}
              <Pie data={slices} dataKey="n" nameKey="id" innerRadius="70%" outerRadius="100%" paddingAngle={total ? 2 : 0} stroke="none" isAnimationActive={false}>
                {slices.map((d) => (
                  <Cell key={d.id} fill={d.color} />
                ))}
              </Pie>
            </PieChart>
          </ChartContainer>
          <p className="pointer-events-none absolute inset-0 grid place-content-center text-center">
            <b className="text-2xl leading-none font-semibold tabular-nums">{total}</b>
            <span className="mt-1 text-xs text-muted-foreground">{t("totalOrders")}</span>
          </p>
        </div>
        <ul className="flex w-full min-w-0 flex-1 flex-col gap-2.5 text-sm">
          {data.map((d) => (
            <li key={d.id} className="flex items-center gap-2">
              <span aria-hidden className="size-2.5 shrink-0 rounded-[3px]" style={{ background: d.color }} />
              <span className="truncate text-text-2">{d.label}</span>
              <b className="ms-auto font-medium tabular-nums">{d.n}</b>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
