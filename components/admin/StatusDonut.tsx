"use client";
import { Cell, Pie, PieChart } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { useLang, type Key } from "@/lib/i18n";
import type { Order, OrderStatus } from "@/lib/types";

const STATUS: [OrderStatus, Key, string][] = [
  ["received", "st_received", "var(--status-new)"],
  ["preparing", "st_preparing", "var(--status-cooking)"],
  ["ready", "st_ready", "var(--status-ready)"],
  ["served", "st_served", "var(--status-served)"],
  ["cancelled", "st_cancelled", "var(--status-cancelled)"],
];

/** Today's orders by status: donut plus a legend that carries the counts (colour never alone). */
export function StatusDonut({ orders }: { orders: Order[] }) {
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
      <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
        <div className="relative size-28 shrink-0">
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
        <ul className="flex min-w-[120px] flex-1 flex-col gap-1.5 text-sm">
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
