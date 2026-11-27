"use client";
import { UtensilsCrossed } from "lucide-react";
import { EmptyState } from "@/components/app/empty-state";
import { Switch } from "@/components/ui/switch";
import { useLang } from "@/lib/i18n";
import { pick, type Category, type MenuItem } from "@/lib/types";
import { cn } from "@/lib/utils";

type Props = {
  categories: Category[];
  menu: MenuItem[];
  busy: ReadonlySet<string>;
  onToggle: (item: MenuItem) => void;
};

export function MenuToggles({ categories, menu, busy, onToggle }: Props) {
  const { lang, t } = useLang();
  if (menu.length === 0) return <EmptyState icon={UtensilsCrossed} title={t("menuEmpty")} />;
  const known = new Set(categories.map((c) => c.id));
  const orphans = menu.filter((i) => !known.has(i.category_id));
  const groups = [
    ...categories.map((c) => ({ c, items: menu.filter((i) => i.category_id === c.id) })),
    ...(orphans.length ? [{ c: { id: "other", name: t("otherCategory"), name_ar: t("otherCategory") } as Category, items: orphans }] : []),
  ].filter((g) => g.items.length);
  return (
    <div className="mx-auto flex w-full max-w-[720px] flex-col gap-4 p-5">
      <p className="text-sm text-text-2">{t("menuHint")}</p>
      {groups.map(({ c, items }) => (
        <section key={c.id} aria-labelledby={`cat-${c.id}`} className="flex flex-col gap-2">
          <h2 id={`cat-${c.id}`} className="px-1 text-[15px] font-semibold">
            {pick(lang, c.name, c.name_ar)}
          </h2>
          <ul className="divide-y rounded-lg border bg-card">
            {items.map((i) => {
              const name = pick(lang, i.name, i.name_ar);
              return (
                <li key={i.id} className="flex min-h-14 items-center gap-3 px-4">
                  <span className={cn("min-w-0 flex-1", !i.available && "text-muted-foreground line-through")}>{name}</span>
                  <Switch
                    checked={i.available}
                    disabled={!!busy?.has(i.id)}
                    onCheckedChange={() => onToggle(i)}
                    aria-label={`${name} ${t("availableSuffix")}`}
                    label={<span className="min-w-20 text-sm text-text-2">{t(i.available ? "available" : "soldOut")}</span>}
                  />
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}
