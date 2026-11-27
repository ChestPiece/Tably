"use client";
import { X } from "lucide-react";
import { createContext, useContext, useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";
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
  /** Editor-sized: a side panel on desktop, full-screen Drawer below 768px. */
  full?: boolean;
  /** Grid-sized on desktop (bulk add). */
  grid?: boolean;
  /** Shown above the title (guest item sheet: arch photo). */
  media?: ReactNode;
  /** Guest sheets: Beiruti 28 title. */
  displayTitle?: boolean;
  /** From 1280px: render inline in the page's right rail (needs a RailSlot), not over the page. */
  rail?: boolean;
};

// The right rail is an <aside> the shell renders; sheets with `rail` portal into it.
const RailCtx = createContext<{ el: HTMLElement | null; set: (el: HTMLElement | null) => void }>({ el: null, set: () => {} });

export function RailProvider({ children }: { children: ReactNode }) {
  const [el, set] = useState<HTMLElement | null>(null);
  return <RailCtx value={{ el, set }}>{children}</RailCtx>;
}

/** Empty = hidden; below 1280px rails fall back to sheets, so the slot hides there too. */
export function RailSlot({ label }: { label: string }) {
  const { set } = useContext(RailCtx);
  return <aside ref={set} aria-label={label} className="w-[400px] shrink-0 border-s bg-card empty:hidden max-xl:hidden" />;
}

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

// Drawer below 768px wide or 600px tall (landscape phones); Dialog/Sheet above. Radix wires title/description via aria-labelledby/describedby.
export function ResponsiveSheet({ open, onOpenChange, title, description, children, footer, full, grid, media, displayTitle, rail }: Props) {
  const { lang } = useLang();
  const wide = useMediaQuery("(min-width: 768px) and (min-height: 600px)");
  const xl = useMediaQuery("(min-width: 1280px)");
  const slot = useContext(RailCtx).el;

  if (rail && xl && slot) return open ? createPortal(<RailPanel {...{ onOpenChange, title, description, footer }}>{children}</RailPanel>, slot) : null;
  const desc = (D: typeof DialogDescription | typeof DrawerDescription) =>
    description ? <D>{description}</D> : <D className="sr-only">{title}</D>;

  if (!wide)
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent className={cn(full && "mt-0 h-dvh data-[vaul-drawer-direction=bottom]:max-h-dvh data-[vaul-drawer-direction=bottom]:rounded-none")}>
          {/* Header scrolls with the body, so a photo never squeezes the content on short screens; the footer stays put. */}
          <div className="relative min-h-0 flex-1 overflow-y-auto">
            <DrawerHeader className="px-5">
              {media}
              <DrawerTitle className={cn(displayTitle && titleCls)}>{title}</DrawerTitle>
              {desc(DrawerDescription)}
            </DrawerHeader>
            <div className="px-5 py-4">{children}</div>
          </div>
          {footer && <div className={foot}>{footer}</div>}
        </DrawerContent>
      </Drawer>
    );

  // Editors (creating and editing) open beside the page; short tasks stay a centred dialog.
  if (full || grid)
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent
          side={lang === "ar" ? "left" : "right"}
          onKeyDown={submitOnModEnter}
          className={cn("gap-0 bg-card p-0 data-[state=open]:duration-base sm:max-w-[720px]", grid && "sm:max-w-[min(1040px,calc(100vw-4rem))]")}
        >
          <SheetHeader className="gap-1 px-6 py-5 pe-16">
            <SheetTitle className="text-xl leading-tight">{title}</SheetTitle>
            {desc(SheetDescription)}
          </SheetHeader>
          <div className="relative min-h-0 flex-1 overflow-y-auto px-6 py-6">{children}</div>
          {footer && <div className="shrink-0 border-t px-6 pt-4 pb-[max(1rem,env(safe-area-inset-bottom))]">{footer}</div>}
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
        {footer && <div className="shrink-0 border-t px-6 pt-4 pb-[max(1rem,env(safe-area-inset-bottom))]">{footer}</div>}
      </DialogContent>
    </Dialog>
  );
}

// Non-modal: the list beside it stays usable. Esc closes unless focus is in a portaled popover (select, menu).
function RailPanel({ onOpenChange, title, description, footer, children }: Pick<Props, "onOpenChange" | "title" | "description" | "footer" | "children">) {
  const { t } = useLang();
  const ref = useRef<HTMLElement>(null);
  // Focus moves in on open and back to the row that opened it on close.
  useEffect(() => {
    const back = document.activeElement as HTMLElement | null;
    ref.current?.focus();
    return () => {
      if (back?.isConnected) back.focus();
    };
  }, []);
  return (
    <section
      ref={ref}
      tabIndex={-1}
      aria-label={title}
      onKeyDown={(e) => {
        if (e.key === "Escape" && e.currentTarget.contains(e.target as Node)) {
          e.preventDefault();
          onOpenChange(false);
        } else submitOnModEnter(e);
      }}
      className="flex h-full flex-col outline-none"
    >
      <header className="flex shrink-0 items-start gap-3 border-b px-6 py-4">
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-lg leading-tight font-semibold">{title}</h2>
          {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
        </div>
        <Button variant="ghost" size="icon-sm" className="-me-2 text-muted-foreground" onClick={() => onOpenChange(false)} aria-label={t("close")}>
          <X aria-hidden />
        </Button>
      </header>
      <div className="relative min-h-0 flex-1 overflow-y-auto px-6 py-5">{children}</div>
      {footer && <div className="shrink-0 border-t px-6 pt-4 pb-[max(1rem,env(safe-area-inset-bottom))]">{footer}</div>}
    </section>
  );
}
