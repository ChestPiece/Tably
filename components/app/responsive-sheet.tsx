"use client";
import type { KeyboardEvent, ReactNode } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Drawer, DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useMediaQuery } from "@/hooks/use-media-query";
import { cn } from "@/lib/utils";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  /** Editor-sized: a side panel on desktop, full-screen Drawer below 768px. */
  full?: boolean;
  /** Grid-sized on desktop (bulk add). */
  grid?: boolean;
  /** Shown above the title (guest item sheet: arch photo). */
  media?: ReactNode;
  /** Guest sheets: Beiruti 28 title. */
  displayTitle?: boolean;
};

const body = "relative min-h-0 flex-1 overflow-y-auto px-5 py-4";
const titleCls = "font-display text-[28px] leading-[1.15] font-semibold";
const foot = "shrink-0 border-t px-5 pt-4 pb-[max(1.25rem,env(safe-area-inset-bottom))]";

// Ctrl/Cmd+Enter presses the sheet's primary action (its submit button, or one marked data-primary).
function submitOnModEnter(e: KeyboardEvent<HTMLElement>) {
  if (e.key !== "Enter" || !(e.metaKey || e.ctrlKey)) return;
  const b = e.currentTarget.querySelector<HTMLButtonElement>("button[type=submit]:not(:disabled), button[data-primary]:not(:disabled)");
  if (!b) return;
  e.preventDefault();
  b.click();
}

// Drawer below 768px; Dialog from 768px up. Radix wires title/description via aria-labelledby/describedby.
export function ResponsiveSheet({ open, onOpenChange, title, description, children, footer, full, grid, media, displayTitle }: Props) {
  const wide = useMediaQuery("(min-width: 768px)");
  const desc = (D: typeof DialogDescription | typeof DrawerDescription) =>
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

  // Editors (creating and editing) open beside the page; short tasks stay a centred dialog.
  if (full || grid)
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent
          side="right"
          onKeyDown={submitOnModEnter}
          className={cn("gap-0 bg-card p-0 data-[state=open]:duration-base sm:max-w-[720px]", grid && "sm:max-w-[min(1040px,calc(100vw-4rem))]")}
        >
          <SheetHeader className="gap-1 px-6 py-5 pe-16">
            <SheetTitle className="text-xl leading-tight">{title}</SheetTitle>
            {desc(SheetDescription)}
          </SheetHeader>
          <div className="relative min-h-0 flex-1 overflow-y-auto px-6 py-6">{children}</div>
          {footer && <div className="shrink-0 border-t px-6 py-4">{footer}</div>}
        </SheetContent>
      </Sheet>
    );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent onKeyDown={submitOnModEnter} className="flex max-h-[90dvh] flex-col gap-0 overflow-hidden p-0">
        <DialogHeader className="gap-1.5 px-6 pt-6 pb-4 pe-16 text-start">
          {media}
          <DialogTitle className={cn(displayTitle && titleCls)}>{title}</DialogTitle>
          {desc(DialogDescription)}
        </DialogHeader>
        <div className="relative min-h-0 flex-1 overflow-y-auto px-6 pb-6">{children}</div>
        {footer && <div className="shrink-0 border-t px-6 py-4">{footer}</div>}
      </DialogContent>
    </Dialog>
  );
}
