"use client";
import { useState } from "react";
import { ArrowLeft, Bell, Check, ReceiptText } from "lucide-react";
import { useLang, type Key } from "@/lib/i18n";
import { formatMoney } from "@/lib/format";
import { VENUE_TZ } from "@/lib/stats";
import { pick, type Lang, type MenuItem, type Order, type OrderLine, type ServiceRequest, type Visit } from "@/lib/types";
import { Arch } from "@/components/app/arch";
import { StatusTag } from "@/components/app/status-badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Me } from "./GuestApp";

const STEPS = ["received", "preparing", "ready", "served"] as const;
const HEAD: Record<Order["status"], Key> = { received: "hReceived", preparing: "hPreparing", ready: "hReady", served: "hServed", cancelled: "hCancelled" };

const clock = (iso: string | null, lang: Lang) =>
  iso ? new Intl.DateTimeFormat(lang === "ar" ? "ar-AE-u-nu-latn" : "en-AE", { hour: "numeric", minute: "2-digit", timeZone: VENUE_TZ }).format(new Date(iso)) : "";

export function TableView({
  me,
  visit,
  orders,
  menu,
  requests,
  serviceMode,
  busy,
  onRequest,
  onOrderMore,
}: {
  me: Me | null;
  visit: Visit | null;
  orders: Order[];
  menu: MenuItem[];
  requests: ServiceRequest[];
  serviceMode: "table" | "counter";
  busy: boolean;
  onRequest: (k: "waiter" | "bill") => void;
  onOrderMore: () => void;
}) {
  const { lang, t } = useLang();
  const [billView, setBillView] = useState(false);
  const waiter = requests.some((r) => r.kind === "waiter");
  const billAsked = requests.some((r) => r.kind === "bill") || !!visit?.bill_requested_at;
  const live = orders.filter((o) => o.status !== "cancelled");
  const total = live.reduce((n, o) => n + o.total_fils, 0);
  const newest = [...orders].reverse();
  const focus = newest.find((o) => o.guest_id === me?.guest_id) ?? newest[0];

  if (billView)
    return (
      <div className="flex flex-1 flex-col gap-2 p-6">
        <h2 className="font-display text-[28px] leading-[1.15] font-semibold">{t("yourBill")}</h2>
        <Lines lines={live.flatMap((o) => o.order_lines)} menu={menu} className="my-5" />
        <Total label={t("tableTotal")} fils={total} />
        <p className="rounded-md bg-muted p-4 text-[15px]">{visit?.paid_at ? t("paidNote") : t("billNote")}</p>
        <div className="mt-auto pt-4">
          <Button variant="secondary" className="w-full" onClick={() => setBillView(false)}>
            <ArrowLeft className="rtl:rotate-180" aria-hidden />
            {t("back")}
          </Button>
        </div>
      </div>
    );

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
            {t("orderNo")} {focus.number} · {t("sentAt")} {clock(focus.created_at, lang)}
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
                    <time className="text-sm text-muted-foreground tabular-nums">{state !== "wait" ? clock(times[i], lang) : ""}</time>
                  </li>
                );
              })}
            </ol>
          )}

          {newest.map((o) => (
            <section key={o.id} className="border-t py-4">
              <h3 className="mb-3 flex justify-between gap-2 text-sm font-medium text-text-2">
                <span className="truncate">
                  {clock(o.created_at, lang)}
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

      <div className="mt-auto grid grid-cols-2 gap-3 pt-4">
        <Button className="col-span-2" onClick={onOrderMore}>
          {t("orderMore")}
        </Button>
        <Button variant="secondary" className="min-w-0 px-2" disabled={busy || waiter} onClick={() => onRequest("waiter")}>
          <Bell aria-hidden />
          <span className="truncate">{t(waiter ? "waiterComing" : "callWaiter")}</span>
        </Button>
        <Button
          variant="secondary"
          className="min-w-0 px-2"
          disabled={!orders.length || (busy && !billAsked)}
          onClick={() => {
            if (!billAsked && !visit?.paid_at) onRequest("bill");
            setBillView(true);
          }}
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
  return (
    <ul className={cn("grid gap-3", className)}>
      {lines.map((l) => {
        // Order lines snapshot names, not item ids: match the photo by name.
        const img = menu.find((m) => m.name === l.name)?.image_url;
        return (
          <li key={l.id} className="flex items-center gap-3 text-[15px]">
            {img ? <Arch src={img} alt="" width={32} height={38} /> : <span aria-hidden className="h-[38px] w-8 shrink-0 rounded-arch bg-muted" />}
            <span className="min-w-0">
              {l.quantity} × {pick(lang, l.name, l.name_ar)}
              {l.option_name && <small className="block text-sm text-text-2">{pick(lang, l.option_name, l.option_name_ar)}</small>}
            </span>
            <span className="ms-auto whitespace-nowrap text-text-2 tabular-nums">{formatMoney(l.unit_price_fils * l.quantity, lang)}</span>
          </li>
        );
      })}
    </ul>
  );
}

function Total({ label, fils }: { label: string; fils: number }) {
  const { lang } = useLang();
  return (
    <div className="flex justify-between border-t py-4 font-semibold">
      <span>{label}</span>
      <span className="tabular-nums">{formatMoney(fils, lang)}</span>
    </div>
  );
}
