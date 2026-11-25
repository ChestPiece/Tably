"use client";
import Image from "next/image";
import { ChevronRight, ImagePlus, Loader2, Plus, Trash2, X } from "lucide-react";
import { useEffect, useState, type DragEvent } from "react";
import { ConfirmAction } from "@/components/app/confirm-action";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ResponsiveSheet } from "@/components/app/responsive-sheet";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { MAX_MINOR, minorToInput, parseMinor } from "@/lib/format";
import { useVenue } from "@/lib/venue";
import { errorText, useLang } from "@/lib/i18n";
import { pick, type Category, type ItemOption, type MenuItem } from "@/lib/types";
import type { AdminProps } from "./AdminApp";

type Props = AdminProps & {
  rid: string;
  /** null = closed */
  item: MenuItem | null;
  isNew: boolean;
  categories: Category[];
  onClose: () => void;
  onSaved: () => void;
  onDeleted: () => void;
};

// Keyed by item id so every opened item starts from fresh state.
export function ItemEditor({ item, ...rest }: Props) {
  return item ? <Editor key={item.id} item={item} {...rest} /> : null;
}

type OptRow = ItemOption & { aed: string; cost: string };
type LangId = "en" | "ar";
const LANGS = [
  { id: "en", label: "English", dir: "ltr", name: "name", desc: "description", tag: "badge", opt: "name", ek: "n" },
  { id: "ar", label: "العربية", dir: "rtl", name: "name_ar", desc: "description_ar", tag: "badge_ar", opt: "name_ar", ek: "a" },
] as const;
const MAX_PHOTO = 5 * 1024 * 1024;
const toRows = (m: MenuItem, digits: number, costs: Map<string | null, number> = new Map()): OptRow[] =>
  m.item_options.map((o) => ({ ...o, aed: minorToInput(o.price_fils, digits), cost: costs.has(o.id) ? minorToInput(costs.get(o.id)!, digits) : "" }));

