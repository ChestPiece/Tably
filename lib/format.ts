import type { Lang } from "./types.ts";

const locale = (lang: Lang) => (lang === "ar" ? "ar-AE-u-nu-latn" : "en-AE");

/** Integer fils -> "AED 81.00" / "81.00 د.إ.‏" (Western digits in both languages; currency:false -> bare number). */
export const formatMoney = (fils: number, lang: Lang, opts: { currency?: boolean } = {}) =>
  new Intl.NumberFormat(locale(lang), {
    style: opts.currency === false ? "decimal" : "currency",
    currency: "AED",
    minimumFractionDigits: 2,
  }).format(fils / 100);

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

/** Largest price the editor accepts: 10,000 AED. */
export const MAX_FILS = 1_000_000;

/** "12.5" / "١٢٫٥٠" -> 1250 integer fils; null when not a price with up to 2 decimals. */
export const parseFils = (input: string) => {
  const m = /^(\d+)(?:\.(\d{1,2}))?$/.exec(latinDigits(input.trim()));
  return m ? Number(m[1]) * 100 + Number((m[2] ?? "").padEnd(2, "0")) : null;
};

/** Integer fils -> "12.50" for a price input (always Latin digits, integer math). */
export const filsToInput = (fils: number) => `${Math.floor(fils / 100)}.${String(fils % 100).padStart(2, "0")}`;

/** "T12" / "ط 12" (NBSP). */
export const tableLabel = (lang: Lang, n: number) => (lang === "ar" ? "ط " : "T") + n;
