import type { Metadata } from "next";
import { Figtree, Fraunces } from "next/font/google";
import { LandingMotion } from "@/components/landing/LandingMotion";
import { LANDING_HTML } from "@/components/landing/markup";
import "@/components/landing/landing.css";

const serif = Fraunces({ subsets: ["latin"], axes: ["opsz", "SOFT", "WONK"], variable: "--lf-serif" });
const sans = Figtree({ subsets: ["latin"], variable: "--lf-sans" });

export const metadata: Metadata = {
  title: { absolute: "Tably · QR menus and table ordering for restaurants" },
  description: "Guests scan the code on the table, order from their own phone, and your kitchen sees it at once. Free during the beta.",
  openGraph: {
    title: "Tably · QR menus and table ordering",
    description: "Scan the code. Order from your phone. Food comes to your table.",
    type: "website",
  },
};

// Public landing page. Static markup (components/landing/markup.ts) + GSAP/Lenis motion.
export default function Home() {
  return (
    <>
      <div className={`tl ${serif.variable} ${sans.variable}`} data-wait="" dangerouslySetInnerHTML={{ __html: LANDING_HTML }} />
      <LandingMotion />
    </>
  );
}
