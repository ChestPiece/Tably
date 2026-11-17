"use client";
import type { Dispatch, SetStateAction } from "react";
import { useLang } from "@/lib/i18n";
import { formatMoney } from "@/lib/format";
import { pick, type MenuItem } from "@/lib/types";
import { QuantityStepper } from "@/components/app/quantity-stepper";
import { ResponsiveSheet } from "@/components/app/responsive-sheet";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { CartLine } from "./GuestApp";

export function CartSheet({
  cart,
  setCart,
  menu,
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
          <Button className="min-w-0 flex-1 justify-between" disabled={blocked} onClick={onSend}>
            <span className="truncate">{busy ? t("sending") : locked ? t("retrySafe") : t("placeOrder")}</span>
            <span className="tabular-nums">{formatMoney(total, lang)}</span>
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
              return (
                <li key={l.key} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-2 border-b py-4">
                  <div className="min-w-0">
                    <b className="block font-display text-lg leading-[1.2] font-semibold">{item ? pick(lang, item.name, item.name_ar) : "—"}</b>
                    {opt && <small className="text-sm text-text-2">{pick(lang, opt.name, opt.name_ar)}</small>}
                  </div>
                  <span className="text-end font-medium tabular-nums">{formatMoney(l.unit * l.quantity, lang)}</span>
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

          <label className="mt-4 grid gap-2">
            <span className="text-sm font-medium">{t("noteLabel")}</span>
            <Textarea value={note} disabled={locked} onChange={(e) => setNote(e.target.value.slice(0, 200))} placeholder={t("notePlaceholder")} rows={2} className="min-h-0 resize-none" />
          </label>

          <div className="mt-5 flex items-baseline justify-between">
            <span className="font-medium">{t("total")}</span>
            <span className="text-lg font-semibold tabular-nums">{formatMoney(total, lang)}</span>
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
