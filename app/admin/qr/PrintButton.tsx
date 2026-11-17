"use client";
import Link from "next/link";
import { ArrowLeft, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLang } from "@/lib/i18n";

export function QrToolbar({ origin }: { origin: string }) {
  const { t } = useLang();
  return (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-3 print:hidden">
      <div className="flex min-w-0 items-center gap-2">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/admin?page=tables" aria-label={t("backToAdmin")}>
            <ArrowLeft aria-hidden className="rtl:rotate-180" />
          </Link>
        </Button>
        <p className="min-w-0 text-sm text-muted-foreground">{t("qrLinksTo").replace("{o}", origin)}</p>
      </div>
      <Button size="sm" onClick={() => window.print()}>
        <Printer aria-hidden /> {t("print")}
      </Button>
    </div>
  );
}
