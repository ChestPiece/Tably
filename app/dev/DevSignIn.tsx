"use client";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { staffClient, toEmail } from "@/lib/supabase/browser";

// Seeded dev accounts (see supabase/seed.sql). This page 404s in production.
const ACCOUNTS = [
  { label: "Owner", login: "anasowner", password: "anas123" },
  { label: "Staff", login: "anasstaff", password: "anas123" },
];

export function DevSignIn({ signedInAs }: { signedInAs: string | null }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");
  const sb = staffClient();
  const go = async (key: string, fn: () => Promise<{ message: string } | null>) => {
    setError("");
    setBusy(key);
    const e = await fn();
    setBusy("");
    if (e) return setError(e.message);
    router.refresh();
  };
  return (
    <div className="flex flex-col gap-3">
      {signedInAs && <p className="text-sm">Signed in as <b className="font-medium">{signedInAs}</b></p>}
      <div className="flex flex-wrap gap-2">
        {ACCOUNTS.map((a) => (
          <Button key={a.login} size="sm" disabled={!!busy} onClick={() => go(a.login, async () => (await sb.auth.signInWithPassword({ email: toEmail(a.login), password: a.password })).error)}>
            {busy === a.login && <Loader2 aria-hidden className="animate-spin" />}
            Sign in as {a.label}
          </Button>
        ))}
        {signedInAs && (
          <Button variant="secondary" size="sm" disabled={!!busy} onClick={() => go("out", async () => (await sb.auth.signOut()).error)}>
            Sign out
          </Button>
        )}
      </div>
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
