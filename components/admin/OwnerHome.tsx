"use client";
import { Arch } from "@/components/app/arch";
import { Button } from "@/components/ui/button";
import { formatMoney } from "@/lib/format";
import { useLang } from "@/lib/i18n";
import { dayStats, ordersByHour, topDishes } from "@/lib/stats";
import { pick, type MenuItem, type Order, type TableRow, type Visit } from "@/lib/types";
import { FloorPlan } from "./FloorPlan";
import { HourChart } from "./HourChart";
import { OrdersTable } from "./OrdersTable";

// Hairlines between KPIs: 4 across, 2×2 below 1100px.
const KPI_CELL = [
  "py-5 pe-5",
  "border-s py-5 ps-5 pe-5",
  "border-s py-5 ps-5 pe-5 max-[1100px]:border-s-0 max-[1100px]:border-t max-[1100px]:ps-0",
  "border-s py-5 ps-5 max-[1100px]:border-t",
];

export type TodayData = { orders: Order[]; lastWeek: Order[]; openVisits: Visit[]; paidVisits: Visit[] };

export function OwnerHome({ today, menu, tables, onOrders }: { today: TodayData; menu: MenuItem[]; tables: TableRow[]; onOrders: () => void }) {
  const { lang, t } = useLang();
  const s = dayStats(today.orders, today.paidVisits);
  const top = topDishes(today.orders);
  const max = top[0]?.qty ?? 1;
  const money = (fils: number | null) => (fils === null ? "—" : formatMoney(fils, lang));
  const kpis: [string, string, string][] = [
    [t("kOrders"), String(s.orders), t("kOrdersD")],
    [t("kCollected"), money(s.collectedFils), t("kCollectedD")],
    [t("kAvg"), money(s.avgTicketFils), t("kAvgD")],
    [t("kKitchen"), s.kitchenMedianMin === null ? "—" : `${s.kitchenMedianMin} ${t("minShort")}`, t("kKitchenD")],
  ];

  return (
    <>
      <dl className="mb-8 grid grid-cols-4 border-y max-[1100px]:grid-cols-2">
        {kpis.map(([label, value, note], i) => (
          <div key={label} className={KPI_CELL[i]}>
            <dt className="text-sm text-text-2">{label}</dt>
            <dd className="mt-2 mb-1 text-[32px] leading-[1.15] font-medium whitespace-nowrap tabular-nums max-[480px]:text-2xl">{value}</dd>
            <dd className="text-sm text-muted-foreground">{note}</dd>
          </div>
        ))}
      </dl>

      <div className="mb-8 grid grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)] gap-8 max-[1100px]:grid-cols-1">
        <HourChart today={ordersByHour(today.orders)} lastWeek={ordersByHour(today.lastWeek)} />
        <FloorPlan tables={tables} visits={today.openVisits} />
      </div>

      <div className="grid grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)] gap-8 max-[1100px]:grid-cols-1">
        <section aria-labelledby="latest-h">
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
        <section aria-labelledby="top-h">
          <h2 id="top-h" className="mb-4 text-[15px] font-semibold">
            {t("topDishes")}
          </h2>
          {top.length === 0 ? (
            <p className="py-12 text-center text-sm text-text-2">{t("noOrdersToday")}</p>
          ) : (
            <ul>
              {top.map((d, i) => {
                const img = menu.find((m) => m.name === d.name)?.image_url;
                return (
                  <li key={d.name} className="grid grid-cols-[40px_minmax(0,1fr)_auto] items-center gap-3 border-b py-3 text-sm">
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
      </div>
    </>
  );
}
