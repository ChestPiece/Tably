"use client";
import { createContext, useContext, type ReactNode } from "react";
import { currencyDigits, formatMoney } from "./format";
import { useLang } from "./i18n";
import type { Restaurant } from "./types";

// The restaurant's own money and clock. Every screen that shows prices or times sits under one of these.
type Venue = { currency: string; tz: string; secondLang: "ar" | null };
const VenueContext = createContext<Venue | null>(null);

export function VenueProvider({ restaurant, children }: { restaurant: Pick<Restaurant, "currency" | "timezone" | "second_lang">; children: ReactNode }) {
  return <VenueContext value={{ currency: restaurant.currency, tz: restaurant.timezone, secondLang: restaurant.second_lang }}>{children}</VenueContext>;
}

export function useVenue() {
  const v = useContext(VenueContext);
  if (!v) throw new Error("useVenue outside VenueProvider");
  const { lang } = useLang();
  return {
    ...v,
    digits: currencyDigits(v.currency),
    money: (minor: number, opts?: { bare?: boolean }) => formatMoney(minor, lang, v.currency, opts),
  };
}

// A real ISO 4217 code the browser can format, like USD or KWD.
export const isCurrency = (c: string) => /^[A-Z]{3}$/.test(c) && Intl.supportedValuesOf("currency").includes(c);

// IANA zones for a picker. The browser list leaves out "UTC" in some engines.
export const timeZones = () => {
  const z = Intl.supportedValuesOf("timeZone");
  return z.includes("UTC") ? z : ["UTC", ...z];
};
