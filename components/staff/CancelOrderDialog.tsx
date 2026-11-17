"use client";
import { useState } from "react";
import { Loader2 } from "lucide-react";
import { ResponsiveSheet } from "@/components/app/responsive-sheet";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { tr, type Key } from "@/lib/i18n";
import { tableLabel } from "@/lib/format";
import type { Lang, Order } from "@/lib/types";

const REASONS: Key[] = ["reasonSoldOut", "reasonClosed", "reasonGuest", "reasonOther"];

type Props = { order: Order | null; lang: Lang; onClose: () => void; onConfirm: (o: Order, reason: string) => Promise<boolean> };

export function CancelOrderDialog({ order, lang, onClose, onConfirm }: Props) {
  const [preset, setPreset] = useState<Key>("reasonSoldOut");
  const [detail, setDetail] = useState("");
  const [pending, setPending] = useState(false);
  const other = preset === "reasonOther";
  const reason = other ? detail.trim() : [tr("en", preset), detail.trim()].filter(Boolean).join(": ");
  const submit = async () => {
    if (!order || !reason) return;
    setPending(true);
    const ok = await onConfirm(order, reason);
    setPending(false);
    if (ok) setDetail("");
  };
  return (
    <ResponsiveSheet
      open={!!order}
      onOpenChange={(o) => !o && !pending && onClose()}
      title={tr(lang, "cancelTitle")}
      description={order ? `${tableLabel(lang, order.table_number)} #${order.number} · ${tr(lang, "cancelBody")}` : tr(lang, "cancelBody")}
      footer={
        <div className="flex gap-2">
          <Button variant="secondary" className="flex-1" disabled={pending} onClick={onClose}>
            {tr(lang, "keepOrder")}
          </Button>
          <Button className="flex-1" disabled={pending || !reason} onClick={submit}>
            {pending && <Loader2 aria-hidden className="animate-spin" />}
            {tr(lang, "confirmCancel")}
          </Button>
        </div>
      }
    >
      <RadioGroup value={preset} onValueChange={(v) => setPreset(v as Key)} className="gap-1">
        {REASONS.map((k) => (
          <Label key={k} htmlFor={`r-${k}`} className="flex min-h-12 items-center gap-3 rounded-md border border-input bg-card px-4 font-medium has-data-[state=checked]:border-foreground has-data-[state=checked]:shadow-[inset_0_0_0_1px_var(--foreground)]">
            <RadioGroupItem id={`r-${k}`} value={k} />
            {tr(lang, k)}
          </Label>
        ))}
      </RadioGroup>
      <Label htmlFor="cancel-detail" className="mt-4 mb-1.5">
        {tr(lang, "reasonDetail")}
      </Label>
      <Textarea id="cancel-detail" maxLength={200} rows={2} value={detail} onChange={(e) => setDetail(e.target.value)} />
    </ResponsiveSheet>
  );
}
