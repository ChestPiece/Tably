"use client";
import { Button } from "@/components/ui/button";
import { formatAge, tableLabel } from "@/lib/format";
import { tr } from "@/lib/i18n";
import type { Lang, ServiceRequest } from "@/lib/types";
import { cn } from "@/lib/utils";

type Props = {
  requests: ServiceRequest[];
  lang: Lang;
  onResolve: (id: string) => void;
  now: number;
  busyId?: string;
  fresh?: Set<string>;
};

/** One chip per open waiter/bill call, above the columns. Hidden when there are none. */
export function CallsTray({ requests, lang, onResolve, now, busyId, fresh }: Props) {
  if (!requests.length) return null;
  return (
    <section aria-label={tr(lang, "callsTitle")} className="shrink-0 border-b bg-card">
      <ul className="flex gap-2 overflow-x-auto px-4 py-2 [scrollbar-width:none]">
        {requests.map((r) => (
          <li
            key={r.id}
            className={cn("flex shrink-0 items-center gap-3 rounded-md border bg-background py-1.5 ps-4 pe-1.5 text-sm whitespace-nowrap animate-in fade-in", fresh?.has(r.id) && "bg-muted")}
          >
            <b className="font-display text-xl leading-none font-semibold">{tableLabel(lang, r.table_number)}</b>
            <span>{tr(lang, r.kind === "bill" ? "wantsBill" : "needsWaiter")}</span>
            <time className="text-sm text-muted-foreground tabular-nums">
              <bdi dir="ltr">{formatAge(Math.max(0, now - new Date(r.created_at).getTime()), lang)}</bdi>
            </time>
            <Button size="xs" disabled={busyId === r.id} onClick={() => onResolve(r.id)}>
              {tr(lang, "done")}
            </Button>
          </li>
        ))}
      </ul>
    </section>
  );
}
