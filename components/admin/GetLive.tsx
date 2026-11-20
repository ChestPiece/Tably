"use client";
import { Check } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useLang, type Key } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { PANEL } from "./OwnerHome";

type Step = { title: Key; desc: Key; done: boolean; action: Key; onClick?: () => void; href?: string };

// First-run steps on the owner home. Gone once the restaurant has dishes and its first order.
export function GetLive({ dishes, ordered, team, onMenu, onTeam }: { dishes: boolean; ordered: boolean; team: boolean; onMenu: () => void; onTeam: () => void }) {
  const { t } = useLang();
  if (dishes && ordered) return null;
  const steps: Step[] = [
    { title: "glDishes", desc: "glDishesD", done: dishes, action: "addDish", onClick: onMenu },
    { title: "glQr", desc: "glQrD", done: ordered, action: "printCards", href: "/admin/qr" },
    { title: "glTeam", desc: "glTeamD", done: team, action: "glInvite", onClick: onTeam },
  ];
  const next = steps.findIndex((s) => !s.done);

  return (
    <section aria-labelledby="gl-h" className={cn(PANEL, "mb-5 max-sm:mb-3")}>
      <h2 id="gl-h" className="text-xl font-semibold">{t("glTitle")}</h2>
      <p className="mt-1 text-sm text-muted-foreground">{t("glDesc")}</p>
      <ol className="mt-5 flex flex-col">
        {steps.map((s, i) => (
          <li key={s.title} className="flex items-center gap-4 border-t py-4 last:pb-0 max-sm:flex-wrap">
            <span
              aria-hidden
              className={cn(
                "grid size-8 shrink-0 place-items-center rounded-full text-sm font-semibold tabular-nums",
                s.done ? "bg-primary text-primary-foreground" : "ring-1 ring-border",
              )}
            >
              {s.done ? <Check className="size-4" /> : i + 1}
            </span>
            <div className="min-w-0 flex-1">
              <p className="font-medium">
                {t(s.title)}
                {s.done && <span className="sr-only"> ({t("glDone")})</span>}
              </p>
              <p className="text-sm text-muted-foreground">{t(s.desc)}</p>
            </div>
            {!s.done && (
              <Button size="sm" variant={i === next ? "default" : "secondary"} className="max-sm:ms-12" asChild={!!s.href} onClick={s.onClick}>
                {s.href ? <Link href={s.href} target="_blank">{t(s.action)}</Link> : t(s.action)}
              </Button>
            )}
          </li>
        ))}
      </ol>
    </section>
  );
}
