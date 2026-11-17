import { Minus, Plus, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  value: number;
  min?: number;
  max?: number;
  onChange: (v: number) => void;
  labels: { decrease: string; increase: string; remove?: string };
  /** Indigo fill (on the sheet's primary action row). */
  filled?: boolean;
};

const btn = "grid size-10 place-items-center rounded-md transition-colors duration-fast ease-sufra outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background active:scale-[.98] disabled:pointer-events-none [&_svg]:size-4";

export function QuantityStepper({ value, min = 1, max = 99, onChange, labels, filled }: Props) {
  const remove = value <= min && !!labels.remove;
  const tone = filled ? "text-primary-foreground hover:bg-brand-field disabled:opacity-50" : "text-foreground hover:bg-muted disabled:text-muted-foreground";
  return (
    <div dir="ltr" className={cn("inline-flex h-10 items-center rounded-md border", filled ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card")}>
      <button type="button" className={cn(btn, tone)} aria-label={remove ? labels.remove : labels.decrease} disabled={!remove && value <= min} onClick={() => onChange(remove ? 0 : value - 1)}>
        {remove ? <Trash2 aria-hidden /> : <Minus aria-hidden />}
      </button>
      <output aria-live="polite" className="min-w-7 text-center font-semibold tabular-nums">{value}</output>
      <button type="button" className={cn(btn, tone)} aria-label={labels.increase} disabled={value >= max} onClick={() => onChange(value + 1)}>
        <Plus aria-hidden />
      </button>
    </div>
  );
}
