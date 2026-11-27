"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ensureGuestSession, guestClient } from "@/lib/supabase/guest";
import { errorText, useLang } from "@/lib/i18n";
import { brandTokens } from "@/lib/brand";
import { MENU_SELECT, ORDER_SELECT, type Category, type MenuItem, type Order, type Restaurant, type ServiceRequest, type Visit } from "@/lib/types";
import { Welcome, ClosedVisit } from "./Welcome";
import { loadUsual, saveUsual, toUsual, usualCart } from "@/lib/memory";
import { MenuView } from "./MenuView";
import { TableView } from "./TableView";
import { ItemSheet } from "./ItemSheet";
import { CartSheet } from "./CartSheet";
import { GuestHeader, CartBar } from "./Chrome";
import { useVenue } from "@/lib/venue";
import { applyChange, type Change } from "@/lib/live";
import { toast } from "sonner";
import { NO_SIGNALS, isSimple, lineKey, pickNudge, reconcileCart, unitPrice, type CartLine, type Signals, type Via } from "@/lib/menu";
import { pick } from "@/lib/types";
import { Button } from "@/components/ui/button";

export type { CartLine };
export type Me = { guest_id: string; seq: number; display_name: string | null };
type Phase = "boot" | "welcome" | "in" | "closed";
type Closed = { paid_method: "cash" | "card" | null; last_visit: string | null; rating: number | null };
const NOT_CLOSED: Closed = { paid_method: null, last_visit: null, rating: null };
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
  const { secondLang, money } = useVenue();
  const sb = guestClient();

  // English-only restaurant: a guest whose last venue was in Arabic switches back to English.
  useEffect(() => {
    if (!secondLang && lang === "ar") toggle();
  }, [secondLang, lang, toggle]);

  const [phase, setPhase] = useState<Phase>("boot");
  const [ended, setEnded] = useState(false);
  const [closed, setClosed] = useState<Closed>(NOT_CLOSED);
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
  const [openItem, setOpenItem] = useState<{ item: MenuItem; via?: Via } | null>(null);
  const [signals, setSignals] = useState<Signals>(NO_SIGNALS);
  const [pairings, setPairings] = useState<Map<string, string[]>>(new Map());
  // One "goes well with" per dish per page load: a nudge, never a nag.
  const nudged = useRef(new Set<string>());
  const [cartOpen, setCartOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  // Waiter / bill taps have their own busy flag: they must not freeze the cart, nor the cart them.
  const [asking, setAsking] = useState(false);
  const [error, setError] = useState("");
  const [online, setOnline] = useState(true);
  const visitId = useRef<string | null>(null);

  // Ranking from real orders plus the owner's pairings. Failure just means no nudges.
  useEffect(() => {
    sb.rpc("menu_signals", { p_restaurant: restaurant.id }).then(({ data }) => data && setSignals(data as Signals));
    sb.from("item_pairings").select("item_id, pairs_with_id").eq("restaurant_id", restaurant.id).then(({ data }) => {
      const m = new Map<string, string[]>();
      for (const p of data ?? []) m.set(p.item_id, [...(m.get(p.item_id) ?? []), p.pairs_with_id]);
      setPairings(m);
    });
  }, [sb, restaurant.id]);

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
        setClosed({ ...NOT_CLOSED, ...s });
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
        setClosed({ ...NOT_CLOSED, ...s });
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

  function addToCart(item: MenuItem, optionId: string | null, addonIds: string[], quantity: number, via?: Via) {
    const unit = unitPrice(item, optionId, addonIds);
    const key = lineKey(item.id, optionId, addonIds);
    setCart((c) => {
      const hit = c.find((l) => l.key === key);
      if (hit) return c.map((l) => (l.key === key ? { ...l, quantity: Math.min(20, l.quantity + quantity) } : l));
      return [...c, { key, itemId: item.id, optionId, addonIds, quantity, unit, ...(via ? { via } : {}) }];
    });
    setOpenItem(null);
    if (via !== "pairing") offerPairing(item);
  }

  function offerPairing(item: MenuItem) {
    if (nudged.current.has(item.id)) return;
    const next = pickNudge([item.id], new Set([...cart.map((l) => l.itemId), item.id]), pairings, signals, menu);
    if (!next) return;
    nudged.current.add(item.id);
    addSuggested(next, true);
  }

  // Simple dishes go straight in; dishes with choices open their sheet, which carries the "via".
  function addSuggested(next: MenuItem, asToast = false) {
    const go = () => (isSimple(next) ? addToCart(next, null, [], 1, "pairing") : setOpenItem({ item: next, via: "pairing" }));
    if (!asToast) return go();
    toast(t("goesWell"), {
      id: "pairing",
      description: pick(lang, next.name, next.name_ar),
      action: { label: `${t("add")} · ${money(next.price_fils)}`, onClick: go },
    });
  }

  // Simple items: the menu row stepper edits their single cart line.
  function setItemQty(item: MenuItem, quantity: number) {
    const key = lineKey(item.id, null, []);
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
        p_lines: attempt.lines.map((l) => ({
          item_id: l.itemId, option_id: l.optionId, addon_ids: l.addonIds ?? [], via: l.via ?? null, quantity: l.quantity, expected_price: l.unit,
        })),
        p_note: attempt.note || null,
        p_visit: visitId.current,
      });
      if (e) throw e;
      setPending(null);
      store.set(`cb-pending-${slug}`, null);
      saveUsual(restaurant.slug, toUsual(attempt.lines));
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
      .order("position", { referencedTable: "item_options" })
      .order("position", { referencedTable: "item_addons" });
    if (!data) return;
    const fresh = data as MenuItem[];
    setMenu(fresh);
    setCart((c) => reconcileCart(c, fresh));
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
  // Recognition over recall: last time's order, re-priced against today's menu. Only before anything is ordered.
  const usual = useMemo(() => (phase === "in" ? usualCart(loadUsual(restaurant.slug), menu) : []), [phase, menu, restaurant.slug]);
  const showUsual = usual.length > 0 && !cart.length && !orders.length && !restaurant.ordering_paused && !locked;

  const tokens = useMemo(() => brandTokens(restaurant.accent, restaurant.vibe), [restaurant.accent, restaurant.vibe]);
  // Portalled sheets, drawers and toasts render in <body>, outside the root below: put the brand on <html> too.
  useEffect(() => {
    const st = document.documentElement.style;
    for (const [k, v] of Object.entries(tokens)) st.setProperty(k, v);
    return () => Object.keys(tokens).forEach((k) => st.removeProperty(k));
  }, [tokens]);
  // Inline on the root as well, so the first server paint already wears the brand (no indigo flash).
  const branded = (node: React.ReactNode) => <div className="contents" style={tokens as React.CSSProperties}>{node}</div>;

  if (phase === "boot") {
    return branded(<div className="grid min-h-dvh place-items-center text-text-2">{t("joining")}</div>);
  }
  if (phase === "welcome") {
    return branded(
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
    return branded(
      <ClosedVisit
        restaurant={restaurant}
        paidMethod={closed.paid_method}
        rating={closed.last_visit ? closed.rating ?? 0 : null}
        onRate={async (rating, note) => {
          const { error: e } = await sb.rpc("leave_feedback", { p_visit: closed.last_visit, p_rating: rating, p_note: note });
          if (e) toast.error(t("rateFailed"));
          return !e;
        }}
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

  return branded(
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
            signals={signals}
            onOpen={(item, via) => setOpenItem({ item, via })}
            onQuickAdd={(i, via) => addToCart(i, null, [], 1, via)}
            onSetQty={setItemQty}
            top={
              showUsual && (
                <section aria-labelledby="usual-h" className="mx-5 mt-6 rounded-xl border bg-card p-4">
                  <h2 id="usual-h" className="text-[15px] font-medium">{t("yourUsual")}</h2>
                  <p className="mt-1 text-sm text-text-2">
                    {usual
                      .map((l) => {
                        const i = menu.find((m) => m.id === l.itemId)!; // usualCart keeps only dishes on the menu
                        return `${l.quantity > 1 ? `${l.quantity}× ` : ""}${pick(lang, i.name, i.name_ar)}`;
                      })
                      .join(" · ")}
                  </p>
                  <Button
                    className="mt-3 w-full"
                    onClick={() => {
                      setCart(usual);
                      setCartOpen(true);
                    }}
                  >
                    {t("orderUsual")} · <span className="tabular-nums">{money(usual.reduce((n, l) => n + l.unit * l.quantity, 0))}</span>
                  </Button>
                </section>
              )
            }
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
      {view === "table" && restaurant.instagram && (
        <a
          href={`https://instagram.com/${restaurant.instagram}`}
          target="_blank"
          rel="noopener noreferrer"
          className="mx-auto mb-[max(20px,env(safe-area-inset-bottom))] inline-flex min-h-12 items-center gap-1.5 px-4 text-sm text-text-2 underline-offset-4 hover:underline"
        >
          {t("followUs")} <span dir="ltr">@{restaurant.instagram}</span>
        </a>
      )}

      {view === "menu" && <CartBar count={cartCount} total={cartTotal} onOpen={() => { toast.dismiss("pairing"); setCartOpen(true); }} />}

      {openItem && (
        <ItemSheet
          key={openItem.item.id}
          item={openItem.item}
          disabled={restaurant.ordering_paused || locked}
          onClose={() => setOpenItem(null)}
          onAdd={(item, optionId, addonIds, qty) => addToCart(item, optionId, addonIds, qty, openItem.via)}
        />
      )}
      {cartOpen && (
        <CartSheet
          cart={pending?.lines ?? cart}
          setCart={setCart}
          menu={menu}
          suggestion={pending || locked ? null : pickNudge(cart.map((l) => l.itemId), new Set(cart.map((l) => l.itemId)), pairings, signals, menu)}
          onSuggest={(i) => {
            if (!isSimple(i)) setCartOpen(false);
            addSuggested(i);
          }}
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
