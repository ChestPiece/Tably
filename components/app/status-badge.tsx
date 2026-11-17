"use client";
import { tr, useLang, type Key } from "@/lib/i18n";
import type { Lang, OrderStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

const MAP: Record<OrderStatus, { key: Key; color: string }> = {
  received: { key: "st_received", color: "var(--status-new)" },
  preparing: { key: "st_preparing", color: "var(--status-cooking)" },
  ready: { key: "st_ready", color: "var(--status-ready)" },
  served: { key: "st_served", color: "var(--status-served)" },
  cancelled: { key: "st_cancelled", color: "var(--status-cancelled)" },
};

/** 8px square + word. Colour never carries status alone; late is said in words. */
export function StatusTag({ status, lang: langProp, late, label, className }: { status: OrderStatus; lang?: Lang; late?: boolean; label?: string; className?: string }) {
  const ctx = useLang();
  const lang = langProp ?? ctx.lang;
  const { key, color } = MAP[status];
  return (
    <span className={cn("inline-flex items-center gap-2 text-sm whitespace-nowrap", className)}>
      <span aria-hidden className="size-2 shrink-0 rounded-[2px]" style={{ background: color }} />
      {label ?? tr(lang, key)}
      {late && <span> · {tr(lang, "late")}</span>}
    </span>
  );
}

/** Old name, same component (existing callers). */
export const StatusBadge = StatusTag;
