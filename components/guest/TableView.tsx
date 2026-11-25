"use client";
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Banknote, Bell, Check, CreditCard, ReceiptText } from "lucide-react";
import { useLang, type Key } from "@/lib/i18n";
import { pick, type MenuItem, type Order, type OrderLine, type ServiceRequest, type Visit } from "@/lib/types";
import { Arch } from "@/components/app/arch";
import { StatusTag } from "@/components/app/status-badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { formatClock } from "@/lib/format";
import type { Me } from "./GuestApp";
import { useVenue } from "@/lib/venue";

const STEPS = ["received", "preparing", "ready", "served"] as const;
const HEAD: Record<Order["status"], Key> = { received: "hReceived", preparing: "hPreparing", ready: "hReady", served: "hServed", cancelled: "hCancelled" };

const clock = formatClock;

export function TableView({
  me,
  visit,
  orders,
  menu,
  requests,
  serviceMode,
  busy,
  onRequest,
  onNudge,
  onOrderMore,
}: {
  me: Me | null;
  visit: Visit | null;
  orders: Order[];
  menu: MenuItem[];
  requests: ServiceRequest[];
  serviceMode: "table" | "counter";
  busy: boolean;
  onRequest: (k: "waiter" | "bill", method?: Method) => void;
  onNudge: (id: string) => void;
  onOrderMore: () => void;
}) {
  const { lang, t } = useLang();
  const { tz } = useVenue();
  const [billView, setBillView] = useState(false);
  const open = requests.filter((r) => !r.resolved_at);
  const waiter = open.some((r) => r.kind === "waiter");
  const billReq = open.find((r) => r.kind === "bill");
  const billAsked = !!billReq || !!visit?.bill_requested_at;
  const live = orders.filter((o) => o.status !== "cancelled");
  const total = live.reduce((n, o) => n + o.total_fils, 0);
  const newest = [...orders].reverse();
  const focus = newest.find((o) => o.guest_id === me?.guest_id) ?? newest[0];

  if (billView) {
    const method = billReq?.pay_method ?? null;
    return (
      <div className="flex flex-1 flex-col gap-2 p-6">
        <h2 className="font-display text-[28px] leading-[1.15] font-semibold">{t("yourBill")}</h2>
        <Lines lines={live.flatMap((o) => o.order_lines)} menu={menu} className="my-5" />
        <Total label={t("tableTotal")} fils={total} />
        {visit?.paid_at ? (
          <p className="rounded-md bg-muted p-4 text-[15px]">{t("paidNote")}</p>
        ) : (
          <fieldset className="grid gap-3">
            <legend className="mb-1 font-medium">{t("payHow")}</legend>
            <div className="grid grid-cols-2 gap-3">
              {(["cash", "card"] as const).map((m) => (
                <Button
                  key={m}
                  variant={method === m ? "default" : "secondary"}
                  aria-pressed={method === m}
                  disabled={busy}
                  onClick={() => onRequest("bill", m)}
                >
                  {m === "cash" ? <Banknote aria-hidden /> : <CreditCard aria-hidden />}
                  {t(m)}
                </Button>
              ))}
            </div>
            <p className="text-sm text-text-2">{method ? t("payingBy").replace("{m}", t(method).toLowerCase()) : t("payHowNote")}</p>
          </fieldset>
        )}
        {billReq && <RequestStatus r={billReq} onNudge={onNudge} />}
        <div className="mt-auto pt-4">
          <Button variant="secondary" className="w-full" onClick={() => setBillView(false)}>
            <ArrowLeft className="rtl:rotate-180" aria-hidden />
            {t("back")}
          </Button>
        </div>
      </div>
    );
  }

  const idx = focus ? STEPS.indexOf(focus.status as (typeof STEPS)[number]) : -1;
  const times = focus ? [focus.created_at, focus.preparing_at, focus.ready_at, focus.served_at] : [];
  const sub =
    !focus || focus.status === "served"
      ? ""
      : focus.status === "cancelled"
        ? (focus.cancel_reason ?? "")
        : focus.status === "ready"
          ? t(serviceMode === "counter" ? "readyCounter" : "subReady")
          : t("subWait");

  return (
    <div className="flex flex-1 flex-col gap-2 p-6">
      {focus ? (
        <>
          <p className="text-sm text-text-2">
            {t("orderNo")} {focus.number} · {t("sentAt")} {clock(focus.created_at, lang, tz)}
          </p>
          <h2 className="font-display text-[28px] leading-[1.15] font-semibold">{t(HEAD[focus.status])}</h2>
          {sub && <p className="text-text-2">{sub}</p>}

          {focus.status !== "cancelled" && (
            <ol className="mt-6 mb-4 grid">
              {STEPS.map((s, i) => {
                const state = i < idx || (i === idx && s === "served") ? "done" : i === idx ? "now" : "wait";
                return (
                  <li key={s} aria-current={state === "now" ? "step" : undefined} className="relative grid grid-cols-[20px_minmax(0,1fr)_auto] gap-x-3 pb-5 last:pb-0">
                    {i < STEPS.length - 1 && <span aria-hidden className={cn("absolute start-[9px] top-5 bottom-0 w-0.5", state === "done" ? "bg-foreground" : "bg-border")} />}
                    <i
                      aria-hidden
                      className={cn(
                        "relative z-10 grid size-5 place-items-center rounded-full border-2 bg-background not-italic",
                        state === "done" && "border-foreground bg-foreground text-background",
                        state === "now" && "border-ochre",
                        state === "wait" && "border-border",
                      )}
                    >
                      {state === "done" && <Check className="size-3" strokeWidth={3} />}
                      {state === "now" && <span className="size-2 rounded-full bg-ochre" />}
                    </i>
                    <span>
                      <b className={cn("font-medium", state === "wait" && "font-normal text-muted-foreground")}>{t(s === "served" ? "sServed" : (`st_${s}` as Key))}</b>
                      {state === "now" && s === "preparing" && <small className="block text-sm text-text-2">{t("sPrepNote")}</small>}
                    </span>
                    <time className="text-sm text-muted-foreground tabular-nums">{state !== "wait" ? clock(times[i], lang, tz) : ""}</time>
                  </li>
                );
              })}
            </ol>
          )}

          {newest.map((o) => (
            <section key={o.id} className="border-t py-4">
              <h3 className="mb-3 flex justify-between gap-2 text-sm font-medium text-text-2">
                <span className="truncate">
                  {clock(o.created_at, lang, tz)}
                  {o.guest_name && ` · ${o.guest_name}`}
                </span>
                <StatusTag status={o.status} />
              </h3>
              <Lines lines={o.order_lines} menu={menu} />
            </section>
          ))}
          <Total label={t("tableTotal")} fils={total} />
        </>
      ) : (
        <p className="py-6 text-text-2">{t("noOrdersYet")}</p>
      )}

      <div className="mt-auto grid gap-2 pt-4 empty:hidden" aria-live="polite">
        {requests.map((r) => (
          <RequestStatus key={r.id} r={r} onNudge={onNudge} />
        ))}
      </div>
      <div className="grid grid-cols-2 gap-3 pt-2">
        <Button className="col-span-2" onClick={onOrderMore}>
          {t("orderMore")}
        </Button>
        <Button variant="secondary" className="min-w-0 px-2" disabled={busy || waiter} onClick={() => onRequest("waiter")}>
          <Bell aria-hidden />
          <span className="truncate">{t("callWaiter")}</span>
        </Button>
        <Button
          variant="secondary"
          className="min-w-0 px-2"
          disabled={!orders.length}
          onClick={() => setBillView(true)}
        >
          <ReceiptText aria-hidden />
          <span className="truncate">{t(billAsked || visit?.paid_at ? "yourBill" : "requestBill")}</span>
        </Button>
      </div>
    </div>
  );
}

