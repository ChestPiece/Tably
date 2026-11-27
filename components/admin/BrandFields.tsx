"use client";
import { ImageUp, Loader2, X } from "lucide-react";
import Image from "next/image";
import { useId } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Welcome } from "@/components/guest/Welcome";
import { brandTokens, VIBES } from "@/lib/brand";
import { useLang } from "@/lib/i18n";
import { dominantColors } from "@/lib/palette";
import type { Restaurant, Vibe } from "@/lib/types";

export const HEX = /^#[0-9a-fA-F]{6}$/;
export const HANDLE = /^[A-Za-z0-9._]{0,30}$/;

/** Up to 3 brand colours read from a logo image. Never throws: a logo it cannot read gives no swatches. */
export async function logoColors(img: Blob): Promise<string[]> {
  try {
    const bmp = await createImageBitmap(img, { resizeWidth: 64, resizeHeight: 64 });
    const c = document.createElement("canvas");
    c.width = c.height = 64;
    const ctx = c.getContext("2d")!;
    ctx.drawImage(bmp, 0, 0);
    return dominantColors(ctx.getImageData(0, 0, 64, 64).data);
  } catch {
    return [];
  }
}

/** "@chest.best" or an instagram.com link becomes the bare handle. */
export const cleanHandle = (v: string) => v.trim().replace(/^(https?:\/\/)?(www\.)?instagram\.com\//i, "").replace(/^@/, "").replace(/\/.*$/, "");

// Swatches from the logo, plus a native picker and a hex field for any colour.
export function ColorField({ value, swatches, error, onChange }: { value: string; swatches: string[]; error?: string; onChange: (hex: string) => void }) {
  const { t } = useLang();
  const id = useId();
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-sm font-medium" id={`${id}-l`}>{t("brandColor")}</span>
      <div role="group" aria-labelledby={`${id}-l`} className="flex flex-wrap items-center gap-2">
        {swatches.map((s) => (
          <button
            key={s}
            type="button"
            aria-label={s}
            aria-pressed={s.toLowerCase() === value.toLowerCase()}
            onClick={() => onChange(s)}
            style={{ background: s }}
            className="size-10 rounded-full ring-1 ring-border outline-none ring-offset-2 ring-offset-background focus-visible:ring-2 focus-visible:ring-ring aria-pressed:ring-2 aria-pressed:ring-foreground"
          />
        ))}
        <input
          type="color"
          aria-label={t("brandColorPick")}
          value={HEX.test(value) ? value : "#1e2a5a"}
          onChange={(e) => onChange(e.target.value)}
          className="size-10 cursor-pointer rounded-md border bg-transparent p-1"
        />
        <Input
          size="sm"
          dir="ltr"
          maxLength={7}
          spellCheck={false}
          className="w-28 font-mono uppercase"
          aria-label={t("brandColorHex")}
          aria-invalid={!!error}
          aria-describedby={`${id}-h`}
          value={value}
          onChange={(e) => onChange(e.target.value.startsWith("#") ? e.target.value : `#${e.target.value}`)}
        />
      </div>
      <p id={`${id}-h`} className={error ? "text-sm text-destructive" : "text-sm text-muted-foreground"}>
        {error || t(swatches.length ? "brandColorHint" : "brandColorHintNoLogo")}
      </p>
    </div>
  );
}

// Four looks; each card sets its own name in that vibe's display face.
export function VibeField({ value, name, onChange }: { value: Vibe; name: string; onChange: (v: Vibe) => void }) {
  const { t } = useLang();
  return (
    <fieldset className="flex flex-col gap-1.5">
      <legend className="mb-1.5 text-sm font-medium">{t("vibeLabel")}</legend>
      <div className="grid grid-cols-2 gap-2">
        {(Object.keys(VIBES) as Vibe[]).map((v) => (
          <label
            key={v}
            className="flex min-h-20 cursor-pointer flex-col justify-between gap-2 rounded-md border p-3 has-checked:border-foreground has-checked:ring-1 has-checked:ring-foreground has-focus-visible:ring-2 has-focus-visible:ring-ring"
          >
            <input type="radio" name="vibe" value={v} checked={value === v} onChange={() => onChange(v)} className="sr-only" />
            <span className="truncate text-xl leading-tight font-semibold" style={{ fontFamily: `${VIBES[v].display}, serif` }}>{name || "Tably"}</span>
            <span className="text-xs text-muted-foreground">{VIBES[v].label}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

// Wide photo guests see behind the welcome card.
export function CoverField({ src, busy, error, onPick, onRemove }: { src: string | null; busy?: boolean; error?: string; onPick: (f: File) => void; onRemove: () => void }) {
  const { t } = useLang();
  const id = useId();
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-sm font-medium" id={`${id}-l`}>{t("coverLabel")}</span>
      {src && (
        <div className="relative aspect-[16/9] w-full max-w-80 overflow-hidden rounded-md">
          <Image src={src} alt="" fill sizes="320px" className="object-cover" />
        </div>
      )}
      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" variant="outline" size="sm" disabled={busy} asChild>
          <label htmlFor={id} className="cursor-pointer">
            {busy ? <Loader2 aria-hidden className="animate-spin" /> : <ImageUp aria-hidden />}
            {t(src ? "coverChange" : "coverUpload")}
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
            {t("coverRemove")}
          </Button>
        )}
      </div>
      <p id={`${id}-h`} aria-live="polite" className={error ? "text-sm text-destructive" : "text-sm text-muted-foreground"}>{error || t("coverHint")}</p>
    </div>
  );
}

// The real guest welcome screen with the unsaved draft, in a phone frame. `light` re-applies guest tokens in dark admin.
export function BrandPreview({ restaurant }: { restaurant: Restaurant }) {
  const tokens = brandTokens(restaurant.accent, restaurant.vibe) as React.CSSProperties;
  return (
    <div aria-hidden inert className="light pointer-events-none mx-auto h-[620px] w-[300px] overflow-hidden rounded-[36px] bg-background text-foreground ring-1 ring-border">
      <div className="h-[775px] w-[375px] origin-top-left scale-[0.8]" style={tokens}>
        <Welcome restaurant={restaurant} tableNumber={1} pinRequired={false} ended={false} busy={false} error="" onJoin={() => {}} />
      </div>
    </div>
  );
}
