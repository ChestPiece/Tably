import Image from "next/image";
import { cn } from "@/lib/utils";

/** Dish photo in the arch frame. Renders nothing without a src (callers decide the fallback). */
export function Arch({ src, alt, width, height, className }: { src?: string | null; alt: string; width: number; height: number; className?: string }) {
  if (!src) return null;
  return (
    <span className={cn("block shrink-0 overflow-hidden rounded-arch bg-muted", className)} style={{ width, height }}>
      <Image src={src} alt={alt} width={width} height={height} className="size-full object-cover" />
    </span>
  );
}
