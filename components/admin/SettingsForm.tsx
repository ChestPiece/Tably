"use client";
import { Check, Eye, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { ResponsiveSheet } from "@/components/app/responsive-sheet";
import { useMediaQuery } from "@/hooks/use-media-query";
import { useLang, type Key } from "@/lib/i18n";
import type { Restaurant } from "@/lib/types";
import { isCurrency, timeZones } from "@/lib/venue";
import type { AdminProps } from "./AdminApp";
import { LogoField, logoProblem, uploadLogo } from "./LogoField";
import { BrandPreview, CoverField, ColorField, HANDLE, HEX, VibeField, cleanHandle, logoColors } from "./BrandFields";

// A whole row is the tap target for its switch.
function SwitchRow({ title, desc, checked, onChange }: { title: string; desc: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-5 border-b py-4">
      <span className="flex flex-col gap-0.5">
        <span className="font-medium">{title}</span>
        <span className="text-sm text-muted-foreground">{desc}</span>
      </span>
      <Switch checked={checked} onCheckedChange={onChange} />
    </label>
  );
}

// Owner changes their own password. Re-checks the current one first, so an unattended
// signed-in laptop can't be used to lock the owner out.
function PasswordForm({ sb, email }: { sb: AdminProps["sb"]; email: string }) {
  const { t } = useLang();
  const [cur, setCur] = useState("");
  const [next, setNext] = useState("");
  const [again, setAgain] = useState("");
  const [err, setErr] = useState<Key | "">("");
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (next.length < 8) return setErr("weakPassword");
    if (next !== again) return setErr("passwordMismatch");
    setBusy(true);
    setErr("");
    const check = await sb.auth.signInWithPassword({ email, password: cur });
    const upd = check.error ? null : await sb.auth.updateUser({ password: next });
    setBusy(false);
    if (check.error) return setErr("wrongCurrent");
    if (upd?.error) return setErr(upd.error.code === "same_password" ? "samePassword" : upd.error.code === "weak_password" ? "weakPassword" : "signupFailed");
    setCur("");
    setNext("");
    setAgain("");
    toast.success(t("passwordSaved"));
  }

  const field = (id: string, label: Key, value: string, set: (v: string) => void, auto: string) => (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium">{t(label)}</label>
      <Input id={id} type="password" size="sm" autoComplete={auto} value={value} onChange={(e) => (set(e.target.value), err && setErr(""))} aria-invalid={!!err} aria-describedby="pw-err" />
    </div>
  );

  return (
    <form
      noValidate
      className="grid max-w-[640px] gap-x-5 gap-y-4 sm:grid-cols-2"
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
    >
      <p className="text-sm text-muted-foreground sm:col-span-2">{t("accountDesc").replace("{n}", email)}</p>
      <input type="email" autoComplete="username" value={email} readOnly hidden />
      <div className="sm:col-span-2 sm:max-w-[calc(50%-10px)]">{field("pw-cur", "currentPassword", cur, setCur, "current-password")}</div>
      {field("pw-new", "newPassword", next, setNext, "new-password")}
      {field("pw-again", "confirmPassword", again, setAgain, "new-password")}
      <p id="pw-err" aria-live="polite" className="min-h-5 text-sm text-destructive sm:col-span-2">{err && t(err)}</p>
      <div className="sm:col-span-2">
        <Button type="submit" size="sm" disabled={busy || !cur || !next}>
          {busy && <Loader2 aria-hidden className="animate-spin" />}
          {t("savePassword")}
        </Button>
      </div>
    </form>
  );
}

type Section = "general" | "ordering" | "branding" | "language" | "account";
const SECTIONS: [Section, Key][] = [
  ["general", "secGeneral"],
  ["ordering", "secOrdering"],
  ["branding", "secBranding"],
  ["language", "secLanguage"],
  ["account", "accountTitle"],
];

