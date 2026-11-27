"use client";
import { Check, Star } from "lucide-react";
import Image from "next/image";
import { useState } from "react";
import { errorText, useLang } from "@/lib/i18n";
import { pick, type Restaurant } from "@/lib/types";
import { BrandMark, VenueMark } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { LangButton } from "./Chrome";
import { saveUsual } from "@/lib/memory";

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
  const [known, setKnown] = useState(name);
  const [pin, setPin] = useState("");
  const pinError = pinRequired && (error === errorText(lang, { message: "BAD_PIN" }) || error === errorText(lang, { message: "PIN_LOCKED" }));
  const venue = pick(lang, restaurant.name, restaurant.name_ar);

  const tagline = pick(lang, restaurant.tagline, restaurant.tagline_ar);
  const note = pick(lang, restaurant.welcome_note, restaurant.welcome_note_ar);

  return (
    // Cream page with one indigo venue card (a printed menu cover), then the form. Phone: form in the thumb zone; larger screens: centred.
    <main className="mx-auto flex min-h-dvh w-full max-w-[440px] flex-col px-5 pt-3 pb-[max(20px,env(safe-area-inset-bottom))] sm:justify-center">
      <div className="flex min-h-10 justify-end">
        <LangButton />
      </div>

      {restaurant.cover_url && (
        // The owner's photo sits behind the card's top edge, like a menu cover over a table.
        <div className="relative mt-3 aspect-[16/9] w-full overflow-hidden rounded-2xl short:hidden">
          <Image src={restaurant.cover_url} alt="" fill priority sizes="(min-width: 440px) 400px, 100vw" className="object-cover" />
        </div>
      )}
      <section className={`${restaurant.cover_url ? "relative mx-3 -mt-12 short:mx-0 short:mt-3" : "mt-3"} rounded-2xl bg-brand px-6 pt-6 pb-5 text-on-brand shadow-float`}>
        <VenueMark name={venue} logo={restaurant.logo_url} className="h-[72px] w-[60px] rounded-arch bg-brand-field text-[28px] text-on-brand ring-1 ring-brand-rule" />
        <h1 className="mt-5 font-display text-[32px] leading-[1.1] font-semibold [overflow-wrap:anywhere]">{venue}</h1>
        {tagline && <p className="mt-1.5 text-[15px] opacity-85">{tagline}</p>}
        {note && <p className="mt-3 text-[15px] leading-normal opacity-85">{note}</p>}
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
        {known && (
          <div className="flex flex-wrap items-baseline justify-between gap-x-3">
            <p className="font-display text-xl font-semibold">{t("welcomeBack").replace("{name}", known)}</p>
            <Button
              type="button"
              variant="link"
              size="xs"
              className="h-auto min-h-12 p-0 text-muted-foreground underline"
              onClick={() => {
                try {
                  localStorage.removeItem("cb-name");
                } catch {}
                saveUsual(restaurant.slug, null);
                setKnown("");
                setName("");
              }}
            >
              {t("forgetMe")}
            </Button>
          </div>
        )}
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

/** End of the visit (peak-end): thanks, a 1-5 rating with an optional note, then Google and Instagram for everyone. */
export function ClosedVisit({
  restaurant,
  paidMethod,
  rating,
  onRate,
  onNew,
}: {
  restaurant: Restaurant;
  paidMethod: "cash" | "card" | null;
  /** null = nothing to rate; 0 = not rated yet. */
  rating: number | null;
  /** note null = leave the saved note as it is (a star tap). */
  onRate: (rating: number, note: string | null) => Promise<boolean>;
  onNew: () => void;
}) {
  const { lang, t } = useLang();
  const venue = pick(lang, restaurant.name, restaurant.name_ar);
  const [stars, setStars] = useState(rating ?? 0);
  const [note, setNote] = useState("");
  const [sentNote, setSentNote] = useState("");
  const [sending, setSending] = useState(false);

  // Each tap saves the stars only. A failed save keeps the stars on screen (the toast says why), so a second tap retries.
  function rate(n: number) {
    setStars(n);
    onRate(n, null);
  }
  async function send() {
    setSending(true);
    if (await onRate(stars, note)) setSentNote(note.trim());
    setSending(false);
  }

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-[440px] flex-col justify-center gap-3 px-6 py-[max(24px,env(safe-area-inset-bottom))]">
      <VenueMark name={venue} logo={restaurant.logo_url} className="mb-2 h-[72px] w-[60px] rounded-arch bg-brand text-[28px] text-on-brand" />
      <h1 className="flex items-center gap-2 font-display text-[32px] leading-[1.15] font-semibold">
        {paidMethod && <Check aria-hidden className="size-7 shrink-0" strokeWidth={2.5} />}
        {paidMethod ? t("paidBy").replace("{m}", t(paidMethod).toLowerCase()) : t("visitClosedTitle")}
      </h1>
      <p className="text-text-2">{t(paidMethod ? "paidThanks" : "visitClosedBody")}</p>

      {rating !== null && (
        <section className="mt-5 grid gap-3 border-t border-border pt-5" aria-labelledby="rate-title">
          <h2 id="rate-title" className="font-medium">{t("rateTitle")}</h2>
          <div role="radiogroup" aria-labelledby="rate-title" className="flex gap-1">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                role="radio"
                aria-checked={stars === n}
                aria-label={t("rateStar").replace("{n}", String(n))}
                onClick={() => rate(n)}
                className="grid size-12 place-items-center rounded-md text-brand focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
              >
                <Star aria-hidden className="size-8" strokeWidth={1.75} fill={n <= stars ? "currentColor" : "none"} />
              </button>
            ))}
          </div>
          {stars > 0 &&
            (sentNote ? (
              <p role="status" className="text-sm text-text-2">{t("rateThanks")}</p>
            ) : (
              <form
                className="grid gap-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  send();
                }}
              >
                <label className="grid gap-1.5">
                  <span className="text-sm text-text-2">{t("rateNote")}</span>
                  <Textarea value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} rows={3} />
                </label>
                <Button type="submit" variant="secondary" disabled={sending || !note.trim()} className="w-full">
                  {t("rateSend")}
                </Button>
              </form>
            ))}
        </section>
      )}

      {(restaurant.google_review_url || restaurant.instagram) && (
        <nav className="flex flex-wrap gap-x-4">
          {restaurant.google_review_url && (
            <a href={restaurant.google_review_url} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-12 items-center text-sm font-medium underline underline-offset-4">
              {t("googleReview")}
            </a>
          )}
          {restaurant.instagram && (
            <a href={`https://instagram.com/${restaurant.instagram}`} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-12 items-center gap-1.5 text-sm text-text-2 underline-offset-4 hover:underline">
              {t("followUs")} <span dir="ltr">@{restaurant.instagram}</span>
            </a>
          )}
        </nav>
      )}

      <Button onClick={onNew} variant={paidMethod ? "secondary" : "default"} className="mt-4 w-full">
        {t("newVisit")}
      </Button>
    </main>
  );
}
