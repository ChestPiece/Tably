"use client";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useLang, type Key } from "@/lib/i18n";
import type { Order } from "@/lib/types";
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

export function OwnerOrders({ orders, filter, onFilter }: { orders: Order[]; filter: OrderFilter; onFilter: (f: OrderFilter) => void }) {
  const { t } = useLang();
  return (
    <>
      <ToggleGroup
        type="single"
        variant="segmented"
        value={filter}
        onValueChange={(v) => v && onFilter(v as OrderFilter)}
        aria-label={t("navOrders")}
        className="mb-6 max-w-full overflow-x-auto"
      >
        {FILTERS.map(([id, label]) => (
          <ToggleGroupItem key={id} value={id} className="h-9 px-4 whitespace-nowrap">
            {t(label)}
            <span className="ms-1.5 text-muted-foreground tabular-nums">{orders.filter((o) => match(id, o)).length}</span>
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
      <OrdersTable orders={orders.filter((o) => match(filter, o))} />
    </>
  );
}

export const ORDER_FILTERS = FILTERS.map(([id]) => id);
