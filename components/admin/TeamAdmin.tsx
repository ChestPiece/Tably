"use client";
import { Check, Copy, Loader2, Mail, MessageCircle, Send } from "lucide-react";
import { toast } from "sonner";
import { useEffect, useState } from "react";
import { ConfirmAction } from "@/components/app/confirm-action";
import { ResponsiveSheet } from "@/components/app/responsive-sheet";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { MAX_MINOR, minorToInput, parseMinor } from "@/lib/format";
import { useLang, type Key } from "@/lib/i18n";
import { useVenue } from "@/lib/venue";
import { cn } from "@/lib/utils";
import type { AdminProps } from "./AdminApp";
import { Qr } from "./TablesAdmin";

export type Member = { user_id: string; role: string; display_name: string | null };
export type Invite = { email: string; role: string; token: string; opened_at: string | null };

// Two roles: owner and staff. Invites always make staff.
const roleKey = (r: string): Key => (r === "owner" ? "roleOwner" : "roleStaff");

const Avatar = ({ c }: { c: string }) => (
  <span aria-hidden className="grid size-9 shrink-0 place-items-center rounded-full bg-muted text-sm font-semibold uppercase">
    {c}
  </span>
);

type Shift = { id: string; user_id: string; started_at: string; ended_at: string | null; rate_fils: number };
const H14 = 14 * 3600e3;
const shiftMs = (s: Shift) => (s.ended_at ? Date.parse(s.ended_at) : Math.min(Date.now(), Date.parse(s.started_at) + H14)) - Date.parse(s.started_at);

