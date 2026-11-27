"use client";
// Item editor "Selling" fields (spec 2026-11-27, Phase 2): preset tags, pairings, add-ons.
import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, FieldError } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useLang } from "@/lib/i18n";
import { useVenue } from "@/lib/venue";
import { MENU_TAGS, pick, type ItemAddon, type MenuItem, type MenuTag } from "@/lib/types";

const TAG_KEY = { chef: "tagChef", new: "tagNew", spicy: "tagSpicy", veg: "tagVeg", signature: "tagSignature" } as const;

export function TagsField({ value, onChange }: { value: MenuTag[]; onChange: (v: MenuTag[]) => void }) {
  const { t } = useLang();
  return (
    <fieldset className="flex flex-col gap-1.5">
      <legend className="mb-1.5 text-sm font-medium">{t("tagsLabel")}</legend>
      <div className="flex flex-wrap gap-2">
        {MENU_TAGS.map((g) => {
          const on = value.includes(g);
          return (
            <Button
              key={g}
              type="button"
              size="sm"
              variant={on ? "default" : "outline"}
              aria-pressed={on}
              disabled={!on && value.length >= 3}
              onClick={() => onChange(on ? value.filter((x) => x !== g) : [...value, g])}
            >
              {t(TAG_KEY[g])}
            </Button>
          );
        })}
      </div>
      <p className="text-sm text-muted-foreground">{t("tagsHint")}</p>
    </fieldset>
  );
}

export function PairingsField({ itemId, menu, value, onChange }: { itemId: string; menu: MenuItem[]; value: string[]; onChange: (v: string[]) => void }) {
  const { lang, t } = useLang();
  const name = (id: string) => {
    const m = menu.find((i) => i.id === id);
    return m ? pick(lang, m.name, m.name_ar) : "—";
  };
  const choices = menu.filter((i) => i.id !== itemId && !value.includes(i.id));
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-sm font-medium" id="ie-pair-l">{t("pairsLabel")}</span>
      {value.length > 0 && (
        <ul className="flex flex-col gap-1">
          {value.map((id) => (
            <li key={id} className="flex min-h-10 items-center gap-2 rounded-md border px-3">
              <span className="min-w-0 flex-1 truncate text-sm">{name(id)}</span>
              <Button type="button" variant="ghost" size="icon-sm" className="text-muted-foreground" aria-label={`${t("remove")} ${name(id)}`} onClick={() => onChange(value.filter((x) => x !== id))}>
                <X aria-hidden />
              </Button>
            </li>
          ))}
        </ul>
      )}
      {value.length < 3 && choices.length > 0 && (
        <Select value="" onValueChange={(v) => onChange([...value, v])}>
          <SelectTrigger size="sm" className="w-full" aria-labelledby="ie-pair-l">
            <SelectValue placeholder={t("pairsAdd")} />
          </SelectTrigger>
          <SelectContent>
            {choices.map((i) => <SelectItem key={i.id} value={i.id}>{pick(lang, i.name, i.name_ar)}</SelectItem>)}
          </SelectContent>
        </Select>
      )}
      <p className="text-sm text-muted-foreground">{t("pairsHint")}</p>
    </div>
  );
}

export type AddonRow = ItemAddon & { aed: string };

export function AddonsField({
  rows,
  max,
  langField,
  dir,
  errs,
  onRows,
  onMax,
  newRow,
}: {
  rows: AddonRow[];
  max: number;
  langField: "name" | "name_ar";
  dir: "ltr" | "rtl";
  errs: Record<string, string>;
  onRows: (r: AddonRow[]) => void;
  onMax: (n: number) => void;
  newRow: () => AddonRow;
}) {
  const { t } = useLang();
  const { currency } = useVenue();
  const setRow = (i: number, patch: Partial<AddonRow>) => onRows(rows.map((x, n) => (n === i ? { ...x, ...patch } : x)));
  return (
    <div className="flex flex-col gap-2">
      <p className="mb-1 text-sm text-muted-foreground">{t("addonsHint")}</p>
      {rows.map((a, i) => (
        <div key={a.id} className="grid grid-cols-[minmax(0,1fr)_6rem_auto] items-start gap-2">
          <Field data-invalid={!!errs[`a${i}n`]}>
            <Input size="sm" dir={dir} placeholder={t("addonName")} aria-label={`${t("addonName")} ${i + 1}`} aria-invalid={!!errs[`a${i}n`]} value={a[langField]} onChange={(e) => setRow(i, { [langField]: e.target.value })} />
            {errs[`a${i}n`] && <FieldError>{errs[`a${i}n`]}</FieldError>}
          </Field>
          <Field data-invalid={!!errs[`a${i}p`]}>
            <div className="relative">
              <span aria-hidden className="pointer-events-none absolute inset-y-0 start-3 grid place-items-center text-sm text-muted-foreground">+</span>
              <Input size="sm" inputMode="decimal" dir="ltr" className="ps-6 text-start tabular-nums" aria-label={`${t("optExtra")} ${i + 1} (${currency})`} aria-invalid={!!errs[`a${i}p`]} value={a.aed} onChange={(e) => setRow(i, { aed: e.target.value })} />
            </div>
            {errs[`a${i}p`] && <FieldError>{errs[`a${i}p`]}</FieldError>}
          </Field>
          <Button type="button" variant="ghost" size="icon-sm" className="mt-0.5 text-muted-foreground" aria-label={`${t("remove")} ${i + 1}`} onClick={() => onRows(rows.filter((_, n) => n !== i))}>
            <X aria-hidden />
          </Button>
        </div>
      ))}
      <div className="flex flex-wrap items-center gap-3">
        <Button type="button" variant="ghost" size="sm" onClick={() => onRows([...rows, newRow()])}>
          <Plus aria-hidden /> {t("addAddon")}
        </Button>
        {rows.length > 0 && (
          <span className="ms-auto flex items-center gap-2 text-sm">
            <span id="ie-addon-max">{t("addonMax")}</span>
            <Select value={String(Math.min(max, rows.length))} onValueChange={(v) => onMax(Number(v))}>
              <SelectTrigger size="sm" className="w-20" aria-labelledby="ie-addon-max">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Array.from({ length: Math.min(10, rows.length) + 1 }, (_, n) => <SelectItem key={n} value={String(n)}>{n}</SelectItem>)}
              </SelectContent>
            </Select>
          </span>
        )}
      </div>
    </div>
  );
}
