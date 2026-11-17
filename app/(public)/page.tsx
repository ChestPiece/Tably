import { createClient } from "@supabase/supabase-js";
import { ArrowRight } from "lucide-react";
import { headers } from "next/headers";
import Link from "next/link";
import QRCode from "qrcode";
import { BrandLockup } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { SUPABASE_KEY, SUPABASE_URL } from "@/lib/supabase/env";

export const dynamic = "force-dynamic";

// Test-phase home: the QR for one table plus a button to the same guest page.
// HOME_TABLE_SLUG is an optional override; a missing or dead slug falls back to the first table (home_table_slug RPC).
// ponytail: drop this page back to "scan the code on your table" before real guests.
export default async function Home() {
  const sb = createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: false } });
  const lookup = async (s: string | null | undefined) => (s ? (await sb.rpc("table_info", { p_slug: s })).data : null);
  let slug: string | null | undefined = process.env.HOME_TABLE_SLUG;
  let info = await lookup(slug);
  if (!info) {
    slug = (await sb.rpc("home_table_slug")).data as string | null;
    info = await lookup(slug);
  }
  const { data: r } = info ? await sb.from("restaurants").select("name, name_ar").eq("id", info.restaurant_id).single() : { data: null };

  if (!slug || !info || !r) {
    return (
      <main className="grid min-h-dvh place-items-center bg-background p-4">
        <div className="flex w-full max-w-sm flex-col gap-4">
          <BrandLockup className="text-brand" />
          <h1 className="mt-4 text-[28px] leading-tight font-semibold">Scan the code on your table</h1>
          <p className="text-muted-foreground">Each table has its own code. Scan it with your phone camera to see the menu and order.</p>
          <p dir="rtl" lang="ar" className="text-muted-foreground">امسح الرمز على طاولتك بكاميرا هاتفك لتصفح القائمة والطلب.</p>
        </div>
      </main>
    );
  }

  const h = await headers();
  const origin = process.env.NEXT_PUBLIC_SITE_URL ?? `${h.get("x-forwarded-proto") ?? "http"}://${h.get("host")}`;
  const href = `/t/${slug}`;
  const svg = (await QRCode.toString(`${origin}${href}`, { type: "svg", margin: 0, errorCorrectionLevel: "M", color: { dark: "#000000", light: "#0000" } })).replace(
    /#000000(?![0-9a-f])/gi,
    "currentColor",
  );
  const n = info.table_number as number;

  return (
    <main className="mx-auto grid min-h-dvh w-full max-w-4xl content-center gap-10 bg-background px-4 py-10 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:gap-16 sm:px-8">
      <div className="flex flex-col gap-5">
        <BrandLockup className="text-brand" />
        <div className="flex flex-col gap-2">
          <h1 className="font-display text-[40px] leading-[1.05] font-semibold">{r.name}</h1>
          <p dir="rtl" lang="ar" className="w-fit font-display text-2xl font-semibold text-text-2">{r.name_ar}</p>
        </div>
        <p className="max-w-[40ch] text-muted-foreground">
          Scan the code with your phone camera, or tap below to open the menu for table {n} and order.
          <span dir="rtl" lang="ar" className="mt-1 block w-fit">امسح الرمز بكاميرا هاتفك، أو اضغط أدناه لفتح قائمة الطاولة {n} والطلب.</span>
        </p>
        <Button size="lg" className="h-12 w-full text-base sm:w-fit sm:px-8" asChild>
          <Link href={href}>
            Order at table {n}
            <ArrowRight aria-hidden className="rtl:rotate-180" />
          </Link>
        </Button>
      </div>

      <figure className="mx-auto flex w-[min(100%,280px)] flex-col items-center rounded-[140px_140px_12px_12px] bg-card px-8 pt-12 pb-6 text-center text-brand ring-1 ring-border">
        <span className="font-display text-6xl leading-none font-bold tabular-nums">{n}</span>
        <span lang="ar" dir="rtl" className="mt-1 font-display text-lg font-semibold">طاولة {n}</span>
        <span className="mt-5 mb-4 block size-44 [&_svg]:block [&_svg]:size-full" role="img" aria-label={`QR code for table ${n}`} dangerouslySetInnerHTML={{ __html: svg }} />
        <figcaption className="text-sm">
          Scan to order
          <span lang="ar" dir="rtl" className="block">امسح للطلب</span>
        </figcaption>
      </figure>
    </main>
  );
}