function Lines({ lines, menu, className }: { lines: OrderLine[]; menu: MenuItem[]; className?: string }) {
  const { lang } = useLang();
  const { money } = useVenue();
  return (
    <ul className={cn("grid gap-3", className)}>
      {lines.map((l) => {
        // Order lines snapshot names, not item ids: match the photo by name.
        const img = menu.find((m) => m.name === l.name)?.image_url;
        return (
          <li key={l.id} className="flex items-center gap-3 text-[15px]">
            {img ? <Arch src={img} alt="" width={32} height={38} /> : <span aria-hidden className="h-[38px] w-8 shrink-0 rounded-arch bg-muted" />}
            <span className="min-w-0 flex-1">
              <span className="flex items-baseline-last gap-2">
                <span className="min-w-0">
                  <span className="tabular-nums">{l.quantity}</span> × {pick(lang, l.name, l.name_ar)}
                </span>
                <span aria-hidden className="leader" />
                <span className="whitespace-nowrap text-text-2 tabular-nums">{money(l.unit_price_fils * l.quantity)}</span>
              </span>
              {l.option_name && <small className="block text-sm text-text-2">{pick(lang, l.option_name, l.option_name_ar)}</small>}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

function Total({ label, fils }: { label: string; fils: number }) {
  const { money } = useVenue();
  return (
    <div className="flex items-baseline justify-between border-t-[3px] border-double border-foreground py-4 font-semibold">
      <span>{label}</span>
      <span className="font-display text-[22px] tabular-nums">{money(fils)}</span>
    </div>
  );
}

type Method = "cash" | "card";
const RING = 15000;
const DONE_FOR = 6000;

/** One waiter or bill request, live: sending (15 s ring), nudged, on the way (with the staff name), done. */
function RequestStatus({ r, onNudge }: { r: ServiceRequest; onNudge: (id: string) => void }) {
  const { t } = useLang();
  const [now, setNow] = useState(() => Date.now());
  const nudged = useRef(false);
  const age = now - Date.parse(r.created_at);
  const waiting = !r.resolved_at && !r.acknowledged_at;
  // Tick only while something on the card is still counting.
  useEffect(() => {
    if (!waiting && !r.resolved_at) return;
    const id = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(id);
  }, [waiting, r.resolved_at]);
  // Nobody answered in 15 s: ask the server to chime the board again (once; the server enforces it too).
  useEffect(() => {
    if (waiting && !r.nudged_at && age >= RING && !nudged.current) {
      nudged.current = true;
      onNudge(r.id);
    }
  }, [waiting, r.nudged_at, r.id, age, onNudge]);

  if (r.resolved_at && now - Date.parse(r.resolved_at) > DONE_FOR) return null;
  const bill = r.kind === "bill";
  const text = r.resolved_at
    ? t("reqDone")
    : r.acknowledged_at
      ? r.ack_name
        ? t(bill ? "reqBillComing" : "reqComing").replace("{n}", r.ack_name)
        : t(bill ? "billComing" : "reqComingAnon")
      : r.nudged_at || age >= RING
        ? t("reqNudged")
        : t(bill ? "reqBillSending" : "reqSending");
  const progress = Math.min(1, age / RING);
  return (
    <p className={cn("flex min-h-12 items-center gap-3 rounded-md px-4 py-3 text-[15px] transition-opacity duration-base", r.resolved_at ? "bg-muted text-text-2" : "bg-ochre/15")}>
      {waiting && !r.nudged_at && age < RING ? (
        <svg viewBox="0 0 20 20" aria-hidden className="size-5 shrink-0 -rotate-90 motion-reduce:hidden">
          <circle cx="10" cy="10" r="8" fill="none" strokeWidth="2.5" className="stroke-border" />
          <circle cx="10" cy="10" r="8" fill="none" strokeWidth="2.5" strokeLinecap="round" pathLength={1} strokeDasharray={`${progress} 1`} className="stroke-foreground" />
        </svg>
      ) : r.acknowledged_at || r.resolved_at ? (
        <Check aria-hidden className="size-5 shrink-0" />
      ) : (
        <Bell aria-hidden className="size-5 shrink-0" />
      )}
      <span className="min-w-0 flex-1">{text}</span>
    </p>
  );
}
