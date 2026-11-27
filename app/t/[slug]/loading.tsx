import { Skeleton } from "@/components/ui/skeleton";

// Guest menu placeholder: header, category strip, dish rows. Same shape as the menu, so nothing jumps.
export default function Loading() {
  return (
    <div aria-busy="true" className="mx-auto min-h-dvh max-w-[560px]">
      <Skeleton className="h-16 rounded-none" />
      <div className="flex gap-2 border-b px-3 py-3">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-8 w-20 rounded-full" />
        ))}
      </div>
      <div className="space-y-4 px-5 pt-8">
        <Skeleton className="h-7 w-40" />
        {[0, 1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-24" />
        ))}
      </div>
    </div>
  );
}
