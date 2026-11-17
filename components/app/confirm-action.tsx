"use client";
import { Loader2 } from "lucide-react";
import { useState, type ReactNode } from "react";
import {
  AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { errorText, useLang } from "@/lib/i18n";

type Props = {
  trigger?: ReactNode;
  // Controlled mode, for dialogs opened from a menu item.
  open?: boolean;
  onOpenChange?: (o: boolean) => void;
  title: string;
  description: string;
  confirmLabel: string;
  cancelLabel: string;
  tone?: "default" | "destructive";
  onConfirm: () => Promise<void> | void;
};

export function ConfirmAction({ trigger, open: openProp, onOpenChange, title, description, confirmLabel, cancelLabel, tone = "default", onConfirm }: Props) {
  const { lang } = useLang();
  const [openState, setOpenState] = useState(false);
  const open = openProp ?? openState;
  const setOpen = onOpenChange ?? setOpenState;
  const [pending, setPending] = useState(false);
  const run = async () => {
    setPending(true);
    try {
      await onConfirm();
      setOpen(false);
    } catch (e) {
      toast.error(errorText(lang, e));
    } finally {
      setPending(false);
    }
  };
  return (
    <AlertDialog open={open} onOpenChange={(o) => !pending && setOpen(o)}>
      {trigger && <AlertDialogTrigger asChild>{trigger}</AlertDialogTrigger>}
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel size="lg" disabled={pending}>{cancelLabel}</AlertDialogCancel>
          <Button size="lg" variant={tone === "destructive" ? "destructive" : "default"} disabled={pending} onClick={run}>
            {pending && <Loader2 aria-hidden className="animate-spin" />}
            {confirmLabel}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
