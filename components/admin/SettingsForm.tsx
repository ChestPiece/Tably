"use client";
import { Check, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useLang, type Key } from "@/lib/i18n";
import type { Restaurant } from "@/lib/types";
import { isCurrency, timeZones } from "@/lib/venue";
import type { AdminProps } from "./AdminApp";
import { LogoField, logoProblem, uploadLogo } from "./LogoField";

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
      className="grid max-w-[760px] gap-x-5 gap-y-4 border-t pt-8 sm:grid-cols-2"
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
    >
      <div className="sm:col-span-2">
        <h2 className="text-xl font-semibold">{t("accountTitle")}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{t("accountDesc").replace("{n}", email)}</p>
      </div>
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

export function SettingsForm({ sb, restaurant, mutate, email }: AdminProps & { restaurant: Restaurant; email: string }) {
  const { lang, t } = useLang();
  const [logoBusy, setLogoBusy] = useState(false);
  const [logoErr, setLogoErr] = useState("");
  const [d, setD] = useState(restaurant);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [errs, setErrs] = useState<{ name?: string; name_ar?: string; currency?: string }>({});
  const [zones] = useState(timeZones);
  const ar = d.second_lang === "ar";
  const set = <K extends keyof Restaurant>(k: K, v: Restaurant[K]) => setD((p) => ({ ...p, [k]: v }));

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
    const r = await uploadLogo(sb, d.id, file, lang);
    setLogoBusy(false);
    if (r.error) return setLogoErr(r.error);
    set("logo_url", r.url!);
  }

  async function submit() {
    const e = {
      name: d.name.trim() ? undefined : t("required"),
      // Arabic stays optional: an empty Arabic name falls back to English for guests.
      currency: isCurrency(d.currency) ? undefined : t("badCurrency"),
    };
    setErrs(e);
    if (e.name || e.currency) return void document.querySelector<HTMLElement>("#settings-form [aria-invalid=true]")?.focus();
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
        })
        .eq("id", d.id),
    );
    setSaving(false);
    setSaved(ok);
  }

  return (
    <div className="flex flex-col gap-10">
    <form
      id="settings-form"
      noValidate
      className="grid max-w-[760px] gap-x-5 gap-y-2 sm:grid-cols-2"
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
    >
      <div className="mb-6 sm:col-span-2">
        <LogoField name={d.name} src={d.logo_url} busy={logoBusy} error={logoErr} onPick={pickLogo} onRemove={() => set("logo_url", null)} />
      </div>
      {text("name", "nameEn", 60)}
      {ar ? text("name_ar", "nameAr", 60, true) : <span className="max-sm:hidden" />}
      {text("tagline", "taglineEn", 150)}
      {ar ? text("tagline_ar", "taglineAr", 150, true) : <span className="max-sm:hidden" />}
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
        <SwitchRow title={t("arabicMenu")} desc={t("arabicMenuDesc")} checked={ar} onChange={(v) => set("second_lang", v ? "ar" : null)} />
        <SwitchRow title={t("pauseOrdering")} desc={t("pauseOrderingDesc")} checked={d.ordering_paused} onChange={(v) => set("ordering_paused", v)} />
        <SwitchRow title={t("requireCode")} desc={t("requireCodeDesc")} checked={d.pin_required} onChange={(v) => set("pin_required", v)} />
      </div>
      <div className="mt-4 sm:col-span-2">
        <Button type="submit" size="sm" disabled={saving}>
          {saving ? <Loader2 aria-hidden className="animate-spin" /> : saved && <Check aria-hidden />}
          <span aria-live="polite">{t(saving ? "saving" : saved ? "saved" : "save")}</span>
        </Button>
      </div>
    </form>
    <PasswordForm sb={sb} email={email} />
    </div>
  );
}
