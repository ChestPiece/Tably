"use client";
import { cn } from "@/lib/utils";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { staffClient } from "@/lib/supabase/browser";
import { tableLabel } from "@/lib/format";
import { errorText, tr, useLang } from "@/lib/i18n";
import { MENU_SELECT, ORDER_SELECT, pick, type Category, type MenuItem, type Order, type Restaurant, type ServiceRequest, type StaffRole, type Visit } from "@/lib/types";
import { Board } from "@/components/staff/Board";
import { CancelOrderDialog } from "@/components/staff/CancelOrderDialog";
import { MenuToggles } from "@/components/staff/MenuToggles";
import { STAFF_TABS, StaffSidebar, StaffTopBar, type StaffTab } from "@/components/staff/StaffHeader";
import { StaffToday } from "@/components/staff/StaffToday";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { dayRange } from "@/lib/stats";
import { TablesView } from "@/components/staff/TablesView";
import { useVenue } from "@/lib/venue";
import { applyChange, type Change } from "@/lib/live";

function useChime() {
  const ctx = useRef<AudioContext | null>(null);
  const play = useCallback((kind: "order" | "call" | "nudge") => {
    const a = ctx.current;
    if (!a) return;
    // A nudge (guest waited 15 s with no answer) is the call chime, longer and higher.
    const notes = kind === "order" ? [880, 1175] : kind === "call" ? [660, 660] : [784, 784, 988];
    notes.forEach((f, i) => {
      const o = a.createOscillator();
      const g = a.createGain();
      o.type = "sine";
      o.frequency.value = f;
      o.connect(g);
      g.connect(a.destination);
      const t0 = a.currentTime + i * 0.18;
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(0.25, t0 + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.35);
      o.start(t0);
      o.stop(t0 + 0.4);
    });
  }, []);
  const unlock = useCallback(() => {
    ctx.current ??= new AudioContext();
    return ctx.current.resume();
  }, []);
  useEffect(() => () => void ctx.current?.close().catch(() => {}), []);
  return { play, unlock };
}

