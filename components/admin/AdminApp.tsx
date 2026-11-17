"use client";
import { Plus, Printer } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { BrandMark } from "@/components/brand";
import { StaffBoard } from "@/components/staff/StaffBoard";
import { Button } from "@/components/ui/button";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { Switch } from "@/components/ui/switch";
import { errorText, useLang } from "@/lib/i18n";
import { VENUE_TZ } from "@/lib/stats";
import { staffClient } from "@/lib/supabase/browser";
import { pick, type Category, type MenuItem, type Restaurant, type TableRow } from "@/lib/types";
import { AdminSidebar, OWNER_PAGES, type OwnerPage } from "./AdminSidebar";
import { BottomNav } from "./BottomNav";
import { MenuAdmin, blankItem } from "./MenuAdmin";
import { OwnerHome, PANEL, type TodayData } from "./OwnerHome";
import { ORDER_FILTERS, OwnerOrders, type OrderFilter } from "./OwnerOrders";
import { SettingsForm } from "./SettingsForm";
import { TablesAdmin, newSlug } from "./TablesAdmin";
import { TeamAdmin, type Invite, type Member } from "./TeamAdmin";
import { useLiveRefresh } from "./use-live-refresh";

export function AdminApp(props: {
  me: string;
  email: string;
  sidebarOpen: boolean;
  restaurant: Restaurant;
  categories: Category[];
  menu: MenuItem[];
  tables: TableRow[];
  team: Member[];
  invites: Invite[];
  today: TodayData;
}) {
  const sb = useMemo(() => staffClient(), []);
  const router = useRouter();
  const path = usePathname();
  const params = useSearchParams();
  const { lang, t } = useLang();
  const [editing, setEditing] = useState<MenuItem | null>(null);
  const [pausing, setPausing] = useState(false);
  const [adding, setAdding] = useState(false);
  useLiveRefresh(props.restaurant.id);

  const raw = params.get("page");
  const page: OwnerPage = OWNER_PAGES.some((p) => p.id === raw) ? (raw as OwnerPage) : "home";
  const rawFilter = params.get("filter");
  const filter: OrderFilter = ORDER_FILTERS.includes(rawFilter as OrderFilter) ? (rawFilter as OrderFilter) : "all";
  const go = (next: Record<string, string | null>) => {
    const q = new URLSearchParams(params);
    for (const [k, v] of Object.entries(next)) {
      if (v === null) q.delete(k);
      else q.set(k, v);
    }
    router.replace(`${path}?${q}`, { scroll: false });
  };
  const setPage = (p: OwnerPage) => go({ page: p === "home" ? null : p, filter: null });

  // Run a mutation: throws the DB error, toasts success, refreshes server data.
  const run: Run = async (fn, ok) => {
    const { error } = await fn();
    if (error) throw error;
    if (ok) toast.success(ok);
    router.refresh();
  };
  // Same, but toasts the error itself. Returns whether it worked.
  const mutate: Mutate = async (fn, ok) => {
    try {
      await run(fn, ok);
      return true;
    } catch (e) {
      toast.error(errorText(lang, e));
      return false;
    }
  };
  const common = { sb, mutate, run };
  const r = props.restaurant;
  const venue = pick(lang, r.name, r.name_ar);
  const meName = props.team.find((m) => m.user_id === props.me)?.display_name ?? t("roleOwner");
  const live = props.today.orders.filter((o) => ["received", "preparing", "ready"].includes(o.status)).length;

  async function setTaking(on: boolean) {
    setPausing(true);
    await mutate(() => sb.from("restaurants").update({ ordering_paused: !on }).eq("id", r.id));
    setPausing(false);
  }

  const nextTable = Math.max(0, ...props.tables.map((x) => x.number)) + 1;
  async function addTable() {
    setAdding(true);
    await mutate(() => sb.from("tables").insert({ restaurant_id: r.id, number: nextTable, qr_slug: newSlug() }), t("tableAdded"));
    setAdding(false);
  }

  const date = new Intl.DateTimeFormat(lang === "ar" ? "ar-AE-u-nu-latn" : "en-GB", { weekday: "long", day: "numeric", month: "long", timeZone: VENUE_TZ }).format(new Date());
  const head: Record<OwnerPage, { sub?: string; acts?: ReactNode }> = {
    home: {
      sub: date,
      acts: (
        <>
          <Switch label={t("taking")} checked={!r.ordering_paused} disabled={pausing} onCheckedChange={setTaking} />
          <Button variant="secondary" size="sm" onClick={() => setPage("tables")}>
            <Printer aria-hidden />
            {t("printCards")}
          </Button>
        </>
      ),
    },
    board: { sub: t("boardSub") },
    orders: { sub: t("ordersSub") },
    menu: {
      sub: `${props.menu.length} ${t("dishes")}`,
      acts: (
        <Button size="sm" disabled={!props.categories.length} onClick={() => setEditing(blankItem(r.id, props.categories, props.menu))}>
          <Plus aria-hidden />
          {t("addDish")}
        </Button>
      ),
    },
    tables: {
      sub: t("tablesDesc"),
      acts: (
        <>
          <Button variant="secondary" size="sm" asChild>
            <Link href="/admin/qr" target="_blank">
              <Printer aria-hidden />
              {t("printCards")}
            </Link>
          </Button>
          <Button size="sm" disabled={adding} onClick={addTable}>
            <Plus aria-hidden />
            {t("addTableN").replace("{n}", String(nextTable))}
          </Button>
        </>
      ),
    },
    team: { sub: t("teamMembersDesc") },
    settings: { sub: t("settingsDesc") },
  };
  const title = t(OWNER_PAGES.find((p) => p.id === page)!.label);

  return (
    <SidebarProvider defaultOpen={props.sidebarOpen} style={{ "--sidebar-width": "248px", "--sidebar": "var(--card)" } as React.CSSProperties}>
      <AdminSidebar page={page} onPage={setPage} venue={venue} me={meName} liveCount={live} />
      <SidebarInset className="min-w-0 bg-secondary dark:bg-background">
        <main className="mx-auto w-full max-w-[1320px] px-8 pt-8 pb-12 max-lg:pb-32 max-[900px]:px-4 max-[900px]:pt-5">
          <div className="mb-5 flex items-center gap-2.5 lg:hidden">
            <BrandMark className="size-6 text-primary" />
            <span className="truncate font-semibold">{venue}</span>
          </div>
          <header className="mb-6 flex flex-wrap items-end gap-x-6 gap-y-4">
            <div className="flex min-w-0 items-start gap-2">
              <SidebarTrigger className="-ms-2 size-8 text-muted-foreground max-lg:hidden" />
              <div className="min-w-0">
                <h1 className="text-[28px] leading-[1.15] font-semibold">{title}</h1>
                {head[page].sub && <p className="mt-1 text-sm text-muted-foreground">{head[page].sub}</p>}
              </div>
            </div>
            {head[page].acts && <div className="ms-auto flex flex-wrap items-center gap-4 max-sm:ms-0 max-sm:w-full max-sm:[&>a]:flex-1 max-sm:[&>button]:flex-1">{head[page].acts}</div>}
          </header>
          {page === "home" && <OwnerHome today={props.today} menu={props.menu} tables={props.tables} onOrders={() => setPage("orders")} />}
          {page === "board" && (
            <div className="h-[calc(100dvh-12rem)] min-h-[480px] overflow-hidden rounded-2xl bg-card ring-1 ring-border max-lg:h-[calc(100dvh-17rem)]">
              <StaffBoard restaurant={r} role="owner" embedded />
            </div>
          )}
          {page !== "home" && page !== "board" && (
            <div className={PANEL}>
              {page === "orders" && <OwnerOrders orders={props.today.orders} filter={filter} onFilter={(f) => go({ filter: f === "all" ? null : f })} />}
              {page === "menu" && <MenuAdmin {...common} restaurant={r} categories={props.categories} menu={props.menu} editing={editing} onEdit={setEditing} />}
              {page === "tables" && <TablesAdmin {...common} restaurant={r} tables={props.tables} />}
              {page === "settings" && <SettingsForm {...common} restaurant={r} email={props.email} />}
              {page === "team" && <TeamAdmin {...common} me={props.me} rid={r.id} team={props.team} invites={props.invites} />}
            </div>
          )}
        </main>
        <BottomNav page={page} onPage={setPage} liveCount={live} />
      </SidebarInset>
    </SidebarProvider>
  );
}

type Op = () => PromiseLike<{ error: { message: string } | null }>;
type Mutate = (fn: Op, ok?: string) => Promise<boolean>;
type Run = (fn: Op, ok?: string) => Promise<void>;
export type AdminProps = { sb: ReturnType<typeof staffClient>; mutate: Mutate; run: Run };
