"use client";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatAge, tableLabel } from "@/lib/format";
import { tr } from "@/lib/i18n";
import { pick, type Can, type Lang, type Order } from "@/lib/types";
import { cn } from "@/lib/utils";

type Props = {
  can: Can;
  order: Order;
  now: number;
  lang: Lang;
  onAdvance: (o: Order) => void;
  onCancel: (o: Order) => void;
  busy: boolean;
  fresh?: boolean;
  /** Item name highlighted from the "To cook" panel; tickets without it fade. */
  highlight?: string | null;
};

/** Age thresholds for tickets on the line (minutes since the order came in). */
export const ageTone = (ms: number) => (ms >= 15 * 60e3 ? "late" : ms >= 10 * 60e3 ? "warn" : "");

// A ticket on the kitchen line. New = outlined, cooking = filled; the button names the next step.
export function OrderCard({ can, order: o, now, lang, onAdvance, onCancel, busy, fresh, highlight }: Props) {
  const isNew = o.status === "received";
  const ms = Math.max(0, now - new Date(o.created_at).getTime());
  const tone = ageTone(ms);
  const guest = o.guest_name ?? `${tr(lang, "guest")} ${o.guest_seq ?? "?"}`;
  const dim = highlight && !o.order_lines.some((l) => l.name === highlight);
  return (
    <article
      className={cn(
        "flex flex-col gap-2 rounded-lg border p-3 text-card-foreground transition-[background-color,opacity] duration-slow ease-sufra animate-in fade-in",
        isNew ? "border-border bg-transparent" : "border-transparent bg-card",
        fresh && "bg-muted",
        dim && "opacity-35",
      )}
    >
      <header className="flex items-baseline gap-2.5">
        <h3 className="font-display text-[28px] leading-[0.9] font-semibold">
          <span className="sr-only">{tr(lang, "table")} </span>
          {tableLabel(lang, o.table_number)}
        </h3>
        <p className="min-w-0 flex-1 truncate text-sm text-muted-foreground">
          <span className="tabular-nums">#{o.number}</span> · <bdi>{guest}</bdi>
          {o.is_first_of_visit && ` · ${tr(lang, "newTable")}`}
        </p>
        <p
          className={cn(
            "shrink-0 rounded-sm text-[15px] font-semibold whitespace-nowrap text-text-2 tabular-nums",
            tone === "warn" && "text-ochre-text",
            tone === "late" && "bg-danger-bg px-2 text-destructive",
          )}
        >
          <bdi dir="ltr">{formatAge(ms, lang)}</bdi>
          {tone === "late" && <span className="sr-only"> · {tr(lang, "late")}</span>}
        </p>
      </header>
      <ul className="grid gap-0.5 text-base">
        {o.order_lines.map((l) => (
          <li key={l.id} className={cn("grid grid-cols-[26px_minmax(0,1fr)] leading-[1.35]", highlight === l.name && "text-ochre-text")}>
            <b className="font-semibold tabular-nums">{l.quantity}</b>
            <span>
              {pick(lang, l.name, l.name_ar)}
              {l.option_name && <small className="text-sm text-text-2"> · {pick(lang, l.option_name, l.option_name_ar)}</small>}
            </span>
          </li>
        ))}
      </ul>
      {o.note && <p className="rounded-sm bg-danger-bg px-3 py-1.5 text-sm text-destructive">{o.note}</p>}
      {(can.cook || can.cancel) && (
        <div className="flex items-center gap-1">
          {can.cook && (
            <Button variant="secondary" className="flex-1" disabled={busy} onClick={() => onAdvance(o)}>
              {busy && <Loader2 aria-hidden className="animate-spin" />}
              {tr(lang, isNew ? "actStart" : "actReady")}
            </Button>
          )}
          {can.cancel && (
            <Button
              variant="link"
              size="xs"
              className="h-12 shrink-0 text-muted-foreground"
              onClick={() => onCancel(o)}
              aria-label={`${tr(lang, "cancelOrder")}: ${tableLabel(lang, o.table_number)} #${o.number}`}
            >
              {tr(lang, "cancel")}
            </Button>
          )}
        </div>
      )}
    </article>
  );
}
