"use client";
import { Check } from "lucide-react";
import { useState } from "react";
import { errorText, useLang } from "@/lib/i18n";
import { pick, type Restaurant } from "@/lib/types";
import { BrandMark, VenueMark } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LangButton } from "./Chrome";

const onBrandInput =
  "border-brand-rule bg-brand-field text-on-brand placeholder:text-on-brand/60 hover:border-on-brand/60 focus-visible:ring-on-brand focus-visible:ring-offset-brand aria-invalid:border-on-brand";

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
  const pinError = pinRequired && error === errorText(lang, { message: "BAD_PIN" });
  const venue = pick(lang, restaurant.name, restaurant.name_ar);

  return (
    <main className="mx-auto flex min-h-dvh max-w-[560px] flex-col items-center bg-brand px-6 pt-10 pb-[max(24px,env(safe-area-inset-bottom))] text-center text-on-brand">
      <div className="flex w-full justify-end">
        <LangButton className="-mt-6 text-on-brand hover:bg-brand-field" />
      </div>
      <VenueMark name={venue} logo={restaurant.logo_url} className="mt-6 size-40 bg-brand-field text-7xl text-on-brand ring-brand-rule" />
      <div className="mt-8 w-full text-start">
        <h1 className="font-display text-[44px] leading-[1.05] font-semibold [overflow-wrap:anywhere]">{venue}</h1>
        <p className="mt-4 flex items-baseline-last gap-2 border-t border-brand-rule pt-3 [--border:var(--brand-rule)]">
          <span className="opacity-85">{t("welcomeKicker")}</span>
          <span aria-hidden className="leader" />
          <span className="font-display text-[22px] leading-none font-semibold whitespace-nowrap tabular-nums">
            {t("table")} {tableNumber}
          </span>
        </p>
      </div>

      <form
        noValidate
        className="mt-auto grid w-full gap-3 pt-8 text-start"
        onSubmit={(e) => {
          e.preventDefault();
          onJoin(name, pin);
        }}
      >
        {ended && <p className="rounded-md bg-brand-field px-4 py-3 text-sm">{t("visitEnded")}</p>}
        {restaurant.ordering_paused && <p className="rounded-md bg-brand-field px-4 py-3 text-sm">{t("paused")}</p>}

        <label className="grid gap-2">
          <span className="font-medium">{t("yourName")}</span>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={40}
            autoComplete="given-name"
            enterKeyHint="go"
            placeholder={t("nameOptional")}
            className={onBrandInput}
          />
        </label>

        {pinRequired && (
          <label className="grid gap-2">
            <span className="font-medium">{t("tablePin")}</span>
            <Input
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={4}
              aria-invalid={pinError || undefined}
              aria-describedby="pin-hint"
              className={`${onBrandInput} tabular-nums`}
            />
            <small id="pin-hint" role={pinError ? "alert" : undefined} className={`min-h-[1lh] text-sm ${pinError ? "font-medium" : "opacity-85"}`}>
              {pinError ? error : t("pinHelp")}
            </small>
          </label>
        )}

        {error && !pinError && (
          <p role="alert" className="rounded-md bg-brand-field px-4 py-3 text-sm font-medium">
            {error}
          </p>
        )}

        <Button type="submit" disabled={busy} className="w-full bg-on-brand text-brand hover:bg-on-brand/90 focus-visible:ring-on-brand focus-visible:ring-offset-brand">
          {busy ? t("joining") : t("startOrdering")}
        </Button>
      </form>

      <p className="mt-4 flex items-center justify-center gap-2 text-sm opacity-85">
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
