"use client";
import { Bar, CartesianGrid, ComposedChart, Line, XAxis, YAxis } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { useLang } from "@/lib/i18n";

/** Orders per venue hour: today as bars (counts are whole numbers; a smooth curve faked orders between hours), same weekday last week as a dashed step line. */
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
  const hasLastWeek = lastWeek.some(Boolean);

  return (
    <section aria-labelledby="hour-h">
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-3">
        <h2 id="hour-h" className="text-[15px] font-semibold">
          {t("byHour")}
        </h2>
        <div className="flex gap-4 text-sm text-text-2">
          <span className="inline-flex items-center gap-2">
            <i aria-hidden className="size-2.5 rounded-[3px] bg-primary" />
            {t("today")}
          </span>
          {hasLastWeek && <span className="inline-flex items-center gap-2">
            <i aria-hidden className="h-0.5 w-3.5 bg-[repeating-linear-gradient(90deg,var(--muted-foreground)_0_3px,transparent_3px_6px)]" />
            {t("lastWeek")}
          </span>}
        </div>
      </div>
      <div className="relative" dir="ltr">
        <ChartContainer config={config} className="aspect-[640/240] w-full">
          <ComposedChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -20 }} accessibilityLayer>
            <CartesianGrid vertical={false} strokeDasharray="0" />
            <XAxis dataKey="hour" tick={{ fill: "var(--muted-foreground)" }} tickLine={false} axisLine={false} tickMargin={8} tickFormatter={(h: number) => String(h).padStart(2, "0")} />
            <YAxis allowDecimals={false} tick={{ fill: "var(--muted-foreground)" }} tickLine={false} axisLine={false} width={44} />
            <ChartTooltip cursor={{ fill: "var(--muted)" }} content={<ChartTooltipContent labelFormatter={(_, p) => `${String(p?.[0]?.payload?.hour ?? "").padStart(2, "0")}:00`} />} />
            {!empty && <Bar dataKey="today" fill="var(--color-today)" radius={[4, 4, 0, 0]} maxBarSize={28} isAnimationActive={false} />}
            {hasLastWeek && <Line dataKey="lastWeek" type="step" stroke="var(--color-lastWeek)" strokeWidth={2} strokeDasharray="4 4" dot={false} isAnimationActive={false} />}
          </ComposedChart>
        </ChartContainer>
        {empty && <p className="absolute inset-0 grid place-items-center text-sm text-text-2">{t("noOrdersToday")}</p>}
      </div>
    </section>
  );
}
