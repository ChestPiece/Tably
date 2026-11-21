import type { MetadataRoute } from "next";

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://qr-restauratn-app.vercel.app";

export default function sitemap(): MetadataRoute.Sitemap {
  return ["", "/signup", "/login", "/terms", "/privacy"].map((p) => ({ url: `${SITE}${p}` }));
}
