"use client";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { BrandLockup } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { currencyDigits, formatMoney } from "@/lib/format";
import { errorText, useLang, type Key } from "@/lib/i18n";
import { staffClient } from "@/lib/supabase/browser";
import { SUFRA_BRAND } from "@/lib/brand";
import type { Vibe } from "@/lib/types";
import { isCurrency, timeZones } from "@/lib/venue";
import { BrandPreview, ColorField, HEX, VibeField, logoColors } from "./BrandFields";
import { LogoField, logoProblem, uploadLogo } from "./LogoField";

// Best guess from the browser's region; the owner can change it before saving.
const REGION_CURRENCY: Record<string, string> = {
  AE: "AED", SA: "SAR", KW: "KWD", QA: "QAR", BH: "BHD", OM: "OMR", EG: "EGP", JO: "JOD", LB: "LBP", MA: "MAD",
  PK: "PKR", IN: "INR", BD: "BDT", TR: "TRY", GB: "GBP", US: "USD", CA: "CAD", AU: "AUD", NZ: "NZD", JP: "JPY",
  SG: "SGD", MY: "MYR", ZA: "ZAR", NG: "NGN", KE: "KES", CH: "CHF", SE: "SEK", NO: "NOK", DK: "DKK", PL: "PLN",
  DE: "EUR", FR: "EUR", ES: "EUR", IT: "EUR", NL: "EUR", BE: "EUR", IE: "EUR", PT: "EUR", AT: "EUR", FI: "EUR", GR: "EUR",
};
const ARABIC_REGIONS = new Set(["AE", "SA", "KW", "QA", "BH", "OM", "EG", "JO", "LB", "MA", "IQ", "DZ", "TN", "LY", "YE", "SY", "PS", "SD"]);
const COMMON = ["USD", "EUR", "GBP", "AED", "SAR", "KWD", "QAR", "BHD", "OMR", "EGP", "PKR", "INR", "TRY", "JPY", "CAD", "AUD"];

function guess() {
  const loc = new Intl.Locale(navigator.language).maximize();
  const region = loc.region ?? "";
  return {
    currency: REGION_CURRENCY[region] ?? "USD",
    tz: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
    arabic: ARABIC_REGIONS.has(region) || loc.language === "ar",
  };
}

