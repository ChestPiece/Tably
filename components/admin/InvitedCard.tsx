"use client";
import Link from "next/link";
import { BrandLockup } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card";
import { useLang } from "@/lib/i18n";

/** Setup page for an email that already has a staff invite: join that team, don't start a restaurant. */
export function InvitedCard({ token, restaurant }: { token: string; restaurant: string }) {
  const { t } = useLang();
  return (
    <main className="grid min-h-dvh place-items-center bg-background p-4">
      <Card className="w-full max-w-sm rounded-lg shadow-none">
        <CardHeader className="gap-4">
          <BrandLockup size="sm" />
          <div className="flex flex-col gap-1.5">
            <h1 className="text-xl font-semibold text-balance">{t("invitedTo").replace("{v}", restaurant)}</h1>
            <CardDescription>{t("invitedToDesc")}</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <Button size="lg" className="w-full" asChild>
            <Link href={`/join/${token}`}>{t("joinNow").replace("{v}", restaurant)}</Link>
          </Button>
        </CardContent>
      </Card>
    </main>
  );
}
