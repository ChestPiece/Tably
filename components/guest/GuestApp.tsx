"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { ensureGuestSession, guestClient } from "@/lib/supabase/guest";
import { errorText, useLang } from "@/lib/i18n";
import { MENU_SELECT, ORDER_SELECT, type Category, type MenuItem, type Order, type Restaurant, type ServiceRequest, type Visit } from "@/lib/types";
import { Welcome, ClosedVisit } from "./Welcome";
import { MenuView } from "./MenuView";
import { TableView } from "./TableView";
import { ItemSheet } from "./ItemSheet";
import { CartSheet } from "./CartSheet";
import { GuestHeader, CartBar } from "./Chrome";
import { useVenue } from "@/lib/venue";
import { applyChange, type Change } from "@/lib/live";

export type CartLine = { key: string; itemId: string; optionId: string | null; quantity: number; unit: number };
export type Me = { guest_id: string; seq: number; display_name: string | null };
type Phase = "boot" | "welcome" | "in" | "closed";
type Pending = { requestId: string; lines: CartLine[]; note: string };

const store = {
  get<T>(k: string, fallback: T): T {
    try {
      const v = localStorage.getItem(k);
      return v ? (JSON.parse(v) as T) : fallback;
    } catch {
      return fallback;
    }
  },
  set(k: string, v: unknown) {
    try {
      if (v === null) localStorage.removeItem(k);
      else localStorage.setItem(k, JSON.stringify(v));
    } catch {}
  },
};

