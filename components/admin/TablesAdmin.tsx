"use client";
import { ExternalLink, KeyRound, QrCode, RefreshCw, Trash2 } from "lucide-react";
import QRCode from "qrcode";
import { useEffect, useState } from "react";
import { ConfirmAction } from "@/components/app/confirm-action";
import { EmptyState } from "@/components/app/empty-state";
import { ResponsiveSheet } from "@/components/app/responsive-sheet";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useLang } from "@/lib/i18n";
import { StatusTag } from "@/components/app/status-badge";
import type { Order, Restaurant, TableRow as Tbl, Visit } from "@/lib/types";
import { useVenue } from "@/lib/venue";
import { cn } from "@/lib/utils";
import type { AdminProps } from "./AdminApp";

// Slug is supplied here: the DB default (private.new_slug) is not executable by the authenticated role.
export const newSlug = () => Array.from(crypto.getRandomValues(new Uint8Array(5)), (b) => b.toString(16).padStart(2, "0")).join("");

type Dlg = { kind: "code" | "link" | "delete"; tb: Tbl } | null;

export function TablesAdmin({ sb, mutate, run, restaurant, tables, visits, orders }: AdminProps & { restaurant: Restaurant; tables: Tbl[]; visits: Visit[]; orders: Order[] }) {
  const { t } = useLang();
  const [dlg, setDlg] = useState<Dlg>(null);
  const [selId, setSelId] = useState<string | null>(null);
  const sel = tables.find((x) => x.id === selId) ?? null;
  const n = (s: string, v: number) => s.replace("{n}", String(v));
  const close = (o: boolean) => !o && setDlg(null);

  if (!tables.length)
    return (
      <div className="rounded-lg border">
        <EmptyState icon={QrCode} title={t("noTablesTitle")} body={t("noTablesBody")} />
      </div>
    );

  return (
    <div className="flex flex-col gap-5">
      <p className="text-sm text-muted-foreground">{t(restaurant.pin_required ? "codesOn" : "codesOff")}</p>
      <ul className="grid grid-cols-[repeat(auto-fill,minmax(120px,1fr))] gap-3">
        {tables.map((tb) => (
          <li key={tb.id}>
            <button
              type="button"
              aria-current={sel?.id === tb.id || undefined}
              onClick={() => setSelId(sel?.id === tb.id ? null : tb.id)}
              className={cn(
                "flex h-24 w-full flex-col items-start justify-between rounded-xl border bg-background p-3 text-start outline-none hover:border-foreground/30 focus-visible:ring-2 focus-visible:ring-ring",
                sel?.id === tb.id && "border-primary ring-1 ring-primary",
              )}
            >
              <span className="text-xs text-muted-foreground">{t("colTable")}</span>
              <span className="font-display text-[32px] leading-none font-semibold tabular-nums">{tb.number}</span>
              {restaurant.pin_required && (
                <span className="text-xs text-muted-foreground tabular-nums">{tb.pin ? t("codeN").replace("{c}", tb.pin) : t("codeUnset")}</span>
              )}
            </button>
          </li>
        ))}
      </ul>

      <ResponsiveSheet open={!!sel} onOpenChange={(o) => !o && setSelId(null)} title={sel ? `${t("colTable")} ${sel.number}` : ""} full rail>
        {sel && (
          <div className="flex flex-col items-center gap-5">
            <LiveVisit visit={visits.find((v) => v.table_id === sel.id) ?? null} orders={orders} />
            <Qr path={`/t/${sel.qr_slug}`} label={`QR · ${t("colTable")} ${sel.number}`} size="lg" />
            {restaurant.pin_required && (
              <p className="text-sm text-muted-foreground tabular-nums">{sel.pin ? t("codeN").replace("{c}", sel.pin) : t("codeUnset")}</p>
            )}
            <ul className="w-full border-t">
              <RailAction href={`/t/${sel.qr_slug}`} icon={<ExternalLink aria-hidden />} title={t("openGuestPage")} hint={t("openGuestPageHint")} />
              <RailAction onClick={() => setDlg({ kind: "code", tb: sel })} icon={<KeyRound aria-hidden />} title={t("tableCode")} hint={t(restaurant.pin_required ? "tableCodeHint" : "tableCodeOffHint")} />
              <RailAction onClick={() => setDlg({ kind: "link", tb: sel })} icon={<RefreshCw aria-hidden />} title={t("replaceLink")} hint={t("replaceLinkHint")} />
              <RailAction onClick={() => setDlg({ kind: "delete", tb: sel })} icon={<Trash2 aria-hidden />} title={n(t("deleteTableN"), sel.number)} destructive />
            </ul>
          </div>
        )}
      </ResponsiveSheet>

      {dlg && (
        <>
          <CodeDialog open={dlg.kind === "code"} onOpenChange={close} tb={dlg.tb} sb={sb} mutate={mutate} run={run} />
          <ConfirmAction
            open={dlg.kind === "link"}
            onOpenChange={close}
            title={n(t("newLinkTitle"), dlg.tb.number)}
            description={t("newLinkBody")}
            confirmLabel={t("newLink")}
            cancelLabel={t("cancel")}
            onConfirm={() => run(() => sb.from("tables").update({ qr_slug: newSlug() }).eq("id", dlg.tb.id), t("linkCreated"))}
          />
          <ConfirmAction
            open={dlg.kind === "delete"}
            onOpenChange={close}
            tone="destructive"
            title={n(t("delTableTitle"), dlg.tb.number)}
            description={t("delTableBody")}
            confirmLabel={t("delete")}
            cancelLabel={t("cancel")}
            onConfirm={() => run(() => sb.from("tables").delete().eq("id", dlg.tb.id), t("tableDeleted")).then(() => setSelId(null))}
          />
        </>
      )}
    </div>
  );
}

