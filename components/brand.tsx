"use client";
import { useLang } from "@/lib/i18n";
import { cn } from "@/lib/utils";

/** Sufra mark (docs/brand/sufra/mark.svg): arch + dish + rim. currentColor, never mirrored. */
export function BrandMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" aria-hidden="true" className={cn("size-6 shrink-0", className)}>
      <path d="M8 41V22a16 16 0 0 1 32 0v19" fill="none" stroke="currentColor" strokeWidth="4" />
      <path d="M16 39a8 8 0 0 1 16 0z" fill="currentColor" />
      <rect x="22.5" y="28" width="3" height="3" rx="1.5" fill="currentColor" />
      <path d="M3 41h42" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
    </svg>
  );
}

/** Mark + "Sufra" | "سفرة". Visual order is fixed (dir=ltr); AR UI passes/derives ar-first. `nameAr` is ignored (kept so old callers compile). */
export function BrandLockup({ size = "md", order, className }: { size?: "sm" | "md"; order?: "en-first" | "ar-first"; nameAr?: string; className?: string }) {
  const { lang } = useLang();
  const sm = size === "sm";
  const arFirst = (order ?? (lang === "ar" ? "ar-first" : "en-first")) === "ar-first";
  const en = <span key="en" lang="en" className="font-display">Sufra</span>;
  const ar = <span key="ar" lang="ar" className="font-display leading-none">سفرة</span>;
  return (
    <span dir="ltr" className={cn("inline-flex items-center gap-2 font-display font-bold leading-none whitespace-nowrap text-primary", sm ? "text-lg" : "text-2xl", className)}>
      <BrandMark className={sm ? "size-6" : "size-8"} />
      {arFirst ? ar : en}
      <span aria-hidden className="h-[1em] w-px bg-border" />
      {arFirst ? en : ar}
    </span>
  );
}
