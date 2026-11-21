import type { MetadataRoute } from "next";

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://qr-restauratn-app.vercel.app";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/admin", "/staff", "/t/", "/reset-password"] },
    sitemap: `${SITE}/sitemap.xml`,
  };
}
