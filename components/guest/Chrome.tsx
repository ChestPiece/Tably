"use client";
import { ReceiptText } from "lucide-react";
import { useLang } from "@/lib/i18n";
import { pick, type Restaurant } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useVenue } from "@/lib/venue";

export function LangButton({ className = "" }: { className?: string }) {
  const { lang, t, toggle } = useLang();
  const { secondLang } = useVenue();
  if (!secondLang) return null;
  return (
    <Button variant="ghost" size="sm" onClick={toggle} className={cn("px-3", className)}>
      <span lang={lang === "ar" ? "en" : "ar"}>{t("switchLang")}</span>
    </Button>
  );
}

/** Sticky guest bar: venue, table, receipt (tracker) or back-to-menu. Fixed 64px so the category tabs can stick under it. */
export function GuestHeader({
  restaurant,
  tableNumber,
  online,
  view,
  hasOrders,
  onView,
}: {
  restaurant: Restaurant;
  tableNumber: number;
  online: boolean;
  view: "menu" | "table";
  hasOrders: boolean;
  onView: (v: "menu" | "table") => void;
}) {
  const { lang, t } = useLang();
  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 bg-background px-5">
      <span className="min-w-0 flex-1 truncate font-display text-[22px] leading-[1.15] font-semibold">{pick(lang, restaurant.name, restaurant.name_ar)}</span>
      {online ? (
        <span className="text-sm whitespace-nowrap text-text-2">
          {t("table")} {tableNumber}
        </span>
      ) : (
        <span role="status" className="text-sm whitespace-nowrap text-text-2">
          {t("offline")}
        </span>
      )}
      <LangButton className="text-text-2" />
      {view === "menu" && hasOrders && (
        <Button variant="ghost" size="icon" aria-label={t("yourTable")} onClick={() => onView("table")} className="-me-2 text-text-2">
          <ReceiptText aria-hidden />
        </Button>
      )}
    </header>
  );
}

/** Sticky "View order · 3 items" bar, shown once the cart has something. */
export function CartBar({ count, total, onOpen }: { count: number; total: number; onOpen: () => void }) {
  const { t } = useLang();
  const { money } = useVenue();
  if (!count) return null;
  return (
    <div className="sticky bottom-0 z-20 border-t bg-background px-4 pt-3 pb-[max(16px,env(safe-area-inset-bottom))]">
      <Button onClick={onOpen} className="h-14 w-full justify-between px-5">
        <span className="truncate">
          {t("viewOrder")} · {count} {count === 1 ? t("item1") : t("items")}
        </span>
        <span className="tabular-nums">{money(total)}</span>
      </Button>
    </div>
  );
}
