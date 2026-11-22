"use client";
import { ClipboardPaste, Loader2, X } from "lucide-react";
import { useState, type ClipboardEvent, type KeyboardEvent } from "react";
import { ResponsiveSheet } from "@/components/app/responsive-sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { MAX_MINOR, parseMinor } from "@/lib/format";
import { useLang } from "@/lib/i18n";
import { parseDishes, type DishDraft } from "@/lib/parse-dishes";
import type { Category } from "@/lib/types";
import { useVenue } from "@/lib/venue";
import type { AdminProps } from "./AdminApp";

type Row = DishDraft & { key: string; name_ar: string };
type Col = "name" | "name_ar" | "price" | "cost" | "category";
const START = 8;

const blank = (category: string): Row => ({ key: crypto.randomUUID(), name: "", name_ar: "", price: "", cost: "", category });
const filled = (r: Row) => !!(r.name.trim() || r.price.trim() || r.cost.trim() || r.name_ar.trim());

// Many dishes at once: type into a grid, or paste a list / spreadsheet rows. Photos and
// sizes are added per dish later in the normal editor.
export function BulkDishes({ sb, mutate, rid, open, onClose, categories, startPosition }: AdminProps & {
  rid: string;
  open: boolean;
  onClose: () => void;
  categories: Category[];
  startPosition: number;
}) {
  const { t } = useLang();
  const { digits, secondLang } = useVenue();
  const first = categories[0]?.name ?? "";
  const [rows, setRows] = useState<Row[]>(() => Array.from({ length: START }, () => blank(first)));
  const [paste, setPaste] = useState("");
  const [tried, setTried] = useState(false);
  const [saving, setSaving] = useState(false);
  const cols: Col[] = secondLang ? ["name", "name_ar", "price", "cost", "category"] : ["name", "price", "cost", "category"];

  const reset = () => (setRows(Array.from({ length: START }, () => blank(first))), setPaste(""), setTried(false));
  const close = () => (reset(), onClose());

  // Always one empty row at the end to type into.
  const withTail = (list: Row[]) => (list.length && !filled(list[list.length - 1]) ? list : [...list, blank(list.at(-1)?.category ?? first)]);
  const edit = (i: number, k: Col, v: string) => setRows((p) => withTail(p.map((r, n) => (n === i ? { ...r, [k]: v } : r))));

  // Parsed rows replace the empty rows from `at` onwards; filled rows above stay.
  const insert = (text: string, at = rows.findIndex((r) => !filled(r))) => {
    const parsed = parseDishes(text).map((d) => ({ ...blank(d.category || first), ...d, category: d.category || first }));
    if (!parsed.length) return false;
    setRows((p) => {
      const start = at < 0 ? p.length : at;
      const keep = p.slice(0, start);
      const rest = p.slice(start).filter(filled);
      return withTail([...keep, ...parsed, ...rest]);
    });
    return true;
  };

  const onCellPaste = (i: number) => (e: ClipboardEvent<HTMLInputElement>) => {
    const text = e.clipboardData.getData("text");
    if (!/[\n\t]/.test(text.trim())) return; // a single value pastes normally
    e.preventDefault();
    insert(text, i);
  };

  // Enter moves down a row in the same column, like a spreadsheet.
  const onKey = (i: number, k: Col) => (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== "Enter" || e.nativeEvent.isComposing) return;
    e.preventDefault();
    document.getElementById(`bd-${i + 1}-${k}`)?.focus();
  };

  const priceErr = (v: string, required: boolean) => {
    if (!v.trim()) return required ? t("badPrice") : "";
    const m = parseMinor(v, digits);
    return m === null ? t("badPrice") : m > MAX_MINOR ? t("priceTooHigh") : "";
  };
  const problems = (r: Row) =>
    filled(r) ? { name: r.name.trim() ? "" : t("required"), price: priceErr(r.price, true), cost: priceErr(r.cost, false) } : { name: "", price: "", cost: "" };

  const todo = rows.filter(filled);
  const bad = todo.filter((r) => Object.values(problems(r)).some(Boolean)).length;

  async function save() {
    setTried(true);
    if (!todo.length || bad) return void document.querySelector<HTMLElement>("#bulk-grid [aria-invalid=true]")?.focus();
    setSaving(true);
    const ok = await mutate(async () => {
      // Section names that don't exist yet become new categories.
      const byName = new Map(categories.map((c) => [c.name.trim().toLowerCase(), c.id]));
      const fresh = [...new Set(todo.map((r) => r.category.trim()).filter((n) => n && !byName.has(n.toLowerCase())))];
      if (fresh.length) {
        const add = fresh.map((name, j) => ({ id: crypto.randomUUID(), restaurant_id: rid, name, name_ar: "", position: categories.length + j + 1 }));
        const r0 = await sb.from("categories").insert(add);
        if (r0.error) return r0;
        add.forEach((c) => byName.set(c.name.toLowerCase(), c.id));
      }
      const items = todo.map((r, i) => ({
        id: crypto.randomUUID(),
        restaurant_id: rid,
        category_id: byName.get(r.category.trim().toLowerCase()) ?? categories[0].id,
        name: r.name.trim(),
        name_ar: r.name_ar.trim(),
        price_fils: parseMinor(r.price, digits)!,
        position: startPosition + i,
      }));
      const r1 = await sb.from("menu_items").insert(items);
      if (r1.error) return r1;
      const costs = todo.flatMap((r, i) => (r.cost.trim() ? [{ restaurant_id: rid, item_id: items[i].id, option_id: null, cost_fils: parseMinor(r.cost, digits)! }] : []));
      return costs.length ? sb.from("item_costs").insert(costs) : { error: null };
    }, t("dishesAdded").replace("{n}", String(todo.length)));
    setSaving(false);
    if (ok) close();
  }

  const label: Record<Col, string> = { name: t("nameEn"), name_ar: t("nameAr"), price: t("price"), cost: t("costShort"), category: t("categoryLabel") };
  const widths: Record<Col, string> = { name: "minmax(10rem,2fr)", name_ar: "minmax(9rem,1.5fr)", price: "7rem", cost: "7rem", category: "minmax(8rem,1fr)" };
  const grid = { gridTemplateColumns: `${cols.map((c) => widths[c]).join(" ")} 2.5rem` };

  return (
    <ResponsiveSheet
      open={open}
      onOpenChange={(o) => !o && close()}
      title={t("addSeveralTitle")}
      description={t("addSeveralDesc")}
      full
      grid
      footer={
        <div className="flex flex-wrap items-center justify-end gap-3">
          <p aria-live="polite" className="me-auto text-sm text-destructive">{tried && bad ? t("fixRows").replace("{n}", String(bad)) : ""}</p>
          <Button variant="ghost" size="sm" onClick={close}>{t("cancel")}</Button>
          <Button size="sm" data-primary onClick={save} disabled={saving || !todo.length}>
            {saving && <Loader2 aria-hidden className="animate-spin" />}
            {t("addNDishes").replace("{n}", String(todo.length))}
          </Button>
        </div>
      }
    >
      <div className="flex flex-col gap-6">
        <section className="flex flex-col gap-2 rounded-lg border bg-muted/40 p-4">
          <label htmlFor="bd-paste" className="text-sm font-medium">{t("pasteList")}</label>
          <Textarea
            id="bd-paste"
            rows={3}
            value={paste}
            onChange={(e) => setPaste(e.target.value)}
            placeholder={"Drinks\nChai - 80\nLassi 150"}
            aria-describedby="bd-paste-hint"
            className="font-mono text-sm"
          />
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p id="bd-paste-hint" className="text-sm text-muted-foreground">{t("pasteHint")}</p>
            <Button type="button" variant="secondary" size="sm" disabled={!paste.trim()} onClick={() => insert(paste) && setPaste("")}>
              <ClipboardPaste aria-hidden />
              {t("pasteAdd")}
            </Button>
          </div>
        </section>

        <div id="bulk-grid" role="table" aria-label={t("addSeveralTitle")} className="relative overflow-x-auto">
          <div role="row" className="grid min-w-fit gap-2 pb-2 text-sm font-medium text-muted-foreground" style={grid}>
            {cols.map((c) => <span key={c} role="columnheader">{label[c]}{c === "cost" && <span className="font-normal"> {t("optional")}</span>}</span>)}
            <span role="columnheader" className="sr-only">{t("remove")}</span>
          </div>
          <datalist id="bd-cats">{categories.map((c) => <option key={c.id} value={c.name} />)}</datalist>
          <div className="flex min-w-fit flex-col gap-2">
            {rows.map((r, i) => {
              const p = tried ? problems(r) : { name: "", price: "", cost: "" };
              return (
                <div key={r.key} role="row" className="grid items-start gap-2" style={grid}>
                  {cols.map((c) => {
                    const err = c === "name" || c === "price" || c === "cost" ? p[c] : "";
                    return (
                      <div key={c} role="cell" className="flex flex-col gap-1">
                        <Input
                          id={`bd-${i}-${c}`}
                          size="sm"
                          value={r[c]}
                          aria-label={`${label[c]}, ${t("rowN").replace("{n}", String(i + 1))}`}
                          aria-invalid={!!err}
                          title={err || undefined}
                          inputMode={c === "price" || c === "cost" ? "decimal" : undefined}
                          dir={c === "name_ar" ? "rtl" : c === "price" || c === "cost" ? "ltr" : undefined}
                          lang={c === "name_ar" ? "ar" : undefined}
                          list={c === "category" ? "bd-cats" : undefined}
                          maxLength={c === "price" || c === "cost" ? 12 : 80}
                          className={c === "price" || c === "cost" ? "tabular-nums" : undefined}
                          onChange={(e) => edit(i, c, e.target.value)}
                          onPaste={c === "name" ? onCellPaste(i) : undefined}
                          onKeyDown={onKey(i, c)}
                        />
                        {err && <span className="text-xs text-destructive">{err}</span>}
                      </div>
                    );
                  })}
                  <div role="cell">
                    {filled(r) && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        aria-label={`${t("remove")}: ${r.name || t("rowN").replace("{n}", String(i + 1))}`}
                        onClick={() => setRows((prev) => withTail(prev.filter((x) => x.key !== r.key)))}
                      >
                        <X aria-hidden />
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </ResponsiveSheet>
  );
}
