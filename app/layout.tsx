import type { Metadata, Viewport } from "next";
import { Alexandria, Amiri, Beiruti, Bricolage_Grotesque, Cormorant, Figtree, Fraunces, IBM_Plex_Sans, IBM_Plex_Sans_Arabic, Readex_Pro } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import { LangProvider } from "@/lib/i18n";
import "./globals.css";

// Latin display (editorial serif, optical sizes) + Arabic display. Arabic faces skip preload: most visitors never render Arabic. Arabic text gets its own stacks via :lang(ar) in globals.css.
const display = Fraunces({ subsets: ["latin"], axes: ["opsz"], variable: "--nf-display" });
const displayAr = Beiruti({ subsets: ["arabic", "latin"], weight: ["500", "700"], variable: "--nf-display-ar", preload: false });
const sans = IBM_Plex_Sans({ subsets: ["latin"], weight: ["400", "500", "600"], variable: "--nf-sans" });
const arabic = IBM_Plex_Sans_Arabic({ subsets: ["arabic", "latin"], weight: ["400", "500", "600", "700"], variable: "--nf-arabic", preload: false });
// Venue vibes (lib/brand.ts VIBES): display pairs only, body stays Plex. None preload: only venues that pick them load them.
const bold = Bricolage_Grotesque({ subsets: ["latin"], variable: "--nf-bold", preload: false });
const boldAr = Alexandria({ subsets: ["arabic"], variable: "--nf-bold-ar", preload: false });
const clean = Figtree({ subsets: ["latin"], variable: "--nf-clean", preload: false });
const cleanAr = Readex_Pro({ subsets: ["arabic"], variable: "--nf-clean-ar", preload: false });
const classic = Cormorant({ subsets: ["latin"], variable: "--nf-classic", preload: false });
const classicAr = Amiri({ subsets: ["arabic"], weight: ["400", "700"], variable: "--nf-classic-ar", preload: false });
const VIBE_FONTS = [bold, boldAr, clean, cleanAr, classic, classicAr].map((f) => f.variable).join(" ");

export const metadata: Metadata = {
  title: { default: "Tably", template: "%s · Tably" },
  description: "Order from your table.",
  icons: { icon: "/icon.svg", apple: "/icon.svg" },
};

export const viewport: Viewport = { themeColor: "#F6F3EB", width: "device-width", initialScale: 1, viewportFit: "cover" };

// Sets <html lang/dir> from the cookie before first paint, so static pages need no cookie read.
const LANG_SCRIPT = `try{if(/(?:^|; )lang=ar(?:;|$)/.test(document.cookie)){var h=document.documentElement;h.lang="ar";h.dir="rtl"}}catch(e){}`;

// No cookies() here: it would make every route dynamic. Per-request routes wrap themselves in <CookieLang>.
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html suppressHydrationWarning lang="en" dir="ltr" className={`${display.variable} ${displayAr.variable} ${sans.variable} ${arabic.variable} ${VIBE_FONTS}`}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: LANG_SCRIPT }} />
      </head>
      <body>
        <LangProvider initial="en">{children}</LangProvider>
        <Toaster richColors={false} position="bottom-center" mobileOffset={{ bottom: 96 }} />
      </body>
    </html>
  );
}
