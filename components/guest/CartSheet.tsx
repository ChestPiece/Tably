"use client";
import type { Dispatch, SetStateAction } from "react";
import { useLang } from "@/lib/i18n";
import { pick, type MenuItem } from "@/lib/types";
import { QuantityStepper } from "@/components/app/quantity-stepper";
import { ResponsiveSheet } from "@/components/app/responsive-sheet";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { CartLine } from "./GuestApp";
import { useVenue } from "@/lib/venue";

export function CartSheet({
  cart,
  setCart,
  menu,
  suggestion,
  onSuggest,
  note,
  setNote,
  total,
  busy,
  locked,
  paused,
  error,
  onSend,
  onClose,
}: {
  cart: CartLine[];
  setCart: Dispatch<SetStateAction<CartLine[]>>;
  menu: MenuItem[];
  /** One "complete your meal" dish (owner pairing or co-ordered), or null. */
  suggestion: MenuItem | null;
  onSuggest: (i: MenuItem) => void;
  note: string;
  setNote: (n: string) => void;
  total: number;
  busy: boolean;
  locked: boolean;
  paused: boolean;
  error: string;
  onSend: () => void;
  onClose: () => void;
}) {
  const { lang, t } = useLang();
  const { money } = useVenue();
  const setQty = (key: string, q: number) => setCart((c) => (q <= 0 ? c.filter((x) => x.key !== key) : c.map((x) => (x.key === key ? { ...x, quantity: q } : x))));
  // A pending (uncertain) submit can always be retried; a fresh one waits while ordering is paused.
  const blocked = !cart.length || busy || (paused && !locked);

  return (
    <ResponsiveSheet
      open
      onOpenChange={(o) => !o && onClose()}
      title={t("yourOrder")}
      displayTitle
      footer={
        <div className="flex flex-col-reverse gap-3 min-[480px]:flex-row">
          <Button variant="secondary" onClick={onClose}>
            {t("keep")}
          </Button>
          <Button className="min-w-0 justify-between min-[480px]:flex-1" disabled={blocked} onClick={onSend}>
            <span className="truncate">{busy ? t("sending") : locked ? t("retrySafe") : t("placeOrder")}</span>
            <span className="tabular-nums">{money(total)}</span>
          </Button>
        </div>
      }
    >
      {!cart.length ? (
        <p className="py-6 text-text-2">{t("emptyCart")}</p>
      ) : (
        <>
          <ul>
            {cart.map((l) => {
              const item = menu.find((i) => i.id === l.itemId);
              const opt = item?.item_options.find((o) => o.id === l.optionId);
              const extras = [opt && pick(lang, opt.name, opt.name_ar), ...(item?.item_addons ?? []).filter((a) => l.addonIds?.includes(a.id)).map((a) => pick(lang, a.name, a.name_ar))].filter(Boolean);
              return (
                <li key={l.key} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-2 border-b py-4">
                  <div className="col-span-2 min-w-0">
                    <p className="flex items-baseline-last gap-2">
                      <b className="min-w-0 font-display text-lg leading-[1.2] font-semibold">{item ? pick(lang, item.name, item.name_ar) : "—"}</b>
                      <span aria-hidden className="leader" />
                      <span className="font-medium whitespace-nowrap tabular-nums">{money(l.unit * l.quantity)}</span>
                    </p>
                    {extras.length > 0 && <small className="text-sm text-text-2">{extras.join(", ")}</small>}
                  </div>
                  {locked ? (
                    <span className="text-sm text-text-2 tabular-nums">× {l.quantity}</span>
                  ) : (
                    <>
                      <div className="justify-self-start">
                        <QuantityStepper value={l.quantity} min={1} max={20} onChange={(q) => setQty(l.key, q)} labels={{ decrease: t("decrease"), increase: t("increase") }} />
                      </div>
                      <Button variant="link" size="xs" className="justify-self-end" onClick={() => setQty(l.key, 0)}>
                        {t("remove")}
                      </Button>
                    </>
                  )}
                </li>
              );
            })}
          </ul>

          {suggestion && (
            <div className="mt-4 flex items-center gap-3 rounded-md border bg-card px-4 py-3">
              <div className="min-w-0 flex-1">
                <p className="text-sm text-text-2">{t("completeMeal")}</p>
                <p className="truncate font-medium">
                  {pick(lang, suggestion.name, suggestion.name_ar)} <span className="font-normal text-text-2 tabular-nums">· {money(suggestion.price_fils)}</span>
                </p>
              </div>
              <Button variant="secondary" size="xs" onClick={() => onSuggest(suggestion)} aria-label={`${t("add")} ${pick(lang, suggestion.name, suggestion.name_ar)}`}>
                {t("add")}
              </Button>
            </div>
          )}

          <label className="mt-4 grid gap-2">
            <span className="text-sm font-medium">{t("noteLabel")}</span>
            <Textarea value={note} disabled={locked} onChange={(e) => setNote(e.target.value.slice(0, 200))} placeholder={t("notePlaceholder")} rows={2} className="min-h-0 resize-none" />
          </label>

          <div className="mt-5 flex items-baseline justify-between border-t-[3px] border-double border-foreground pt-3">
            <span className="font-medium">{t("total")}</span>
            <span className="text-lg font-semibold tabular-nums">{money(total)}</span>
          </div>
          <p className="mt-1 text-sm text-text-2">{t("payAfter")}</p>
        </>
      )}

      {paused && !locked && <p className="mt-4 rounded-md bg-muted px-4 py-3 text-sm">{t("paused")}</p>}
      {error && (
        <p role="alert" className="mt-4 rounded-md bg-danger-bg px-4 py-3 text-sm text-destructive">
          {error}
        </p>
      )}
    </ResponsiveSheet>
  );
}