export function SettingsForm({ sb, restaurant, mutate, email }: AdminProps & { restaurant: Restaurant; email: string }) {
  const { lang, t } = useLang();
  const [logoBusy, setLogoBusy] = useState(false);
  const [logoErr, setLogoErr] = useState("");
  const [d, setD] = useState(restaurant);
  const [sec, setSec] = useState<Section>("general");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [errs, setErrs] = useState<{ name?: string; name_ar?: string; currency?: string; accent?: string; instagram?: string; review?: string }>({});
  const [swatches, setSwatches] = useState<string[]>([]);
  const [coverBusy, setCoverBusy] = useState(false);
  const [coverErr, setCoverErr] = useState("");
  // Preview sits in the right rail from 1280px; below that the owner opens it on demand.
  const xl = useMediaQuery("(min-width: 1280px)");
  const [previewPick, setPreviewPick] = useState<boolean | null>(null);
  const previewOpen = sec === "branding" && (previewPick ?? xl);
  const [zones] = useState(timeZones);
  const ar = d.second_lang === "ar";
  const set = <K extends keyof Restaurant>(k: K, v: Restaurant[K]) => setD((p) => ({ ...p, [k]: v }));

  // Swatches for a logo saved earlier (storage serves public files with CORS).
  useEffect(() => {
    if (!restaurant.logo_url) return;
    fetch(restaurant.logo_url).then((r) => r.blob()).then(logoColors).then(setSwatches, () => {});
  }, [restaurant.logo_url]);

  useEffect(() => {
    if (!saved) return;
    const id = setTimeout(() => setSaved(false), 2500);
    return () => clearTimeout(id);
  }, [saved]);

  const text = (k: "name" | "name_ar" | "tagline" | "tagline_ar", label: Key, max: number, rtl = false) => {
    const err = k === "name" || k === "name_ar" ? errs[k] : undefined;
    return (
      <div className="flex flex-col gap-1.5">
        <label htmlFor={`st-${k}`} className="text-sm font-medium">{t(label)}</label>
        <Input
          id={`st-${k}`}
          size="sm"
          dir={rtl ? "rtl" : undefined}
          lang={rtl ? "ar" : undefined}
          maxLength={max}
          value={d[k]}
          aria-invalid={!!err}
          aria-describedby={`st-${k}-err`}
          onChange={(e) => set(k, e.target.value)}
        />
        <p id={`st-${k}-err`} className="min-h-5 text-sm text-destructive">{err}</p>
      </div>
    );
  };

  async function pickLogo(file: File) {
    const bad = logoProblem(file);
    setLogoErr(bad ? t(bad) : "");
    if (bad) return;
    setLogoBusy(true);
    logoColors(file).then(setSwatches);
    const r = await uploadLogo(sb, d.id, file, lang);
    setLogoBusy(false);
    if (r.error) return setLogoErr(r.error);
    set("logo_url", r.url!);
  }

  async function pickCover(file: File) {
    const bad = logoProblem(file);
    setCoverErr(bad ? t(bad) : "");
    if (bad) return;
    setCoverBusy(true);
    const r = await uploadLogo(sb, d.id, file, lang, "cover");
    setCoverBusy(false);
    if (r.error) return setCoverErr(r.error);
    set("cover_url", r.url!);
  }

  async function submit() {
    const e = {
      name: d.name.trim() ? undefined : t("required"),
      // Arabic stays optional: an empty Arabic name falls back to English for guests.
      currency: isCurrency(d.currency) ? undefined : t("badCurrency"),
      accent: HEX.test(d.accent) ? undefined : t("badHex"),
      instagram: HANDLE.test(d.instagram) ? undefined : t("badHandle"),
      review: !d.google_review_url?.trim() || /^https:\/\/\S+$/.test(d.google_review_url.trim()) ? undefined : t("badReviewUrl"),
    };
    setErrs(e);
    if (e.name || e.currency || e.accent || e.instagram || e.review) {
      setSec(e.name || e.currency ? "general" : "branding");
      return void setTimeout(() => document.querySelector<HTMLElement>("#settings-form [aria-invalid=true]")?.focus());
    }
    setSaving(true);
    // Success shows on the button (Saved ✓), not as a toast. Errors still toast via mutate.
    const ok = await mutate(() =>
      sb
        .from("restaurants")
        .update({
          name: d.name.trim(),
          name_ar: d.name_ar.trim(),
          tagline: d.tagline,
          tagline_ar: d.tagline_ar,
          logo_url: d.logo_url,
          currency: d.currency,
          timezone: d.timezone,
          second_lang: d.second_lang,
          service_mode: d.service_mode,
          ordering_paused: d.ordering_paused,
          pin_required: d.pin_required,
          accent: d.accent.toUpperCase(),
          vibe: d.vibe,
          cover_url: d.cover_url,
          welcome_note: d.welcome_note.trim(),
          welcome_note_ar: d.welcome_note_ar.trim(),
          instagram: d.instagram,
          google_review_url: d.google_review_url?.trim() || null,
        })
        .eq("id", d.id),
    );
    setSaving(false);
    setSaved(ok);
  }

  const show = (id: Section) => (sec === id ? undefined : true);
  return (
    // One section at a time. All sections share one draft, so switching never loses edits; Save writes them all.
    <div className="grid gap-8 lg:grid-cols-[176px_minmax(0,1fr)]">
      <nav aria-label={t("settingsSections")} className="max-lg:-mx-1 max-lg:overflow-x-auto max-lg:scroll-cue">
        <ul className="flex gap-1 lg:flex-col">
          {SECTIONS.map(([id, label]) => (
            <li key={id}>
              <button
                type="button"
                aria-current={sec === id || undefined}
                onClick={() => setSec(id)}
                className="h-10 w-full rounded-md px-3 text-start text-sm font-medium whitespace-nowrap text-muted-foreground outline-none hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring aria-[current]:bg-muted aria-[current]:text-foreground"
              >
                {t(label)}
              </button>
            </li>
          ))}
        </ul>
      </nav>
      <div className="min-w-0">
        <form
          id="settings-form"
          noValidate
          hidden={sec === "account"}
          className="grid max-w-[640px] gap-x-5 gap-y-2 sm:grid-cols-2"
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
        >
          <div hidden={show("general")} className="contents">
            {text("name", "nameEn", 60)}
            {text("tagline", "taglineEn", 150)}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="st-currency" className="text-sm font-medium">{t("currencyLabel")}</label>
              <Input
                id="st-currency"
                size="sm"
                dir="ltr"
                maxLength={3}
                autoComplete="off"
                autoCapitalize="characters"
                spellCheck={false}
                className="w-28 uppercase"
                value={d.currency}
                aria-invalid={!!errs.currency}
                aria-describedby="st-currency-hint"
                onChange={(e) => set("currency", e.target.value.toUpperCase())}
              />
              <p id="st-currency-hint" className={errs.currency ? "text-sm text-destructive" : "text-sm text-muted-foreground"}>{errs.currency ?? t("currencyHint")}</p>
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="st-tz" className="text-sm font-medium">{t("timezoneLabel")}</label>
              <Select value={d.timezone} onValueChange={(v) => set("timezone", v)}>
                <SelectTrigger id="st-tz" size="sm" className="w-full" aria-describedby="st-tz-hint">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="max-h-80">
                  {zones.map((z) => <SelectItem key={z} value={z}>{z.replaceAll("_", " ")}</SelectItem>)}
                </SelectContent>
              </Select>
              <p id="st-tz-hint" className="text-sm text-muted-foreground">{t("timezoneHint")}</p>
            </div>
          </div>
          <div hidden={show("ordering")} className="contents">
            <div className="flex flex-col gap-1.5 sm:col-span-2">
              <label htmlFor="st-service" className="text-sm font-medium">{t("serviceStyle")}</label>
              <Select value={d.service_mode} onValueChange={(v) => set("service_mode", v as Restaurant["service_mode"])}>
                <SelectTrigger id="st-service" size="sm" className="w-full sm:max-w-[calc(50%-10px)]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="table">{t("serviceTable")}</SelectItem>
                  <SelectItem value="counter">{t("serviceCounter")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="mt-4 border-t sm:col-span-2">
              <SwitchRow title={t("pauseOrdering")} desc={t("pauseOrderingDesc")} checked={d.ordering_paused} onChange={(v) => set("ordering_paused", v)} />
              <SwitchRow title={t("requireCode")} desc={t("requireCodeDesc")} checked={d.pin_required} onChange={(v) => set("pin_required", v)} />
            </div>
          </div>
          <div hidden={show("branding")} className="grid gap-6 sm:col-span-2">
            <LogoField name={d.name} src={d.logo_url} busy={logoBusy} error={logoErr} onPick={pickLogo} onRemove={() => set("logo_url", null)} />
            <ColorField value={d.accent} swatches={swatches} error={errs.accent} onChange={(v) => set("accent", v)} />
            <VibeField value={d.vibe} name={d.name} onChange={(v) => set("vibe", v)} />
            <CoverField src={d.cover_url} busy={coverBusy} error={coverErr} onPick={pickCover} onRemove={() => set("cover_url", null)} />
            <div className="flex flex-col gap-1.5">
              <label htmlFor="st-note" className="text-sm font-medium">{t("welcomeNote")}</label>
              <Textarea id="st-note" maxLength={280} rows={2} value={d.welcome_note} aria-describedby="st-note-h" onChange={(e) => set("welcome_note", e.target.value)} />
              <p id="st-note-h" className="text-sm text-muted-foreground">{t("welcomeNoteHint")} {d.welcome_note.length}/280</p>
            </div>
            {ar && (
              <div className="flex flex-col gap-1.5">
                <label htmlFor="st-note-ar" className="text-sm font-medium">{t("welcomeNoteAr")}</label>
                <Textarea id="st-note-ar" dir="rtl" lang="ar" maxLength={280} rows={2} value={d.welcome_note_ar} onChange={(e) => set("welcome_note_ar", e.target.value)} />
              </div>
            )}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="st-ig" className="text-sm font-medium">{t("instagramLabel")}</label>
              <Input
                id="st-ig"
                size="sm"
                dir="ltr"
                spellCheck={false}
                autoCapitalize="none"
                className="max-w-64"
                placeholder="yourplace"
                value={d.instagram}
                aria-invalid={!!errs.instagram}
                aria-describedby="st-ig-h"
                onChange={(e) => set("instagram", cleanHandle(e.target.value))}
              />
              <p id="st-ig-h" className={errs.instagram ? "text-sm text-destructive" : "text-sm text-muted-foreground"}>{errs.instagram ?? t("instagramHint")}</p>
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="st-review" className="text-sm font-medium">{t("googleReviewLabel")}</label>
              <Input
                id="st-review"
                size="sm"
                type="url"
                dir="ltr"
                spellCheck={false}
                autoCapitalize="none"
                maxLength={500}
                placeholder="https://g.page/r/…"
                value={d.google_review_url ?? ""}
                aria-invalid={!!errs.review}
                aria-describedby="st-review-h"
                onChange={(e) => set("google_review_url", e.target.value)}
              />
              <p id="st-review-h" className={errs.review ? "text-sm text-destructive" : "text-sm text-muted-foreground"}>{errs.review ?? t("googleReviewHint")}</p>
            </div>
            {!previewOpen && (
              <Button type="button" variant="outline" size="sm" className="justify-self-start" onClick={() => setPreviewPick(true)}>
                <Eye aria-hidden />
                {t("showPreview")}
              </Button>
            )}
          </div>
          <div hidden={show("language")} className="contents">
            <div className="border-t sm:col-span-2">
              <SwitchRow title={t("arabicMenu")} desc={t("arabicMenuDesc")} checked={ar} onChange={(v) => set("second_lang", v ? "ar" : null)} />
            </div>
            {ar && (
              <>
                <div className="h-4 sm:col-span-2" />
                {text("name_ar", "nameAr", 60, true)}
                {text("tagline_ar", "taglineAr", 150, true)}
              </>
            )}
          </div>
          <div className="mt-4 sm:col-span-2">
            <Button type="submit" size="sm" disabled={saving}>
              {saving ? <Loader2 aria-hidden className="animate-spin" /> : saved && <Check aria-hidden />}
              <span aria-live="polite">{t(saving ? "saving" : saved ? "saved" : "save")}</span>
            </Button>
          </div>
        </form>
        {sec === "account" && <PasswordForm sb={sb} email={email} />}
        <ResponsiveSheet rail open={previewOpen} onOpenChange={setPreviewPick} title={t("guestPreview")}>
          <div className="py-4">
            <BrandPreview restaurant={d} />
          </div>
        </ResponsiveSheet>
      </div>
    </div>
  );
}