export function TeamAdmin({ sb, me, rid, venue, team, invites, mutate, run }: AdminProps & { me: string; rid: string; venue: string; team: Member[]; invites: Invite[] }) {
  const { lang, t } = useLang();
  const { digits, currency, money } = useVenue();
  const [selId, setSelId] = useState<string | null>(null);
  const sel = team.find((m) => m.user_id === selId) ?? null;
  // Pay and shifts are owner-only tables, loaded here (and reloaded after each change).
  const [rates, setRates] = useState<Record<string, string>>({});
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [tick, setTick] = useState(0);
  useEffect(() => {
    sb.from("staff_pay").select("user_id, hourly_rate_fils").eq("restaurant_id", rid).then(({ data }) =>
      setRates(Object.fromEntries((data ?? []).map((p) => [p.user_id, minorToInput(p.hourly_rate_fils, digits)]))),
    );
    sb.from("shifts").select("id, user_id, started_at, ended_at, rate_fils").eq("restaurant_id", rid)
      .gte("started_at", new Date(Date.now() - 14 * 864e5).toISOString()).order("started_at", { ascending: false })
      .then(({ data }) => setShifts((data ?? []) as Shift[]));
  }, [sb, rid, tick, digits]);

  async function saveRate(uid: string) {
    const f = parseMinor(rates[uid] ?? "", digits);
    if (f === null || f > MAX_MINOR) return toast.error(t("badPrice"));
    if (await mutate(() => sb.from("staff_pay").upsert({ restaurant_id: rid, user_id: uid, hourly_rate_fils: f }), t("rateSaved"))) setTick((x) => x + 1);
  }
  async function fixHours(s: Shift, hours: number) {
    const ended = new Date(Date.parse(s.started_at) + hours * 3600e3).toISOString();
    if (await mutate(() => sb.from("shifts").update({ ended_at: ended }).eq("id", s.id), t("hoursSaved"))) setTick((x) => x + 1);
  }
  const [sharing, setSharing] = useState<Invite | null>(null);
  const [email, setEmail] = useState("");
  const [err, setErr] = useState("");
  const [inviting, setInviting] = useState(false);
  const n = (s: string, v: string) => s.replace("{n}", v);

  async function invite() {
    const v = email.trim().toLowerCase();
    if (!/^[^@\s]+@[^@\s]+\.[a-z]{2,}$/i.test(v)) {
      setErr(t("badEmail"));
      return document.getElementById("invite-email")?.focus();
    }
    setErr("");
    setInviting(true);
    const { data, error } = await sb.from("staff_invites").insert({ restaurant_id: rid, email: v, role: "staff" }).select("email, role, token, opened_at").single();
    if (await mutate(async () => ({ error }), t("inviteSaved"))) {
      setEmail("");
      setSharing(data as Invite);
    }
    setInviting(false);
  }

  return (
    <div className="flex max-w-[640px] flex-col gap-8">
      <ul className="border-t">
        {team.map((m) => {
          const name = m.display_name ?? t("staffMember");
          const rate = parseMinor(rates[m.user_id] ?? "", digits);
          const hrs = shifts.filter((x) => x.user_id === m.user_id).reduce((a, x) => a + shiftMs(x), 0) / 3600e3;
          return (
            // Row opens the member in the right rail (rate, shifts, remove).
            <li key={m.user_id} className={cn("relative flex items-center gap-4 border-b py-3 hover:bg-muted/50", sel?.user_id === m.user_id && "bg-muted")}>
              <Avatar c={name[0]} />
              <span className="min-w-0 flex-1">
                <button
                  type="button"
                  aria-current={sel?.user_id === m.user_id || undefined}
                  onClick={() => setSelId(sel?.user_id === m.user_id ? null : m.user_id)}
                  className="block max-w-full truncate text-start font-medium outline-none after:absolute after:inset-0 after:content-[''] focus-visible:after:ring-2 focus-visible:after:ring-ring focus-visible:after:ring-inset"
                >
                  {name}
                  {m.user_id === me && <span className="font-normal text-muted-foreground"> ({t("you")})</span>}
                </button>
                <span className="block text-sm text-muted-foreground">{t(roleKey(m.role))}</span>
              </span>
              <span className="text-end text-sm tabular-nums">
                <span className="block">{rate ? `${money(rate)} / ${t("hShort")}` : <span className="text-muted-foreground">{t("rateNone")}</span>}</span>
                <span className="block text-muted-foreground">{t("hours14").replace("{h}", hrs.toFixed(1))}</span>
              </span>
            </li>
          );
        })}
        {invites.map((i) => (
          <li key={i.token} className="flex items-center gap-4 border-b py-3">
            <Avatar c="@" />
            <span className="min-w-0 flex-1">
              <span className="block truncate" dir="ltr">{i.email}</span>
              <span className="block text-sm text-muted-foreground">
                {t(roleKey(i.role))} · {t(i.opened_at ? "inviteOpened" : "inviteWaiting")}
              </span>
            </span>
            <Button variant="secondary" size="sm" aria-label={n(t("sendInviteN"), i.email)} onClick={() => setSharing(i)}>
              <Send aria-hidden />
              <span className="max-sm:sr-only">{t("sendInvite")}</span>
            </Button>
            <Button
              variant="link"
              size="sm"
              aria-label={n(t("cancelInviteN"), i.email)}
              onClick={() => mutate(() => sb.from("staff_invites").delete().eq("token", i.token), t("inviteCancelled"))}
            >
              {t("cancel")}
            </Button>
          </li>
        ))}
      </ul>

      <Shifts hid="shifts-h" shifts={shifts} team={team} lang={lang} onFix={fixHours} />

      <ResponsiveSheet open={!!sel} onOpenChange={(o) => !o && setSelId(null)} title={sel?.display_name ?? t("staffMember")} description={sel ? t(roleKey(sel.role)) : undefined} full rail>
        {sel && (
          <div className="flex flex-col gap-6">
            <form
              className="flex flex-col gap-1.5"
              onSubmit={(e) => {
                e.preventDefault();
                saveRate(sel.user_id);
              }}
            >
              <label htmlFor="rail-rate" className="text-sm font-medium">{n(t("hourlyRateN"), sel.display_name ?? t("staffMember")).replace("{c}", currency)}</label>
              <div className="relative w-40">
                <Input
                  id="rail-rate"
                  size="sm"
                  inputMode="decimal"
                  dir="ltr"
                  autoComplete="off"
                  placeholder="0.00"
                  className="pe-16 text-start tabular-nums"
                  value={rates[sel.user_id] ?? ""}
                  onChange={(e) => setRates((p) => ({ ...p, [sel.user_id]: e.target.value }))}
                  onBlur={(e) => e.target.value.trim() && saveRate(sel.user_id)}
                />
                <span aria-hidden className="pointer-events-none absolute inset-y-0 end-3 grid place-items-center text-xs text-muted-foreground">{t("perHour").replace("{c}", currency)}</span>
              </div>
            </form>
            <Shifts hid="rail-shifts-h" compact shifts={shifts.filter((x) => x.user_id === sel.user_id)} team={team} lang={lang} onFix={fixHours} />
            {sel.user_id !== me && (
              <ConfirmAction
                tone="destructive"
                title={n(t("removeMemberTitle"), sel.display_name ?? t("staffMember"))}
                description={t("removeMemberBody")}
                confirmLabel={t("remove")}
                cancelLabel={t("cancel")}
                onConfirm={() => run(() => sb.from("staff_members").delete().eq("restaurant_id", rid).eq("user_id", sel.user_id), t("memberRemoved")).then(() => setSelId(null))}
                trigger={
                  <Button variant="ghost" size="sm" className="self-start text-destructive hover:text-destructive">
                    {n(t("removeMemberN"), sel.display_name ?? t("staffMember"))}
                  </Button>
                }
              />
            )}
          </div>
        )}
      </ResponsiveSheet>

      <form
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          invite();
        }}
      >
        <h2 className="text-xl font-semibold">{t("inviteStaff")}</h2>
        <p className="mt-1 mb-4 text-sm text-muted-foreground">{t("inviteDesc")}</p>
        <div className="flex flex-wrap items-start gap-3 max-sm:[&>button]:flex-1">
          <div className="flex min-w-0 flex-1 basis-full flex-col gap-1.5 sm:basis-auto">
            <label htmlFor="invite-email" className="sr-only">{t("loginLabel")}</label>
            <Input
              id="invite-email"
              type="email"
              dir="ltr"
              size="sm"
              autoComplete="off"
              autoCapitalize="none"
              spellCheck={false}
              placeholder={t("loginLabel")}
              aria-invalid={!!err}
              aria-describedby="invite-err"
              value={email}
              onChange={(e) => (setEmail(e.target.value), err && setErr(""))}
            />
            <p id="invite-err" aria-live="polite" className="min-h-5 text-sm text-destructive">{err}</p>
          </div>
          <Button type="submit" size="sm" disabled={inviting}>
            {inviting && <Loader2 aria-hidden className="animate-spin" />}
            {t(inviting ? "inviting" : "invite")}
          </Button>
        </div>
      </form>
      <ShareInvite invite={sharing} venue={venue} roleName={sharing ? t(roleKey(sharing.role)) : ""} onClose={() => setSharing(null)} />
    </div>
  );
}

