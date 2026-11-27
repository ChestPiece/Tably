"use client";
import dynamic from "next/dynamic";
import { cn } from "@/lib/utils";
import { ListPlus, Plus, Printer } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { BrandMark } from "@/components/brand";
import { RailProvider, RailSlot } from "@/components/app/responsive-sheet";
import { Button } from "@/components/ui/button";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { Switch } from "@/components/ui/switch";
import { errorText, useLang } from "@/lib/i18n";
import { useVenue } from "@/lib/venue";
import { staffClient } from "@/lib/supabase/browser";
import { pick, type Category, type MenuItem, type Restaurant, type TableRow } from "@/lib/types";
import { AdminSidebar, OWNER_PAGES, type OwnerPage } from "./AdminSidebar";
import { FeedbackPage } from "./FeedbackPage";
import { BottomNav } from "./BottomNav";
import { BulkDishes } from "./BulkDishes";
import { MenuAdmin, blankItem } from "./MenuAdmin";
import { GetLive } from "./GetLive";
import { OwnerHome, PANEL, type TodayData } from "./OwnerHome";
import { ORDER_FILTERS, OwnerOrders, type OrderFilter } from "./OwnerOrders";
import { SettingsForm } from "./SettingsForm";
import { TablesAdmin, newSlug } from "./TablesAdmin";
import { TeamAdmin, type Invite, type Member } from "./TeamAdmin";
import { useOwnerLive } from "./use-live-refresh";

// Pages behind navigation load on demand: the profit charts and the live board stay out of the first load.
const ProfitPage = dynamic(() => import("./ProfitPage").then((m) => m.ProfitPage));
const StaffBoard = dynamic(() => import("@/components/staff/StaffBoard").then((m) => m.StaffBoard));

