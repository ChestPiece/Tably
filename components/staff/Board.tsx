"use client";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { ArrowDown, Inbox, Loader2 } from "lucide-react";
import { EmptyState } from "@/components/app/empty-state";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { CallsTray, type CallAction } from "@/components/staff/CallsTray";
import { OrderCard, ageTone } from "@/components/staff/OrderCard";
import { StatusTag } from "@/components/app/status-badge";
import { formatAge, tableLabel } from "@/lib/format";
import { tr } from "@/lib/i18n";
import { pick, type Lang, type Order, type ServiceRequest } from "@/lib/types";
import { cn } from "@/lib/utils";

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
  onCall: CallAction;
};

const COL_MIN = 248; // px, one ticket column; narrower clips the action row and the guest line
const GAP = 12;

/** Number of ticket columns that fit the line's width. */
function useColumns(el: HTMLDivElement | null) {
  const [n, setN] = useState(1);
  useLayoutEffect(() => {
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setN(Math.max(1, Math.floor((e.contentRect.width + GAP) / (COL_MIN + GAP)))));
    ro.observe(el);
    return () => ro.disconnect();
  }, [el]);
  return n;
}

// Deal tickets oldest-first into the shortest column, so the top row is always the oldest work and
// short tickets don't leave holes under long ones.
// ponytail: height is estimated from line count, not measured; good enough to stop gaps, measure if columns drift.
function deal(list: Order[], cols: number) {
  const out = Array.from({ length: cols }, () => ({ h: 0, items: [] as Order[] }));
  for (const o of list) {
    const c = out.reduce((a, b) => (b.h < a.h ? b : a));
    c.h += 4 + o.order_lines.length + (o.note ? 1.5 : 0);
    c.items.push(o);
  }
  return out.map((c) => c.items);
}

/** Item totals across the line, biggest first, for batch cooking. */
function totals(list: Order[], lang: Lang) {
  const m = new Map<string, { label: string; q: number; opts: Map<string, number> }>();
  for (const o of list)
    for (const l of o.order_lines) {
      const e = m.get(l.name) ?? { label: pick(lang, l.name, l.name_ar), q: 0, opts: new Map() };
      e.q += l.quantity;
      if (l.option_name) {
        const k = pick(lang, l.option_name, l.option_name_ar);
        e.opts.set(k, (e.opts.get(k) ?? 0) + l.quantity);
      }
      m.set(l.name, e);
    }
  return [...m].sort((a, b) => b[1].q - a[1].q);
}

