"use client";
import { useRef, useState } from "react";
import { Inbox } from "lucide-react";
import { EmptyState } from "@/components/app/empty-state";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CallsTray } from "@/components/staff/CallsTray";
import { OrderCard } from "@/components/staff/OrderCard";
import { StatusTag } from "@/components/app/status-badge";
import { tableLabel } from "@/lib/format";
import { tr, type Key } from "@/lib/i18n";
import type { Lang, Order, OrderStatus, ServiceRequest } from "@/lib/types";

type Stage = Extract<OrderStatus, "received" | "preparing" | "ready">;
const COLUMNS: { status: Stage; key: Key; empty: Key }[] = [
  { status: "received", key: "colNew", empty: "emptyNew" },
  { status: "preparing", key: "colCooking", empty: "emptyPrep" },
  { status: "ready", key: "colReady", empty: "emptyReady" },
];

type Props = {
  lang: Lang;
  now: number;
  loaded: boolean;
  orders: Order[];
  recent: Order[];
  requests: ServiceRequest[];
  fresh: Set<string>;
  busyId: string;
  onAdvance: (o: Order) => void;
  onCancel: (o: Order) => void;
  onResolve: (id: string) => void;
};

function ColumnHeader({ lang, col, count }: { lang: Lang; col: (typeof COLUMNS)[number]; count: number }) {
  return (
    <div className="flex items-baseline justify-between px-2 pb-3">
      <h2 className="text-[15px] font-semibold">{tr(lang, col.key)}</h2>
      <span className="text-sm text-muted-foreground tabular-nums">{count}</span>
    </div>
  );
}

function BoardSkeleton() {
  return (
    <div aria-hidden className="grid h-full gap-4 p-2 sm:grid-cols-3">
      {COLUMNS.map((c) => (
        <div key={c.status} className="space-y-2 px-2">
          <Skeleton className="h-5 w-24" />
          {[0, 1].map((i) => (
            <Skeleton key={i} className="h-40 w-full rounded-lg" />
          ))}
        </div>
      ))}
    </div>
  );
}

export function Board({ lang, now, loaded, orders, recent, requests, fresh, busyId, onAdvance, onCancel, onResolve }: Props) {
  const scroller = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState<Stage>("received");
  const by = (s: Stage) => orders.filter((o) => o.status === s);

  // <640: horizontal snap columns, count tabs jump between them (scrollTo, never scrollIntoView).
  const jump = (s: Stage) => {
    const el = scroller.current;
    if (!el) return;
    setActive(s);
    const i = COLUMNS.findIndex((c) => c.status === s);
    el.scrollTo({ left: (el.children[i] as HTMLElement).offsetLeft - el.offsetLeft, behavior: "smooth" });
  };
  const onScroll = () => {
    const el = scroller.current;
    if (!el) return;
    const i = Math.round(el.scrollLeft / (el.scrollWidth / COLUMNS.length));
    setActive(COLUMNS[Math.min(i, COLUMNS.length - 1)].status);
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <CallsTray requests={requests} lang={lang} now={now} busyId={busyId} fresh={fresh} onResolve={onResolve} />
      <Tabs value={active} onValueChange={(v) => jump(v as Stage)} className="shrink-0 border-b sm:hidden">
        <TabsList variant="underline" dir="ltr" aria-label={tr(lang, "jumpTo")} className="h-auto w-full">
          {COLUMNS.map((c) => (
            <TabsTrigger key={c.status} value={c.status} className="flex-1 gap-2">
              {tr(lang, c.key)}
              <span className="text-muted-foreground tabular-nums">{by(c.status).length}</span>
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>
      <div className="flex min-h-0 flex-1">
        <div className="min-w-0 flex-1">
          {!loaded ? (
            <BoardSkeleton />
          ) : orders.length === 0 ? (
            <EmptyState icon={Inbox} title={tr(lang, "allClear")} body={tr(lang, "allClearBody")} />
          ) : (
            <div
              ref={scroller}
              onScroll={onScroll}
              dir="ltr"
              // dir=ltr keeps the phone snap maths simple; from sm the grid follows the reading direction again.
              className={`flex h-full snap-x snap-mandatory overflow-x-auto sm:grid sm:snap-none sm:grid-cols-3 sm:grid-rows-1 sm:overflow-visible ${lang === "ar" ? "sm:[direction:rtl]" : ""}`}
            >
              {COLUMNS.map((c) => {
                const list = by(c.status);
                return (
                  <section key={c.status} aria-label={tr(lang, c.key)} dir={lang === "ar" ? "rtl" : "ltr"} className="flex h-full w-[85vw] shrink-0 snap-center flex-col border-e px-3 pt-4 last:border-e-0 sm:w-auto sm:min-w-0">
                    <ColumnHeader lang={lang} col={c} count={list.length} />
                    <ScrollArea className="min-h-0 flex-1 overflow-hidden">
                      <div className="@container pb-6">
                        {list.length === 0 ? (
                          <p className="px-2 py-6 text-sm text-text-2">{tr(lang, c.empty)}</p>
                        ) : (
                          <div className="grid grid-cols-[repeat(auto-fill,minmax(min(16rem,100%),1fr))] gap-3">
                            {list.map((o) => (
                              <OrderCard key={o.id} order={o} now={now} lang={lang} busy={busyId === o.id} fresh={fresh.has(o.id)} onAdvance={onAdvance} onCancel={onCancel} />
                            ))}
                          </div>
                        )}
                      </div>
                    </ScrollArea>
                  </section>
                );
              })}
            </div>
          )}
        </div>
      </div>
      {recent.length > 0 && (
        <details className="shrink-0 border-t bg-card px-4 py-2 text-sm">
          <summary className="min-h-8 cursor-pointer font-medium text-muted-foreground">
            {tr(lang, "recentOrders")} ({recent.length})
          </summary>
          <ul className="mt-2 max-h-40 divide-y overflow-y-auto">
            {recent.map((o) => (
              <li key={o.id} className="flex gap-3 py-1.5">
                <b className="w-12 font-display text-base font-semibold">{tableLabel(lang, o.table_number)}</b>
                <span className="w-14 text-muted-foreground tabular-nums">#{o.number}</span>
                <span className="flex-1 truncate">{o.order_lines.map((l) => `${l.quantity}× ${l.name}`).join(", ")}</span>
                <StatusTag status={o.status} lang={lang} />
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}