/** `embedded`: board columns only (owner Live board page), no staff header/tabs. */
export function StaffBoard({ restaurant: initial, role, embedded, sidebarOpen = true, clockedIn = false, me = "" }: { restaurant: Restaurant; role: StaffRole; embedded?: boolean; sidebarOpen?: boolean; clockedIn?: boolean; me?: string }) {
  const sb = useMemo(() => staffClient(), []);
  const rid = initial.id;
  const [restaurant, setRestaurant] = useState(initial);
  const { lang } = useLang();
  const { tz } = useVenue();
  // Tab lives in the URL (?tab=), so reloads and shared links land on the same screen.
  const params = useSearchParams();
  const router = useRouter();
  const path = usePathname();
  const tab = STAFF_TABS.find((x) => x === params.get("tab")) ?? "board";
  const setTab = (next: StaffTab) => {
    const q = new URLSearchParams(params);
    if (next === "board") q.delete("tab");
    else q.set("tab", next);
    router.replace(q.size ? `${path}?${q}` : path, { scroll: false });
  };
  const [loaded, setLoaded] = useState(false);
  // First load failed and nothing is on screen: say so instead of a false "All clear".
  const [failed, setFailed] = useState(false);
  const [announce, setAnnounce] = useState("");
  const [orders, setOrders] = useState<Order[]>([]);
  const [requests, setRequests] = useState<ServiceRequest[]>([]);
  const [visits, setVisits] = useState<Visit[]>([]);
  const [menu, setMenu] = useState<MenuItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [online, setOnline] = useState(false);
  // Shift mode = clocked in (wages for the owner's profit report). Survives reloads through the open shift row.
  const [shift, setShift] = useState(clockedIn);
  // Several taps can be in flight at once (two cards advanced back to back), so busy is a set.
  const [busy, setBusy] = useState<ReadonlySet<string>>(new Set());
  const [cancelling, setCancelling] = useState<Order | null>(null);
  const langRef = useRef(lang);
  useEffect(() => {
    langRef.current = lang;
  }, [lang]);
  const [fresh, setFresh] = useState<Set<string>>(new Set());
  const [now, setNow] = useState(() => Date.now());
  const { play, unlock } = useChime();
  const shiftRef = useRef(clockedIn);
  const wake = useRef<{ release: () => Promise<void> } | null>(null);
  const nudged = useRef(new Set<string>());

  // Full loads only on connect, tab return and errors; every other change patches from the payload.
  const loadSeq = useRef(0);
  const load = useCallback(async () => {
    const seq = ++loadSeq.current;
    const startedAt = new Date().toISOString();
    // Whole venue day: the board shows live tickets, the Today page counts the rest.
    const since = dayRange(new Date(), tz).start;
    // Open visits first: a table seated before midnight still owes its earlier orders.
    const v = await sb.from("visits").select("*").eq("restaurant_id", rid).is("closed_at", null).order("table_number");
    const open = (v.data ?? []).map((x) => x.id).join(",");
    const [o, r, m, c] = await Promise.all([
      sb.from("orders").select(ORDER_SELECT).eq("restaurant_id", rid).or(`status.in.(received,preparing,ready),created_at.gte.${since}${open ? `,visit_id.in.(${open})` : ""}`).order("created_at").order("position", { referencedTable: "order_lines" }),
      sb.from("service_requests").select("*").eq("restaurant_id", rid).is("resolved_at", null).order("created_at"),
      sb.from("menu_items").select(MENU_SELECT).eq("restaurant_id", rid).order("position"),
      sb.from("categories").select("*").eq("restaurant_id", rid).order("position"),
    ]);
    if (seq !== loadSeq.current) return; // a newer load is in flight; its answer wins
    setLoaded(true);
    const bad = !!(o.error || r.error || v.error);
    setFailed(bad);
    if (bad) return setOnline(false);
    // Keep tickets that arrived live while this load was in flight.
    const got = o.data as Order[];
    const ids = new Set(got.map((x) => x.id));
    setOrders((prev) => [...got, ...prev.filter((x) => !ids.has(x.id) && x.created_at >= startedAt)]);
    setRequests(r.data as ServiceRequest[]);
    setVisits(v.data as Visit[]);
    setMenu((m.data ?? []) as MenuItem[]);
    setCategories((c.data ?? []) as Category[]);
  }, [sb, rid, tz]);

  const timers = useRef(new Set<number>());
  const later = (fn: () => void, ms: number) => {
    const id = window.setTimeout(() => {
      timers.current.delete(id);
      fn();
    }, ms);
    timers.current.add(id);
  };
  const markFresh = (id: string) => {
    setFresh((s) => new Set(s).add(id));
    later(() => setFresh((s) => { const n = new Set(s); n.delete(id); return n; }), 4000);
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial fetch for the realtime subscription below; state is set after await
    load();
    const filter = `restaurant_id=eq.${rid}`;
    const ch = sb
      .channel(`board-${rid}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "orders", filter }, async (p) => {
        const id = p.new.id as string;
        if (shiftRef.current) play("order");
        markFresh(id);
        setAnnounce(tr(langRef.current, "announceOrder").replace("{n}", String(p.new.table_number)));
        if (document.hidden) document.title = "● New order · Tably";
        // The payload has no lines; they commit with the order, so one row fetch gets them all.
        const { data } = await sb.from("orders").select(ORDER_SELECT).eq("id", id).order("position", { referencedTable: "order_lines" }).maybeSingle();
        if (data) setOrders((l) => applyChange(l, { eventType: "INSERT", new: data as Order, old: {} }));
      })
      // Only rows already on the board: an old order's update has no lines to show.
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "orders", filter }, (p) =>
        setOrders((l) => (l.some((o) => o.id === p.new.id) ? applyChange(l, p as unknown as Change<Order>) : l)),
      )
      .on("postgres_changes", { event: "*", schema: "public", table: "service_requests", filter }, (p) => {
        const r = p.new as ServiceRequest;
        if (p.eventType === "INSERT") {
          if (shiftRef.current) play("call");
          markFresh(r.id);
          setAnnounce(tr(langRef.current, "announceCall").replace("{n}", String(r.table_number)));
        } else if (r.nudged_at && !r.acknowledged_at && !r.resolved_at && !nudged.current.has(r.id)) {
          nudged.current.add(r.id);
          if (shiftRef.current) play("nudge");
          markFresh(r.id);
          setAnnounce(tr(langRef.current, "announceCall").replace("{n}", String(r.table_number)));
        }
        setRequests((l) => applyChange(l, p as unknown as Change<ServiceRequest>, (x) => !x.resolved_at));
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "visits", filter }, (p) =>
        setVisits((l) => applyChange(l, p as unknown as Change<Visit>, (x) => !x.closed_at).sort((a, b) => a.table_number - b.table_number)),
      )
      .on("postgres_changes", { event: "*", schema: "public", table: "menu_items", filter }, (p) =>
        // A new dish needs its options: refetch. Toggles and edits patch in place.
        p.eventType === "INSERT" ? load() : setMenu((l) => applyChange(l, p as unknown as Change<MenuItem>)),
      )
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "restaurants", filter: `id=eq.${rid}` }, (p) =>
        setRestaurant((r) => ({ ...r, ...(p.new as Partial<Restaurant>) })),
      )
      .subscribe((s) => {
        setOnline(s === "SUBSCRIBED");
        if (s === "SUBSCRIBED") load();
      });
    const tick = window.setInterval(() => setNow(Date.now()), 20000);
    const onVisible = () => {
      if (document.visibilityState !== "visible") return;
      document.title = "Tably · Kitchen";
      load();
      if (shiftRef.current) navigator.wakeLock?.request("screen").then((w) => (wake.current = w)).catch(() => {});
    };
    document.addEventListener("visibilitychange", onVisible);
    const pending = timers.current;
    return () => {
      sb.removeChannel(ch);
      window.clearInterval(tick);
      document.removeEventListener("visibilitychange", onVisible);
      pending.forEach(window.clearTimeout);
      pending.clear();
      wake.current?.release().catch(() => {});
      wake.current = null;
    };
  }, [sb, rid, load, play]); // eslint-disable-line react-hooks/exhaustive-deps -- later/markFresh only touch refs and setters

  // Already clocked in on load: audio needs a user gesture, so unlock on the first tap anywhere.
  useEffect(() => {
    if (!clockedIn) return;
    const once = () => unlock();
    window.addEventListener("pointerdown", once, { once: true });
    return () => window.removeEventListener("pointerdown", once);
  }, [clockedIn, unlock]);

  async function toggleShift() {
    const { error: e } = await sb.rpc(shift ? "clock_out" : "clock_in");
    if (e) return void toast.error(errorText(lang, e));
    if (shift) {
      shiftRef.current = false;
      setShift(false);
      await wake.current?.release().catch(() => {});
      return;
    }
    await unlock();
    shiftRef.current = true;
    setShift(true);
    play("order");
    wake.current = (await navigator.wakeLock?.request("screen").catch(() => null)) ?? null;
  }

  /** `optimistic` paints the expected result at once; a refusal reloads, which rolls it back. */
  async function run(id: string, fn: () => PromiseLike<{ error: unknown }>, optimistic?: () => void) {
    setBusy((s) => new Set(s).add(id));
    optimistic?.();
    const { error: e } = await fn();
    setBusy((s) => {
      const n = new Set(s);
      n.delete(id);
      return n;
    });
    // Success shows up through realtime; a refusal means our copy was stale, and with the
    // socket down nothing would echo the change, so both resync.
    if (e) toast.error(errorText(lang, e));
    if (e || !online) load();
    return !e;
  }

  const live = orders.filter((o) => ["received", "preparing", "ready"].includes(o.status));
  const recent = orders.filter((o) => ["served", "cancelled"].includes(o.status)).reverse().slice(0, 12);
  const soldOut = menu.filter((i) => !i.available).length;
  const dayStart = Date.parse(dayRange(new Date(now), tz).start);
  const today = orders.filter((o) => Date.parse(o.created_at) >= dayStart);
  const titles: Record<StaffTab, string> = { board: tr(lang, "tabBoard"), today: tr(lang, "today"), tables: tr(lang, "tabTables"), menu: tr(lang, "tabMenu") };

  const body = (
    <div className={cn("flex flex-col bg-background text-foreground", embedded ? "h-full" : "h-dvh")}>
      {!embedded && <StaffTopBar title={titles[tab]} online={online} shift={shift} onToggleShift={toggleShift} />}
      <p aria-live="polite" className="sr-only">
        {announce}
      </p>

      {restaurant.ordering_paused && !embedded && <p className="shrink-0 border-b bg-muted px-5 py-3 text-sm">{tr(lang, "boardPaused")}</p>}

      {(embedded || tab === "board") && (
        <main className="flex min-h-0 flex-1 flex-col">
          <Board
            lang={lang}
            now={now}
            loaded={loaded}
            failed={failed}
            onRetry={load}
            orders={live}
            recent={recent}
            requests={requests}
            fresh={fresh}
            busy={busy}
            onAdvance={async (o) => {
              const to = o.status === "received" ? "preparing" : o.status === "preparing" ? "ready" : "served";
              const moved = () => setOrders((l) => applyChange(l, { eventType: "UPDATE", new: { id: o.id, status: to }, old: {} }));
              if (!(await run(o.id, () => sb.rpc("advance_order", { p_order: o.id, p_from: o.status }), moved))) return;
              // A mis-tap on a busy line is easy; offer one-step undo (server allows it for 2 minutes).
              toast(`${tableLabel(lang, o.table_number)} #${o.number} · ${tr(lang, to === "preparing" ? "colCooking" : to === "ready" ? "colReady" : "actServed")}`, {
                duration: 6000,
                action: { label: tr(lang, "undo"), onClick: () => run(o.id, () => sb.rpc("revert_order", { p_order: o.id, p_from: to })) },
              });
            }}
            onCancel={setCancelling}
            onCall={(r, act) =>
              run(r.id, () =>
                act === "ack"
                  ? sb.rpc("acknowledge_request", { p_request: r.id })
                  : act === "done"
                    ? sb.rpc("resolve_request", { p_request: r.id })
                    : sb.rpc("settle_bill", { p_visit: r.visit_id, p_method: act }),
              )
            }
          />
        </main>
      )}

      {!embedded && tab === "today" && (
        <main className="relative min-h-0 flex-1 overflow-y-auto">
          <StaffToday orders={today} />
        </main>
      )}

      {!embedded && tab === "tables" && (
        <main className="min-h-0 flex-1 overflow-y-auto">
          <TablesView
            visits={visits}
            orders={orders}
            now={now}
            busy={busy}
            onPay={(v, m) => run(v.id, () => sb.rpc("record_payment", { p_visit: v.id, p_method: m }))}
            onClose={(v) => run(v.id, () => sb.rpc("close_visit", { p_visit: v.id }))}
          />
        </main>
      )}

      {!embedded && tab === "menu" && (
        <main className="min-h-0 flex-1 overflow-y-auto">
          <MenuToggles
            categories={categories}
            menu={menu}
            busy={busy}
            onToggle={(i) =>
              run(
                i.id,
                () => sb.rpc("set_item_available", { p_item: i.id, p_available: !i.available }),
                () => setMenu((l) => applyChange(l, { eventType: "UPDATE", new: { id: i.id, available: !i.available }, old: {} })),
              )
            }
          />
        </main>
      )}

      <CancelOrderDialog
        key={cancelling?.id}
        order={cancelling}
        lang={lang}
        onClose={() => setCancelling(null)}
        onConfirm={(o, reason) =>
          run(o.id, () => sb.rpc("cancel_order", { p_order: o.id, p_reason: reason })).then((ok) => {
            if (ok) setCancelling(null);
            return ok;
          })
        }
      />
    </div>
  );

  if (embedded) return body;
  return (
    <SidebarProvider defaultOpen={sidebarOpen} style={{ "--sidebar-width": "232px", "--sidebar": "var(--card)" } as React.CSSProperties}>
      <StaffSidebar
        venue={pick(lang, restaurant.name, restaurant.name_ar)}
        tab={tab}
        onTab={setTab}
        counts={{ board: live.length, tables: visits.length, soldOut }}
        role={role}
        me={me}
      />
      <SidebarInset className="min-w-0">{body}</SidebarInset>
    </SidebarProvider>
  );
}
