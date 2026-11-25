"use client";
import { Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { BrandLockup } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { useLang, type Key } from "@/lib/i18n";
import { staffClient } from "@/lib/supabase/browser";

// Landing page for the password reset email.
// Default email link: ?code=… (PKCE, works in the browser that asked for the link).
// With the Supabase email template set to ?token_hash={{ .TokenHash }}&type=recovery it works on any device.
export default function ResetPassword() {
  const router = useRouter();
  const { t } = useLang();
  const [ready, setReady] = useState<boolean | null>(null);
  const [password, setPassword] = useState("");
  const [again, setAgain] = useState("");
  const [error, setError] = useState<Key | "">("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const sb = staffClient();
    const q = new URLSearchParams(location.search);
    const hash = q.get("token_hash");
    (async () => {
      // Only a fresh link opens the form; an old sign-in cookie in this browser must not.
      if (!hash && !q.get("code")) return setReady(false);
      if (hash) {
        const { error } = await sb.auth.verifyOtp({ token_hash: hash, type: "recovery" });
        if (error) return setReady(false);
      }
      // getUser waits for the client to finish reading a ?code= and checks the session with the server.
      const { data } = await sb.auth.getUser();
      // The link is spent: keep its token out of history, screenshots and Referer headers.
      history.replaceState(null, "", location.pathname);
      setReady(!!data.user);
    })();
  }, []);

  async function save() {
    if (password.length < 8) return setError("weakPassword");
    if (password !== again) return setError("passwordMismatch");
    setBusy(true);
    setError("");
    const sb = staffClient();
    const { error: err } = await sb.auth.updateUser({ password });
    if (err) {
      setBusy(false);
      return setError(err.code === "same_password" ? "samePassword" : err.code === "weak_password" ? "weakPassword" : "linkExpired");
    }
    await sb.auth.signOut();
    router.replace("/login");
  }

  return (
    <main className="grid min-h-dvh place-items-center bg-background p-4">
      <Card className="w-full max-w-sm rounded-lg shadow-none">
        <CardHeader className="gap-4">
          <BrandLockup />
          <div className="flex flex-col gap-1.5">
            <h1 className="text-xl font-semibold">{t("newPasswordTitle")}</h1>
            {ready === false && <CardDescription>{t("linkExpired")}</CardDescription>}
          </div>
        </CardHeader>
        <CardContent>
          {ready === null && <Loader2 aria-label={t("oneMoment")} className="mx-auto animate-spin text-muted-foreground" />}
          {ready === false && (
            <Button size="lg" variant="secondary" className="w-full" asChild>
              <Link href="/login">{t("backToLogin")}</Link>
            </Button>
          )}
          {ready && (
            <form
              noValidate
              className="flex flex-col gap-6"
              onSubmit={(e) => {
                e.preventDefault();
                save();
              }}
            >
              <FieldGroup>
                <Field>
                  <FieldLabel htmlFor="new">{t("newPassword")}</FieldLabel>
                  <Input id="new" type="password" size="lg" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} aria-invalid={!!error} aria-describedby={error ? "reset-error" : undefined} />
                </Field>
                <Field>
                  <FieldLabel htmlFor="again">{t("confirmPassword")}</FieldLabel>
                  <Input id="again" type="password" size="lg" autoComplete="new-password" value={again} onChange={(e) => setAgain(e.target.value)} aria-invalid={!!error} aria-describedby={error ? "reset-error" : undefined} />
                </Field>
                {error && <FieldError id="reset-error">{t(error)}</FieldError>}
              </FieldGroup>
              <Button type="submit" size="lg" disabled={busy}>
                {busy && <Loader2 aria-hidden className="animate-spin" />}
                {busy ? t("oneMoment") : t("savePassword")}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
