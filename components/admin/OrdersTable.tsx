"use client";
import { StatusTag } from "@/components/app/status-badge";
import { formatMoney, tableLabel } from "@/lib/format";
import { useLang } from "@/lib/i18n";
import { VENUE_TZ } from "@/lib/stats";
import type { Order } from "@/lib/types";

const th = "border-b pe-5 pb-3 text-start text-sm font-medium whitespace-nowrap text-muted-foreground last:pe-0";
const td = "border-b py-3 pe-5 align-middle last:pe-0";
// Guest, items and placed drop out below 900px.
const opt = "max-[900px]:hidden";

export function OrdersTable({ orders }: { orders: Order[] }) {
  const { lang, t } = useLang();
  if (!orders.length) return <p className="py-12 text-center text-text-2">{t("noOrders")}</p>;
  const clock = new Intl.DateTimeFormat(lang === "ar" ? "ar-AE-u-nu-latn" : "en-AE", { hour: "numeric", minute: "2-digit", timeZone: VENUE_TZ });
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr>
            <th className={th}>{t("table")}</th>
            <th className={`${th} ${opt}`}>{t("guest")}</th>
            <th className={th}>{t("colStatus")}</th>
            <th className={`${th} ${opt} text-end`}>{t("colItems")}</th>
            <th className={`${th} ${opt}`}>{t("colPlaced")}</th>
            <th className={`${th} text-end`}>{t("colTotal")}</th>
          </tr>
        </thead>
        <tbody>
          {orders.map((o) => (
            <tr key={o.id}>
              <td className={td}>
                <span className="font-display text-lg leading-none font-semibold">{tableLabel(lang, o.table_number)}</span>
              </td>
              <td className={`${td} ${opt} max-w-40 truncate`}>{o.guest_name ?? `${t("guest")} ${o.guest_seq}`}</td>
              <td className={td}>
                <StatusTag status={o.status} />
              </td>
              <td className={`${td} ${opt} text-end tabular-nums`}>{o.order_lines.reduce((n, l) => n + l.quantity, 0)}</td>
              <td className={`${td} ${opt} tabular-nums`}>{clock.format(new Date(o.created_at))}</td>
              <td className={`${td} text-end whitespace-nowrap tabular-nums`}>{formatMoney(o.total_fils, lang)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
