"use client";
import { Eye, EyeOff, Languages, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { BrandLockup } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { useLang, type Key } from "@/lib/i18n";
import { staffClient, toEmail } from "@/lib/supabase/browser";

export default function StaffLogin() {
  const router = useRouter();
  const { t, toggle } = useLang();
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<Key | "">("");
  const [info, setInfo] = useState(false);
  const [busy, setBusy] = useState(false);
  const [signup, setSignup] = useState(false);
  const [show, setShow] = useState(false);

  return (
    <main className="relative grid min-h-dvh place-items-center bg-background p-4">
      <Button type="button" variant="ghost" size="sm" onClick={toggle} className="absolute end-4 top-4">
        <Languages aria-hidden />
        {t("switchLang")}
      </Button>
      <Card className="w-full max-w-sm rounded-lg shadow-none">
        <CardHeader className="gap-4">
          <BrandLockup />
          <div className="flex flex-col gap-1.5">
            <h1 className="text-xl font-semibold">{signup ? t("signupTitle") : t("loginTitle")}</h1>
            <CardDescription>{signup ? t("signupDesc") : t("loginDesc")}</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <form
            className="flex flex-col gap-6"
            onSubmit={async (e) => {
              e.preventDefault();
              setBusy(true);
              setError("");
              setInfo(false);
              const sb = staffClient();
              if (signup) {
                const { data, error: err } = await sb.auth.signUp({ email: toEmail(login), password });
                setBusy(false);
                if (err) return setError(err.code === "weak_password" ? "weakPassword" : err.code === "user_already_exists" ? "accountExists" : "signupFailed");
                if (!data.session) return setInfo(true);
              } else {
                const { error: err } = await sb.auth.signInWithPassword({ email: toEmail(login), password });
                if (err) {
                  setBusy(false);
                  return setError("wrongCreds");
                }
              }
              await sb.rpc("accept_invites");
              router.replace("/staff");
              router.refresh();
            }}
          >
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="login">{t("usernameLabel")}</FieldLabel>
                <Input
                  id="login"
                  size="lg"
                  value={login}
                  onChange={(e) => setLogin(e.target.value)}
                  autoComplete="username"
                  autoCapitalize="none"
                  required
                  aria-invalid={!!error}
                  aria-describedby={error ? "login-error" : undefined}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="password">{t("passwordLabel")}</FieldLabel>
                <div className="relative">
                  <Input
                    id="password"
                    size="lg"
                    type={show ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete={signup ? "new-password" : "current-password"}
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
                {error && <FieldError id="login-error">{t(error)}</FieldError>}
                {info && <p role="status" className="text-sm text-muted-foreground">{t("checkEmail")}</p>}
              </Field>
            </FieldGroup>
            <Button type="submit" size="lg" disabled={busy}>
              {busy && <Loader2 aria-hidden className="animate-spin" />}
              {busy ? t("oneMoment") : signup ? t("createAccount") : t("signIn")}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="lg"
              className="text-muted-foreground"
              onClick={() => {
                setSignup(!signup);
                setError("");
                setInfo(false);
              }}
            >
              {signup ? t("haveAccount") : t("haveInvite")}
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
