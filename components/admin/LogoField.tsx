"use client";
import { ImageUp, Loader2, X } from "lucide-react";
import { useId } from "react";
import { VenueMark } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { errorText, useLang, type Key } from "@/lib/i18n";
import type { staffClient } from "@/lib/supabase/browser";

const MAX_LOGO = 2 * 1024 * 1024;

// Checked before upload: the bucket also enforces type and a 5 MB cap.
export const logoProblem = (file: File): Key | null =>
  !/^image\/(jpeg|png|webp)$/.test(file.type) ? "photoType" : file.size > MAX_LOGO ? "logoTooBig" : null;

// Uploads into the owner's own folder (storage policies check the first path part).
export async function uploadLogo(sb: ReturnType<typeof staffClient>, rid: string, file: File, lang: "en" | "ar", kind: "logo" | "cover" = "logo") {
  const path = `${rid}/${kind}-${crypto.randomUUID()}.${file.name.split(".").pop()?.toLowerCase() || "png"}`;
  const { error } = await sb.storage.from("menu-images").upload(path, file, { contentType: file.type });
  if (error) return { error: errorText(lang, error) };
  return { url: sb.storage.from("menu-images").getPublicUrl(path).data.publicUrl };
}

// The restaurant's logo as guests see it, with pick and remove. No logo = the name's initial.
export function LogoField({ name, src, busy, error, onPick, onRemove }: {
  name: string;
  src: string | null;
  busy?: boolean;
  error?: string;
  onPick: (file: File) => void;
  onRemove: () => void;
}) {
  const { t } = useLang();
  const id = useId();
  return (
    <div className="flex items-center gap-4">
      <VenueMark name={name || "?"} logo={src} className="size-16 text-2xl" />
      <div className="flex min-w-0 flex-col gap-1.5">
        <span className="text-sm font-medium" id={`${id}-l`}>{t("logoLabel")}</span>
        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" variant="outline" size="sm" disabled={busy} asChild>
            <label htmlFor={id} className="cursor-pointer">
              {busy ? <Loader2 aria-hidden className="animate-spin" /> : <ImageUp aria-hidden />}
              {t(src ? "logoChange" : "logoUpload")}
            </label>
          </Button>
          <input
            id={id}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="sr-only"
            aria-labelledby={`${id}-l`}
            aria-describedby={`${id}-h`}
            onChange={(e) => {
              const f = e.target.files?.[0];
              e.target.value = "";
              if (f) onPick(f);
            }}
          />
          {src && (
            <Button type="button" variant="ghost" size="sm" onClick={onRemove} disabled={busy}>
              <X aria-hidden />
              {t("logoRemove")}
            </Button>
          )}
        </div>
        <p id={`${id}-h`} aria-live="polite" className={error ? "text-sm text-destructive" : "text-sm text-muted-foreground"}>
          {error || t("logoHint")}
        </p>
      </div>
    </div>
  );
}