function Editor({ sb, mutate, run, rid, item, isNew, categories, onClose, onSaved, onDeleted }: Props & { item: MenuItem }) {
  const { lang, t } = useLang();
  const { digits, currency, secondLang } = useVenue();
  // Arabic fields exist only when the restaurant has an Arabic menu.
  const langs = secondLang ? LANGS : LANGS.slice(0, 1);
  const filsToInput = (m: number) => minorToInput(m, digits);
  const parseFils = (v: string) => parseMinor(v, digits);
  const [d, setD] = useState(item);
  const [price, setPrice] = useState(filsToInput(item.price_fils));
  const [opts, setOpts] = useState(() => toRows(item, digits));
  const [cost, setCost] = useState("");
  const [initial, setInitial] = useState(() => JSON.stringify([item, filsToInput(item.price_fils), toRows(item, digits), ""]));
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [photoErr, setPhotoErr] = useState("");
  const [confirmClose, setConfirmClose] = useState(false);
  const [errs, setErrs] = useState<Record<string, string>>({});
  const [tab, setTab] = useState<LangId>(lang === "ar" && secondLang ? "ar" : "en");
  const [optsOpen, setOptsOpen] = useState(item.item_options.length > 0);
  const set = <K extends keyof MenuItem>(k: K, v: MenuItem[K]) => setD((p) => ({ ...p, [k]: v }));
  const dirty = JSON.stringify([d, price, opts, cost]) !== initial;

  // Costs are owner-only (item_costs), so they load here rather than with the guest-readable menu.
  useEffect(() => {
    if (isNew) return;
    sb.from("item_costs").select("option_id, cost_fils").eq("item_id", item.id).then(({ data }) => {
      if (!data?.length) return;
      const m = new Map(data.map((c) => [c.option_id as string | null, c.cost_fils as number]));
      const base = m.has(null) ? filsToInput(m.get(null)!) : "";
      const rows = toRows(item, digits, m);
      setCost(base);
      setOpts(rows);
      setInitial(JSON.stringify([item, filsToInput(item.price_fils), rows, base]));
    });
  }, [sb, item, isNew]); // eslint-disable-line react-hooks/exhaustive-deps -- digits is fixed per restaurant
  // Esc, overlay, X and Cancel all land here: ask before throwing away edits.
  const tryClose = () => (dirty ? setConfirmClose(true) : onClose());
  const badPrice = (f: number | null) => (f === null ? t("badPrice") : f > MAX_MINOR ? t("priceTooHigh") : "");

  async function upload(file: File | undefined) {
    if (!file) return;
    setPhotoErr("");
    if (!/^image\/(jpeg|png|webp)$/.test(file.type)) return setPhotoErr(t("photoType"));
    if (file.size > MAX_PHOTO) return setPhotoErr(t("photoTooBig"));
    setUploading(true);
    const path = `${rid}/${crypto.randomUUID()}.${file.name.split(".").pop()?.toLowerCase() || "jpg"}`;
    const { error } = await sb.storage.from("menu-images").upload(path, file, { contentType: file.type });
    setUploading(false);
    if (error) return setPhotoErr(errorText(lang, error));
    set("image_url", sb.storage.from("menu-images").getPublicUrl(path).data.publicUrl);
  }

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    upload(e.dataTransfer.files[0]);
  };

  async function save() {
    const e: Record<string, string> = {};
    if (!d.name.trim()) e.name = t("required");
    if (secondLang && !d.name_ar.trim()) e.name_ar = t("required");
    const fils = parseFils(price);
    if (badPrice(fils)) e.price = badPrice(fils);
    // Empty cost = not set (the Profit page counts those dishes as missing a cost).
    const costFils = cost.trim() ? parseFils(cost) : null;
    if (cost.trim() && badPrice(costFils)) e.cost = badPrice(costFils);
    const optFils = opts.map((o) => parseFils(o.aed));
    const optCost = opts.map((o) => (o.cost.trim() ? parseFils(o.cost) : null));
    opts.forEach((o, i) => {
      if (!o.name.trim()) e[`o${i}n`] = t("required");
      if (secondLang && !o.name_ar.trim()) e[`o${i}a`] = t("required");
      if (badPrice(optFils[i])) e[`o${i}p`] = badPrice(optFils[i]);
      if (o.cost.trim() && badPrice(optCost[i])) e[`o${i}c`] = badPrice(optCost[i]);
    });
    setErrs(e);
    const keys = Object.keys(e);
    if (keys.length) {
      // Jump to the language tab (and open options) holding the first error, then focus it.
      const en = keys.some((k) => k === "name" || /^o\d+n$/.test(k));
      const ar = keys.some((k) => k === "name_ar" || /^o\d+a$/.test(k));
      const next: LangId = en && (tab === "en" || !ar) ? "en" : ar ? "ar" : tab;
      setTab(next);
      if (keys.some((k) => k.startsWith("o"))) setOptsOpen(true);
      requestAnimationFrame(() => document.querySelector<HTMLElement>(`#ie-${next} [aria-invalid=true], #ie-price[aria-invalid=true], #ie-cost[aria-invalid=true], #item-editor details [aria-invalid=true]`)?.focus());
      return;
    }
    setSaving(true);
    const { item_options: _ignored, ...row } = d;
    void _ignored;
    const ok = await mutate(async () => {
      const r1 = await sb.from("menu_items").upsert({ ...row, price_fils: fils ?? 0, badge: row.badge || null, badge_ar: row.badge_ar || null });
      if (r1.error) return r1;
      const keep = opts.map((o) => o.id);
      const r2 = await sb.from("item_options").delete().eq("item_id", d.id).not("id", "in", `(${keep.length ? keep.join(",") : "00000000-0000-0000-0000-000000000000"})`);
      if (r2.error) return r2;
      if (opts.length) {
        const r3 = await sb.from("item_options").upsert(
          opts.map((o, i): ItemOption => ({ id: o.id, item_id: d.id, restaurant_id: rid, name: o.name, name_ar: o.name_ar, price_fils: optFils[i] ?? 0, position: i + 1 })),
        );
        if (r3.error) return r3;
      }
      // Replace this dish's costs; past orders keep their own snapshot.
      const r4 = await sb.from("item_costs").delete().eq("item_id", d.id);
      if (r4.error) return r4;
      const costRows = [
        { option_id: null as string | null, cost_fils: costFils },
        ...opts.map((o, i) => ({ option_id: o.id as string | null, cost_fils: optCost[i] })),
      ].filter((c) => c.cost_fils !== null);
      if (!costRows.length) return { error: null };
      return sb.from("item_costs").insert(costRows.map((c) => ({ ...c, restaurant_id: rid, item_id: d.id })));
    }, t("itemSaved"));
    setSaving(false);
    if (ok) onSaved();
  }

  const setOpt = (i: number, patch: Partial<OptRow>) => setOpts((p) => p.map((x, n) => (n === i ? { ...x, ...patch } : x)));
  const err = (k: string) => (errs[k] ? <FieldError>{errs[k]}</FieldError> : null);
  const itemName = pick(lang, d.name, d.name_ar);
  const pf = parseFils(price);
  const cf = parseFils(cost);
  const marginHint = pf && cf !== null && cf <= pf ? `${t("marginLabel")} ${Math.round(((pf - cf) / pf) * 100)}%` : t("costHint");

  const footer = (
    <div className="flex items-center gap-2">
      {!isNew && (
        <ConfirmAction
          tone="destructive"
          title={t("delItemTitle").replace("{n}", itemName)}
          description={t("delItemBody")}
          confirmLabel={t("delete")}
          cancelLabel={t("cancel")}
          onConfirm={async () => {
            await run(() => sb.from("menu_items").delete().eq("id", d.id), t("itemDeleted"));
            onDeleted();
          }}
          trigger={
            <Button type="button" variant="ghost" size="sm" className="text-destructive hover:text-destructive">
              <Trash2 aria-hidden /> {t("delete")}
            </Button>
          }
        />
      )}
      <Button type="button" variant="secondary" size="sm" className="ms-auto" onClick={tryClose}>{t("cancel")}</Button>
      <Button type="submit" form="item-editor" size="sm" disabled={!dirty || saving || uploading}>
        {saving && <Loader2 aria-hidden className="animate-spin" />}
        {t(saving ? "saving" : "save")}
      </Button>
    </div>
  );

  // Language tabs: one set of text fields per language instead of six paired inputs.
  const enErr = ["name", ...opts.map((_, i) => `o${i}n`)].some((k) => errs[k]);
  const arErr = ["name_ar", ...opts.map((_, i) => `o${i}a`)].some((k) => errs[k]);
  const flag = { en: enErr || (!!d.name_ar.trim() && !d.name.trim()), ar: arErr || (!!d.name.trim() && !d.name_ar.trim()) };
  const cur = LANGS.find((x) => x.id === tab)!;

  return (
    <ResponsiveSheet open onOpenChange={(o) => !o && !saving && tryClose()} title={t(isNew ? "newItem" : "editItem")} full rail footer={footer}>
      {/* Container queries: the editor lives in a ~360px rail on desktop, so viewport breakpoints would pick the wide layout. */}
      <div className="@container">
      <form
        id="item-editor"
        noValidate
        className="grid gap-8 @xl:grid-cols-[200px_minmax(0,1fr)]"
        onSubmit={(e) => {
          e.preventDefault();
          save();
        }}
      >
        <div className="@xl:sticky @xl:top-0 @xl:self-start">
          <div className="flex flex-col gap-1.5">
            <label
              onDragOver={(e) => e.preventDefault()}
              onDrop={onDrop}
              className="relative grid aspect-square w-32 cursor-pointer place-items-center @xl:w-full overflow-hidden rounded-lg border border-dashed border-input text-center text-xs text-muted-foreground transition-colors hover:bg-accent has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring"
            >
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="sr-only"
                disabled={uploading}
                aria-label={t(d.image_url ? "replacePhoto" : "addPhoto")}
                aria-invalid={!!photoErr}
                onChange={(e) => {
                  upload(e.target.files?.[0]);
                  e.target.value = "";
                }}
              />
              {d.image_url && <Image src={d.image_url} alt="" fill sizes="(min-width: 768px) 200px, 128px" className="object-cover" />}
              {(uploading || !d.image_url) && (
                <span className="relative flex flex-col items-center gap-1 px-1">
                  {uploading ? <Loader2 aria-hidden className="size-4 animate-spin" /> : <ImagePlus aria-hidden className="size-4" />}
                  {t(uploading ? "uploading" : "addPhoto")}
                </span>
              )}
            </label>
            {d.image_url && !uploading && (
              <Button type="button" variant="link" size="xs" className="self-start px-0 text-muted-foreground" aria-label={t("removePhoto")} onClick={() => set("image_url", null)}>
                {t("remove")}
              </Button>
            )}
          </div>
          {photoErr && <FieldError className="mt-1.5">{photoErr}</FieldError>}
        </div>

        <div className="flex min-w-0 flex-col gap-8">
          <section aria-labelledby="ie-sec-basics" className="flex flex-col gap-4">
            <h3 id="ie-sec-basics" className="text-sm font-semibold">{t("secBasics")}</h3>
            <Tabs value={tab} onValueChange={(v) => setTab(v as LangId)} className="gap-4">
              <TabsList className={langs.length > 1 ? "w-full" : "hidden"} aria-label={t("language")}>
                {langs.map((l) => (
                  <TabsTrigger key={l.id} value={l.id} lang={l.id} className="gap-2">
                    {l.label}
                    {flag[l.id] && <i role="img" aria-label={t("needsAttention")} className="size-1.5 rounded-full bg-ochre" />}
                  </TabsTrigger>
                ))}
              </TabsList>
              {langs.map((l) => (
                <TabsContent key={l.id} value={l.id} forceMount id={`ie-${l.id}`} className="flex flex-col gap-4 data-[state=inactive]:hidden">
                  <Field data-invalid={!!errs[l.name]}>
                    <FieldLabel htmlFor={`ie-name-${l.id}`}>{t("fName")}</FieldLabel>
                    <Input id={`ie-name-${l.id}`} size="sm" dir={l.dir} maxLength={80} value={d[l.name]} aria-invalid={!!errs[l.name]} onChange={(e) => set(l.name, e.target.value)} />
                    {err(l.name)}
                  </Field>
                  <Field>
                    <FieldLabel htmlFor={`ie-desc-${l.id}`}>
                      {t("fDesc")} <span className="font-normal text-muted-foreground">{t("optional")}</span>
                    </FieldLabel>
                    <Textarea id={`ie-desc-${l.id}`} dir={l.dir} rows={2} maxLength={400} className="min-h-16" value={d[l.desc]} onChange={(e) => set(l.desc, e.target.value)} />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor={`ie-tag-${l.id}`}>
                      {t("fTag")} <span className="font-normal text-muted-foreground">{t("optional")}</span>
                    </FieldLabel>
                    <Input id={`ie-tag-${l.id}`} size="sm" dir={l.dir} maxLength={40} value={d[l.tag] ?? ""} aria-describedby="ie-tag-hint" onChange={(e) => set(l.tag, e.target.value)} />
                  </Field>
                </TabsContent>
              ))}
              <p id="ie-tag-hint" className="-mt-2 text-sm text-muted-foreground">{t("tagHint")}</p>
            </Tabs>
            <Field>
              <FieldLabel htmlFor="ie-cat">{t("categoryLabel")}</FieldLabel>
              <Select value={d.category_id} onValueChange={(v) => set("category_id", v)}>
                <SelectTrigger id="ie-cat" size="sm" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((c) => <SelectItem key={c.id} value={c.id}>{pick(lang, c.name, c.name_ar)}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
          </section>

          <section aria-labelledby="ie-sec-price" className="flex flex-col gap-4 border-t pt-6">
            <h3 id="ie-sec-price" className="text-sm font-semibold">{t("secPrice")}</h3>
            <div className="grid gap-4 @sm:grid-cols-2">
              <Field data-invalid={!!errs.price}>
                <FieldLabel htmlFor="ie-price">{t("basePrice")}</FieldLabel>
                <div className="relative">
                  <Input id="ie-price" size="sm" inputMode="decimal" autoComplete="off" dir="ltr" className="pe-14 text-start tabular-nums" value={price} aria-invalid={!!errs.price} onChange={(e) => setPrice(e.target.value)} />
                  <span aria-hidden className="pointer-events-none absolute inset-y-0 end-3 grid place-items-center text-sm text-muted-foreground">{currency}</span>
                </div>
                {err("price")}
              </Field>
              <Field data-invalid={!!errs.cost}>
                <FieldLabel htmlFor="ie-cost">
                  {t("costToMake")} <span className="font-normal text-muted-foreground">{t("optional")}</span>
                </FieldLabel>
                <div className="relative">
                  <Input id="ie-cost" size="sm" inputMode="decimal" autoComplete="off" dir="ltr" className="pe-14 text-start tabular-nums" value={cost} aria-invalid={!!errs.cost} aria-describedby="ie-cost-hint" onChange={(e) => setCost(e.target.value)} />
                  <span aria-hidden className="pointer-events-none absolute inset-y-0 end-3 grid place-items-center text-sm text-muted-foreground">{currency}</span>
                </div>
                {err("cost") ?? <p id="ie-cost-hint" className="text-sm text-muted-foreground">{marginHint}</p>}
              </Field>
            </div>
          </section>

        <details open={optsOpen} onToggle={(e) => setOptsOpen(e.currentTarget.open)} className="group border-t pt-6">
          <summary className="flex min-h-10 cursor-pointer list-none items-center gap-2 font-medium [&::-webkit-details-marker]:hidden">
            <ChevronRight aria-hidden className="size-4 text-muted-foreground transition-transform group-open:rotate-90 rtl:-scale-x-100" />
            {t("sizesExtras")}
            {opts.length > 0 && <span className="font-normal text-muted-foreground tabular-nums">{opts.length}</span>}
          </summary>
          <div className="flex flex-col gap-2 pt-2">
            <p className="mb-1 text-sm text-muted-foreground">{t("optionsHint")}</p>
            {opts.map((o, i) => {
              const nk = `o${i}${cur.ek}`;
              return (
                <div key={o.id} className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] items-start gap-2 @sm:grid-cols-[minmax(0,1fr)_6rem_6rem_auto]">
                  <Field data-invalid={!!errs[nk]} className="col-span-3 @sm:col-span-1">
                    <Input size="sm" dir={cur.dir} aria-label={`${t("optName")} ${i + 1} (${cur.label})`} placeholder={t("optName")} aria-invalid={!!errs[nk]} value={o[cur.opt]} onChange={(e) => setOpt(i, { [cur.opt]: e.target.value })} />
                    {err(nk)}
                  </Field>
                  <Field data-invalid={!!errs[`o${i}p`]}>
                    <div className="relative">
                      <span aria-hidden className="pointer-events-none absolute inset-y-0 start-3 grid place-items-center text-sm text-muted-foreground">+</span>
                      <Input size="sm" aria-label={`${t("optExtra")} ${i + 1} (${currency})`} inputMode="decimal" dir="ltr" className="ps-6 text-start tabular-nums" aria-invalid={!!errs[`o${i}p`]} value={o.aed} onChange={(e) => setOpt(i, { aed: e.target.value })} />
                    </div>
                    {err(`o${i}p`)}
                  </Field>
                  <Field data-invalid={!!errs[`o${i}c`]}>
                    <Input size="sm" aria-label={`${t("optCost")} ${i + 1} (${currency})`} placeholder={t("costShort")} inputMode="decimal" dir="ltr" className="text-start tabular-nums" aria-invalid={!!errs[`o${i}c`]} value={o.cost} onChange={(e) => setOpt(i, { cost: e.target.value })} />
                    {err(`o${i}c`)}
                  </Field>
                  <Button type="button" variant="ghost" size="icon-sm" className="mt-0.5 text-muted-foreground" aria-label={`${t("removeOption")} ${i + 1}`} onClick={() => setOpts((p) => p.filter((_, n) => n !== i))}>
                    <X aria-hidden />
                  </Button>
                </div>
              );
            })}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="self-start"
              onClick={() => setOpts((p) => [...p, { id: crypto.randomUUID(), item_id: d.id, restaurant_id: rid, name: "", name_ar: "", price_fils: 0, position: p.length + 1, aed: filsToInput(0), cost: "" }])}
            >
              <Plus aria-hidden /> {t("addOption")}
            </Button>
          </div>
        </details>
        </div>
      </form>
      </div>
      <AlertDialog open={confirmClose} onOpenChange={setConfirmClose}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("discardTitle")}</AlertDialogTitle>
            <AlertDialogDescription>{t("discardBody")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("keepEditing")}</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={onClose}>{t("discard")}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </ResponsiveSheet>
  );
}
