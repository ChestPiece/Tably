import { CookieLang } from "@/components/cookie-lang";

export default function LangLayout({ children }: { children: React.ReactNode }) {
  return <CookieLang>{children}</CookieLang>;
}
