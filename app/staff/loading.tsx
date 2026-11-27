import { Skeleton } from "@/components/ui/skeleton";

// Kitchen board placeholder: top bar and ticket columns.
export default function Loading() {
  return (
    <div aria-busy="true" className="flex h-dvh flex-col bg-background">
      <Skeleton className="h-14 rounded-none" />
      <div className="grid flex-1 grid-cols-[repeat(auto-fill,minmax(248px,1fr))] content-start gap-3 p-4">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-44 rounded-lg" />
        ))}
      </div>
    </div>
  );
}