/** Who is at the table now: since when, how many, what they ordered and the running total. */
function LiveVisit({ visit, orders }: { visit: Visit | null; orders: Order[] }) {
  const { lang, t } = useLang();
  const { money, tz } = useVenue();
  if (!visit) return <p className="w-full rounded-lg border border-dashed py-4 text-center text-sm text-muted-foreground">{t("noVisit")}</p>;
  const clock = new Intl.DateTimeFormat(lang === "ar" ? "ar-AE-u-nu-latn" : "en-AE", { hour: "numeric", minute: "2-digit", timeZone: tz });
  const mine = orders.filter((o) => o.visit_id === visit.id);
  const total = mine.filter((o) => o.status !== "cancelled").reduce((s, o) => s + o.total_fils, 0);
  const state = visit.paid_at ? t("paid") : visit.bill_requested_at ? t("billAsked") : t("seated");
  return (
    <section aria-label={t("visitNow")} className="w-full rounded-lg bg-muted/60 p-4">
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="font-semibold">{state}</h3>
        <span className="text-sm text-muted-foreground tabular-nums">{t("seatedAt").replace("{t}", clock.format(new Date(visit.opened_at)))}</span>
      </div>
      <p className="text-sm text-muted-foreground">{visit.guest_count === 1 ? t("guestOne") : t("guestsN").replace("{n}", String(visit.guest_count))}</p>
      {mine.length > 0 && (
        <ul aria-label={t("visitOrders")} className="mt-3 border-t text-sm">
          {mine.map((o) => (
            <li key={o.id} className="flex items-center gap-3 border-b py-2">
              <span className="tabular-nums">#{o.number}</span>
              <StatusTag status={o.status} />
              <span className="ms-auto tabular-nums">{money(o.total_fils)}</span>
            </li>
          ))}
          <li className="flex justify-between pt-2 font-semibold">
            {t("total")}
            <span className="tabular-nums">{money(total)}</span>
          </li>
        </ul>
      )}
    </section>
  );
}

