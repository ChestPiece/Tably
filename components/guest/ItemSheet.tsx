"use client";
import { useState } from "react";
import { useLang } from "@/lib/i18n";
import { formatMoney } from "@/lib/format";
import { pick, type MenuItem } from "@/lib/types";
import { Arch } from "@/components/app/arch";
import { QuantityStepper } from "@/components/app/quantity-stepper";
import { ResponsiveSheet } from "@/components/app/responsive-sheet";
import { Button } from "@/components/ui/button";

export function ItemSheet({
  item,
  disabled,
  onClose,
  onAdd,
}: {
  item: MenuItem;
  disabled: boolean;
  onClose: () => void;
  onAdd: (item: MenuItem, optionId: string | null, quantity: number) => void;
}) {
  const { lang, t } = useLang();
  const [optionId, setOptionId] = useState<string | null>(item.item_options[0]?.id ?? null);
  const [qty, setQty] = useState(1);
  const option = item.item_options.find((o) => o.id === optionId);
  const unit = item.price_fils + (option?.price_fils ?? 0);
  const name = pick(lang, item.name, item.name_ar);

  return (
    <ResponsiveSheet
      open
      onOpenChange={(o) => !o && onClose()}
      title={name}
      description={pick(lang, item.description, item.description_ar) || undefined}
      displayTitle
      media={item.image_url ? <Arch src={item.image_url} alt={name} width={184} height={224} className="mx-auto mt-2 mb-5" /> : undefined}
      footer={
        <div className="flex items-center gap-3">
          <QuantityStepper value={qty} min={1} max={20} onChange={setQty} labels={{ decrease: t("decrease"), increase: t("increase") }} />
          <Button className="flex-1 justify-between" disabled={disabled} onClick={() => onAdd(item, optionId, qty)}>
            <span>{t("add")}</span>
            <span className="tabular-nums">{formatMoney(unit * qty, lang)}</span>
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
              <span className="text-text-2 tabular-nums">{o.price_fils ? `+${formatMoney(o.price_fils, lang)}` : ""}</span>
            </label>
          ))}
        </fieldset>
      )}
      <p className="mt-4 text-sm text-text-2">{t("allergyNote")}</p>
    </ResponsiveSheet>
  );
}
