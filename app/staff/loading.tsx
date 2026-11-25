import { Skeleton } from "@/components/ui/skeleton";

// Kitchen board placeholder: top bar and ticket columns.
export default function Loading() {
  return (
    <div aria-busy="true" className="flex h-dvh flex-col bg-background">
      <Skeleton className="h-14 rounded-none" />
      <div className="grid flex-1 grid-cols-1 gap-4 p-4 md:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-full min-h-48" />
        ))}
      </div>
    </div>
  );
}
