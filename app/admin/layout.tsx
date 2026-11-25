import { CookieLang } from "@/components/cookie-lang";
import { OpsFont } from "@/components/ops-font";
import { ThemeProvider } from "@/components/theme-provider";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false} storageKey="sufra-owner-theme">
      <OpsFont />
      <CookieLang>{children}</CookieLang>
    </ThemeProvider>
  );
}
