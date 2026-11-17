"use client";
import { ExternalLink, KeyRound, MoreHorizontal, QrCode, RefreshCw, Trash2 } from "lucide-react";
import QRCode from "qrcode";
import { useEffect, useState } from "react";
import { BrandMark } from "@/components/brand";
import { ConfirmAction } from "@/components/app/confirm-action";
import { EmptyState } from "@/components/app/empty-state";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { tr, useLang } from "@/lib/i18n";
import type { Restaurant, TableRow as Tbl } from "@/lib/types";
import type { AdminProps } from "./AdminApp";

// Slug is supplied here: the DB default (private.new_slug) is not executable by the authenticated role.
export const newSlug = () => Array.from(crypto.getRandomValues(new Uint8Array(5)), (b) => b.toString(16).padStart(2, "0")).join("");

type Dlg = { kind: "code" | "link" | "delete"; tb: Tbl } | null;

export function TablesAdmin({ sb, mutate, run, restaurant, tables }: AdminProps & { restaurant: Restaurant; tables: Tbl[] }) {
  const { t } = useLang();
  const [dlg, setDlg] = useState<Dlg>(null);
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
      <ul className="grid grid-cols-[repeat(auto-fill,minmax(196px,1fr))] gap-5">
        {tables.map((tb) => (
          <li
            key={tb.id}
            className="relative grid justify-items-center gap-2 rounded-[98px_98px_var(--radius-md)_var(--radius-md)] border bg-background px-4 pt-8 pb-4 text-center"
          >
            <span className="font-display text-[44px] leading-none font-semibold tabular-nums">{tb.number}</span>
            <span lang="ar" className="font-display text-lg text-muted-foreground">{n(tr("ar", "tableWord"), tb.number)}</span>
            <Qr slug={tb.qr_slug} label={`QR · ${t("colTable")} ${tb.number}`} />
            <span className="text-sm leading-snug">{tr("en", "scanCta")}</span>
            <span lang="ar" dir="rtl" className="text-sm">{tr("ar", "scanCta")}</span>
            {restaurant.pin_required && (
              <span className="text-sm text-muted-foreground tabular-nums">{tb.pin ? t("codeN").replace("{c}", tb.pin) : t("codeUnset")}</span>
            )}
            <span dir="ltr" className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
              <BrandMark className="size-3" />
              Sufra
            </span>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon-sm" className="absolute end-2 bottom-2 text-muted-foreground" aria-label={n(t("tableActionsN"), tb.number)}>
                  <MoreHorizontal aria-hidden />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem asChild>
                  <a href={`/t/${tb.qr_slug}`} target="_blank" rel="noreferrer">
                    <ExternalLink aria-hidden /> {t("colLink")}
                  </a>
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => setDlg({ kind: "code", tb })}>
                  <KeyRound aria-hidden /> {t("setCode")}
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => setDlg({ kind: "link", tb })}>
                  <RefreshCw aria-hidden /> {t("newLink")}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem variant="destructive" onSelect={() => setDlg({ kind: "delete", tb })}>
                  <Trash2 aria-hidden /> {n(t("deleteTableN"), tb.number)}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </li>
        ))}
      </ul>

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
            onConfirm={() => run(() => sb.from("tables").delete().eq("id", dlg.tb.id), t("tableDeleted"))}
          />
        </>
      )}
    </div>
  );
}

// QR drawn in currentColor so it follows the theme on screen; the print sheet draws its own.
function Qr({ slug, label }: { slug: string; label: string }) {
  const [svg, setSvg] = useState("");
  useEffect(() => {
    let live = true;
    QRCode.toString(`${window.location.origin}/t/${slug}`, { type: "svg", margin: 0, errorCorrectionLevel: "M", color: { dark: "#000000", light: "#0000" } }).then(
      (s) => live && setSvg(s.replace(/#000000(?![0-9a-f])/gi, "currentColor")),
    );
    return () => void (live = false);
  }, [slug]);
  return (
    <span
      role="img"
      aria-label={label}
      className="block size-[116px] rounded-sm border bg-card p-2 [&_svg]:block [&_svg]:size-full"
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
