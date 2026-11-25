"use client";
import { Button } from "@/components/ui/button";
import { useLang } from "@/lib/i18n";

/** Shared body for route error.tsx files: one plain message and a retry. */
export function RouteError({ reset }: { reset: () => void }) {
  const { t } = useLang();
  return (
    <main role="alert" className="grid min-h-dvh place-content-center gap-4 p-6 text-center">
      <p className="max-w-sm text-text-2">{t("pageFailed")}</p>
      <Button className="mx-auto min-h-12" onClick={reset}>
        {t("tryAgain")}
      </Button>
    </main>
  );
}
