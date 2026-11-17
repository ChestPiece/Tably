import { ThemeProvider } from "@/components/theme-provider";

// Guest is always light. forcedTheme also strips a stale `.dark` left on <html> by a client-side
// navigation from /staff or /admin (next-themes does not clean up on unmount).
export default function GuestLayout({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" forcedTheme="light" enableSystem={false} storageKey="sufra-guest-theme">
      {children}
    </ThemeProvider>
  );
}
