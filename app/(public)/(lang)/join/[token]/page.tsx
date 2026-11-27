"use client";
import { Eye, EyeOff, Languages, Loader2 } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { BrandLockup, VenueMark } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { errorText, useLang, type Key } from "@/lib/i18n";
import { staffClient } from "@/lib/supabase/browser";

type Info = { email: string; restaurant: string; logo_url: string | null };
type Result = { status: "joined" | "already_member" | "wrong_email" | "unconfirmed" | "invalid"; restaurant?: string; email?: string };
// What the page shows: loading, the form, or a dead end with its message.
type View = "boot" | "form" | "sent" | Result["status"];

// A staff invite link (/join/<token>). The email is fixed by the invite; the token is the secret.
export default function Join() {
  const { token } = useParams<{ token: string }>();
  const router = useRouter();
  const { lang, t, toggle } = useLang();
  const [info, setInfo] = useState<Info | null>(null);
  const [view, setView] = useState<View>("boot");
  const [other, setOther] = useState(""); // the restaurant in an already_member result
  const [signIn, setSignIn] = useState(false);
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [error, setError] = useState<Key | "">("");
  const [busy, setBusy] = useState(false);

  async function accept(sb: ReturnType<typeof staffClient>, venue: string, displayName?: string) {
    const { data, error: err } = await sb.rpc("accept_invite", { p_token: token, p_name: displayName || null });
    if (err) {
      // A network blip or a coded refusal is not a dead link: say what happened, keep the form.
      toast.error(errorText(lang, err));
      return setView("form");
    }
    const r = data as Result;
    if (r.status !== "joined") {
      setOther(r.restaurant ?? "");
      return setView(r.status);
    }
    toast.success(t("joinWelcome").replace("{v}", venue));
    router.replace("/staff");
    router.refresh();
  }

  // Load the invite; if already signed in (or back from the confirmation email), join straight away.
  useEffect(() => {
    const sb = staffClient();
    (async () => {
      const { data } = await sb.rpc("invite_info", { p_token: token });
      if (!data) return setView("invalid");
      const i = data as Info;
      setInfo(i);
      const { data: u } = await sb.auth.getUser();
      if (u.user && !u.user.is_anonymous) return accept(sb, i.restaurant, u.user.user_metadata?.display_name);
      setView("form");
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- runs once per link
  }, [token]);

  async function submit() {
    if (!info) return;
    setBusy(true);
    setError("");
    const sb = staffClient();
    const clean = name.trim();
    try {
      if (signIn) {
        const { error: err } = await sb.auth.signInWithPassword({ email: info.email, password });
        if (err) return setError("wrongCreds");
      } else {
        const { data, error: err } = await sb.auth.signUp({
          email: info.email,
          password,
          options: { emailRedirectTo: `${location.origin}/join/${token}`, data: { display_name: clean } },
        });
        if (err) return setError(err.code === "weak_password" ? "weakPassword" : err.code === "user_already_exists" ? "accountExists" : "signupFailed");
        if (!data.session) return setView("sent");
      }
      await accept(sb, info.restaurant, clean);
    } catch {
      setError("signupFailed");
    } finally {
      setBusy(false);
    }
  }

  async function signOut() {
    await staffClient().auth.signOut();
    setView(info ? "form" : "invalid");
  }

  const venue = info?.restaurant ?? "";
  const dead: Partial<Record<View, [Key, Key]>> = {
    invalid: ["joinInvalid", "joinInvalidDesc"],
    wrong_email: ["joinWrongEmail", "joinWrongEmailDesc"],
    already_member: ["joinAlready", "joinAlreadyDesc"],
    unconfirmed: ["joinUnconfirmed", "joinCheckEmail"],
  };
  const deadCopy = dead[view];

  return (
    <main className="relative grid min-h-dvh place-items-center bg-background p-4 short:pt-16">
      <Button type="button" variant="ghost" size="sm" onClick={toggle} className="absolute end-4 top-4">
        <Languages aria-hidden />
        <span lang={lang === "ar" ? "en" : "ar"}>{t("switchLang")}</span>
      </Button>
      <Card className="w-full max-w-sm rounded-lg shadow-none">
        {view === "boot" ? (
          <CardContent className="grid min-h-60 place-items-center" role="status" aria-label={t("oneMoment")}>
            <Loader2 aria-hidden className="size-6 animate-spin text-muted-foreground" />
          </CardContent>
        ) : deadCopy ? (
          <>
            <CardHeader className="gap-4">
              <BrandLockup size="sm" />
              <div className="flex flex-col gap-1.5">
                <h1 className="text-xl font-semibold text-balance">
                  {t(deadCopy[0]).replace("{e}", info?.email ?? "").replace("{v}", other)}
                </h1>
                <CardDescription>{t(deadCopy[1]).replace("{e}", info?.email ?? "")}</CardDescription>
              </div>
            </CardHeader>
            <CardContent className="flex flex-col gap-2">
              {view === "wrong_email" || view === "already_member" ? (
                <Button size="lg" onClick={signOut}>{t("signOut")}</Button>
              ) : view === "unconfirmed" ? (
                <Button size="lg" onClick={() => location.reload()}>{t("tryAgain")}</Button>
              ) : (
                <Button size="lg" variant="secondary" asChild>
                  <Link href="/login">{t("backToLogin")}</Link>
                </Button>
              )}
            </CardContent>
          </>
        ) : (
          <>
            <CardHeader className="items-center gap-4 text-center">
              <VenueMark name={venue} logo={info?.logo_url} />
              <div className="flex flex-col gap-1.5">
                <h1 className="text-xl font-semibold text-balance">{t("joinTitle").replace("{v}", venue)}</h1>
                <CardDescription>
                  {view === "sent" ? t("joinCheckEmail").replace("{e}", info?.email ?? "") : t(signIn ? "joinSignInDesc" : "joinDesc")}
                </CardDescription>
              </div>
            </CardHeader>
            {view === "form" && (
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
                      <Input id="email" type="email" dir="ltr" size="lg" value={info?.email ?? ""} readOnly aria-readonly className="bg-muted text-muted-foreground" />
                    </Field>
                    {!signIn && (
                      <Field>
                        <FieldLabel htmlFor="name">{t("staffName")}</FieldLabel>
                        <Input id="name" size="lg" value={name} onChange={(e) => setName(e.target.value)} autoComplete="given-name" maxLength={60} required aria-describedby="name-hint" />
                        <FieldDescription id="name-hint">{t("yourNameHint")}</FieldDescription>
                      </Field>
                    )}
                    <Field>
                      <FieldLabel htmlFor="password">{t("passwordLabel")}</FieldLabel>
                      <div className="relative">
                        <Input
                          id="password"
                          size="lg"
                          type={show ? "text" : "password"}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          autoComplete={signIn ? "current-password" : "new-password"}
                          minLength={signIn ? undefined : 8}
                          required
                          className="pe-12"
                          aria-invalid={!!error}
                          aria-describedby={error ? "join-error" : undefined}
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
                    {error && <FieldError id="join-error">{t(error)}</FieldError>}
                    {!signIn && (
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
                    {busy ? t("oneMoment") : t(signIn ? "joinSignIn" : "joinCreate")}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="lg"
                    className="text-muted-foreground"
                    onClick={() => (setSignIn(!signIn), setError(""))}
                  >
                    {t(signIn ? "joinNewAccount" : "joinHaveAccount")}
                  </Button>
                </form>
              </CardContent>
            )}
          </>
        )}
      </Card>
    </main>
  );
}