/** The app sends no invite email, so the owner shares a one-person link: copy, WhatsApp, email or a QR to scan in person. */
function ShareInvite({ invite, venue, roleName, onClose }: { invite: Invite | null; venue: string; roleName: string; onClose: () => void }) {
  const { t } = useLang();
  const [copied, setCopied] = useState(false);
  if (!invite) return <Dialog open={false} />;
  const path = `/join/${invite.token}`;
  const link = `${location.origin}${path}`;
  const msg = `${t("inviteMsg").replace("{v}", venue).replace("{r}", roleName)}
${link}`;
  const subject = t("inviteSubject").replace("{v}", venue);
  return (
    <Dialog open onOpenChange={(o) => !o && (setCopied(false), onClose())}>
      <DialogContent className="sm:max-w-md" onOpenAutoFocus={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>{t("sendInviteTitle").replace("{n}", invite.email)}</DialogTitle>
          <DialogDescription>{t("sendInviteBody")}</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="invite-link" className="text-sm font-medium">{t("inviteLink")}</label>
          <div className="flex gap-2">
            <Input id="invite-link" readOnly dir="ltr" size="sm" value={link} onClick={(e) => e.currentTarget.select()} className="min-w-0 flex-1" />
            <Button
              type="button"
              size="sm"
              className="w-28 shrink-0"
              onClick={async () => {
                await navigator.clipboard.writeText(link);
                setCopied(true);
                window.setTimeout(() => setCopied(false), 2000);
              }}
            >
              {copied ? <Check aria-hidden /> : <Copy aria-hidden />}
              <span aria-live="polite">{t(copied ? "copied" : "copyLink")}</span>
            </Button>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Button variant="secondary" size="sm" asChild>
            <a href={`https://wa.me/?text=${encodeURIComponent(msg)}`} target="_blank" rel="noreferrer">
              <MessageCircle aria-hidden />
              {t("byWhatsApp")}
            </a>
          </Button>
          <Button variant="secondary" size="sm" asChild>
            <a href={`mailto:${invite.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(msg)}`}>
              <Mail aria-hidden />
              {t("byEmail")}
            </a>
          </Button>
        </div>
        <div className="flex items-center gap-4 border-t pt-4">
          <Qr path={path} label={t("scanToJoin")} />
          <p className="text-sm text-muted-foreground">{t("scanToJoin")}</p>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/** Last 14 days of clock-ins. The owner can correct hours (e.g. a forgotten clock-out, capped at 14 h). */
function Shifts({ hid, compact, shifts, team, lang, onFix }: { hid: string; compact?: boolean; shifts: Shift[]; team: Member[]; lang: "en" | "ar"; onFix: (s: Shift, hours: number) => void }) {
  const { t } = useLang();
  const { money, tz } = useVenue();
  const when = new Intl.DateTimeFormat(lang === "ar" ? "ar-AE-u-nu-latn" : "en-GB", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: tz });
  return (
    <section aria-labelledby={hid}>
      <h2 id={hid} className={compact ? "mb-2 text-sm font-medium" : "text-xl font-semibold"}>{t("shifts")}</h2>
      {!compact && <p className="mt-1 mb-4 text-sm text-muted-foreground">{t("shiftsDesc")}</p>}
      {shifts.length === 0 ? (
        <p className="border-t py-6 text-sm text-muted-foreground">{t("noShifts")}</p>
      ) : (
        <ul className="border-t">
          {shifts.map((s) => {
            const name = team.find((m) => m.user_id === s.user_id)?.display_name ?? t("staffMember");
            const ms = shiftMs(s);
            const hrs = (ms / 3600e3).toFixed(2);
            return (
              <li key={s.id} className="flex items-center gap-4 border-b py-3 text-sm">
                <span className="min-w-0 flex-1">
                  {!compact && <span className="block truncate font-medium">{name}</span>}
                  <span className={compact ? "block" : "block text-muted-foreground"}>
                    {when.format(new Date(s.started_at))}
                    {!s.ended_at && ` · ${t("onShiftNow")}`}
                  </span>
                </span>
                <span className="text-muted-foreground tabular-nums">{money(Math.round((ms / 3600e3) * s.rate_fils))}</span>
                <label className="relative w-24 shrink-0">
                  <span className="sr-only">{t("hoursFor").replace("{n}", name)}</span>
                  <Input
                    key={hrs}
                    size="sm"
                    inputMode="decimal"
                    dir="ltr"
                    defaultValue={hrs}
                    className="pe-7 text-start tabular-nums"
                    onBlur={(e) => {
                      const h = Number(e.target.value);
                      if (e.target.value === hrs) return;
                      if (!(h >= 0 && h <= 14)) return (e.target.value = hrs), toast.error(t("badHours"));
                      onFix(s, h);
                    }}
                  />
                  <span aria-hidden className="pointer-events-none absolute inset-y-0 end-2.5 grid place-items-center text-xs text-muted-foreground">{t("hShort")}</span>
                </label>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
