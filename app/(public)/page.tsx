import Link from "next/link";
import { redirect } from "next/navigation";
import { BrandLockup } from "@/components/brand";
import { Button } from "@/components/ui/button";

// Platform landing for a bare visit: guests arrive through a table QR, not here.
export default function Home() {
  if (process.env.NODE_ENV === "development") redirect("/dev");
  return (
    <main className="grid min-h-dvh place-items-center bg-background p-4">
      <div className="flex w-full max-w-sm flex-col gap-4">
        <BrandLockup className="text-brand" />
        <h1 className="mt-4 text-[28px] leading-tight font-semibold">Scan the code on your table</h1>
        <p className="text-muted-foreground">Each table has its own code. Scan it with your phone camera to see the menu and order.</p>
        <p dir="rtl" lang="ar" className="text-muted-foreground">امسح الرمز على طاولتك بكاميرا هاتفك لتصفح القائمة والطلب.</p>
        <Button variant="secondary" size="sm" className="mt-2 self-start" asChild>
          <Link href="/staff">Staff sign in</Link>
        </Button>
      </div>
    </main>
  );
}
