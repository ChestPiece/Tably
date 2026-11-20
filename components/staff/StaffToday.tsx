"use client";
import { HourChart } from "@/components/admin/HourChart";
import { PANEL, StatusDonut } from "@/components/admin/OwnerHome";
import { useLang, type Key } from "@/lib/i18n";
import { dayStats, ordersByHour, topDishes } from "@/lib/stats";
import { pick, type Order } from "@/lib/types";
import { useVenue } from "@/lib/venue";

const NO_WEEK = new Array<number>(24).fill(0);

/** Shift summary for staff: today's counts by stage, kitchen time, busiest hours, most ordered. No money (owner only). */
export function StaffToday({ orders }: { orders: Order[] }) {
  const { lang, t } = useLang();
  const { tz } = useVenue();
  const s = dayStats(orders, []);
  const n = (...st: Order["status"][]) => orders.filter((o) => st.includes(o.status)).length;
  const top = topDishes(orders);
  const kpis: [Key, string][] = [
    ["kOrders", String(s.orders)],
    ["st_served", String(n("served"))],
    ["liveOrders", String(n("received", "preparing", "ready"))],
    ["st_cancelled", String(n("cancelled"))],
    ["kKitchen", s.kitchenMedianMin === null ? "—" : `${s.kitchenMedianMin} ${t("minShort")}`],
  ];
  return (
    <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-4 p-5 max-sm:p-3">
      <dl className="grid grid-cols-5 gap-4 max-[1000px]:grid-cols-3 max-sm:grid-cols-2 max-sm:gap-3">
        {kpis.map(([k, v]) => (
          <div key={k} className={`${PANEL} flex flex-col`}>
            <dt className="order-2 mt-2 text-sm text-muted-foreground">{t(k)}</dt>
            <dd className="order-1 text-[28px] leading-none font-semibold whitespace-nowrap tabular-nums">{v}</dd>
          </div>
        ))}
      </dl>
      <div className="grid grid-cols-3 gap-4 max-[1000px]:grid-cols-1">
        <div className={`${PANEL} col-span-2 max-[1000px]:col-span-1`}>
          <HourChart today={ordersByHour(orders, tz)} lastWeek={NO_WEEK} />
        </div>
        <div className="flex flex-col gap-4">
          <div className={PANEL}>
            <StatusDonut orders={orders} />
          </div>
          <section aria-labelledby="staff-top-h" className={`${PANEL} flex-1`}>
            <h2 id="staff-top-h" className="mb-3 text-[15px] font-semibold">
              {t("topDishes")}
            </h2>
            {top.length === 0 ? (
              <p className="text-sm text-text-2">{t("noOrdersToday")}</p>
            ) : (
              <ol className="divide-y text-sm">
                {top.map((d) => (
                  <li key={d.name} className="flex gap-3 py-2">
                    <span className="min-w-0 flex-1 truncate">{pick(lang, d.name, d.name_ar)}</span>
                    <b className="font-medium tabular-nums">{d.qty}</b>
                  </li>
                ))}
              </ol>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
