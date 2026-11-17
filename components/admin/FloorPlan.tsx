"use client";
import { useLang } from "@/lib/i18n";
import type { TableRow, Visit } from "@/lib/types";

const COLS = 5;
const W = 36; // marker width; height = W * 1.2, arch radius = W / 2
const H = W * 1.2;
const GAP_X = 60;
const GAP_Y = 76;

// Arch marker: flat base, semicircle top.
const arch = (x: number, y: number) => `M${x},${y + H} V${y + W / 2} A${W / 2},${W / 2} 0 0 1 ${x + W},${y + W / 2} V${y + H} Z`;

/** No table coordinates exist, so the floor is a grid ordered by table number. */
export function FloorPlan({ tables, visits }: { tables: TableRow[]; visits: Visit[] }) {
  const { t } = useLang();
  const byTable = new Map(visits.map((v) => [v.table_number, v]));
  const rows = Math.max(1, Math.ceil(tables.length / COLS));
  const width = (COLS - 1) * GAP_X + W + 24;
  const height = (rows - 1) * GAP_Y + H + 28;
  const legend: [string, string, boolean][] = [
    ["var(--primary)", t("seated"), false],
    ["var(--ochre)", t("billAsked"), false],
    ["var(--muted-foreground)", t("freeTable"), true],
  ];

  return (
    <section aria-labelledby="floor-h">
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-3">
        <h2 id="floor-h" className="text-[15px] font-semibold">
          {t("floor")}
        </h2>
        <div className="flex gap-4 text-sm text-text-2">
          {legend.map(([c, label, outline]) => (
            <span key={label} className="inline-flex items-center gap-2">
              <i aria-hidden className="size-2 rounded-[2px]" style={outline ? { boxShadow: `inset 0 0 0 1.5px ${c}` } : { background: c }} />
              {label}
            </span>
          ))}
        </div>
      </div>
      {tables.length === 0 ? (
        <p className="py-12 text-center text-sm text-text-2">—</p>
      ) : (
        <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label={t("floor")} className="block h-auto w-full max-w-[360px]" direction="ltr">
          {tables.map((tb, i) => {
            const x = 12 + (i % COLS) * GAP_X;
            const y = 4 + Math.floor(i / COLS) * GAP_Y;
            const v = byTable.get(tb.number);
            const fill = !v ? "none" : v.bill_requested_at && !v.paid_at ? "var(--ochre)" : "var(--primary)";
            const state = !v ? t("freeTable") : v.bill_requested_at && !v.paid_at ? t("billAsked") : t("seated");
            return (
              <g key={tb.id}>
                <title>{`${t("table")} ${tb.number}: ${state}`}</title>
                <path d={arch(x, y)} fill={fill} stroke={v ? "none" : "var(--muted-foreground)"} strokeWidth={1.5} />
                <text x={x + W / 2} y={y + H + 16} textAnchor="middle" className="fill-text-2 text-[11px] font-medium">
                  {tb.number}
                </text>
              </g>
            );
          })}
        </svg>
      )}
    </section>
  );
}
