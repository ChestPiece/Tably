"use client";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatAge, tableLabel } from "@/lib/format";
import { tr, type Key } from "@/lib/i18n";
import { pick, type Lang, type Order } from "@/lib/types";
import { cn } from "@/lib/utils";

type Stage = "received" | "preparing" | "ready";

// One action per ticket. Start / Mark ready are primary; Served is secondary (the pass, not the stove).
const ACTION: Record<Stage, { key: Key; variant: "default" | "secondary" }> = {
  received: { key: "actStart", variant: "default" },
  preparing: { key: "actReady", variant: "default" },
  ready: { key: "actServed", variant: "secondary" },
};

type Props = {
  order: Order;
  now: number;
  lang: Lang;
  onAdvance: (o: Order) => void;
  onCancel: (o: Order) => void;
  busy: boolean;
  fresh?: boolean;
};

export function OrderCard({ order: o, now, lang, onAdvance, onCancel, busy, fresh }: Props) {
  const action = ACTION[o.status as Stage];
  // Ready tickets age from when they hit the pass.
  const since = o.status === "ready" && o.ready_at ? o.ready_at : o.created_at;
  const ms = Math.max(0, now - new Date(since).getTime());
  const late = o.status === "preparing" && ms >= 15 * 60e3;
  const guest = o.guest_name ?? `${tr(lang, "guest")} ${o.guest_seq ?? "?"}`;
  return (
    <article className={cn("rounded-lg border bg-card p-3 text-card-foreground transition-colors duration-slow ease-sufra animate-in fade-in", fresh && "bg-muted")}>
      <header className="flex items-baseline gap-3">
        <h3 className="font-display text-[30px] leading-[0.9] font-semibold">
          <span className="sr-only">{tr(lang, "table")} </span>
          {tableLabel(lang, o.table_number)}
        </h3>
        <p className="min-w-0 truncate text-sm text-text-2">
          <bdi>{guest}</bdi>
          {o.is_first_of_visit && ` · ${tr(lang, "newTable")}`}
        </p>
        <p className={cn("ms-auto text-sm whitespace-nowrap text-text-2 tabular-nums", late && "font-semibold text-destructive")}>
          <bdi dir="ltr">{formatAge(ms, lang)}</bdi>
          {late && ` · ${tr(lang, "late")}`}
        </p>
      </header>
      <ul className="my-2.5 grid gap-1">
        {o.order_lines.map((l) => (
          <li key={l.id} className="grid grid-cols-[28px_minmax(0,1fr)] leading-[1.3]">
            <b className="font-semibold tabular-nums">{l.quantity}</b>
            <span>
              {pick(lang, l.name, l.name_ar)}
              {l.option_name && <small className="text-sm text-text-2"> · {pick(lang, l.option_name, l.option_name_ar)}</small>}
            </span>
          </li>
        ))}
      </ul>
      {o.note && <p className="mb-2.5 rounded-sm bg-danger-bg px-3 py-2 text-sm text-destructive">{o.note}</p>}
      <div className="flex items-center gap-2">
        <Button variant={action.variant} size="sm" className="flex-1" disabled={busy} onClick={() => onAdvance(o)}>
          {busy && <Loader2 aria-hidden className="animate-spin" />}
          {tr(lang, action.key)}
        </Button>
        <Button variant="link" size="xs" className="shrink-0" onClick={() => onCancel(o)} aria-label={`${tr(lang, "cancelOrder")}: ${tableLabel(lang, o.table_number)} #${o.number}`}>
          {tr(lang, "cancel")}
        </Button>
      </div>
    </article>
  );
}
