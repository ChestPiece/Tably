"use client";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { Plus } from "lucide-react";
import { useLang } from "@/lib/i18n";
import { pick, type Category, type MenuItem } from "@/lib/types";
import { Arch } from "@/components/app/arch";
import { QuantityStepper } from "@/components/app/quantity-stepper";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useVenue } from "@/lib/venue";

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
  const { money } = useVenue();
  const sections = categories.map((c) => ({ c, items: menu.filter((i) => i.category_id === c.id) })).filter((s) => s.items.length);
  const [cat, setCat] = useState(sections[0]?.c.id ?? "");

  // Scrollspy: last section whose top passed the sticky header + index (112px); at page end, the last section
  // (short closing sections never reach the top). Paused briefly after a tap so smooth scroll doesn't flicker.
  const tapLock = useRef(0);
  useEffect(() => {
    const els = [...document.querySelectorAll<HTMLElement>("section[id^='cat-']")];
    const onScroll = () => {
      if (performance.now() < tapLock.current) return;
      const atEnd = innerHeight + scrollY >= document.documentElement.scrollHeight - 2;
      const el = atEnd ? els.at(-1) : els.findLast((s) => s.getBoundingClientRect().top <= 130);
      if (el ?? els[0]) setCat((el ?? els[0]).id.slice(4));
    };
    addEventListener("scroll", onScroll, { passive: true });
    return () => removeEventListener("scroll", onScroll);
  }, [sections.length]);

  const jump = (id: string, at: number) => {
    tapLock.current = at + 1000;
    setCat(id);
    document.getElementById(`cat-${id}`)?.scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
  };

  return (
    <>
      <nav aria-label={t("menu")} className="sticky top-16 z-20 overflow-x-auto border-b bg-background px-3 [scrollbar-width:none]">
        <ul className="flex h-12 items-stretch gap-1">
          {sections.map(({ c }) => (
            <li key={c.id} className="flex">
              <a
                href={`#cat-${c.id}`}
                aria-current={cat === c.id ? "true" : undefined}
                onClick={(e) => {
                  e.preventDefault();
                  jump(c.id, e.timeStamp);
                }}
                className="flex items-center border-b-2 border-transparent px-2 text-sm font-medium whitespace-nowrap text-text-2 outline-none focus-visible:ring-2 focus-visible:ring-ring aria-[current]:border-foreground aria-[current]:text-foreground"
              >
                {pick(lang, c.name, c.name_ar)}
              </a>
            </li>
          ))}
        </ul>
      </nav>

      {sections.map(({ c, items }) => {
        const featured = items.find((i) => i.badge && i.image_url);
        const rest = items.filter((i) => i !== featured);
        return (
          <section key={c.id} id={`cat-${c.id}`} aria-labelledby={`cat-h-${c.id}`} className="scroll-mt-28 px-5 pt-8">
            <h2 id={`cat-h-${c.id}`} className="border-b border-foreground pb-2 font-display text-[28px] leading-[1.1] font-semibold">
              {pick(lang, c.name, c.name_ar)}
            </h2>
            {featured && (
              <button
                type="button"
                onClick={() => onOpen(featured)}
                disabled={disabled || !featured.available}
                className="group relative mt-4 block h-[200px] w-full overflow-hidden rounded-lg text-start outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed"
              >
                <Image
                  src={featured.image_url!}
                  alt={pick(lang, featured.name, featured.name_ar)}
                  fill
                  priority={c.id === sections[0].c.id}
                  sizes="(max-width: 560px) 100vw, 560px"
                  className={cn("object-cover transition-transform duration-slow ease-sufra [@media(hover:hover)]:group-hover:scale-[1.02]", !featured.available && "grayscale")}
                />
                <span className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 bg-photo-scrim px-4 py-3 text-on-photo">
                  <b className="font-display text-[22px] leading-[1.15] font-semibold">{pick(lang, featured.name, featured.name_ar)}</b>
                  <span className="font-medium whitespace-nowrap tabular-nums">
                    {featured.available ? money(featured.price_fils) : t("soldOut")}
                  </span>
                </span>
              </button>
            )}
            <ul>
              {rest.map((i) => (
                <DishRow key={i.id} item={i} qty={inCart(i.id)} disabled={disabled} onOpen={onOpen} onQuickAdd={onQuickAdd} onSetQty={onSetQty} />
              ))}
            </ul>
          </section>
        );
      })}
      <p className="px-5 pt-6 pb-8 text-sm text-text-2">{t("allergyNote")}</p>
    </>
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
  const { money } = useVenue();
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
          <span className={cn("flex items-baseline-last gap-2", out && "text-muted-foreground")}>
            <span className="min-w-0 font-display text-[20px] leading-[1.2] font-semibold">{name}</span>
            <span aria-hidden className="leader" />
            <span className="font-medium whitespace-nowrap tabular-nums">{money(i.price_fils)}</span>
          </span>
          <span className="line-clamp-2 text-sm leading-[1.45] text-text-2">{pick(lang, i.description, i.description_ar)}</span>
        </button>
        <div className="mt-3 flex min-h-10 items-center justify-end">{control}</div>
      </div>
      <Arch src={i.image_url} alt="" width={80} height={96} className={cn(out && "[&_img]:opacity-60 [&_img]:grayscale")} />
    </li>
  );
}
