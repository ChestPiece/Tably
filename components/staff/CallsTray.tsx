"use client";
import { Banknote, CreditCard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatAge, tableLabel } from "@/lib/format";
import { tr } from "@/lib/i18n";
import type { Lang, ServiceRequest } from "@/lib/types";
import { cn } from "@/lib/utils";

/** ack = "On my way"; done = waiter call handled; cash / card = bill paid at the table (records it and frees the table). */
export type CallAction = (r: ServiceRequest, act: "ack" | "done" | "cash" | "card") => void;

type Props = {
  requests: ServiceRequest[];
  lang: Lang;
  onCall: CallAction;
  now: number;
  busy?: ReadonlySet<string>;
  fresh?: Set<string>;
};

/** One chip per open waiter/bill call, above the columns. Hidden when there are none. */
export function CallsTray({ requests, lang, onCall, now, busy, fresh }: Props) {
  if (!requests.length) return null;
  return (
    <section aria-label={tr(lang, "callsTitle")} className="shrink-0 border-b bg-card">
      <ul className="flex gap-2 overflow-x-auto px-4 py-2 scroll-cue [scrollbar-width:none]">
        {requests.map((r) => {
          const isBusy = !!busy?.has(r.id);
          const nudged = !!r.nudged_at && !r.acknowledged_at;
          const bill = r.kind === "bill";
          // The guest's pick goes first; the other method stays one tap away.
          const methods = r.pay_method === "card" ? (["card", "cash"] as const) : (["cash", "card"] as const);
          return (
            <li
              key={r.id}
              className={cn(
                "flex shrink-0 items-center gap-3 rounded-md border bg-background py-1.5 ps-4 pe-1.5 text-sm whitespace-nowrap animate-in fade-in",
                fresh?.has(r.id) && "bg-muted",
                nudged && "border-[var(--status-cooking)] bg-[color-mix(in_oklch,var(--status-cooking)_14%,var(--background))]",
              )}
            >
              <b className="font-display text-xl leading-none font-semibold">{tableLabel(lang, r.table_number)}</b>
              <span>
                {tr(lang, bill ? "wantsBill" : "needsWaiter")}
                {bill && r.pay_method && <> · {tr(lang, "payWith").replace("{m}", tr(lang, r.pay_method).toLowerCase())}</>}
              </span>
              <time className={cn("text-sm tabular-nums", nudged ? "font-medium" : "text-muted-foreground")}>
                <bdi dir="ltr">{formatAge(Math.max(0, now - new Date(r.created_at).getTime()), lang)}</bdi>
              </time>
              {r.acknowledged_at && r.ack_name && <span className="text-muted-foreground">{tr(lang, "ackBy").replace("{n}", r.ack_name)}</span>}
              {!r.acknowledged_at ? (
                <Button disabled={isBusy} onClick={() => onCall(r, "ack")}>
                  {tr(lang, "onMyWay")}
                </Button>
              ) : bill ? (
                methods.map((m, i) => (
                  <Button key={m} variant={i === 0 ? "default" : "secondary"} disabled={isBusy} onClick={() => onCall(r, m)}>
                    {m === "cash" ? <Banknote aria-hidden /> : <CreditCard aria-hidden />}
                    {tr(lang, m === "cash" ? "paidCash" : "paidCard")}
                  </Button>
                ))
              ) : (
                <Button disabled={isBusy} onClick={() => onCall(r, "done")}>
                  {tr(lang, "done")}
                </Button>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
