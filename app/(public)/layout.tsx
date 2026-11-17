import { ThemeProvider } from "@/components/theme-provider";

// Home, sign-in and password reset are always light (strips a stale `.dark` from /staff or /admin).
export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" forcedTheme="light" enableSystem={false} storageKey="sufra-public-theme">
      {children}
    </ThemeProvider>
  );
}
