"use client";
import { Loader2 } from "lucide-react";
import { useState } from "react";
import { ConfirmAction } from "@/components/app/confirm-action";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useLang, type Key } from "@/lib/i18n";
import type { AdminProps } from "./AdminApp";

export type Member = { user_id: string; role: string; display_name: string | null };
export type Invite = { email: string; role: string };

// Roles the owner can hand out. "staff" is the front desk / counter role.
const ROLES: { id: string; label: Key; desc: Key }[] = [
  { id: "staff", label: "roleStaff", desc: "roleStaffD" },
  { id: "kitchen", label: "roleKitchen", desc: "roleKitchenD" },
  { id: "waiter", label: "roleWaiter", desc: "roleWaiterD" },
];
const roleKey = (r: string): Key => (r === "owner" ? "roleOwner" : (ROLES.find((x) => x.id === r)?.label ?? "roleStaff"));

const Avatar = ({ c }: { c: string }) => (
  <span aria-hidden className="grid size-9 shrink-0 place-items-center rounded-full bg-muted text-sm font-semibold uppercase">
    {c}
  </span>
);

export function TeamAdmin({ sb, me, rid, team, invites, mutate, run }: AdminProps & { me: string; rid: string; team: Member[]; invites: Invite[] }) {
  const { t } = useLang();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("staff");
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
    if (await mutate(() => sb.from("staff_invites").insert({ restaurant_id: rid, email: v, role }), t("inviteSaved"))) setEmail("");
    setInviting(false);
  }

  return (
    <div className="flex max-w-[640px] flex-col gap-8">
      <ul className="border-t">
        {team.map((m) => {
          const name = m.display_name ?? t("staffMember");
          return (
            <li key={m.user_id} className="flex items-center gap-4 border-b py-3">
              <Avatar c={name[0]} />
              <span className="min-w-0 flex-1">
                <span className="block truncate font-medium">
                  {name}
                  {m.user_id === me && <span className="font-normal text-muted-foreground"> ({t("you")})</span>}
                </span>
                {m.role === "owner" && <span className="block text-sm text-muted-foreground">{t("roleOwner")}</span>}
              </span>
              {m.role !== "owner" && (
                <RoleSelect
                  value={m.role}
                  label={n(t("roleOfN"), name)}
                  onChange={(r) => mutate(() => sb.from("staff_members").update({ role: r }).eq("restaurant_id", rid).eq("user_id", m.user_id), t("roleChanged"))}
                />
              )}
              {m.user_id !== me && (
                <ConfirmAction
                  tone="destructive"
                  title={n(t("removeMemberTitle"), name)}
                  description={t("removeMemberBody")}
                  confirmLabel={t("remove")}
                  cancelLabel={t("cancel")}
                  onConfirm={() => run(() => sb.from("staff_members").delete().eq("restaurant_id", rid).eq("user_id", m.user_id), t("memberRemoved"))}
                  trigger={
                    <Button variant="link" size="sm" aria-label={n(t("removeMemberN"), name)}>
                      {t("remove")}
                    </Button>
                  }
                />
              )}
            </li>
          );
        })}
        {invites.map((i) => (
          <li key={i.email} className="flex items-center gap-4 border-b py-3">
            <Avatar c="@" />
            <span className="min-w-0 flex-1">
              <span className="block truncate" dir="ltr">{i.email}</span>
              <span className="block text-sm text-muted-foreground">
                {t(roleKey(i.role))} · {t("inviteWaiting")}
              </span>
            </span>
            <Button
              variant="link"
              size="sm"
              aria-label={n(t("cancelInviteN"), i.email)}
              onClick={() => mutate(() => sb.from("staff_invites").delete().eq("restaurant_id", rid).eq("email", i.email), t("inviteCancelled"))}
            >
              {t("cancel")}
            </Button>
          </li>
        ))}
      </ul>

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
          <RoleSelect value={role} label={t("roleLabel")} onChange={setRole} />
          <Button type="submit" size="sm" disabled={inviting}>
            {inviting && <Loader2 aria-hidden className="animate-spin" />}
            {t(inviting ? "inviting" : "invite")}
          </Button>
        </div>
      </form>
    </div>
  );
}

function RoleSelect({ value, label, onChange }: { value: string; label: string; onChange: (r: string) => void }) {
  const { t } = useLang();
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger size="sm" aria-label={label} className="w-36">
        <SelectValue>{t(roleKey(value))}</SelectValue>
      </SelectTrigger>
      <SelectContent align="end" className="max-w-72">
        {ROLES.map((r) => (
          <SelectItem key={r.id} value={r.id} textValue={t(r.label)}>
            <span className="flex flex-col">
              {t(r.label)}
              <small className="text-xs whitespace-normal text-muted-foreground">{t(r.desc)}</small>
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
