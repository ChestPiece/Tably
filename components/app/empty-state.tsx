import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

export function EmptyState({ icon: Icon, title, body, action }: { icon: LucideIcon; title: string; body?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-3 px-6 py-12 text-center">
      <span className="grid size-12 place-items-center rounded-arch bg-muted text-text-2">
        <Icon aria-hidden className="size-6" />
      </span>
      <h2 className="font-display text-xl font-bold">{title}</h2>
      {body && <p className="max-w-sm text-sm text-text-2">{body}</p>}
      {action}
    </div>
  );
}
