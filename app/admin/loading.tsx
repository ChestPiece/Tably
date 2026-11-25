import { Skeleton } from "@/components/ui/skeleton";

// Owner shell placeholder: sidebar plus a bento of panels.
export default function Loading() {
  return (
    <div aria-busy="true" className="flex h-dvh bg-background">
      <Skeleton className="hidden w-[248px] shrink-0 rounded-none lg:block" />
      <div className="grid flex-1 grid-cols-1 gap-4 p-6 md:grid-cols-3">
        <Skeleton className="h-28 md:col-span-3" />
        <Skeleton className="h-64 md:col-span-2" />
        <Skeleton className="h-64" />
      </div>
    </div>
  );
}
