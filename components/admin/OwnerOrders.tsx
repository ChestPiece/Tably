"use client";
import { useState } from "react";
import { Undo2, X } from "lucide-react";
import { ResponsiveSheet } from "@/components/app/responsive-sheet";
import { CancelOrderDialog } from "@/components/staff/CancelOrderDialog";
import { Button } from "@/components/ui/button";
import { StatusTag } from "@/components/app/status-badge";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { tableLabel } from "@/lib/format";
import { useLang, type Key } from "@/lib/i18n";
import { pick, type Order } from "@/lib/types";
import { lineExtras } from "@/lib/menu";
import { useVenue } from "@/lib/venue";
import type { AdminProps } from "./AdminApp";
import { OrdersTable } from "./OrdersTable";

export type OrderFilter = "all" | "kitchen" | "served" | "cancelled";

const FILTERS: [OrderFilter, Key][] = [
  ["all", "fAll"],
  ["kitchen", "fKitchen"],
  ["served", "fServed"],
  ["cancelled", "fCancelled"],
];

const KITCHEN = ["received", "preparing", "ready"];
const match = (f: OrderFilter, o: Order) =>
  f === "all" || (f === "kitchen" ? KITCHEN.includes(o.status) : o.status === f);

type Props = Pick<AdminProps, "sb" | "mutate"> & { orders: Order[]; filter: OrderFilter; onFilter: (f: OrderFilter) => void; selected: string | null; onSelect: (id: string | null) => void };

export function OwnerOrders({ sb, mutate, orders, filter, onFilter, selected, onSelect }: Props) {
  const { lang, t } = useLang();
  const open = orders.find((o) => o.id === selected) ?? null;
  const [cancelling, setCancelling] = useState<Order | null>(null);
  const [busy, setBusy] = useState(false);
  const undo = async (o: Order) => {
    setBusy(true);
    await mutate(() => sb.rpc("revert_order", { p_order: o.id, p_from: o.status }));
    setBusy(false);
  };
  return (
    <>
      <ToggleGroup
        type="single"
        variant="segmented"
        value={filter}
        onValueChange={(v) => v && onFilter(v as OrderFilter)}
        aria-label={t("navOrders")}
        className="mb-6 max-w-full overflow-x-auto scroll-cue max-sm:grid max-sm:w-full max-sm:grid-cols-2 max-sm:[mask-image:none]"
      >
        {FILTERS.map(([id, label]) => (
          <ToggleGroupItem key={id} value={id} className="h-9 px-4 whitespace-nowrap">
            {t(label)}
            <span className="ms-1.5 text-muted-foreground tabular-nums">{orders.filter((o) => match(id, o)).length}</span>
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
      <OrdersTable orders={orders.filter((o) => match(filter, o))} onOpen={(id) => onSelect(id === selected ? null : id)} selected={selected} />
      <ResponsiveSheet
        open={!!open}
        onOpenChange={(o) => !o && onSelect(null)}
        title={open ? `${tableLabel(lang, open.table_number)} · ${t("orderNo")} ${open.number}` : ""}
        full
        rail
      >
        {open && <OrderDetail o={open} busy={busy} onUndo={() => undo(open)} onCancel={() => setCancelling(open)} />}
      </ResponsiveSheet>
      <CancelOrderDialog
        key={cancelling?.id}
        order={cancelling}
        lang={lang}
        onClose={() => setCancelling(null)}
        onConfirm={async (o, reason) => {
          const ok = await mutate(() => sb.rpc("cancel_order", { p_order: o.id, p_reason: reason }));
          if (ok) setCancelling(null);
          return ok;
        }}
      />
    </>
  );
}

export const ORDER_FILTERS = FILTERS.map(([id]) => id);

const STEPS = [
  ["received", "created_at"],
  ["preparing", "preparing_at"],
  ["ready", "ready_at"],
  ["served", "served_at"],
  ["cancelled", "cancelled_at"],
] as const;

// The step stamp each status was reached at; undo is allowed for 2 minutes after it (server enforces, incl. "not after payment").
const STAMP = { preparing: "preparing_at", ready: "ready_at", served: "served_at" } as const;
const canUndo = (o: Order) => {
  const k = STAMP[o.status as keyof typeof STAMP];
  return !!k && !!o[k] && Date.now() - Date.parse(o[k]!) < 120e3;
};

function OrderDetail({ o, busy, onUndo, onCancel }: { o: Order; busy: boolean; onUndo: () => void; onCancel: () => void }) {
  const { lang, t } = useLang();
  const { money, tz } = useVenue();
  const clock = new Intl.DateTimeFormat(lang === "ar" ? "ar-AE-u-nu-latn" : "en-AE", { hour: "numeric", minute: "2-digit", timeZone: tz });
  const lines = [...o.order_lines].sort((a, b) => a.position - b.position);
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-3">
        <StatusTag status={o.status} />
        <span className="truncate text-sm text-muted-foreground">{o.guest_name ?? `${t("guest")} ${o.guest_seq}`}</span>
      </div>

      <ul className="border-t text-[15px]">
        {lines.map((l) => (
          <li key={l.id} className="flex items-baseline gap-3 border-b py-2.5">
            <span className="w-6 shrink-0 text-muted-foreground tabular-nums">{l.quantity}×</span>
            <span className="min-w-0 flex-1">
              <span className="block">{pick(lang, l.name, l.name_ar)}</span>
              {lineExtras(lang, l) && <span className="block text-sm text-muted-foreground">{lineExtras(lang, l)}</span>}
            </span>
            <span className="whitespace-nowrap tabular-nums">{money(l.unit_price_fils * l.quantity)}</span>
          </li>
        ))}
        <li className="flex items-baseline justify-between py-3 font-semibold">
          {t("total")}
          <span className="tabular-nums">{money(o.total_fils)}</span>
        </li>
      </ul>

      {o.note && (
        <p className="rounded-md bg-muted px-3 py-2 text-sm">
          <b className="font-medium">{t("notePrefix")}:</b> {o.note}
        </p>
      )}
      {o.cancel_reason && <p className="text-sm text-destructive">{o.cancel_reason}</p>}

      <ol className="flex flex-col gap-2 text-sm">
        {STEPS.filter(([, k]) => o[k]).map(([s, k]) => (
          <li key={s} className="flex justify-between gap-3">
            <span className="text-muted-foreground">{t(`st_${s}`)}</span>
            <span className="tabular-nums">{clock.format(new Date(o[k]!))}</span>
          </li>
        ))}
      </ol>

      {(canUndo(o) || KITCHEN.includes(o.status)) && (
        <div className="flex flex-col gap-2 border-t pt-4">
          {canUndo(o) && (
            <>
              <Button variant="secondary" size="sm" disabled={busy} onClick={onUndo}>
                <Undo2 aria-hidden />
                {t("undoStep")}
              </Button>
              <p className="text-xs text-muted-foreground">{t("undoStepHint")}</p>
            </>
          )}
          {KITCHEN.includes(o.status) && (
            <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={onCancel}>
              <X aria-hidden />
              {t("cancelOrder")}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
