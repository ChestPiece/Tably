"use client";
import { StatusTag } from "@/components/app/status-badge";
import { tableLabel } from "@/lib/format";
import { useLang, type Key } from "@/lib/i18n";
import { useVenue } from "@/lib/venue";
import type { Order } from "@/lib/types";
import { cn } from "@/lib/utils";

const th = "border-b pe-5 pb-3 text-start text-sm font-medium whitespace-nowrap text-muted-foreground first:ps-3 last:pe-3";
const td = "border-b py-2.5 pe-5 align-middle first:ps-3 last:pe-3";
// Guest, items and placed drop out below 900px.
const opt = "max-[900px]:hidden";

/** `onOpen`: rows become buttons that open the order (owner Orders page). */
export function OrdersTable({ orders, empty = "noOrders", onOpen, selected }: { orders: Order[]; empty?: Key; onOpen?: (id: string) => void; selected?: string | null }) {
  const { lang, t } = useLang();
  const { money, tz } = useVenue();
  if (!orders.length) return <p className="py-12 text-center text-sm text-text-2">{t(empty)}</p>;
  const clock = new Intl.DateTimeFormat(lang === "ar" ? "ar-AE-u-nu-latn" : "en-AE", { hour: "numeric", minute: "2-digit", timeZone: tz });
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
            <tr key={o.id} className={onOpen ? cn("relative hover:bg-muted/60", selected === o.id && "bg-muted") : undefined}>
              <td className={td}>
                {onOpen ? (
                  <button
                    type="button"
                    aria-current={selected === o.id || undefined}
                    onClick={() => onOpen(o.id)}
                    className="font-display text-lg leading-none font-semibold outline-none after:absolute after:inset-0 after:content-[''] focus-visible:after:ring-2 focus-visible:after:ring-ring focus-visible:after:ring-inset"
                  >
                    {tableLabel(lang, o.table_number)}
                    <span className="sr-only"> · {t("orderNo")} {o.number}</span>
                  </button>
                ) : (
                  <span className="font-display text-lg leading-none font-semibold">{tableLabel(lang, o.table_number)}</span>
                )}
              </td>
              <td className={`${td} ${opt} max-w-40 truncate`}>{o.guest_name ?? `${t("guest")} ${o.guest_seq}`}</td>
              <td className={td}>
                <StatusTag status={o.status} />
              </td>
              <td className={`${td} ${opt} text-end tabular-nums`}>{o.order_lines.reduce((n, l) => n + l.quantity, 0)}</td>
              <td className={`${td} ${opt} whitespace-nowrap tabular-nums`}>{clock.format(new Date(o.created_at))}</td>
              <td className={`${td} text-end whitespace-nowrap tabular-nums`}>{money(o.total_fils)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