function RailAction({ icon, title, hint, href, onClick, destructive }: { icon: React.ReactNode; title: string; hint?: string; href?: string; onClick?: () => void; destructive?: boolean }) {
  const cls = cn(
    "flex w-full items-start gap-3 border-b py-3 text-start text-sm outline-none hover:bg-muted/60 focus-visible:bg-muted [&_svg]:mt-0.5 [&_svg]:size-4 [&_svg]:shrink-0",
    destructive ? "text-destructive" : "[&_svg]:text-muted-foreground",
  );
  const body = (
    <>
      {icon}
      <span className="flex flex-col">
        {title}
        {hint && <small className="text-xs text-muted-foreground">{hint}</small>}
      </span>
    </>
  );
  return (
    <li>
      {href ? (
        <a href={href} target="_blank" rel="noreferrer" className={cls}>{body}</a>
      ) : (
        <button type="button" onClick={onClick} className={cls}>{body}</button>
      )}
    </li>
  );
}

// QR drawn in currentColor so it follows the theme on screen; the print sheet draws its own.
export function Qr({ path, label, size }: { path: string; label: string; size?: "lg" }) {
  const [svg, setSvg] = useState("");
  useEffect(() => {
    let live = true;
    QRCode.toString(`${window.location.origin}${path}`, { type: "svg", margin: 0, errorCorrectionLevel: "M", color: { dark: "#000000", light: "#0000" } }).then(
      (s) => live && setSvg(s.replace(/#000000(?![0-9a-f])/gi, "currentColor")),
    );
    return () => void (live = false);
  }, [path]);
  return (
    <span
      role="img"
      aria-label={label}
      className={cn("block rounded-sm border bg-card p-2 [&_svg]:block [&_svg]:size-full", size === "lg" ? "size-52 p-3" : "size-[116px]")}
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}

function CodeDialog({ open, onOpenChange, tb, sb, mutate }: AdminProps & { open: boolean; onOpenChange: (o: boolean) => void; tb: Tbl }) {
  const { t } = useLang();
  const [pin, setPin] = useState(tb.pin ?? "");
  const [bad, setBad] = useState(false);
  const [saving, setSaving] = useState(false);
  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    const v = pin.replace(/\D/g, "");
    if (v && v.length !== 4) return setBad(true);
    setSaving(true);
    const ok = await mutate(() => sb.from("tables").update({ pin: v || null }).eq("id", tb.id), t("codeSaved"));
    setSaving(false);
    if (ok) onOpenChange(false);
  };
  return (
    <Dialog open={open} onOpenChange={(o) => !saving && onOpenChange(o)}>
      <DialogContent className="sm:max-w-sm">
        <form onSubmit={save} noValidate className="flex flex-col gap-5">
          <DialogHeader>
            <DialogTitle>{t("setCodeTitle").replace("{n}", String(tb.number))}</DialogTitle>
            <DialogDescription>{t("setCodeBody")}</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-1.5">
            <Input
              autoFocus
              aria-label={t("codeLabelN").replace("{n}", String(tb.number))}
              aria-invalid={bad}
              aria-describedby="code-err"
              value={pin}
              onChange={(e) => (setPin(e.target.value.replace(/\D/g, "").slice(0, 4)), setBad(false))}
              inputMode="numeric"
              autoComplete="off"
              maxLength={4}
              size="sm"
              className="w-28 text-center text-lg tracking-[0.3em] tabular-nums"
            />
            <p id="code-err" aria-live="polite" className="min-h-5 text-sm text-destructive">{bad ? t("codeBad") : ""}</p>
          </div>
          <DialogFooter>
            <Button type="button" variant="secondary" size="sm" disabled={saving} onClick={() => onOpenChange(false)}>
              {t("cancel")}
            </Button>
            <Button type="submit" size="sm" disabled={saving}>
              {t("save")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
