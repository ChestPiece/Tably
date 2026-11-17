"use client";
import { Loader2, Pencil, Plus, Trash2, UtensilsCrossed } from "lucide-react";
import { useState } from "react";
import { ConfirmAction } from "@/components/app/confirm-action";
import { EmptyState } from "@/components/app/empty-state";
import { ResponsiveSheet } from "@/components/app/responsive-sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { tr, useLang } from "@/lib/i18n";
import { pick, type Category, type MenuItem, type Restaurant } from "@/lib/types";
import type { AdminProps } from "./AdminApp";
import { ItemEditor } from "./ItemEditor";
import { ItemsTable } from "./ItemsTable";

type Props = AdminProps & {
  restaurant: Restaurant;
  categories: Category[];
  menu: MenuItem[];
  editing: MenuItem | null;
  onEdit: (i: MenuItem | null) => void;
};

export function blankItem(rid: string, categories: Category[], menu: MenuItem[]): MenuItem {
  return {
    id: crypto.randomUUID(),
    restaurant_id: rid,
    category_id: categories[0]?.id ?? "",
    name: "",
    name_ar: "",
    description: "",
    description_ar: "",
    price_fils: 0,
    image_url: null,
    available: true,
    badge: null,
    badge_ar: null,
    position: menu.length + 1,
    item_options: [],
  };
}

export function MenuAdmin({ sb, mutate, run, restaurant, categories, menu, editing, onEdit }: Props) {
  const { lang, t } = useLang();
  const [cat, setCat] = useState("all");
  const [managing, setManaging] = useState(false);
  const [busyId, setBusyId] = useState("");
  const rid = restaurant.id;
  const current = categories.some((c) => c.id === cat) ? cat : "all";
  const items = current === "all" ? menu : menu.filter((i) => i.category_id === current);
  const count = (id: string) => menu.filter((i) => i.category_id === id).length;

  const toggle = async (i: MenuItem) => {
    setBusyId(i.id);
    await mutate(() => sb.from("menu_items").update({ available: !i.available }).eq("id", i.id));
    setBusyId("");
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center gap-3">
        <ToggleGroup
          type="single"
          variant="segmented"
          value={current}
          onValueChange={(v) => v && setCat(v)}
          aria-label={t("categories")}
          className="max-w-full overflow-x-auto"
        >
          {[{ id: "all", label: t("allItems"), n: menu.length }, ...categories.map((c) => ({ id: c.id, label: pick(lang, c.name, c.name_ar), n: count(c.id) }))].map((c) => (
            <ToggleGroupItem key={c.id} value={c.id} className="h-9 px-4 whitespace-nowrap">
              {c.label}
              <span className="ms-1.5 text-muted-foreground tabular-nums">{c.n}</span>
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
        <Button variant="secondary" size="sm" className="ms-auto" onClick={() => setManaging(true)}>
          <Pencil aria-hidden />
          {t("editCategories")}
        </Button>
      </div>

      {items.length ? (
        <ItemsTable
          items={items}
          busyId={busyId}
          catName={(id) => {
            const c = categories.find((x) => x.id === id);
            return c ? pick(lang, c.name, c.name_ar) : "—";
          }}
          onEdit={(i) => onEdit(structuredClone(i))}
          onToggle={toggle}
        />
      ) : (
        <div className="rounded-lg border">
          <EmptyState icon={UtensilsCrossed} title={t(menu.length ? "noItemsInCategory" : "menuEmpty")} body={t("noItemsBody")} />
        </div>
      )}

      <ItemEditor
        sb={sb}
        mutate={mutate}
        run={run}
        rid={rid}
        item={editing}
        categories={categories}
        isNew={!!editing && !menu.some((m) => m.id === editing.id)}
        onClose={() => onEdit(null)}
        onSaved={() => onEdit(null)}
        onDeleted={() => onEdit(null)}
      />

      <ResponsiveSheet open={managing} onOpenChange={setManaging} title={t("editCategories")} description={t("editCategoriesBody")}>
        <div className="flex flex-col gap-4 pt-2">
          {categories.map((c) => (
            <CategoryRow key={c.id} c={c} used={count(c.id) > 0} sb={sb} mutate={mutate} run={run} />
          ))}
          <Button
            variant="secondary"
            size="sm"
            className="self-start"
            onClick={() => mutate(() => sb.from("categories").insert({ restaurant_id: rid, name: tr("en", "newCategoryName"), name_ar: tr("ar", "newCategoryName"), position: categories.length + 1 }), t("categoryAdded"))}
          >
            <Plus aria-hidden /> {t("addCategory")}
          </Button>
        </div>
      </ResponsiveSheet>
    </div>
  );
}

function CategoryRow({ c, used, sb, mutate, run }: AdminProps & { c: Category; used: boolean }) {
  const { lang, t } = useLang();
  const [saving, setSaving] = useState(false);
  // Save on Enter or blur, only when the value changed.
  // An empty value or a failed save puts the stored name back in the field.
  const save = async (el: HTMLInputElement, col: "name" | "name_ar") => {
    const v = el.value.trim();
    if (!v) el.value = c[col];
    if (!v || v === c[col]) return;
    setSaving(true);
    const ok = await mutate(() => sb.from("categories").update({ [col]: v }).eq("id", c.id), t("categorySaved"));
    if (!ok) el.value = c[col];
    setSaving(false);
  };
  const input = (col: "name" | "name_ar", label: string) => (
    <Input
      aria-label={label}
      dir={col === "name_ar" ? "rtl" : undefined}
      size="sm"
      maxLength={60}
      defaultValue={c[col]}
      onBlur={(e) => save(e.currentTarget, col)}
      onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
    />
  );
  return (
    <div className="flex flex-col gap-1">
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
      <div className="grid flex-1 gap-2 sm:grid-cols-2">
        {input("name", t("catNameEn"))}
        {input("name_ar", t("catNameAr"))}
      </div>
      <div className="flex items-center justify-end gap-1">
        {saving && <Loader2 aria-hidden className="size-4 animate-spin text-muted-foreground" />}
        <ConfirmAction
          tone="destructive"
          title={t("delCatTitle").replace("{n}", pick(lang, c.name, c.name_ar))}
          description={t("delCatBody")}
          confirmLabel={t("delete")}
          cancelLabel={t("cancel")}
          onConfirm={() => run(() => sb.from("categories").delete().eq("id", c.id), t("categoryDeleted"))}
          trigger={
            <Button variant="ghost" size="icon" disabled={used} aria-label={t("deleteCategory")}>
              <Trash2 aria-hidden />
            </Button>
          }
        />
      </div>
    </div>
    {used && <p className="text-sm text-muted-foreground">{t("moveItemsFirst")}</p>}
    </div>
  );
}
