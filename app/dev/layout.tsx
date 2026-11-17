import { ThemeProvider } from "@/components/theme-provider";

// Dev launcher is always light (same reason as app/t/layout.tsx: strips a stale `.dark`).
export default function DevLayout({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" forcedTheme="light" enableSystem={false} storageKey="sufra-dev-theme">
      {children}
    </ThemeProvider>
  );
}
