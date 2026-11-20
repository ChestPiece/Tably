import { headers } from "next/headers";
import { redirect } from "next/navigation";
import QRCode from "qrcode";
import { getStaff, serverClient } from "@/lib/supabase/server";
import { BrandMark } from "@/components/brand";
import { QrToolbar } from "./PrintButton";

export const dynamic = "force-dynamic";

// Fixed print colours (light pearl + indigo), so the card scans and prints the same in dark mode.
const PEARL = "oklch(96.6% 0.004 106)";

// Printable table cards (Sufra brand §5): 100 × 150 mm tent, arch top, indigo QR on pearl.
// Three 100 mm tents don't fit A4 (297 mm), so print scales them to 93% on A4 landscape.
export default async function QrSheet() {
  const staff = await getStaff();
  if (!staff || staff.role !== "owner") redirect("/login");
  const sb = await serverClient();
  const [{ data: r }, { data: tables }] = await Promise.all([
    sb.from("restaurants").select("name, name_ar, pin_required").eq("id", staff.restaurantId).single(),
    sb.from("tables").select("number, qr_slug, pin").eq("restaurant_id", staff.restaurantId).order("number"),
  ]);
  const h = await headers();
  const origin = process.env.NEXT_PUBLIC_SITE_URL ?? `${h.get("x-forwarded-proto") ?? "http"}://${h.get("host")}`;
  const cards = await Promise.all(
    (tables ?? []).map(async (t) => ({
      ...t,
      svg: (
        await QRCode.toString(`${origin}/t/${t.qr_slug}`, { type: "svg", margin: 0, errorCorrectionLevel: "M", color: { dark: "#000000", light: "#0000" } })
      ).replace(/#000000(?![0-9a-f])/gi, "currentColor"),
    })),
  );

  return (
    <main className="mx-auto max-w-[340mm] p-4 sm:p-6 print:max-w-none print:p-0">
      <style>{`@media print { @page { size: A4 landscape; margin: 5mm; } html, body { background: #fff !important; } }`}</style>
      <QrToolbar origin={origin} />
      <div className="flex flex-wrap justify-center gap-6 print:gap-[3mm] print:[zoom:0.93]">
        {cards.map((c) => (
          <div
            key={c.qr_slug}
            style={{ background: PEARL }}
            className="relative flex h-[150mm] w-[100mm] shrink-0 break-inside-avoid flex-col items-center rounded-[50mm_50mm_2mm_2mm] px-[9mm] pt-[18mm] pb-[7mm] text-center text-brand shadow-float print:shadow-none print:[print-color-adjust:exact]"
          >
            <span aria-hidden className="pointer-events-none absolute inset-[3mm] rounded-[47mm_47mm_1mm_1mm] border-[0.3mm] border-brand/25" />
            <span className="font-display text-[22mm] leading-none font-bold tabular-nums">{c.number}</span>
            <span lang="ar" dir="rtl" className="mt-[1mm] font-display text-[6mm] leading-[1.3] font-semibold">
              طاولة {c.number}
            </span>
            <span className="mt-[5mm] mb-[4mm] block size-[32mm] p-[1.5mm] [&_svg]:block [&_svg]:size-full" role="img" aria-label={`QR · Table ${c.number}`} dangerouslySetInnerHTML={{ __html: c.svg }} />
            <span className="text-[3.4mm] leading-[1.35]">Scan to see the menu and order</span>
            <span lang="ar" dir="rtl" className="text-[3.6mm] leading-[1.5]">امسح لتصفح القائمة والطلب</span>
            {r?.pin_required && c.pin && (
              <span className="mt-[2mm] text-[3mm] tabular-nums">
                Table code {c.pin} · <span lang="ar" dir="rtl">رمز الطاولة {c.pin}</span>
              </span>
            )}
            <span className="mt-auto font-display text-[5mm] leading-[1.2] font-semibold">{r?.name}</span>
            {r?.name_ar && (
              <span lang="ar" dir="rtl" className="font-display text-[4.6mm] leading-[1.4] font-semibold">
                {r.name_ar}
              </span>
            )}
            <span dir="ltr" className="mt-[4mm] flex items-center gap-[1.5mm] text-[2.6mm]">
              <BrandMark className="size-[4mm]" />
              Tably
            </span>
          </div>
        ))}
      </div>
    </main>
  );
}
