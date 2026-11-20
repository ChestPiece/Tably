"use client";
import { Eye, EyeOff, Languages, Loader2 } from "lucide-react";
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

type Mode = "in" | "up" | "forgot";

// One sign-in for owners and staff. Owners land on /admin, staff on /staff,
// and a new account with no restaurant yet goes to /admin/setup to create one.
export default function Login() {
  const router = useRouter();
  const { lang, t, toggle } = useLang();
  const [mode, setMode] = useState<Mode>("in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<Key | "">("");
  const [info, setInfo] = useState<Key | "">("");
  const [busy, setBusy] = useState(false);
  const [show, setShow] = useState(false);

  const switchTo = (m: Mode) => {
    setMode(m);
    setError("");
    setInfo("");
  };

  // Link invites, then route by role. No membership yet = a new restaurant to set up.
  async function enter(sb: ReturnType<typeof staffClient>) {
    await sb.rpc("accept_invites");
    const { data: member } = await sb.from("staff_members").select("role").order("role").limit(1).maybeSingle();
    router.replace(!member ? "/admin/setup" : member.role === "owner" ? "/admin" : "/staff");
    router.refresh();
  }

  // /signup (?signup) or an owner's invite link (?invite=email): open sign-up, email filled in for invites.
  useEffect(() => {
    const q = new URLSearchParams(location.search);
    const invited = q.get("invite");
    if (!invited && !q.has("signup")) return;
    /* eslint-disable react-hooks/set-state-in-effect -- URL is only readable after hydration */
    setMode("up");
    if (invited) setEmail(invited);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);

  // Back from the sign-up confirmation email (?code=…): finish signing in.
  useEffect(() => {
    if (!new URLSearchParams(location.search).get("code")) return;
    const sb = staffClient();
    (async () => {
      setBusy(true);
      const { data } = await sb.auth.getUser();
      if (data.user) await enter(sb);
      setBusy(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function submit() {
    try {
      await attempt();
    } catch {
      setError("signupFailed");
    } finally {
      setBusy(false);
    }
  }

  async function attempt() {
    setBusy(true);
    setError("");
    setInfo("");
    const sb = staffClient();
    const mail = email.trim().toLowerCase();
    if (mode === "forgot") {
      await sb.auth.resetPasswordForEmail(mail, { redirectTo: `${location.origin}/reset-password` });
      setBusy(false);
      // Same message either way, so the form can't be used to probe for accounts.
      return setInfo("resetSent");
    }
    if (mode === "up") {
      const { data, error: err } = await sb.auth.signUp({ email: mail, password, options: { emailRedirectTo: `${location.origin}/login` } });
      if (err) {
        setBusy(false);
        return setError(err.code === "weak_password" ? "weakPassword" : err.code === "user_already_exists" ? "accountExists" : "signupFailed");
      }
      if (!data.session) {
        setBusy(false);
        return setInfo("checkEmail");
      }
    } else {
      const { error: err } = await sb.auth.signInWithPassword({ email: mail, password });
      if (err) {
        setBusy(false);
        return setError("wrongCreds");
      }
    }
    await enter(sb);
  }

  const title: Key = mode === "up" ? "signupTitle" : mode === "forgot" ? "resetTitle" : "loginTitle";
  const desc: Key = mode === "up" ? "signupDesc" : mode === "forgot" ? "resetDesc" : "loginDesc";
  const action: Key = mode === "up" ? "createAccount" : mode === "forgot" ? "sendLink" : "signIn";

  return (
    <main className="relative grid min-h-dvh place-items-center bg-background p-4">
      <Button type="button" variant="ghost" size="sm" onClick={toggle} className="absolute end-4 top-4">
        <Languages aria-hidden />
        <span lang={lang === "ar" ? "en" : "ar"}>{t("switchLang")}</span>
      </Button>
      <Card className="w-full max-w-sm rounded-lg shadow-none">
        <CardHeader className="gap-4">
          <BrandLockup />
          <div className="flex flex-col gap-1.5">
            <h1 className="text-xl font-semibold">{t(title)}</h1>
            <CardDescription>{t(desc)}</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <form
            className="flex flex-col gap-6"
            onSubmit={(e) => {
              e.preventDefault();
              submit();
            }}
          >
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="email">{t("usernameLabel")}</FieldLabel>
                <Input
                  id="email"
                  type="email"
                  dir="ltr"
                  size="lg"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete={mode === "up" ? "email" : "username"}
                  autoCapitalize="none"
                  spellCheck={false}
                  required
                  aria-invalid={!!error}
                  aria-describedby={error ? "login-error" : undefined}
                />
              </Field>
              {mode !== "forgot" && (
                <Field>
                  <div className="flex items-baseline justify-between gap-2">
                    <FieldLabel htmlFor="password">{t("passwordLabel")}</FieldLabel>
                    {mode === "in" && (
                      <Button type="button" variant="link" size="xs" className="h-auto p-0 text-muted-foreground" onClick={() => switchTo("forgot")}>
                        {t("forgotPassword")}
                      </Button>
                    )}
                  </div>
                  <div className="relative">
                    <Input
                      id="password"
                      size="lg"
                      type={show ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      autoComplete={mode === "up" ? "new-password" : "current-password"}
                      minLength={mode === "up" ? 8 : undefined}
                      required
                      className="pe-12"
                      aria-invalid={!!error}
                      aria-describedby={error ? "login-error" : undefined}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-lg"
                      onClick={() => setShow(!show)}
                      aria-label={show ? t("hidePassword") : t("showPassword")}
                      aria-pressed={show}
                      className="absolute end-0 top-0 text-muted-foreground"
                    >
                      {show ? <EyeOff aria-hidden /> : <Eye aria-hidden />}
                    </Button>
                  </div>
                </Field>
              )}
              {error && <FieldError id="login-error">{t(error)}</FieldError>}
              {info && <p role="status" className="text-sm text-muted-foreground">{t(info)}</p>}
              {mode === "up" && (
                <p className="text-sm text-muted-foreground">
                  {t("agreeTerms")}{" "}
                  <Link href="/terms" className="underline underline-offset-2 hover:text-foreground">{t("terms")}</Link>
                  {` ${t("and")} `}
                  <Link href="/privacy" className="underline underline-offset-2 hover:text-foreground">{t("privacy")}</Link>.
                </p>
              )}
            </FieldGroup>
            <Button type="submit" size="lg" disabled={busy}>
              {busy && <Loader2 aria-hidden className="animate-spin" />}
              {busy ? t("oneMoment") : t(action)}
            </Button>
            <Button type="button" variant="ghost" size="lg" className="text-muted-foreground" onClick={() => switchTo(mode === "in" ? "up" : "in")}>
              {t(mode === "in" ? "newHere" : mode === "up" ? "haveAccount" : "backToLogin")}
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
