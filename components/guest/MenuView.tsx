"use client";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { Plus } from "lucide-react";
import { useLang } from "@/lib/i18n";
import { pick, type Category, type MenuItem, type MenuTag } from "@/lib/types";
import { isSimple, rankSection, type Signals, type Via } from "@/lib/menu";
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
  signals,
  top,
}: {
  categories: Category[];
  signals: Signals;
  /** Shown above Quick picks (the returning guest's usual). */
  top?: React.ReactNode;
  menu: MenuItem[];
  disabled: boolean;
  /** Quantity of an item already in the cart (all options summed). */
  inCart: (itemId: string) => number;
  onOpen: (i: MenuItem, via?: Via) => void;
  onQuickAdd: (i: MenuItem, via?: Via) => void;
  onSetQty: (i: MenuItem, qty: number) => void;
}) {
  const { lang, t } = useLang();
  const { money } = useVenue();
  const popular = new Set(signals.popular);
  // Hick's law: a short row of real best-sellers, only once there is enough data to mean something.
  const quick = signals.quick.map((id) => menu.find((i) => i.id === id)).filter((i): i is MenuItem => !!i?.available);
  const sections = categories.map((c) => ({ c, items: menu.filter((i) => i.category_id === c.id) })).filter((s) => s.items.length);
  const [cat, setCat] = useState(sections[0]?.c.id ?? "");

  // Scrollspy: last section whose top passed the sticky header + index (112px); at page end, the last section
  // (short closing sections never reach the top). Paused briefly after a tap so smooth scroll doesn't flicker.
  const tapLock = useRef(0);
  useEffect(() => {
    const els = [...document.querySelectorAll<HTMLElement>("section[id^='cat-']")];
    let frame = 0; // one layout read per frame, not per scroll event
    const check = () => {
      frame = 0;
      if (performance.now() < tapLock.current) return;
      const atEnd = innerHeight + scrollY >= document.documentElement.scrollHeight - 2;
      const el = atEnd ? els.at(-1) : els.findLast((s) => s.getBoundingClientRect().top <= 130);
      if (el ?? els[0]) setCat((el ?? els[0]).id.slice(4));
    };
    const onScroll = () => void (frame ||= requestAnimationFrame(check));
    addEventListener("scroll", onScroll, { passive: true });
    return () => {
      removeEventListener("scroll", onScroll);
      cancelAnimationFrame(frame);
    };
  }, [sections.length]);

  const jump = (id: string, at: number) => {
    tapLock.current = at + 1000;
    setCat(id);
    document.getElementById(`cat-${id}`)?.scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
  };

  return (
    <>
      <nav aria-label={t("menu")} className="sticky top-[calc(4rem+env(safe-area-inset-top))] z-20 overflow-x-auto scroll-cue border-b bg-background px-3 [scrollbar-width:none]">
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

      {top}
      {quick.length >= 3 && (
        <section aria-labelledby="quick-h" className="pt-6">
          <h2 id="quick-h" className="px-5 text-[15px] font-medium">{t("quickPicks")}</h2>
          <ul className="mt-2 flex snap-x gap-2 overflow-x-auto scroll-cue px-5 pb-1 [scrollbar-width:none]">
            {quick.map((i) => {
              const name = pick(lang, i.name, i.name_ar);
              return (
                <li key={i.id} className="shrink-0 snap-start">
                  <button
                    type="button"
                    disabled={disabled}
                    aria-label={`${t("add")} ${name}`}
                    onClick={() => (isSimple(i) ? onQuickAdd(i, "quick") : onOpen(i, "quick"))}
                    className="flex min-h-12 max-w-56 items-center gap-2 rounded-full border bg-card py-1.5 ps-4 pe-1.5 text-start outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60"
                  >
                    <span className="truncate text-[15px] font-medium">{name}</span>
                    <span className="text-sm whitespace-nowrap text-text-2 tabular-nums">{money(i.price_fils)}</span>
                    <span aria-hidden className="grid size-9 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground">
                      <Plus className="size-4" />
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {sections.map(({ c, items }) => {
        const { hero: featured, rest } = rankSection(items);
        return (
          <section key={c.id} id={`cat-${c.id}`} aria-labelledby={`cat-h-${c.id}`} className="scroll-mt-[calc(7rem+env(safe-area-inset-top))] px-5 pt-8">
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
                <Tags item={featured} popular={popular.has(featured.id)} className="absolute start-3 top-3" onPhoto />
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
                <DishRow key={i.id} item={i} popular={popular.has(i.id)} qty={inCart(i.id)} disabled={disabled} onOpen={onOpen} onQuickAdd={onQuickAdd} onSetQty={onSetQty} />
              ))}
            </ul>
          </section>
        );
      })}
      <p className="px-5 pt-6 pb-8 text-sm text-text-2">{t("allergyNote")}</p>
    </>
  );
}

const TAG_KEY = { chef: "tagChef", new: "tagNew", spicy: "tagSpicy", veg: "tagVeg", signature: "tagSignature" } as const;

// Text chips only (no emoji). "Popular" is computed from real orders, never typed.
function Tags({ item, popular, className, onPhoto }: { item: MenuItem; popular: boolean; className?: string; onPhoto?: boolean }) {
  const { lang, t } = useLang();
  const badge = item.badge ? pick(lang, item.badge, item.badge_ar) : "";
  const tags = (item.tags ?? []) as MenuTag[];
  if (!popular && !badge && !tags.length) return null;
  const chip = onPhoto ? "bg-background/90 text-foreground" : "border text-text-2";
  return (
    <span className={cn("flex flex-wrap gap-1.5", className)}>
      {popular && <span className="rounded-full bg-primary px-2 py-0.5 text-xs font-medium text-primary-foreground">{t("tagPopular")}</span>}
      {badge && <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium", chip)}>{badge}</span>}
      {tags.map((g) => (
        <span key={g} className={cn("rounded-full px-2 py-0.5 text-xs", chip)}>{t(TAG_KEY[g])}</span>
      ))}
    </span>
  );
}

function DishRow({
  item: i,
  popular,
  qty,
  disabled,
  onOpen,
  onQuickAdd,
  onSetQty,
}: {
  item: MenuItem;
  popular: boolean;
  qty: number;
  disabled: boolean;
  onOpen: (i: MenuItem) => void;
  onQuickAdd: (i: MenuItem) => void;
  onSetQty: (i: MenuItem, qty: number) => void;
}) {
  const { lang, t } = useLang();
  const { money } = useVenue();
  const name = pick(lang, i.name, i.name_ar);
  const simple = isSimple(i);
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
        <Tags item={i} popular={popular} className="mt-2" />
        <div className="mt-3 flex min-h-10 items-center justify-end">{control}</div>
      </div>
      <Arch src={i.image_url} alt="" width={80} height={96} className={cn(out && "[&_img]:opacity-60 [&_img]:grayscale")} />
    </li>
  );
}
