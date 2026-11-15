import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ChestBest — Good food. Zero waiting to order.",
  description: "Explore the ChestBest table ordering demo. Order, prepare, and serve in one connected experience.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
