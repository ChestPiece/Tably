import type { Metadata, Viewport } from "next";
import { Beiruti, Fraunces, IBM_Plex_Sans, IBM_Plex_Sans_Arabic } from "next/font/google";
import { cookies } from "next/headers";
import { Toaster } from "@/components/ui/sonner";
import { LangProvider } from "@/lib/i18n";
import type { Lang } from "@/lib/types";
import "./globals.css";

// Latin display (editorial serif, optical sizes) + Arabic display. Arabic text gets its own stacks via :lang(ar) in globals.css.
const display = Fraunces({ subsets: ["latin"], axes: ["opsz"], variable: "--nf-display" });
const displayAr = Beiruti({ subsets: ["arabic", "latin"], weight: ["500", "700"], variable: "--nf-display-ar" });
const sans = IBM_Plex_Sans({ subsets: ["latin"], weight: ["400", "500", "600"], variable: "--nf-sans" });
const arabic = IBM_Plex_Sans_Arabic({ subsets: ["arabic", "latin"], weight: ["400", "500", "600", "700"], variable: "--nf-arabic" });

export const metadata: Metadata = {
  title: { default: "Tably", template: "%s · Tably" },
  description: "Order from your table.",
  icons: { icon: "/icon.svg", apple: "/icon.svg" },
};

export const viewport: Viewport = { themeColor: "#F6F3EB", width: "device-width", initialScale: 1, viewportFit: "cover" };

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const lang: Lang = (await cookies()).get("lang")?.value === "ar" ? "ar" : "en";
  return (
    <html suppressHydrationWarning lang={lang} dir={lang === "ar" ? "rtl" : "ltr"} className={`${display.variable} ${displayAr.variable} ${sans.variable} ${arabic.variable}`}>
      <body>
        <LangProvider initial={lang}>{children}</LangProvider>
        <Toaster richColors={false} position="bottom-center" />
      </body>
    </html>
  );
}
