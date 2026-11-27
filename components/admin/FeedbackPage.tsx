"use client";
import { Star } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { errorText, useLang } from "@/lib/i18n";
import { useVenue } from "@/lib/venue";
import { cn } from "@/lib/utils";
import type { AdminProps } from "./AdminApp";
import { PANEL } from "./OwnerHome";
import { spanRange } from "./use-profit";

type Row = { id: string; rating: number; note: string | null; created_at: string; visits: { table_number: number } | null };

/** Guest ratings from the last 30 days, newest first. 3 stars or fewer is flagged so the owner follows up in person. */
export function FeedbackPage({ sb }: { sb: AdminProps["sb"] }) {
  const { lang, t } = useLang();
  const { tz } = useVenue();
  const [rows, setRows] = useState<Row[] | null>(null);

  useEffect(() => {
    const { from } = spanRange(30, tz);
    let live = true;
    sb.from("visit_feedback")
      .select("id, rating, note, created_at, visits(table_number)")
      .gte("created_at", from)
      .order("created_at", { ascending: false })
      .limit(500)
      .then(({ data, error }) => {
        if (!live) return;
        if (error) toast.error(errorText(lang, error));
        setRows((data ?? []) as unknown as Row[]);
      });
    return () => {
      live = false;
    };
  }, [sb, tz, lang]);

  const when = new Intl.DateTimeFormat(lang === "ar" ? "ar-AE-u-nu-latn" : "en-AE", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit", timeZone: tz });
  const avg = rows?.length ? rows.reduce((n, r) => n + r.rating, 0) / rows.length : 0;

  return (
    <div className={cn(PANEL, "flex min-h-0 flex-1 flex-col max-w-3xl")}>
      {rows === null ? (
        <p className="text-sm text-muted-foreground">{t("fbLoading")}</p>
      ) : !rows.length ? (
        <p className="text-sm text-muted-foreground">{t("fbEmpty")}</p>
      ) : (
        <>
          <dl className="flex gap-8">
            <div>
              <dt className="text-sm text-muted-foreground">{t("fbAvg")}</dt>
              <dd className="text-2xl font-semibold tabular-nums">{avg.toFixed(1)}</dd>
            </div>
            <div>
              <dt className="text-sm text-muted-foreground">{t("fbCount")}</dt>
              <dd className="text-2xl font-semibold tabular-nums">{rows.length}</dd>
            </div>
          </dl>
          <ul className="relative mt-4 min-h-0 flex-1 divide-y overflow-y-auto border-t">
            {rows.map((r) => (
              <li key={r.id} className={cn("grid gap-1 py-3", r.rating <= 3 && "-mx-3 rounded-md bg-danger-bg px-3")}>
                <div className="flex flex-wrap items-center gap-x-3 text-sm">
                  <span className="inline-flex items-center gap-1 font-medium tabular-nums">
                    <Star aria-hidden className="size-4" fill="currentColor" />
                    {r.rating}/5
                  </span>
                  {r.visits && <span>{t("table")} {r.visits.table_number}</span>}
                  <span className="text-muted-foreground">{when.format(new Date(r.created_at))}</span>
                  {r.rating <= 3 && <span className="font-medium text-destructive">{t("fbLow")}</span>}
                </div>
                {r.note && <p className="text-sm [overflow-wrap:anywhere]">{r.note}</p>}
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