export function AdminApp(props: {
  me: string;
  email: string;
  sidebarOpen: boolean;
  hasOrdered: boolean;
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
  const { tz } = useVenue();
  const [editing, setEditing] = useState<MenuItem | null>(null);
  const [bulk, setBulk] = useState(false);
  const [pausing, setPausing] = useState(false);
  const [adding, setAdding] = useState(false);
  const raw = params.get("page");
  const page: OwnerPage = OWNER_PAGES.some((p) => p.id === raw) ? (raw as OwnerPage) : "home";
  // The Live board page runs its own realtime feed; don't double it.
  const today = useOwnerLive(props.restaurant.id, props.today, page === "board");
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
  const setPage = (p: OwnerPage) => go({ page: p === "home" ? null : p, filter: null, sel: null });

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
  const meName = props.team.find((m) => m.user_id === props.me)?.display_name ?? props.email.split("@")[0];
  const live = today.orders.filter((o) => ["received", "preparing", "ready"].includes(o.status)).length;

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

  const date = new Intl.DateTimeFormat(lang === "ar" ? "ar-AE-u-nu-latn" : "en-GB", { weekday: "long", day: "numeric", month: "long", timeZone: tz }).format(new Date());
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
    profit: { sub: t("profitSub") },
    feedback: { sub: t("fbSub") },
    menu: {
      sub: `${props.menu.length} ${t(props.menu.length === 1 ? "dishOne" : "dishes")}`,
      acts: (
        <>
          <Button variant="secondary" size="sm" disabled={!props.categories.length} onClick={() => setBulk(true)}>
            <ListPlus aria-hidden />
            {t("addSeveral")}
          </Button>
          <Button size="sm" disabled={!props.categories.length} onClick={() => setEditing(blankItem(r.id, props.categories, props.menu))}>
            <Plus aria-hidden />
            {t("addDish")}
          </Button>
        </>
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
  const fit = page === "profit" || (page === "home" && props.menu.length > 0 && props.hasOrdered);
  const title = t(OWNER_PAGES.find((p) => p.id === page)!.label);

  return (
    <SidebarProvider defaultOpen={props.sidebarOpen} style={{ "--sidebar-width": "248px", "--sidebar": "var(--card)" } as React.CSSProperties}>
      <AdminSidebar page={page} onPage={setPage} venue={venue} me={meName} liveCount={live} />
      {/* Shell fits the viewport; only this inner area scrolls. */}
      <SidebarInset className="h-dvh min-w-0 flex-row overflow-hidden bg-secondary dark:bg-background">
        <RailProvider>
        <div className="flex min-w-0 flex-1 flex-col">
        <div className="relative min-h-0 flex-1 overflow-y-auto">
        {/* Home (once the first-run steps are done) and Profit fit the screen from 1280px; other pages flow and scroll here. */}
        <div className={cn("mx-auto w-full max-w-[1320px] px-8 pt-8 pb-12 max-lg:pb-32 max-[900px]:px-4 max-[900px]:pt-5", fit && "fit:flex fit:h-full fit:flex-col fit:pb-8", page === "board" && "flex h-full flex-col")}>
          <div className="mb-5 flex items-center gap-2.5 lg:hidden">
            <BrandMark className="size-6 text-primary" />
            <span className="truncate font-semibold">{venue}</span>
          </div>
          <header className="mb-6 flex shrink-0 flex-wrap items-end gap-x-6 gap-y-4">
            <div className="min-w-0">
              <h1 className="text-[28px] leading-[1.15] font-semibold">{title}</h1>
              {head[page].sub && <p className="mt-1 text-sm text-muted-foreground">{head[page].sub}</p>}
            </div>
            {head[page].acts && <div className="ms-auto flex flex-wrap items-center gap-4 max-sm:ms-0 max-sm:w-full max-sm:[&>a]:flex-1 max-sm:[&>button]:flex-1">{head[page].acts}</div>}
          </header>
          {page === "home" && (
            <>
              <GetLive dishes={props.menu.length > 0} ordered={props.hasOrdered} team={props.team.length > 1 || props.invites.length > 0} onMenu={() => setPage("menu")} onTeam={() => setPage("team")} />
              <OwnerHome sb={sb} today={today} menu={props.menu} tables={props.tables} onOrders={(sel) => go({ page: "orders", filter: null, sel: sel ?? null })} onProfit={() => setPage("profit")} />
            </>
          )}
          {page === "profit" && <ProfitPage sb={sb} onMenu={() => setPage("menu")} />}
          {page === "feedback" && <FeedbackPage sb={sb} />}
          {page === "board" && (
            <div className="min-h-[480px] flex-1 overflow-hidden rounded-2xl bg-card ring-1 ring-border short:min-h-[320px]">
              <StaffBoard restaurant={r} role="owner" embedded />
            </div>
          )}
          {page !== "home" && page !== "board" && page !== "profit" && page !== "feedback" && (
            <div className={`${PANEL} ${page === "team" ? "max-w-3xl" : page === "settings" ? "max-w-4xl" : ""}`}>
              {page === "orders" && <OwnerOrders {...common} orders={today.orders} filter={filter} onFilter={(f) => go({ filter: f === "all" ? null : f })} selected={params.get("sel")} onSelect={(id) => go({ sel: id })} />}
              {page === "menu" && <MenuAdmin {...common} restaurant={r} categories={props.categories} menu={props.menu} editing={editing} onEdit={setEditing} />}
              {page === "menu" && (
                <BulkDishes {...common} rid={r.id} open={bulk} onClose={() => setBulk(false)} categories={props.categories} startPosition={props.menu.length + 1} />
              )}
              {page === "tables" && <TablesAdmin {...common} restaurant={r} tables={props.tables} visits={today.openVisits} orders={today.orders} />}
              {page === "settings" && <SettingsForm {...common} restaurant={r} email={props.email} />}
              {page === "team" && <TeamAdmin {...common} me={props.me} rid={r.id} venue={venue} team={props.team} invites={props.invites} />}
            </div>
          )}
        </div>
        </div>
        <BottomNav page={page} onPage={setPage} liveCount={live} />
        </div>
        <RailSlot label={t("details")} />
        </RailProvider>
      </SidebarInset>
    </SidebarProvider>
  );
}

type Op = () => PromiseLike<{ error: { message: string } | null }>;
type Mutate = (fn: Op, ok?: string) => Promise<boolean>;
type Run = (fn: Op, ok?: string) => Promise<void>;
export type AdminProps = { sb: ReturnType<typeof staffClient>; mutate: Mutate; run: Run };
