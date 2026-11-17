"use client";
import { useState } from "react";
import { errorText, useLang } from "@/lib/i18n";
import { pick, type MenuItem, type Restaurant } from "@/lib/types";
import { Arch } from "@/components/app/arch";
import { BrandMark } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LangButton } from "./Chrome";

const onBrandInput =
  "border-brand-rule bg-brand-field text-on-brand placeholder:text-on-brand/60 hover:border-on-brand/60 focus-visible:ring-on-brand focus-visible:ring-offset-brand aria-invalid:border-on-brand";

export function Welcome({
  restaurant,
  tableNumber,
  pinRequired,
  featured,
  ended,
  busy,
  error,
  onJoin,
}: {
  restaurant: Restaurant;
  tableNumber: number;
  pinRequired: boolean;
  featured?: MenuItem;
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
      {featured?.image_url ? (
        <Arch src={featured.image_url} alt={pick(lang, featured.name, featured.name_ar)} width={248} height={304} className="bg-brand-field" />
      ) : (
        <span aria-hidden className="grid h-[304px] w-[248px] place-items-center rounded-arch bg-brand-field">
          <BrandMark className="size-24 text-ochre" />
        </span>
      )}
      <span aria-hidden className="h-0.5 w-[296px] max-w-full rounded-full bg-brand-rule" />
      <h1 className="mt-6 font-display text-[40px] leading-[1.1] font-semibold [overflow-wrap:anywhere]">{venue}</h1>
      <p className="mt-2 opacity-85">
        {t("table")} {tableNumber} · {t("welcome")}
      </p>

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

export function ClosedVisit({ onNew }: { onNew: () => void }) {
  const { t } = useLang();
  return (
    <main className="mx-auto flex min-h-dvh max-w-[560px] flex-col justify-center gap-3 px-6">
      <h1 className="font-display text-[32px] leading-[1.15] font-semibold">{t("visitClosedTitle")}</h1>
      <p className="text-text-2">{t("visitClosedBody")}</p>
      <Button onClick={onNew} className="mt-6 w-full">
        {t("newVisit")}
      </Button>
    </main>
  );
}
