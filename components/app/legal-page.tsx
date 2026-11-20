import Link from "next/link";
import { BrandLockup } from "@/components/brand";

const SUPPORT = process.env.NEXT_PUBLIC_SUPPORT_EMAIL;

// Plain reading page for Terms and Privacy. English only, like the landing page.
export function LegalPage({ title, updated, children }: { title: string; updated: string; children: React.ReactNode }) {
  return (
    <main lang="en" dir="ltr" className="mx-auto w-full max-w-[68ch] px-4 py-10 sm:py-16">
      <Link href="/" aria-label="Tably home" className="inline-block">
        <BrandLockup className="text-brand" />
      </Link>
      <h1 className="mt-10 font-display text-[40px] leading-[1.05] font-semibold">{title}</h1>
      <p className="mt-2 text-sm text-muted-foreground">Last updated {updated}</p>
      <div className="mt-8 flex flex-col gap-4 leading-relaxed [&_h2]:mt-6 [&_h2]:text-xl [&_h2]:font-semibold [&_ul]:list-disc [&_ul]:ps-5 [&_li]:mt-1">
        {children}
        <h2>Contact</h2>
        <p>
          {SUPPORT ? (
            <>Questions or requests: <a className="underline underline-offset-2" href={`mailto:${SUPPORT}`}>{SUPPORT}</a>.</>
          ) : (
            <>Questions or requests: reply to any email you got from Tably.</>
          )}
        </p>
      </div>
    </main>
  );
}
