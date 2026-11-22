"use client";
import Image from "next/image";
import { useLang } from "@/lib/i18n";
import { cn } from "@/lib/utils";

/** Tably mark (public/icon.svg): table seen from above, plate and dish. Frame is currentColor, never mirrored. */
export function BrandMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true" className={cn("size-6 shrink-0", className)}>
      <rect x="1" y="1" width="30" height="30" rx="9.5" fill="currentColor" />
      <rect x="6.5" y="6.5" width="19" height="19" rx="5.5" className="fill-background" />
      <circle cx="16" cy="16" r="5.5" fill="#E08A3C" />
    </svg>
  );
}

/** Mark + "Tably" | "تابلي". Visual order is fixed (dir=ltr); AR UI passes/derives ar-first. `nameAr` is ignored (kept so old callers compile). */
export function BrandLockup({ size = "md", order, className }: { size?: "sm" | "md"; order?: "en-first" | "ar-first"; nameAr?: string; className?: string }) {
  const { lang } = useLang();
  const sm = size === "sm";
  const arFirst = (order ?? (lang === "ar" ? "ar-first" : "en-first")) === "ar-first";
  const en = <span key="en" lang="en" className="font-display">Tably</span>;
  const ar = <span key="ar" lang="ar" className="font-display leading-none">تابلي</span>;
  return (
    <span dir="ltr" className={cn("inline-flex items-center gap-2 font-display font-bold leading-none whitespace-nowrap text-primary", sm ? "text-lg" : "text-2xl", className)}>
      <BrandMark className={sm ? "size-6" : "size-8"} />
      {arFirst ? ar : en}
      <span aria-hidden className="h-[1em] w-px bg-border" />
      {arFirst ? en : ar}
    </span>
  );
}

/** A restaurant's own mark: its uploaded logo, or the first letter of its name in a circle. Never a dish photo. */
export function VenueMark({ name, logo, className }: { name: string; logo?: string | null; className?: string }) {
  if (logo) {
    return (
      <span className={cn("relative size-16 shrink-0 overflow-hidden rounded-full bg-card ring-1 ring-border", className)}>
        <Image src={logo} alt="" fill sizes="128px" className="object-cover" />
      </span>
    );
  }
  const initial = Array.from(name.trim())[0]?.toUpperCase() ?? "";
  return (
    <span aria-hidden className={cn("grid size-16 shrink-0 place-items-center rounded-full bg-primary font-display text-3xl font-semibold text-primary-foreground", className)}>
      {initial}
    </span>
  );
}
