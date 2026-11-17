"use client";
import Image from "next/image";
import { ImagePlus, Loader2, Plus, Trash2, X } from "lucide-react";
import { useState, type DragEvent } from "react";
import { ConfirmAction } from "@/components/app/confirm-action";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ResponsiveSheet } from "@/components/app/responsive-sheet";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel, FieldLegend, FieldSet } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { MAX_FILS, filsToInput, parseFils } from "@/lib/format";
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

type OptRow = ItemOption & { aed: string };
const MAX_PHOTO = 5 * 1024 * 1024;
const toRows = (m: MenuItem): OptRow[] => m.item_options.map((o) => ({ ...o, aed: filsToInput(o.price_fils) }));

function Editor({ sb, mutate, run, rid, item, isNew, categories, onClose, onSaved, onDeleted }: Props & { item: MenuItem }) {
  const { lang, t } = useLang();
  const [d, setD] = useState(item);
  const [price, setPrice] = useState(filsToInput(item.price_fils));
  const [opts, setOpts] = useState(() => toRows(item));
  const [initial] = useState(() => JSON.stringify([item, filsToInput(item.price_fils), toRows(item)]));
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [photoErr, setPhotoErr] = useState("");
  const [confirmClose, setConfirmClose] = useState(false);
  const [errs, setErrs] = useState<Record<string, string>>({});
  const set = <K extends keyof MenuItem>(k: K, v: MenuItem[K]) => setD((p) => ({ ...p, [k]: v }));
  const dirty = JSON.stringify([d, price, opts]) !== initial;
  // Esc, overlay, X and Cancel all land here: ask before throwing away edits.
  const tryClose = () => (dirty ? setConfirmClose(true) : onClose());
  const badPrice = (f: number | null) => (f === null ? t("badPrice") : f > MAX_FILS ? t("priceTooHigh") : "");

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
    if (!d.name_ar.trim()) e.name_ar = t("required");
    const fils = parseFils(price);
    if (badPrice(fils)) e.price = badPrice(fils);
    const optFils = opts.map((o) => parseFils(o.aed));
    opts.forEach((o, i) => {
      if (!o.name.trim()) e[`o${i}n`] = t("required");
      if (!o.name_ar.trim()) e[`o${i}a`] = t("required");
      if (badPrice(optFils[i])) e[`o${i}p`] = badPrice(optFils[i]);
    });
    setErrs(e);
    if (Object.keys(e).length) return document.querySelector<HTMLElement>("#item-editor [aria-invalid=true]")?.focus();
    setSaving(true);
    const { item_options: _ignored, ...row } = d;
    void _ignored;
    const ok = await mutate(async () => {
      const r1 = await sb.from("menu_items").upsert({ ...row, price_fils: fils ?? 0, badge: row.badge || null, badge_ar: row.badge_ar || null });
      if (r1.error) return r1;
      const keep = opts.map((o) => o.id);
      const r2 = await sb.from("item_options").delete().eq("item_id", d.id).not("id", "in", `(${keep.length ? keep.join(",") : "00000000-0000-0000-0000-000000000000"})`);
      if (r2.error) return r2;
      if (!opts.length) return { error: null };
      return sb.from("item_options").upsert(
        opts.map((o, i): ItemOption => ({ id: o.id, item_id: d.id, restaurant_id: rid, name: o.name, name_ar: o.name_ar, price_fils: optFils[i] ?? 0, position: i + 1 })),
      );
    }, t("itemSaved"));
    setSaving(false);
    if (ok) onSaved();
  }

  const setOpt = (i: number, patch: Partial<OptRow>) => setOpts((p) => p.map((x, n) => (n === i ? { ...x, ...patch } : x)));
  const err = (k: string) => (errs[k] ? <FieldError>{errs[k]}</FieldError> : null);
  const itemName = pick(lang, d.name, d.name_ar);

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

  return (
    <ResponsiveSheet open onOpenChange={(o) => !o && !saving && tryClose()} title={t(isNew ? "newItem" : "editItem")} side="right" full footer={footer}>
      <form
        id="item-editor"
        noValidate
        className="flex flex-col gap-6 pt-2"
        onSubmit={(e) => {
          e.preventDefault();
          save();
        }}
      >
        <FieldGroup className="gap-4">
          <Field data-invalid={!!errs.name}>
            <FieldLabel htmlFor="ie-name">{t("nameEn")}</FieldLabel>
            <Input id="ie-name" size="sm" maxLength={80} value={d.name} aria-invalid={!!errs.name} onChange={(e) => set("name", e.target.value)} />
            {err("name")}
          </Field>
          <Field data-invalid={!!errs.name_ar}>
            <FieldLabel htmlFor="ie-name-ar">{t("nameAr")}</FieldLabel>
            <Input id="ie-name-ar" size="sm" dir="rtl" maxLength={80} value={d.name_ar} aria-invalid={!!errs.name_ar} onChange={(e) => set("name_ar", e.target.value)} />
            {err("name_ar")}
          </Field>
          <Field>
            <FieldLabel htmlFor="ie-desc">{t("descEn")}</FieldLabel>
            <Textarea id="ie-desc" rows={3} maxLength={400} value={d.description} onChange={(e) => set("description", e.target.value)} />
          </Field>
          <Field>
            <FieldLabel htmlFor="ie-desc-ar">{t("descAr")}</FieldLabel>
            <Textarea id="ie-desc-ar" dir="rtl" rows={3} maxLength={400} value={d.description_ar} onChange={(e) => set("description_ar", e.target.value)} />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field data-invalid={!!errs.price}>
              <FieldLabel htmlFor="ie-price">{t("basePrice")}</FieldLabel>
              <div className="relative">
                <Input id="ie-price" size="sm" inputMode="decimal" autoComplete="off" dir="ltr" className="pe-14 text-start tabular-nums" value={price} aria-invalid={!!errs.price} onChange={(e) => setPrice(e.target.value)} />
                <span aria-hidden className="pointer-events-none absolute inset-y-0 end-3 grid place-items-center text-sm text-muted-foreground">{t("aed")}</span>
              </div>
              {err("price")}
            </Field>
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
            <Field>
              <FieldLabel htmlFor="ie-badge">{t("badgeEn")}</FieldLabel>
              <Input id="ie-badge" size="sm" maxLength={40} value={d.badge ?? ""} onChange={(e) => set("badge", e.target.value)} />
            </Field>
            <Field>
              <FieldLabel htmlFor="ie-badge-ar">{t("badgeAr")}</FieldLabel>
              <Input id="ie-badge-ar" size="sm" dir="rtl" maxLength={40} value={d.badge_ar ?? ""} onChange={(e) => set("badge_ar", e.target.value)} />
            </Field>
            <FieldDescription className="-mt-2 sm:col-span-2">{t("badgeHint")}</FieldDescription>
          </div>
        </FieldGroup>

        <Field data-invalid={!!photoErr}>
          <FieldLabel htmlFor="ie-photo">{t("photo")}</FieldLabel>
          <div className="flex items-center gap-2">
            <label
              onDragOver={(e) => e.preventDefault()}
              onDrop={onDrop}
              className="relative flex min-h-28 flex-1 cursor-pointer flex-col items-center justify-center overflow-hidden rounded-lg border border-dashed border-input p-3 text-center text-sm text-muted-foreground transition-colors hover:bg-accent has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring"
            >
              <input id="ie-photo" type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" disabled={uploading} onChange={(e) => { upload(e.target.files?.[0]); e.target.value = ""; }} />
              {d.image_url && <Image src={d.image_url} alt="" fill sizes="(min-width: 640px) 36rem, 100vw" className="object-cover" />}
              <span className={d.image_url ? "relative flex items-center gap-2 rounded-md border bg-background px-3 py-1.5 text-foreground" : "flex flex-col items-center gap-1"}>
                {uploading ? <Loader2 aria-hidden className="size-4 animate-spin" /> : <ImagePlus aria-hidden className="size-4" />}
                {uploading ? t("uploading") : d.image_url ? t("replacePhoto") : t("dropPhoto")}
              </span>
            </label>
            {d.image_url && (
              <Button type="button" variant="ghost" size="icon" aria-label={t("removePhoto")} onClick={() => set("image_url", null)}>
                <Trash2 aria-hidden />
              </Button>
            )}
          </div>
          {photoErr ? <FieldError>{photoErr}</FieldError> : <FieldDescription>{t("photoHint")}</FieldDescription>}
        </Field>

        <FieldSet>
          <FieldLegend variant="label">{t("optionsLabel")}</FieldLegend>
          <FieldDescription>{t("optionsHint")}</FieldDescription>
          <div className="flex flex-col gap-3">
            {opts.map((o, i) => (
              <div key={o.id} className="grid grid-cols-2 items-start gap-2 rounded-lg border p-3">
                <Field data-invalid={!!errs[`o${i}n`]}>
                  <Input aria-label={t("optNameEn")} placeholder={t("optNameEn")} aria-invalid={!!errs[`o${i}n`]} value={o.name} onChange={(e) => setOpt(i, { name: e.target.value })} />
                  {err(`o${i}n`)}
                </Field>
                <Field data-invalid={!!errs[`o${i}a`]}>
                  <Input aria-label={t("optNameAr")} placeholder={t("optNameAr")} dir="rtl" aria-invalid={!!errs[`o${i}a`]} value={o.name_ar} onChange={(e) => setOpt(i, { name_ar: e.target.value })} />
                  {err(`o${i}a`)}
                </Field>
                <Field data-invalid={!!errs[`o${i}p`]}>
                  <Input aria-label={`${t("optExtra")} (${t("aed")})`} placeholder={`${t("optExtra")} (${t("aed")})`} inputMode="decimal" dir="ltr" className="text-start tabular-nums" aria-invalid={!!errs[`o${i}p`]} value={o.aed} onChange={(e) => setOpt(i, { aed: e.target.value })} />
                  {err(`o${i}p`)}
                </Field>
                <Button type="button" variant="ghost" size="icon" className="justify-self-end text-muted-foreground" aria-label={t("removeOption")} onClick={() => setOpts((p) => p.filter((_, n) => n !== i))}>
                  <X aria-hidden />
                </Button>
              </div>
            ))}
          </div>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="self-start"
            onClick={() => setOpts((p) => [...p, { id: crypto.randomUUID(), item_id: d.id, restaurant_id: rid, name: "", name_ar: "", price_fils: 0, position: p.length + 1, aed: "0.00" }])}
          >
            <Plus aria-hidden /> {t("addOption")}
          </Button>
        </FieldSet>
      </form>
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
