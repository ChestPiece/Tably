"use client";
import { useState } from "react";
import { useLang } from "@/lib/i18n";
import { pick, type MenuItem } from "@/lib/types";
import { Arch } from "@/components/app/arch";
import { QuantityStepper } from "@/components/app/quantity-stepper";
import { ResponsiveSheet } from "@/components/app/responsive-sheet";
import { Button } from "@/components/ui/button";
import { useVenue } from "@/lib/venue";
import { unitPrice } from "@/lib/menu";

export function ItemSheet({
  item,
  disabled,
  onClose,
  onAdd,
}: {
  item: MenuItem;
  disabled: boolean;
  onClose: () => void;
  onAdd: (item: MenuItem, optionId: string | null, addonIds: string[], quantity: number) => void;
}) {
  const { lang, t } = useLang();
  const { money } = useVenue();
  const [optionId, setOptionId] = useState<string | null>(item.item_options[0]?.id ?? null);
  const [qty, setQty] = useState(1);
  const [addonIds, setAddonIds] = useState<string[]>([]);
  const addons = item.addon_max ? (item.item_addons ?? []) : [];
  const full = addonIds.length >= item.addon_max;
  const unit = unitPrice(item, optionId, addonIds);
  const name = pick(lang, item.name, item.name_ar);

  return (
    <ResponsiveSheet
      open
      onOpenChange={(o) => !o && onClose()}
      title={name}
      description={pick(lang, item.description, item.description_ar) || undefined}
      displayTitle
      media={item.image_url ? <Arch src={item.image_url} alt={name} width={184} height={224} className="mx-auto mt-2 mb-5 short:mb-2 short:h-28! short:w-23!" /> : undefined}
      footer={
        <div className="flex items-center gap-3">
          <QuantityStepper value={qty} min={1} max={20} onChange={setQty} labels={{ decrease: t("decrease"), increase: t("increase") }} />
          <Button className="flex-1 justify-between" disabled={disabled} onClick={() => onAdd(item, optionId, addonIds, qty)}>
            <span>{t("add")}</span>
            <span className="tabular-nums">{money(unit * qty)}</span>
          </Button>
        </div>
      }
    >
      {item.item_options.length > 0 && (
        <fieldset className="grid gap-2">
          <legend className="mb-2 text-[15px] font-medium">{t("choose")}</legend>
          {item.item_options.map((o) => (
            <label
              key={o.id}
              className="flex min-h-12 cursor-pointer items-center gap-3 rounded-md border border-input bg-card px-4 transition-colors duration-fast ease-sufra hover:border-text-2 has-[:checked]:border-foreground has-[:checked]:shadow-[inset_0_0_0_1px_var(--foreground)] has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring"
            >
              <input type="radio" name="option" checked={optionId === o.id} onChange={() => setOptionId(o.id)} className="size-[18px] accent-[var(--primary)] outline-none" />
              <span className="flex-1">{pick(lang, o.name, o.name_ar)}</span>
              <span className="text-text-2 tabular-nums">{o.price_fils ? `+${money(o.price_fils)}` : ""}</span>
            </label>
          ))}
        </fieldset>
      )}
      {addons.length > 0 && (
        <fieldset className="mt-5 grid gap-2">
          <legend className="mb-2 text-[15px] font-medium">
            {t("addOns")} <span className="font-normal text-text-2">· {t("upTo").replace("{n}", String(item.addon_max))}</span>
          </legend>
          {addons.map((a) => {
            const on = addonIds.includes(a.id);
            return (
              <label
                key={a.id}
                className="flex min-h-12 cursor-pointer items-center gap-3 rounded-md border border-input bg-card px-4 transition-colors duration-fast ease-sufra hover:border-text-2 has-[:checked]:border-foreground has-[:checked]:shadow-[inset_0_0_0_1px_var(--foreground)] has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-60"
              >
                <input
                  type="checkbox"
                  checked={on}
                  disabled={!on && full}
                  onChange={() => setAddonIds((ids) => (on ? ids.filter((x) => x !== a.id) : [...ids, a.id]))}
                  className="size-[18px] accent-[var(--primary)] outline-none"
                />
                <span className="flex-1">{pick(lang, a.name, a.name_ar)}</span>
                <span className="text-text-2 tabular-nums">{a.price_fils ? `+${money(a.price_fils)}` : ""}</span>
              </label>
            );
          })}
        </fieldset>
      )}
      <p className="mt-4 text-sm text-text-2">{t("allergyNote")}</p>
    </ResponsiveSheet>
  );
}
