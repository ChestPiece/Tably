import { ThemeProvider } from "@/components/theme-provider";

export default function StaffLayout({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false} storageKey="sufra-staff-theme">
      {children}
    </ThemeProvider>
  );
}
