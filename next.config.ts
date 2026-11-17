import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    rules: {
      // not 'foreign': keep Tailwind off Next internals (next/font CSS breaks otherwise)
      "*.css": { loaders: ["@tailwindcss/turbopack"], as: "*.css", condition: { not: "foreign" } },
    },
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "*.supabase.co" },
    ],
  },
};

export default nextConfig;
