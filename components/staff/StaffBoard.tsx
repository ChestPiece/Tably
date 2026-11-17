"use client";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { staffClient } from "@/lib/supabase/browser";
import { errorText, tr, useLang } from "@/lib/i18n";
import { MENU_SELECT, ORDER_SELECT, pick, type Category, type MenuItem, type Order, type Restaurant, type ServiceRequest, type Visit } from "@/lib/types";
import { Board } from "@/components/staff/Board";
import { CancelOrderDialog } from "@/components/staff/CancelOrderDialog";
import { MenuToggles } from "@/components/staff/MenuToggles";
import { StaffHeader, type StaffTab } from "@/components/staff/StaffHeader";
import { TablesView } from "@/components/staff/TablesView";

function useChime() {
  const ctx = useRef<AudioContext | null>(null);
  const play = useCallback((kind: "order" | "call") => {
    const a = ctx.current;
    if (!a) return;
    const notes = kind === "order" ? [880, 1175] : [660, 660];
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
  const unlock = () => {
    ctx.current ??= new AudioContext();
    return ctx.current.resume();
  };
  return { play, unlock };
}

/** `embedded`: board columns only (owner Live board page), no staff header/tabs. */
export function StaffBoard({ restaurant: initial, role, embedded }: { restaurant: Restaurant; role: "owner" | "staff"; embedded?: boolean }) {
  const sb = useMemo(() => staffClient(), []);
  const router = useRouter();
  const rid = initial.id;
  const [restaurant, setRestaurant] = useState(initial);
  const { lang } = useLang();
  const [tab, setTab] = useState<StaffTab>("board");
  const [loaded, setLoaded] = useState(false);
  const [announce, setAnnounce] = useState("");
  const [orders, setOrders] = useState<Order[]>([]);
  const [requests, setRequests] = useState<ServiceRequest[]>([]);
  const [visits, setVisits] = useState<Visit[]>([]);
  const [menu, setMenu] = useState<MenuItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [online, setOnline] = useState(false);
  const [shift, setShift] = useState(false);
  const [busyId, setBusyId] = useState("");
  const [cancelling, setCancelling] = useState<Order | null>(null);
  const langRef = useRef(lang);
  useEffect(() => {
    langRef.current = lang;
  }, [lang]);
  const [fresh, setFresh] = useState<Set<string>>(new Set());
  const [now, setNow] = useState(() => Date.now());
  const { play, unlock } = useChime();
  const shiftRef = useRef(false);
  const wake = useRef<{ release: () => Promise<void> } | null>(null);

  const load = useCallback(async () => {
    const since = new Date(Date.now() - 3 * 3600_000).toISOString();
    const [o, r, v, m, c] = await Promise.all([
      sb.from("orders").select(ORDER_SELECT).eq("restaurant_id", rid).or(`status.in.(received,preparing,ready),created_at.gte.${since}`).order("created_at").order("position", { referencedTable: "order_lines" }),
      sb.from("service_requests").select("*").eq("restaurant_id", rid).is("resolved_at", null).order("created_at"),
      sb.from("visits").select("*").eq("restaurant_id", rid).is("closed_at", null).order("table_number"),
      sb.from("menu_items").select(MENU_SELECT).eq("restaurant_id", rid).order("position"),
      sb.from("categories").select("*").eq("restaurant_id", rid).order("position"),
    ]);
    setLoaded(true);
    if (o.error || r.error || v.error) return setOnline(false);
    setOrders(o.data as Order[]);
    setRequests(r.data as ServiceRequest[]);
    setVisits(v.data as Visit[]);
    setMenu((m.data ?? []) as MenuItem[]);
    setCategories((c.data ?? []) as Category[]);
  }, [sb, rid]);

  const markFresh = (id: string) => {
    setFresh((s) => new Set(s).add(id));
    window.setTimeout(() => setFresh((s) => { const n = new Set(s); n.delete(id); return n; }), 4000);
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial fetch for the realtime subscription below; state is set after await
    load();
    const filter = `restaurant_id=eq.${rid}`;
    const ch = sb
      .channel(`board-${rid}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "orders", filter }, (p) => {
        if (shiftRef.current) play("order");
        markFresh(p.new.id as string);
        setAnnounce(tr(langRef.current, "announceOrder").replace("{n}", String(p.new.table_number)));
        if (document.hidden) document.title = "● New order · ChestBest";
        // Lines are inserted in the same transaction; reload after they land.
        window.setTimeout(load, 250);
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "orders", filter }, load)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "service_requests", filter }, (p) => {
        if (shiftRef.current) play("call");
        markFresh(p.new.id as string);
        setAnnounce(tr(langRef.current, "announceCall").replace("{n}", String(p.new.table_number)));
        load();
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "service_requests", filter }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "visits", filter }, load)
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
      document.title = "ChestBest · Kitchen";
      load();
      if (shiftRef.current) navigator.wakeLock?.request("screen").then((w) => (wake.current = w)).catch(() => {});
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      sb.removeChannel(ch);
      window.clearInterval(tick);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [sb, rid, load, play]);

  async function toggleShift() {
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

  async function run(id: string, fn: () => PromiseLike<{ error: unknown }>) {
    setBusyId(id);
    const { error: e } = await fn();
    setBusyId("");
    if (e) toast.error(errorText(lang, e));
    load();
    return !e;
  }

  const live = orders.filter((o) => ["received", "preparing", "ready"].includes(o.status));
  const recent = orders.filter((o) => ["served", "cancelled"].includes(o.status)).reverse().slice(0, 12);
  const soldOut = menu.filter((i) => !i.available).length;

  return (
    <div className={cn("flex flex-col bg-background text-foreground", embedded ? "h-full" : "h-dvh")}>
      {!embedded && (
      <StaffHeader
        venue={pick(lang, restaurant.name, restaurant.name_ar)}
        tab={tab}
        onTab={setTab}
        counts={{ board: live.length, tables: visits.length, soldOut }}
        online={online}
        shift={shift}
        onToggleShift={toggleShift}
        role={role}
        onSignOut={async () => {
          await sb.auth.signOut();
          router.replace("/staff/login");
        }}
      />
      )}
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
            orders={live}
            recent={recent}
            requests={requests}
            fresh={fresh}
            busyId={busyId}
            onAdvance={(o) => run(o.id, () => sb.rpc("advance_order", { p_order: o.id, p_from: o.status }))}
            onCancel={setCancelling}
            onResolve={(id) => run(id, () => sb.rpc("resolve_request", { p_request: id }))}
          />
        </main>
      )}

      {!embedded && tab === "tables" && (
        <main className="min-h-0 flex-1 overflow-y-auto">
          <TablesView
            visits={visits}
            orders={orders}
            now={now}
            busyId={busyId}
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
            busyId={busyId}
            onToggle={(i) => run(i.id, () => sb.rpc("set_item_available", { p_item: i.id, p_available: !i.available }))}
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
}
