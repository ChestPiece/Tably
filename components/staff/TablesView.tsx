"use client";
import { Banknote, CreditCard, Users } from "lucide-react";
import type { ReactNode } from "react";
import { ConfirmAction } from "@/components/app/confirm-action";
import { EmptyState } from "@/components/app/empty-state";
import { Button } from "@/components/ui/button";
import { formatAge, plural, tableLabel } from "@/lib/format";
import { useVenue } from "@/lib/venue";
import { useLang } from "@/lib/i18n";
import type { Order, Visit } from "@/lib/types";

const LIVE = ["received", "preparing", "ready"];
const fill = (s: string, vars: Record<string, string | number>) => s.replace(/\{(\w+)\}/g, (_, k) => String(vars[k]));

type Props = {
  visits: Visit[];
  orders: Order[];
  now: number;
  busyId: string;
  onPay: (v: Visit, method: "cash" | "card") => Promise<unknown>;
  onClose: (v: Visit) => Promise<unknown>;
};

export function TablesView({ visits, orders, now, busyId, onPay, onClose }: Props) {
  const { lang, t } = useLang();
  const venue = useVenue();
  const guests = (n: number) =>
    plural(lang, n, { one: lang === "ar" ? "ضيف" : "# guest", two: "ضيفان", few: "# ضيوف", many: "# ضيفاً", other: lang === "ar" ? "# ضيف" : "# guests" });
  const ords = (n: number) =>
    plural(lang, n, { one: lang === "ar" ? "طلب" : "# order", two: "طلبان", few: "# طلبات", many: "# طلباً", other: lang === "ar" ? "# طلب" : "# orders" });

  if (visits.length === 0) return <EmptyState icon={Users} title={t("tablesEmptyTitle")} body={t("tablesEmptyBody")} />;

  return (
    <div className="w-full p-5">
      <ul className="grid gap-4 [grid-template-columns:repeat(auto-fill,minmax(min(260px,100%),1fr))]">
        {visits.map((v) => {
          const vo = orders.filter((o) => o.visit_id === v.id);
          const kitchen = vo.some((o) => LIVE.includes(o.status));
          const total = vo.filter((o) => o.status !== "cancelled").reduce((n, o) => n + o.total_fils, 0);
          const busy = busyId === v.id;
          const unpaid = total > 0 && !v.paid_at;
          const reason = kitchen ? t("reasonKitchen") : unpaid ? t("reasonUnpaid") : "";
          const money = venue.money(total);
          const pay = (m: "cash" | "card", label: string, icon: ReactNode) => (
            <ConfirmAction
              title={fill(t("payTitle"), { m: label })}
              description={fill(t("payBody"), { n: v.table_number, a: money })}
              confirmLabel={t("confirm")}
              cancelLabel={t("cancel")}
              onConfirm={async () => void (await onPay(v, m))}
              trigger={
                <Button variant="secondary" disabled={kitchen || busy}>
                  {icon}
                  {label}
                </Button>
              }
            />
          );
          const tag = v.paid_at
            ? { c: "var(--status-ready)", label: fill(t("paidVia"), { m: v.payment_method === "card" ? t("card") : t("cash") }) }
            : v.bill_requested_at
              ? { c: "var(--ochre)", label: t("billAsked") }
              : { c: "var(--primary)", label: t("seated") };
          return (
            <li key={v.id} className="flex flex-col gap-2 rounded-lg border bg-card p-5">
              <div className="flex items-baseline justify-between gap-2">
                <h2 className="font-display text-[40px] leading-[0.9] font-semibold">
                  <span className="sr-only">{t("table")} </span>
                  {tableLabel(lang, v.table_number)}
                </h2>
                <span className="inline-flex items-center gap-2 text-sm whitespace-nowrap">
                  <span aria-hidden className="size-2 rounded-[2px]" style={{ background: tag.c }} />
                  {tag.label}
                </span>
              </div>
              <p className="text-sm text-text-2">
                {guests(v.guest_count)} · {ords(vo.length)} · <bdi dir="ltr">{formatAge(now - new Date(v.opened_at).getTime(), lang)}</bdi>
              </p>
              <p className="mt-2 text-[26px] leading-[1.2] font-medium tabular-nums">{money}</p>
              {kitchen && <p className="text-sm text-status-cooking">{t("reasonKitchen")}</p>}
              {!kitchen && unpaid && <p className="text-sm text-text-2">{t("reasonUnpaid")}</p>}
              <div className="mt-auto grid grid-cols-2 gap-2 pt-4">
                {unpaid && (
                  <>
                    {pay("cash", t("cash"), <Banknote aria-hidden />)}
                    {pay("card", t("card"), <CreditCard aria-hidden />)}
                  </>
                )}
                {reason || busy ? (
                  <Button className="col-span-2" disabled>
                    {t("closeTable")}
                  </Button>
                ) : (
                  <ConfirmAction
                    title={fill(t("closeTitle"), { n: v.table_number })}
                    description={t("closeBody")}
                    confirmLabel={t("closeTable")}
                    cancelLabel={t("cancel")}
                    onConfirm={async () => void (await onClose(v))}
                    trigger={<Button className="col-span-2">{t("closeTable")}</Button>}
                  />
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
