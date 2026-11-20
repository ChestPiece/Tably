import type { Lang } from "./types.ts";

const locale = (lang: Lang) => (lang === "ar" ? "ar-u-nu-latn" : "en");

/** Decimal places of a currency's minor unit: USD 2, KWD 3, JPY 0. */
export const currencyDigits = (currency: string) =>
  new Intl.NumberFormat("en", { style: "currency", currency }).resolvedOptions().maximumFractionDigits ?? 2;

/** Integer minor units -> "AED 81.00" / "81.00 د.إ.‏" (Western digits in both languages; bare -> number only). */
export const formatMoney = (minor: number, lang: Lang, currency: string, opts: { bare?: boolean } = {}) => {
  const digits = currencyDigits(currency);
  return new Intl.NumberFormat(locale(lang), {
    style: opts.bare ? "decimal" : "currency",
    currency,
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(minor / 10 ** digits);
};

/** Pick a plural form; "#" in the form is replaced by the number formatted for lang. */
export const plural = (lang: Lang, n: number, forms: Partial<Record<Intl.LDMLPluralRule, string>> & { other: string }) =>
  (forms[new Intl.PluralRules(locale(lang)).select(n)] ?? forms.other).replace("#", new Intl.NumberFormat(locale(lang)).format(n));

export const ageLevel = (ms: number): "fresh" | "warn" | "late" => (ms >= 15 * 60e3 ? "late" : ms >= 8 * 60e3 ? "warn" : "fresh");

export function formatAge(ms: number, lang: Lang) {
  const nf = new Intl.NumberFormat(locale(lang));
  const mins = Math.floor(ms / 60e3);
  const m = (n: number) => nf.format(n) + (lang === "ar" ? "د" : "m");
  if (mins < 1) return lang === "ar" ? `<${m(1)}` : "<1m";
  if (mins < 60) return m(mins);
  const mm = new Intl.NumberFormat(locale(lang), { minimumIntegerDigits: 2 }).format(mins % 60);
  return `${nf.format(Math.floor(mins / 60))}${lang === "ar" ? "س" : "h"} ${mm}${lang === "ar" ? "د" : "m"}`;
}

const latinDigits = (s: string) => s.replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x660)).replace("٫", ".").replace(",", ".");

/** Largest price the editor accepts, in minor units (matches the DB check). */
export const MAX_MINOR = 1_000_000;

/** "12.5" / "١٢٫٥٠" -> integer minor units for a currency with `digits` decimals; null when not a valid price. */
export const parseMinor = (input: string, digits: number) => {
  const m = /^(\d+)(?:\.(\d+))?$/.exec(latinDigits(input.trim()));
  if (!m || (m[2] ?? "").length > digits) return null;
  return Number(m[1]) * 10 ** digits + Number((m[2] ?? "").padEnd(digits, "0") || 0);
};

/** Integer minor units -> "12.50" / "1.250" / "500" for a price input (Latin digits, integer math). */
export const minorToInput = (minor: number, digits: number) =>
  digits === 0 ? String(minor) : `${Math.floor(minor / 10 ** digits)}.${String(minor % 10 ** digits).padStart(digits, "0")}`;

/** "T12" / "ط 12" (NBSP). */
export const tableLabel = (lang: Lang, n: number) => (lang === "ar" ? "ط " : "T") + n;
