"use client";
import { Check } from "lucide-react";
import { useState } from "react";
import { errorText, useLang } from "@/lib/i18n";
import { pick, type Restaurant } from "@/lib/types";
import { BrandMark, VenueMark } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LangButton } from "./Chrome";

export function Welcome({
  restaurant,
  tableNumber,
  pinRequired,
  ended,
  busy,
  error,
  onJoin,
}: {
  restaurant: Restaurant;
  tableNumber: number;
  pinRequired: boolean;
  ended: boolean;
  busy: boolean;
  error: string;
  onJoin: (name: string, pin: string) => void;
}) {
  const { lang, t } = useLang();
  // Mounted only after the client boot phase, so localStorage is safe here.
  const [name, setName] = useState(() => {
    try {
      return localStorage.getItem("cb-name") ?? "";
    } catch {
      return "";
    }
  });
  const [pin, setPin] = useState("");
  const pinError = pinRequired && (error === errorText(lang, { message: "BAD_PIN" }) || error === errorText(lang, { message: "PIN_LOCKED" }));
  const venue = pick(lang, restaurant.name, restaurant.name_ar);

  const tagline = pick(lang, restaurant.tagline, restaurant.tagline_ar);

  return (
    // Cream page with one indigo venue card (a printed menu cover), then the form. Phone: form in the thumb zone; larger screens: centred.
    <main className="mx-auto flex min-h-dvh w-full max-w-[440px] flex-col px-5 pt-3 pb-[max(20px,env(safe-area-inset-bottom))] sm:justify-center">
      <div className="flex min-h-10 justify-end">
        <LangButton />
      </div>

      <section className="mt-3 rounded-2xl bg-brand px-6 pt-6 pb-5 text-on-brand shadow-float">
        <VenueMark name={venue} logo={restaurant.logo_url} className="h-[72px] w-[60px] rounded-arch bg-brand-field text-[28px] text-on-brand ring-1 ring-brand-rule" />
        <h1 className="mt-5 font-display text-[32px] leading-[1.1] font-semibold [overflow-wrap:anywhere]">{venue}</h1>
        {tagline && <p className="mt-1.5 text-[15px] opacity-85">{tagline}</p>}
        <p className="mt-6 flex items-baseline-last gap-2 border-t border-brand-rule pt-3 [--border:var(--brand-rule)]">
          <span className="text-[15px] opacity-85">{t("welcomeKicker")}</span>
          <span aria-hidden className="leader" />
          <span className="font-display text-xl leading-none font-semibold whitespace-nowrap tabular-nums">
            {t("table")} {tableNumber}
          </span>
        </p>
      </section>

      <form
        noValidate
        className="grid gap-3 pt-8 max-sm:mt-auto sm:mt-2"
        onSubmit={(e) => {
          e.preventDefault();
          onJoin(name, pin);
        }}
      >
        {ended && <p className="rounded-md bg-muted px-4 py-3 text-sm">{t("visitEnded")}</p>}
        {restaurant.ordering_paused && <p className="rounded-md bg-muted px-4 py-3 text-sm">{t("paused")}</p>}

        <label className="grid gap-1.5">
          <span className="text-sm font-medium">{t("yourName")}</span>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={40}
            autoComplete="given-name"
            enterKeyHint="go"
            placeholder={t("nameOptional")}
          />
        </label>

        {pinRequired && (
          <label className="grid gap-1.5">
            <span className="text-sm font-medium">{t("tablePin")}</span>
            <Input
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={4}
              aria-invalid={pinError || undefined}
              aria-describedby="pin-hint"
              className="tabular-nums"
            />
            <small id="pin-hint" role={pinError ? "alert" : undefined} className={`min-h-[1lh] text-sm ${pinError ? "font-medium text-destructive" : "text-muted-foreground"}`}>
              {pinError ? error : t("pinHelp")}
            </small>
          </label>
        )}

        {error && !pinError && (
          <p role="alert" className="rounded-md bg-danger-bg px-4 py-3 text-sm font-medium text-destructive">
            {error}
          </p>
        )}

        <Button type="submit" disabled={busy} className="mt-1 w-full">
          {busy ? t("joining") : t("startOrdering")}
        </Button>
      </form>

      <p className="mt-5 flex items-center justify-center gap-2 text-sm text-muted-foreground">
        <BrandMark className="size-4" />
        {t("servedBy")}
      </p>
    </main>
  );
}

export function ClosedVisit({ paidMethod, onNew }: { paidMethod: "cash" | "card" | null; onNew: () => void }) {
  const { t } = useLang();
  return (
    <main className="mx-auto flex min-h-dvh max-w-[560px] flex-col justify-center gap-3 px-6">
      {paidMethod && (
        <span aria-hidden className="mb-2 grid size-14 place-items-center rounded-full bg-foreground text-background">
          <Check className="size-7" strokeWidth={2.5} />
        </span>
      )}
      <h1 className="font-display text-[32px] leading-[1.15] font-semibold">
        {paidMethod ? t("paidBy").replace("{m}", t(paidMethod).toLowerCase()) : t("visitClosedTitle")}
      </h1>
      <p className="text-text-2">{t(paidMethod ? "paidThanks" : "visitClosedBody")}</p>
      <Button onClick={onNew} variant={paidMethod ? "secondary" : "default"} className="mt-6 w-full">
        {t("newVisit")}
      </Button>
    </main>
  );
}
