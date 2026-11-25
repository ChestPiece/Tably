import { CookieLang } from "@/components/cookie-lang";
import { OpsFont } from "@/components/ops-font";
import { ThemeProvider } from "@/components/theme-provider";

export default function StaffLayout({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false} storageKey="sufra-staff-theme">
      <OpsFont />
      <CookieLang>{children}</CookieLang>
    </ThemeProvider>
  );
}