export function GuestApp(props: {
  slug: string;
  tableNumber: number;
  pinRequired: boolean;
  restaurant: Restaurant;
  categories: Category[];
  initialMenu: MenuItem[];
}) {
  const { slug, tableNumber } = props;
  const { lang, t, toggle } = useLang();
  const { secondLang } = useVenue();
  const sb = guestClient();

  // English-only restaurant: a guest whose last venue was in Arabic switches back to English.
  useEffect(() => {
    if (!secondLang && lang === "ar") toggle();
  }, [secondLang, lang, toggle]);

  const [phase, setPhase] = useState<Phase>("boot");
  const [ended, setEnded] = useState(false);
  const [paidMethod, setPaidMethod] = useState<"cash" | "card" | null>(null);
  const [me, setMe] = useState<Me | null>(null);
  const [visit, setVisit] = useState<Visit | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [requests, setRequests] = useState<ServiceRequest[]>([]);
  const [menu, setMenu] = useState(props.initialMenu);
  const [restaurant, setRestaurant] = useState(props.restaurant);
  const [view, setView] = useState<"menu" | "table">("menu");
  const [cart, setCart] = useState<CartLine[]>([]);
  const [note, setNote] = useState("");
  const [pending, setPending] = useState<Pending | null>(null);
  const [openItem, setOpenItem] = useState<MenuItem | null>(null);
  const [cartOpen, setCartOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  // Waiter / bill taps have their own busy flag: they must not freeze the cart, nor the cart them.
  const [asking, setAsking] = useState(false);
  const [error, setError] = useState("");
  const [online, setOnline] = useState(true);
  const visitId = useRef<string | null>(null);

  // Restore device-local cart + uncertain submission.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time hydration from localStorage (SSR has no storage)
    setCart(store.get<CartLine[]>(`cb-cart-${slug}`, []));
    setPending(store.get<Pending | null>(`cb-pending-${slug}`, null));
  }, [slug]);
  useEffect(() => {
    if (phase !== "boot") store.set(`cb-cart-${slug}`, cart);
  }, [cart, slug, phase]);

  const loadVisit = useCallback(
    async (id: string) => {
      const [v, o, r] = await Promise.all([
        sb.from("visits").select("*").eq("id", id).maybeSingle(),
        sb.from("orders").select(ORDER_SELECT).eq("visit_id", id).order("created_at").order("position", { referencedTable: "order_lines" }),
        // Open requests, plus ones just resolved so the guest sees "Done" for a moment.
        sb.from("service_requests").select("*").eq("visit_id", id).or(`resolved_at.is.null,resolved_at.gt.${new Date(Date.now() - 10000).toISOString()}`),
      ]);
      if (v.error || o.error) {
        setOnline(false);
        return;
      }
      setOnline(true);
      if (!v.data) {
        // RLS hides closed visits from guests; guest_session says whether (and how) it was paid.
        visitId.current = null;
        setPhase("closed");
        const { data: s } = await sb.rpc("guest_session", { p_slug: slug });
        setPaidMethod(s?.paid_method ?? null);
        return;
      }
      setVisit(v.data as Visit);
      setOrders((o.data ?? []) as Order[]);
      setRequests((r.data ?? []) as ServiceRequest[]);
    },
    [sb, slug],
  );

  const enter = useCallback(
    async (session: { visit_id: string; guest_id: string; seq: number; display_name: string | null }) => {
      visitId.current = session.visit_id;
      setMe({ guest_id: session.guest_id, seq: session.seq, display_name: session.display_name });
      await loadVisit(session.visit_id);
      setPhase((p) => (p === "closed" ? p : "in"));
    },
    [loadVisit],
  );

  // Boot: reuse an existing anonymous session if this phone already joined.
  useEffect(() => {
    (async () => {
      const { data } = await sb.auth.getSession();
      if (!data.session) return setPhase("welcome");
      const { data: s, error: e } = await sb.rpc("guest_session", { p_slug: slug });
      if (e) {
        setError(errorText(lang, e));
        return setPhase("welcome");
      }
      if (s?.visit_id) await enter(s);
      else if (s?.paid_method) {
        setPaidMethod(s.paid_method);
        setPhase("closed");
      } else {
        setEnded(!!s?.ended);
        setPhase("welcome");
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Live updates for this visit + menu availability + pause switch.
  useEffect(() => {
    if (phase !== "in" || !visit) return;
    const id = visit.id;
    const refresh = () => loadVisit(id);
    let first = true;
    const ch = sb
      .channel(`visit-${id}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "orders", filter: `visit_id=eq.${id}` }, async (p) => {
        // The payload has no lines; they commit with the order, so one row fetch gets them.
        const { data } = await sb.from("orders").select(ORDER_SELECT).eq("id", p.new.id).order("position", { referencedTable: "order_lines" }).maybeSingle();
        if (data) setOrders((l) => applyChange(l, { eventType: "INSERT", new: data as Order, old: {} }));
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "orders", filter: `visit_id=eq.${id}` }, (p) =>
        setOrders((l) => applyChange(l, p as unknown as Change<Order>)),
      )
      .on("postgres_changes", { event: "*", schema: "public", table: "service_requests", filter: `visit_id=eq.${id}` }, (p) =>
        setRequests((l) => applyChange(l, p as unknown as Change<ServiceRequest>)),
      )
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "visits", filter: `id=eq.${id}` }, (p) =>
        setVisit((v) => (v ? { ...v, ...(p.new as Partial<Visit>) } : v)),
      )
      // New dishes need their options and show on the next visit; edits, sell-outs and removals apply now.
      .on("postgres_changes", { event: "*", schema: "public", table: "menu_items", filter: `restaurant_id=eq.${restaurant.id}` }, (p) =>
        p.eventType !== "INSERT" && setMenu((m) => (p.eventType === "DELETE" || m.some((i) => i.id === p.new.id) ? applyChange(m, p as unknown as Change<MenuItem>) : m)),
      )
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "restaurants", filter: `id=eq.${restaurant.id}` }, (p) =>
        setRestaurant((r) => ({ ...r, ...(p.new as Partial<Restaurant>) })),
      )
      .subscribe((status) => {
        setOnline(status === "SUBSCRIBED");
        // A rejoin after a drop may have missed status changes: catch up once.
        if (status === "SUBSCRIBED" && !first) refresh();
        if (status === "SUBSCRIBED") first = false;
      });
    // A closed visit stops matching RLS, so realtime can't tell us. Poll as a fallback,
    // faster while the bill is asked for so "Paid, thank you" shows soon after staff settle it.
    // One cheap RPC per tick; the full reload runs only once the visit has ended.
    const poll = window.setInterval(async () => {
      const { data: s } = await sb.rpc("guest_session", { p_slug: slug });
      if (s && s.visit_id !== id) refresh();
    }, visit.bill_requested_at ? 5000 : 15000);
    const onVisible = () => document.visibilityState === "visible" && refresh();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      sb.removeChannel(ch);
      window.clearInterval(poll);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [phase, visit?.id, visit?.bill_requested_at, restaurant.id, sb, loadVisit, slug]); // eslint-disable-line react-hooks/exhaustive-deps

  async function join(name: string, pin: string) {
    setBusy(true);
    setError("");
    try {
      await ensureGuestSession();
      const { data, error: e } = await sb.rpc("join_table", { p_slug: slug, p_name: name, p_pin: pin || null });
      if (e) throw e;
      if (data?.error) throw { message: data.error }; // BAD_PIN / PIN_LOCKED return, not raise, so the miss count sticks
      try {
        localStorage.setItem("cb-name", name);
      } catch {}
      setEnded(false);
      setPhase("boot");
      await enter(data);
    } catch (e) {
      setError(errorText(lang, e));
    } finally {
      setBusy(false);
    }
  }

  function addToCart(item: MenuItem, optionId: string | null, quantity: number) {
    const opt = item.item_options.find((o) => o.id === optionId);
    const unit = item.price_fils + (opt?.price_fils ?? 0);
    const key = `${item.id}:${optionId ?? "-"}:${unit}`;
    setCart((c) => {
      const hit = c.find((l) => l.key === key);
      if (hit) return c.map((l) => (l.key === key ? { ...l, quantity: Math.min(20, l.quantity + quantity) } : l));
      return [...c, { key, itemId: item.id, optionId, quantity, unit }];
    });
    setOpenItem(null);
  }

  // Simple (no-option) items: the menu row stepper edits their single cart line.
  function setItemQty(item: MenuItem, quantity: number) {
    const key = `${item.id}:-:${item.price_fils}`;
    setCart((c) => (quantity <= 0 ? c.filter((l) => l.key !== key) : c.map((l) => (l.key === key ? { ...l, quantity: Math.min(20, quantity) } : l))));
  }

  async function placeOrder() {
    if (busy || !cart.length) return;
    setBusy(true);
    setError("");
    const attempt: Pending = pending ?? { requestId: crypto.randomUUID(), lines: cart, note };
    setPending(attempt);
    store.set(`cb-pending-${slug}`, attempt);
    try {
      const { error: e } = await sb.rpc("place_order", {
        p_request_id: attempt.requestId,
        p_lines: attempt.lines.map((l) => ({ item_id: l.itemId, option_id: l.optionId, quantity: l.quantity, expected_price: l.unit })),
        p_note: attempt.note || null,
        p_visit: visitId.current,
      });
      if (e) throw e;
      setPending(null);
      store.set(`cb-pending-${slug}`, null);
      setCart([]);
      setNote("");
      setCartOpen(false);
      setView("table");
      if (visitId.current) await loadVisit(visitId.current);
    } catch (e) {
      const code = (e as { message?: string }).message ?? "";
      const serverRejected = /^[A-Z_]+$/.test(code);
      // Network failures keep the same request id so a retry can't duplicate the order.
      if (serverRejected) {
        setPending(null);
        store.set(`cb-pending-${slug}`, null);
      }
      if (code === "VISIT_CLOSED") setPhase("closed");
      if (code === "PRICE_CHANGED" || code === "UNAVAILABLE") await refreshCart();
      setError(errorText(lang, e));
    } finally {
      setBusy(false);
    }
  }

  // The server refused the cart's prices: reload the menu, re-price lines, drop what is gone.
  async function refreshCart() {
    const { data } = await sb
      .from("menu_items")
      .select(MENU_SELECT)
      .eq("restaurant_id", restaurant.id)
      .order("position")
      .order("position", { referencedTable: "item_options" });
    if (!data) return;
    const fresh = data as MenuItem[];
    setMenu(fresh);
    setCart((c) => {
      // Re-priced lines can land on a key the cart already has: merge them (max 20, like addToCart).
      const out = new Map<string, CartLine>();
      for (const l of c) {
        const item = fresh.find((i) => i.id === l.itemId);
        if (!item?.available) continue;
        const opt = item.item_options.find((o) => o.id === l.optionId);
        if (l.optionId ? !opt : item.item_options.length > 0) continue;
        const unit = item.price_fils + (opt?.price_fils ?? 0);
        const key = `${l.itemId}:${l.optionId ?? "-"}:${unit}`;
        const hit = out.get(key);
        out.set(key, { ...l, unit, key, quantity: Math.min(20, (hit?.quantity ?? 0) + l.quantity) });
      }
      return [...out.values()];
    });
  }

  async function request(kind: "waiter" | "bill", method?: "cash" | "card") {
    if (asking) return;
    setAsking(true);
    setError("");
    const p_visit = visitId.current;
    const { error: e } = kind === "waiter" ? await sb.rpc("call_waiter", { p_visit }) : await sb.rpc("request_bill", { p_method: method ?? null, p_visit });
    setAsking(false);
    if (e) {
      if (e.message === "VISIT_CLOSED") setPhase("closed");
      return setError(errorText(lang, e));
    }
    if (visitId.current) loadVisit(visitId.current);
  }

  // The 15 s ring ran out with no answer: the board chimes again. Quiet on failure (the card already says "nudged").
  const nudge = useCallback(
    async (id: string) => {
      await sb.rpc("nudge_request", { p_request: id });
      if (visitId.current) loadVisit(visitId.current);
    },
    [sb, loadVisit],
  );

  const cartCount = cart.reduce((n, l) => n + l.quantity, 0);
  const cartTotal = cart.reduce((n, l) => n + l.unit * l.quantity, 0);
  const locked = !!pending;

  if (phase === "boot") {
    return <div className="grid min-h-dvh place-items-center text-text-2">{t("joining")}</div>;
  }
  if (phase === "welcome") {
    return (
      <Welcome
        restaurant={restaurant}
        tableNumber={tableNumber}
        pinRequired={props.pinRequired}
        ended={ended}
        busy={busy}
        error={error}
        onJoin={join}
      />
    );
  }
  if (phase === "closed") {
    return (
      <ClosedVisit
        paidMethod={paidMethod}
        onNew={() => {
          setCart([]);
          setPending(null);
          store.set(`cb-pending-${slug}`, null);
          setOrders([]);
          setVisit(null);
          setEnded(false);
          setPhase("welcome");
        }}
      />
    );
  }

  return (
    <div className="mx-auto flex min-h-dvh max-w-[560px] flex-col bg-background">
      <GuestHeader
        restaurant={restaurant}
        tableNumber={tableNumber}
        online={online}
        view={view}
        hasOrders={orders.length > 0}
        onView={(v) => {
          setView(v);
          window.scrollTo({ top: 0 });
        }}
      />
      {error && (
        <p role="alert" className="mx-5 mt-3 rounded-md bg-danger-bg px-4 py-3 text-sm text-destructive" onClick={() => setError("")}>
          {error}
        </p>
      )}
      {restaurant.ordering_paused && <p className="mx-5 mt-3 rounded-md bg-muted px-4 py-3 text-sm">{t("paused")}</p>}

      {view === "menu" ? (
        <div className="flex-1">
          <MenuView
            categories={props.categories}
            menu={menu}
            disabled={restaurant.ordering_paused || locked}
            inCart={(id) => cart.reduce((n, l) => (l.itemId === id ? n + l.quantity : n), 0)}
            onOpen={setOpenItem}
            onQuickAdd={(i) => addToCart(i, null, 1)}
            onSetQty={setItemQty}
          />
        </div>
      ) : (
        <TableView
          me={me}
          visit={visit}
          orders={orders}
          menu={menu}
          requests={requests}
          serviceMode={restaurant.service_mode}
          busy={asking}
          onRequest={request}
          onNudge={nudge}
          onOrderMore={() => {
            setView("menu");
            window.scrollTo({ top: 0 });
          }}
        />
      )}

      {view === "menu" && <CartBar count={cartCount} total={cartTotal} onOpen={() => setCartOpen(true)} />}

      {openItem && <ItemSheet item={openItem} disabled={restaurant.ordering_paused || locked} onClose={() => setOpenItem(null)} onAdd={addToCart} />}
      {cartOpen && (
        <CartSheet
          cart={pending?.lines ?? cart}
          setCart={setCart}
          menu={menu}
          note={pending?.note ?? note}
          setNote={setNote}
          total={(pending?.lines ?? cart).reduce((n, l) => n + l.unit * l.quantity, 0)}
          busy={busy}
          locked={locked}
          paused={restaurant.ordering_paused}
          error={error}
          onSend={placeOrder}
          onClose={() => setCartOpen(false)}
        />
      )}
    </div>
  );
}
