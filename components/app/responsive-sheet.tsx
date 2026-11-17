"use client";
import type { ReactNode } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Drawer, DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useMediaQuery } from "@/hooks/use-media-query";
import { useLang } from "@/lib/i18n";
import { cn } from "@/lib/utils";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  side?: "bottom" | "right";
  /** Editor-sized: full-screen Drawer below 768px. */
  full?: boolean;
  /** Shown above the title (guest item sheet: arch photo). */
  media?: ReactNode;
  /** Guest sheets: Beiruti 28 title. */
  displayTitle?: boolean;
};

const body = "min-h-0 flex-1 overflow-y-auto px-5 py-4";
const titleCls = "font-display text-[28px] leading-[1.15] font-semibold";
const foot = "shrink-0 border-t px-5 pt-4 pb-[max(1.25rem,env(safe-area-inset-bottom))]";

// Drawer below 768px; Dialog (or right Sheet) from 768px up. Radix wires title/description via aria-labelledby/describedby.
export function ResponsiveSheet({ open, onOpenChange, title, description, children, footer, side = "bottom", full, media, displayTitle }: Props) {
  const { lang } = useLang();
  const wide = useMediaQuery("(min-width: 768px)");
  const desc = (D: typeof DialogDescription | typeof DrawerDescription | typeof SheetDescription) =>
    description ? <D>{description}</D> : <D className="sr-only">{title}</D>;

  if (!wide)
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent className={cn(full && "mt-0 h-dvh data-[vaul-drawer-direction=bottom]:max-h-dvh data-[vaul-drawer-direction=bottom]:rounded-none")}>
          <DrawerHeader className="px-5">
            {media}
            <DrawerTitle className={cn(displayTitle && titleCls)}>{title}</DrawerTitle>
            {desc(DrawerDescription)}
          </DrawerHeader>
          <div className={body}>{children}</div>
          {footer && <div className={foot}>{footer}</div>}
        </DrawerContent>
      </Drawer>
    );

  if (side === "right")
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side={lang === "ar" ? "left" : "right"} className={cn("gap-0 p-0 sm:max-w-[440px]")}>
          <SheetHeader className="pe-16">
            <SheetTitle>{title}</SheetTitle>
            {desc(SheetDescription)}
          </SheetHeader>
          <div className={body}>{children}</div>
          {footer && <div className={foot}>{footer}</div>}
        </SheetContent>
      </Sheet>
    );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={cn("flex max-h-[90dvh] flex-col gap-0 overflow-hidden p-0")}>
        <DialogHeader className="p-5 pe-16 text-start">
          {media}
          <DialogTitle className={cn(displayTitle && titleCls)}>{title}</DialogTitle>
          {desc(DialogDescription)}
        </DialogHeader>
        <div className={body}>{children}</div>
        {footer && <div className={foot}>{footer}</div>}
      </DialogContent>
    </Dialog>
  );
}
