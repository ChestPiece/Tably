import Link from "next/link";
import { notFound } from "next/navigation";
import { BrandMark } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { getStaff, serverClient } from "@/lib/supabase/server";
import { DevSignIn } from "./DevSignIn";

export const dynamic = "force-dynamic";

// Development launcher: open any table without scanning, one-click staff login.
export default async function DevPage() {
  if (process.env.NODE_ENV !== "development") notFound();
  const staff = await getStaff();
  const sb = await serverClient();
  const { data: tables } = staff
    ? await sb.from("tables").select("number, qr_slug").eq("restaurant_id", staff.restaurantId).order("number")
    : { data: null };

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-10 px-4 py-8 sm:px-6">
      <header className="flex flex-wrap items-center gap-3">
        <BrandMark className="size-7 text-brand" />
        <h1 className="text-[28px] leading-tight font-semibold">Dev launcher</h1>
        <span className="text-sm text-muted-foreground">Development only. This page 404s in production.</span>
      </header>

      <section className="flex flex-col gap-4 border-t pt-6">
        <div>
          <h2 className="text-xl font-semibold">Staff session</h2>
          <p className="mt-1 text-sm text-muted-foreground">Sign in with a seeded account.</p>
        </div>
        <DevSignIn signedInAs={staff ? `${staff.email} (${staff.role})` : null} />
        {staff && (
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" size="sm" asChild><Link href="/staff">Kitchen board</Link></Button>
            {staff.role === "owner" && <Button variant="secondary" size="sm" asChild><Link href="/admin">Owner admin</Link></Button>}
            <Button variant="secondary" size="sm" asChild><Link href="/dev/ui">UI preview</Link></Button>
          </div>
        )}
      </section>

      <section className="flex flex-col gap-4 border-t pt-6">
        <div>
          <h2 className="text-xl font-semibold">Guest tables</h2>
          <p className="mt-1 text-sm text-muted-foreground">The same links the printed table cards open. Guest and staff sessions are separate, so both work in one browser.</p>
        </div>
        {!tables ? (
          <p className="text-sm text-muted-foreground">Sign in above to list table links.</p>
        ) : (
          <ul className="grid grid-cols-[repeat(auto-fill,minmax(140px,1fr))] gap-3">
            {tables.map((t) => (
              <li key={t.qr_slug}>
                <Link
                  href={`/t/${t.qr_slug}`}
                  target="_blank"
                  className="flex items-center gap-3 rounded-md border bg-card px-3 py-2.5 transition-colors duration-fast ease-sufra hover:bg-muted"
                >
                  <span className="grid h-11 w-9 shrink-0 place-items-center rounded-arch bg-brand font-display text-lg font-bold text-on-brand tabular-nums">{t.number}</span>
                  <span className="min-w-0">
                    <span className="block text-sm font-medium">Table {t.number}</span>
                    <span className="block truncate text-xs text-muted-foreground">/t/{t.qr_slug}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
