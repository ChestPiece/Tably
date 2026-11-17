"use client";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { useLang } from "@/lib/i18n";

/** Orders per venue hour: today (solid ink) against the same weekday last week (muted, dashed). */
export function HourChart({ today, lastWeek }: { today: number[]; lastWeek: number[] }) {
  const { t } = useLang();
  const config = {
    today: { label: t("today"), color: "var(--primary)" },
    lastWeek: { label: t("lastWeek"), color: "var(--muted-foreground)" },
  } satisfies ChartConfig;

  // Active hours ±1; a quiet day shows the usual service window.
  const active = today.map((n, h) => (n || lastWeek[h] ? h : -1)).filter((h) => h >= 0);
  const from = active.length ? Math.max(0, active[0] - 1) : 11;
  const to = active.length ? Math.min(23, active.at(-1)! + 1) : 23;
  const data = Array.from({ length: to - from + 1 }, (_, i) => ({ hour: from + i, today: today[from + i], lastWeek: lastWeek[from + i] }));
  const empty = !today.some(Boolean);

  return (
    <section aria-labelledby="hour-h">
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-3">
        <h2 id="hour-h" className="text-[15px] font-semibold">
          {t("byHour")}
        </h2>
        <div className="flex gap-4 text-sm text-text-2">
          <span className="inline-flex items-center gap-2">
            <i aria-hidden className="h-0.5 w-3.5 bg-primary" />
            {t("today")}
          </span>
          <span className="inline-flex items-center gap-2">
            <i aria-hidden className="h-0.5 w-3.5 bg-[repeating-linear-gradient(90deg,var(--muted-foreground)_0_3px,transparent_3px_6px)]" />
            {t("lastWeek")}
          </span>
        </div>
      </div>
      <div className="relative" dir="ltr">
        <ChartContainer config={config} className="aspect-[640/240] w-full">
          <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -20 }} accessibilityLayer>
            <CartesianGrid vertical={false} strokeDasharray="0" />
            <XAxis dataKey="hour" tick={{ fill: "var(--muted-foreground)" }} tickLine={false} axisLine={false} tickMargin={8} tickFormatter={(h: number) => String(h).padStart(2, "0")} />
            <YAxis allowDecimals={false} tick={{ fill: "var(--muted-foreground)" }} tickLine={false} axisLine={false} width={44} />
            <ChartTooltip cursor content={<ChartTooltipContent labelFormatter={(_, p) => `${String(p?.[0]?.payload?.hour ?? "").padStart(2, "0")}:00`} />} />
            <Area dataKey="lastWeek" type="monotone" stroke="var(--color-lastWeek)" strokeWidth={2} strokeDasharray="4 4" fill="none" dot={false} isAnimationActive={false} />
            <Area dataKey="today" type="monotone" stroke="var(--color-today)" strokeWidth={2.5} fill="var(--color-today)" fillOpacity={0.08} dot={false} activeDot={{ r: 4 }} isAnimationActive={false} />
          </AreaChart>
        </ChartContainer>
        {empty && <p className="absolute inset-0 grid place-items-center text-sm text-text-2">{t("noOrdersToday")}</p>}
      </div>
    </section>
  );
}