export function Board({ lang, now, loaded, orders, recent, requests, fresh, busyId, onAdvance, onCancel, onCall }: Props) {
  const line = orders.filter((o) => o.status === "received" || o.status === "preparing");
  const pass = orders.filter((o) => o.status === "ready").sort((a, b) => (a.ready_at ?? "").localeCompare(b.ready_at ?? ""));
  const late = line.filter((o) => ageTone(now - new Date(o.created_at).getTime()) === "late").length;

  const [pane, setPane] = useState<"line" | "pass">("line");
  const [showTotals, setShowTotals] = useState(false);
  const [highlight, setHighlight] = useState<string | null>(null);
  const scroller = useRef<HTMLDivElement>(null);
  const [grid, setGrid] = useState<HTMLDivElement | null>(null);
  const cols = useColumns(grid);
  const [below, setBelow] = useState(0);

  // "N more below": tickets whose top edge is under the fold of the line.
  const countBelow = () => {
    const el = scroller.current;
    if (!el) return;
    const fold = el.getBoundingClientRect().bottom - 40;
    setBelow([...el.querySelectorAll("article")].filter((t) => t.getBoundingClientRect().top > fold).length);
  };
  useEffect(() => {
    const id = requestAnimationFrame(countBelow);
    return () => cancelAnimationFrame(id);
  }, [orders, cols, pane, showTotals]);

  const toCook = totals(line, lang);
  const hi = highlight && toCook.some(([k]) => k === highlight) ? highlight : null;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <CallsTray requests={requests} lang={lang} now={now} busyId={busyId} fresh={fresh} onCall={onCall} />

      {/* Phone / narrow: one pane at a time. */}
      <div role="tablist" aria-label={tr(lang, "jumpTo")} className="flex shrink-0 gap-1 border-b p-2 lg:hidden">
        {(["line", "pass"] as const).map((p) => (
          <button
            key={p}
            role="tab"
            aria-selected={pane === p}
            onClick={() => setPane(p)}
            className="h-12 flex-1 rounded-md font-semibold text-muted-foreground aria-selected:bg-muted aria-selected:text-foreground"
          >
            {tr(lang, p === "line" ? "lineTitle" : "atPass")} <span className="tabular-nums">{p === "line" ? line.length : pass.length}</span>
          </button>
        ))}
      </div>

      {!loaded ? (
        <div aria-hidden className="grid flex-1 grid-cols-[repeat(auto-fill,minmax(232px,1fr))] content-start gap-3 p-4">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-44 rounded-lg" />
          ))}
        </div>
      ) : orders.length === 0 ? (
        <div className="grid flex-1 place-items-center">
          <EmptyState icon={Inbox} title={tr(lang, "allClear")} body={tr(lang, "allClearBody")} />
        </div>
      ) : (
        <div className={cn("grid min-h-0 flex-1 grid-cols-[minmax(0,1fr)] grid-rows-[minmax(0,1fr)] lg:grid-cols-[minmax(0,1fr)_256px]", showTotals && "lg:grid-cols-[232px_minmax(0,1fr)_256px]")}>
          {showTotals && (
            <aside aria-label={tr(lang, "toCook")} className="hidden min-h-0 overflow-y-auto border-e px-3 pt-3 pb-6 lg:block">
              <h2 className="px-2 text-[15px] font-semibold">{tr(lang, "toCook")}</h2>
              <p className="px-2 pb-2 text-sm text-muted-foreground">{tr(lang, "toCookHint")}</p>
              {toCook.map(([k, e]) => (
                <button
                  key={k}
                  aria-pressed={hi === k}
                  onClick={() => setHighlight(hi === k ? null : k)}
                  className="grid w-full grid-cols-[40px_minmax(0,1fr)] items-baseline gap-1.5 rounded-md px-2 py-2.5 text-start aria-pressed:bg-muted"
                >
                  <b className="font-display text-2xl leading-none font-semibold tabular-nums">{e.q}</b>
                  <span>
                    {e.label}
                    {[...e.opts].map(([o, q]) => (
                      <small key={o} className="block text-sm text-muted-foreground">
                        <span className="tabular-nums">{q}</span> {o}
                      </small>
                    ))}
                  </span>
                </button>
              ))}
            </aside>
          )}

          <section aria-label={tr(lang, "lineTitle")} className={cn("relative min-h-0 flex-col", pane === "line" ? "flex" : "hidden lg:flex")}>
            <div ref={scroller} onScroll={countBelow} className="relative min-h-0 flex-1 overflow-y-auto">
              <div className="sticky top-0 z-10 flex items-center gap-3 bg-background px-4 pt-3 pb-2">
                <h2 className="text-[15px] font-semibold">{tr(lang, "lineTitle")}</h2>
                <span className="text-sm text-muted-foreground tabular-nums">
                  {line.length} · {tr(lang, "oldestFirst")}
                </span>
                {late > 0 && <span className="text-sm font-medium text-destructive tabular-nums">{tr(lang, "overLate").replace("{n}", String(late))}</span>}
                {line.length > 0 && (
                  <Button
                    variant={showTotals ? "default" : "secondary"}
                    size="xs"
                    aria-pressed={showTotals}
                    className="ms-auto max-lg:hidden"
                    onClick={() => (setShowTotals((v) => !v), setHighlight(null))}
                  >
                    {tr(lang, "toCook")}
                  </Button>
                )}
              </div>
              <div ref={setGrid} className="flex items-start gap-3 px-4 pb-24">
                {line.length === 0 ? (
                  <p className="py-6 text-sm text-text-2">{tr(lang, "emptyPrep")}</p>
                ) : (
                  deal(line, cols).map((list, i) => (
                    <div key={i} className="flex min-w-0 flex-1 flex-col gap-3">
                      {list.map((o) => (
                        <OrderCard key={o.id} order={o} now={now} lang={lang} busy={busyId === o.id} fresh={fresh.has(o.id)} highlight={hi} onAdvance={onAdvance} onCancel={onCancel} />
                      ))}
                    </div>
                  ))
                )}
              </div>
            </div>
            {below > 0 && (
              <Button
                className="absolute end-6 bottom-4 rounded-full shadow-float"
                onClick={() => scroller.current?.scrollBy({ top: scroller.current.clientHeight * 0.8, behavior: "smooth" })}
              >
                {tr(lang, "moreBelow").replace("{n}", String(below))}
                <ArrowDown aria-hidden />
              </Button>
            )}
          </section>

          <section aria-label={tr(lang, "atPass")} className={cn("min-h-0 flex-col border-s max-lg:border-s-0", pane === "pass" ? "flex" : "hidden lg:flex")}>
            <h2 className="flex items-baseline gap-2 px-4 pt-3 pb-2 text-[15px] font-semibold">
              {tr(lang, "atPass")} <span className="text-sm font-medium text-muted-foreground tabular-nums">{pass.length}</span>
            </h2>
            {pass.length === 0 ? (
              <p className="px-4 py-2 text-sm text-text-2">{tr(lang, "emptyReady")}</p>
            ) : (
              <ul className="grid min-h-0 content-start gap-1.5 overflow-y-auto px-2.5 pb-6">
                {pass.map((o) => {
                  const ms = Math.max(0, now - new Date(o.ready_at ?? o.created_at).getTime());
                  const waiting = ms >= 5 * 60e3;
                  return (
                    <li
                      key={o.id}
                      className={cn("grid grid-cols-[52px_minmax(0,1fr)_auto] items-center gap-2 rounded-lg bg-card py-1.5 ps-3 pe-1.5 animate-in fade-in", waiting && "ring-[1.5px] ring-ochre ring-inset")}
                    >
                      <b className="font-display text-[26px] leading-none font-semibold">
                        <span className="sr-only">{tr(lang, "table")} </span>
                        {tableLabel(lang, o.table_number)}
                      </b>
                      <span className="min-w-0 text-sm">
                        <span className="block truncate text-muted-foreground tabular-nums">#{o.number}</span>
                        <span className={cn("block font-semibold text-text-2 tabular-nums", waiting && "text-ochre-text")}>
                          <bdi dir="ltr">{formatAge(ms, lang)}</bdi>
                        </span>
                      </span>
                      <Button variant="secondary" disabled={busyId === o.id} onClick={() => onAdvance(o)} aria-label={`${tr(lang, "actServed")}: ${tableLabel(lang, o.table_number)} #${o.number}`}>
                        {busyId === o.id && <Loader2 aria-hidden className="animate-spin" />}
                        {tr(lang, "actServed")}
                      </Button>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </div>
      )}

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
                <span className="flex-1 truncate">{o.order_lines.map((l) => `${l.quantity}× ${pick(lang, l.name, l.name_ar)}`).join(", ")}</span>
                <StatusTag status={o.status} lang={lang} />
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}