export function SetupWizard({ email }: { email: string }) {
  const router = useRouter();
  const { lang, t } = useLang();
  const [g] = useState(guess);
  const [zones] = useState(timeZones);
  const [name, setName] = useState("");
  const [currency, setCurrency] = useState(g.currency);
  const [tz, setTz] = useState(zones.includes(g.tz) ? g.tz : "UTC");
  const [arabic, setArabic] = useState(g.arabic);
  const [tables, setTables] = useState("5");
  const [errs, setErrs] = useState<{ name?: Key; currency?: Key; tables?: Key; accent?: Key }>({});
  const [accent, setAccent] = useState(SUFRA_BRAND);
  const [vibe, setVibe] = useState<Vibe>("sufra");
  const [swatches, setSwatches] = useState<string[]>([]);
  const [formErr, setFormErr] = useState("");
  const [busy, setBusy] = useState(false);
  // The logo waits on this device until the restaurant exists (its folder is the restaurant id).
  const [logo, setLogo] = useState<File | null>(null);
  const [logoErr, setLogoErr] = useState("");
  const preview = useMemo(() => (logo ? URL.createObjectURL(logo) : null), [logo]);
  useEffect(() => () => void (preview && URL.revokeObjectURL(preview)), [preview]);

  const okCurrency = isCurrency(currency);
  const sample = okCurrency ? formatMoney(Math.round(12.5 * 10 ** currencyDigits(currency)), lang, currency) : "";

  async function submit() {
    const n = Number(tables);
    const e = {
      name: name.trim() ? undefined : ("required" as const),
      currency: okCurrency ? undefined : ("badCurrency" as const),
      tables: Number.isInteger(n) && n >= 1 && n <= 50 ? undefined : ("tablesRange" as const),
      accent: HEX.test(accent) ? undefined : ("badHex" as const),
    };
    setErrs(e);
    setFormErr("");
    if (e.name || e.currency || e.tables || e.accent) return void document.querySelector<HTMLElement>("#setup-form [aria-invalid=true]")?.focus();
    setBusy(true);
    const sb = staffClient();
    const { data: rid, error } = await sb.rpc("create_restaurant", { p_name: name.trim(), p_currency: currency, p_timezone: tz, p_second_lang: arabic ? "ar" : null, p_tables: n });
    // A failed logo upload never blocks setup: it can be added again in Settings.
    if (!error) {
      const r = logo ? await uploadLogo(sb, rid as string, logo, lang) : null;
      await sb.from("restaurants").update({ accent: accent.toUpperCase(), vibe, ...(r?.url ? { logo_url: r.url } : {}) }).eq("id", rid as string);
    }
    if (!error || error.message === "ALREADY_OWNER") {
      router.replace("/admin");
      return router.refresh();
    }
    setBusy(false);
    setFormErr(error.message === "AUTH_REQUIRED" ? t("confirmEmailFirst") : errorText(lang, error));
  }

  async function signOut() {
    await staffClient().auth.signOut();
    router.replace("/login");
  }

  return (
    <main className="flex min-h-dvh items-center justify-center gap-10 bg-background p-4">
      <Card className="w-full max-w-md rounded-lg shadow-none">
        <CardHeader className="gap-4">
          <BrandLockup />
          <div className="flex flex-col gap-1.5">
            <h1 className="text-xl font-semibold">{t("setupTitle")}</h1>
            <CardDescription>{t("setupDesc")}</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <form
            id="setup-form"
            noValidate
            className="flex flex-col gap-6"
            onSubmit={(e) => {
              e.preventDefault();
              submit();
            }}
          >
            <FieldGroup>
              <Field data-invalid={!!errs.name}>
                <FieldLabel htmlFor="su-name">{t("restaurantName")}</FieldLabel>
                <Input id="su-name" size="lg" maxLength={60} autoComplete="organization" value={name} aria-invalid={!!errs.name} aria-describedby="su-name-err" onChange={(e) => setName(e.target.value)} />
                {errs.name && <FieldError id="su-name-err">{t(errs.name)}</FieldError>}
              </Field>
              <LogoField
                name={name}
                src={preview}
                error={logoErr}
                onPick={(f) => {
                  const bad = logoProblem(f);
                  setLogoErr(bad ? t(bad) : "");
                  if (bad) return;
                  setLogo(f);
                  logoColors(f).then((c) => {
                    setSwatches(c);
                    if (c[0]) setAccent(c[0]);
                  });
                }}
                onRemove={() => {
                  setLogo(null);
                  setSwatches([]);
                }}
              />
              <ColorField value={accent} swatches={swatches} error={errs.accent && t(errs.accent)} onChange={setAccent} />
              <VibeField value={vibe} name={name} onChange={setVibe} />
              <div className="grid gap-4 sm:grid-cols-[8rem_minmax(0,1fr)]">
                <Field data-invalid={!!errs.currency}>
                  <FieldLabel htmlFor="su-currency">{t("currencyLabel")}</FieldLabel>
                  <Input
                    id="su-currency"
                    size="lg"
                    dir="ltr"
                    list="su-currencies"
                    maxLength={3}
                    autoComplete="off"
                    autoCapitalize="characters"
                    spellCheck={false}
                    className="uppercase"
                    value={currency}
                    aria-invalid={!!errs.currency}
                    aria-describedby="su-currency-hint"
                    onChange={(e) => setCurrency(e.target.value.toUpperCase())}
                  />
                  <datalist id="su-currencies">{COMMON.map((c) => <option key={c} value={c} />)}</datalist>
                </Field>
                <Field>
                  <FieldLabel htmlFor="su-tz">{t("timezoneLabel")}</FieldLabel>
                  <Select value={tz} onValueChange={setTz}>
                    <SelectTrigger id="su-tz" size="lg" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="max-h-80">
                      {zones.map((z) => <SelectItem key={z} value={z}>{z.replaceAll("_", " ")}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </Field>
                <p id="su-currency-hint" className={errs.currency ? "-mt-2 text-sm text-destructive sm:col-span-2" : "-mt-2 text-sm text-muted-foreground sm:col-span-2"}>
                  {errs.currency ? t(errs.currency) : sample && t("pricesLookLike").replace("{p}", sample)}
                </p>
              </div>
              <Field data-invalid={!!errs.tables}>
                <FieldLabel htmlFor="su-tables">{t("tablesCount")}</FieldLabel>
                <Input id="su-tables" size="lg" type="number" inputMode="numeric" min={1} max={50} className="w-28" value={tables} aria-invalid={!!errs.tables} aria-describedby="su-tables-hint" onChange={(e) => setTables(e.target.value)} />
                <FieldDescription id="su-tables-hint" className={errs.tables ? "text-destructive" : undefined}>{t(errs.tables ?? "tablesHint")}</FieldDescription>
              </Field>
              <label className="flex cursor-pointer items-center justify-between gap-5 border-y py-4">
                <span className="flex flex-col gap-0.5">
                  <span className="font-medium">{t("arabicMenu")}</span>
                  <span className="text-sm text-muted-foreground">{t("arabicMenuDesc")}</span>
                </span>
                <Switch checked={arabic} onCheckedChange={setArabic} />
              </label>
              {formErr && <FieldError role="alert">{formErr}</FieldError>}
            </FieldGroup>
            <Button type="submit" size="lg" disabled={busy}>
              {busy && <Loader2 aria-hidden className="animate-spin" />}
              {busy ? t("oneMoment") : t("createRestaurant")}
            </Button>
            <p className="text-center text-sm text-muted-foreground">
              {t("signedInAs").replace("{e}", email)}{" "}
              <Button type="button" variant="link" size="xs" className="h-auto p-0 align-baseline text-muted-foreground underline" onClick={signOut}>
                {t("signOut")}
              </Button>
            </p>
          </form>
        </CardContent>
      </Card>
      {/* Live guest welcome screen with what the owner has picked so far. */}
      <div className="sticky top-4 hidden self-start lg:block">
        <BrandPreview
          restaurant={{
            id: "", slug: "", name: name || "Tably", name_ar: "", tagline: "", tagline_ar: "", currency, timezone: tz,
            second_lang: null, accent, service_mode: "table", ordering_paused: false, pin_required: false,
            logo_url: preview, cover_url: null, vibe, welcome_note: "", welcome_note_ar: "", instagram: "", google_review_url: null,
          }}
        />
      </div>
    </main>
  );
}
