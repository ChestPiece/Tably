"use client";
import { BrandMark } from "@/components/brand";
import { useLang } from "@/lib/i18n";

export default function BadTableLink() {
  const { t } = useLang();
  return (
    <main className="mx-auto flex min-h-dvh max-w-[560px] flex-col justify-center gap-3 px-6">
      <span aria-hidden className="mb-4 block h-24 w-20 rounded-arch bg-muted" />
      <h1 className="font-display text-[28px] leading-[1.15] font-semibold">{t("badLinkTitle")}</h1>
      <p className="text-text-2">{t("badLinkBody")}</p>
      <p className="mt-8 flex items-center gap-2 text-sm text-text-2">
        <BrandMark className="size-4" />
        {t("servedBy")}
      </p>
    </main>
  );
}
