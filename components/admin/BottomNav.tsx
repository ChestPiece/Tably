"use client";
import { Ellipsis } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useLang } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { OWNER_PAGES, useOwnerActions, type OwnerPage } from "./AdminSidebar";

const TABS: OwnerPage[] = ["home", "board", "orders", "menu"];
const tab = "relative flex min-h-14 flex-1 flex-col items-center justify-center gap-1 text-xs font-medium transition-colors duration-fast [&_svg]:size-5";
const row = "flex h-12 w-full items-center gap-3 rounded-lg px-3 text-start text-[15px] hover:bg-muted [&_svg]:size-5 [&_svg]:shrink-0 [&_svg]:text-muted-foreground";

/** Phone and tablet owner nav (below lg, where the sidebar would be a sheet). */
export function BottomNav({ page, onPage, liveCount }: { page: OwnerPage; onPage: (p: OwnerPage) => void; liveCount: number }) {
  const { t } = useLang();
  const actions = useOwnerActions();
  const [more, setMore] = useState(false);
  const rest = OWNER_PAGES.filter((p) => !TABS.includes(p.id));
  const inMore = rest.some((p) => p.id === page);

  return (
    <>
      <nav aria-label={t("adminSections")} className="fixed inset-x-0 bottom-0 z-30 border-t bg-card pb-[env(safe-area-inset-bottom)] lg:hidden">
        <ul className="mx-auto flex max-w-xl px-1">
          {TABS.map((id) => {
            const p = OWNER_PAGES.find((x) => x.id === id)!;
            const on = page === id;
            return (
              <li key={id} className="flex flex-1">
                <button type="button" aria-current={on ? "page" : undefined} onClick={() => onPage(id)} className={cn(tab, on ? "text-primary" : "text-muted-foreground")}>
                  <span className={cn("grid h-7 w-12 place-items-center rounded-full transition-colors duration-fast", on && "bg-primary text-primary-foreground")}>
                    <p.icon aria-hidden />
                  </span>
                  {t(p.label)}
                  {id === "board" && liveCount > 0 && (
                    <span className="absolute top-1.5 start-[calc(50%+10px)] min-w-5 rounded-full bg-ochre px-1.5 text-[11px] leading-5 font-semibold text-brand tabular-nums">
                      <span className="sr-only">{t("liveOrders")}: </span>
                      {liveCount}
                    </span>
                  )}
                </button>
              </li>
            );
          })}
          <li className="flex flex-1">
            <button type="button" aria-expanded={more} aria-current={inMore ? "page" : undefined} onClick={() => setMore(true)} className={cn(tab, inMore ? "text-primary" : "text-muted-foreground")}>
              <span className={cn("grid h-7 w-12 place-items-center rounded-full", inMore && "bg-primary text-primary-foreground")}>
                <Ellipsis aria-hidden />
              </span>
              {t("navMore")}
            </button>
          </li>
        </ul>
      </nav>

      <Sheet open={more} onOpenChange={setMore}>
        <SheetContent side="bottom" className="rounded-t-2xl bg-card px-3 pt-3 pb-[max(16px,env(safe-area-inset-bottom))]">
          <SheetHeader className="px-3 pb-0">
            <SheetTitle>{t("navMore")}</SheetTitle>
            <SheetDescription className="sr-only">{t("adminSections")}</SheetDescription>
          </SheetHeader>
          <ul className="flex flex-col">
            {rest.map((p) => (
              <li key={p.id}>
                <button
                  type="button"
                  aria-current={page === p.id ? "page" : undefined}
                  onClick={() => {
                    onPage(p.id);
                    setMore(false);
                  }}
                  className={cn(row, page === p.id && "bg-muted font-medium")}
                >
                  <p.icon aria-hidden />
                  {t(p.label)}
                </button>
              </li>
            ))}
          </ul>
          <ul className="flex flex-col border-t pt-2">
            {actions.map((a) => (
              <li key={a.id}>
                {a.href ? (
                  <Link href={a.href} className={row}>
                    {a.icon}
                    {a.label}
                  </Link>
                ) : (
                  <button type="button" lang={a.lang} onClick={a.onClick} className={row}>
                    {a.icon}
                    {a.label}
                  </button>
                )}
              </li>
            ))}
          </ul>
        </SheetContent>
      </Sheet>
    </>
  );
}
