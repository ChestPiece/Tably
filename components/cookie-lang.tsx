import { cookies } from "next/headers";
import { LangProvider } from "@/lib/i18n";
import type { Lang } from "@/lib/types";

// Language from the `lang` cookie, for routes that render per request. The root layout
// stays cookie-free so the landing and legal pages prerender as static HTML.
export async function CookieLang({ children }: { children: React.ReactNode }) {
  const lang: Lang = (await cookies()).get("lang")?.value === "ar" ? "ar" : "en";
  return <LangProvider initial={lang}>{children}</LangProvider>;
}
