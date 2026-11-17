"use client";
import Image from "next/image";
import { useState } from "react";
import { Plus } from "lucide-react";
import { useLang } from "@/lib/i18n";
import { formatMoney } from "@/lib/format";
import { pick, type Category, type MenuItem } from "@/lib/types";
import { Arch } from "@/components/app/arch";
import { QuantityStepper } from "@/components/app/quantity-stepper";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

export function MenuView({
  categories,
  menu,
  disabled,
  inCart,
  onOpen,
  onQuickAdd,
  onSetQty,
}: {
  categories: Category[];
  menu: MenuItem[];
  disabled: boolean;
  /** Quantity of an item already in the cart (all options summed). */
  inCart: (itemId: string) => number;
  onOpen: (i: MenuItem) => void;
  onQuickAdd: (i: MenuItem) => void;
  onSetQty: (i: MenuItem, qty: number) => void;
}) {
  const { lang, t } = useLang();
  const sections = categories.map((c) => ({ c, items: menu.filter((i) => i.category_id === c.id) })).filter((s) => s.items.length);
  const [cat, setCat] = useState(sections[0]?.c.id ?? "");

  return (
    <Tabs value={cat} onValueChange={setCat} className="gap-0">
      <div className="sticky top-16 z-20 overflow-x-auto border-b bg-background px-1 [scrollbar-width:none]">
        <TabsList variant="underline" className="h-auto">
          {sections.map(({ c }) => (
            <TabsTrigger key={c.id} value={c.id}>
              {pick(lang, c.name, c.name_ar)}
            </TabsTrigger>
          ))}
        </TabsList>
      </div>

      {sections.map(({ c, items }) => {
        const featured = items.find((i) => i.badge && i.image_url);
        const rest = items.filter((i) => i !== featured);
        return (
          <TabsContent key={c.id} value={c.id} className="px-5 pt-4 pb-6">
            {featured && (
              <button
                type="button"
                onClick={() => onOpen(featured)}
                disabled={disabled || !featured.available}
                className="group relative mb-2 block h-[200px] w-full overflow-hidden rounded-lg text-start outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed"
              >
                <Image
                  src={featured.image_url!}
                  alt={pick(lang, featured.name, featured.name_ar)}
                  fill
                  priority
                  sizes="(max-width: 560px) 100vw, 560px"
                  className={cn("object-cover transition-transform duration-slow ease-sufra [@media(hover:hover)]:group-hover:scale-[1.02]", !featured.available && "grayscale")}
                />
                <span className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 bg-gradient-to-t from-[var(--photo-scrim)] to-transparent px-4 pt-10 pb-4 text-[var(--on-photo)]">
                  <b className="font-display text-[22px] leading-[1.15] font-semibold">{pick(lang, featured.name, featured.name_ar)}</b>
                  <span className="font-medium whitespace-nowrap tabular-nums">
                    {featured.available ? formatMoney(featured.price_fils, lang) : t("soldOut")}
                  </span>
                </span>
              </button>
            )}
            <ul>
              {rest.map((i) => (
                <DishRow key={i.id} item={i} qty={inCart(i.id)} disabled={disabled} onOpen={onOpen} onQuickAdd={onQuickAdd} onSetQty={onSetQty} />
              ))}
            </ul>
            <p className="pt-6 text-sm text-text-2">{t("allergyNote")}</p>
          </TabsContent>
        );
      })}
    </Tabs>
  );
}

function DishRow({
  item: i,
  qty,
  disabled,
  onOpen,
  onQuickAdd,
  onSetQty,
}: {
  item: MenuItem;
  qty: number;
  disabled: boolean;
  onOpen: (i: MenuItem) => void;
  onQuickAdd: (i: MenuItem) => void;
  onSetQty: (i: MenuItem, qty: number) => void;
}) {
  const { lang, t } = useLang();
  const name = pick(lang, i.name, i.name_ar);
  const simple = i.item_options.length === 0;
  const out = !i.available;

  let control;
  if (out) control = <span className="text-sm text-text-2">{t("soldOut")}</span>;
  else if (qty && simple)
    control = (
      <QuantityStepper
        filled
        value={qty}
        min={1}
        max={20}
        onChange={(q) => onSetQty(i, q)}
        labels={{ decrease: t("decrease"), increase: t("increase"), remove: t("remove") }}
      />
    );
  else
    control = (
      <Button variant="secondary" size="xs" disabled={disabled} aria-label={`${t("add")} ${name}`} onClick={() => (simple ? onQuickAdd(i) : onOpen(i))}>
        <Plus aria-hidden />
        {t("add")}
        {qty ? ` · ${qty}` : ""}
      </Button>
    );

  return (
    <li className={cn("grid gap-4 border-b py-4 last:border-0", i.image_url ? "grid-cols-[minmax(0,1fr)_80px]" : "grid-cols-1")}>
      <div className="min-w-0">
        <button
          type="button"
          onClick={() => onOpen(i)}
          disabled={disabled || out}
          className="grid w-full gap-1 rounded-sm text-start outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-default"
        >
          <span className={cn("font-display text-[19px] leading-[1.2] font-semibold", out && "text-muted-foreground")}>{name}</span>
          <span className="line-clamp-2 text-sm leading-[1.45] text-text-2">{pick(lang, i.description, i.description_ar)}</span>
        </button>
        <div className="mt-3 flex min-h-10 items-center justify-between gap-3">
          <span className={cn("font-medium tabular-nums", out && "text-muted-foreground")}>{formatMoney(i.price_fils, lang)}</span>
          {control}
        </div>
      </div>
      <Arch src={i.image_url} alt="" width={80} height={96} className={cn(out && "[&_img]:opacity-60 [&_img]:grayscale")} />
    </li>
  );
}
