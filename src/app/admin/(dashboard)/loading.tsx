import { Skeleton } from "@/components/ui/spinner";

export default function AdminLoading() {
  return (
    <div role="status" aria-live="polite" className="text-forest">
      <span className="sr-only">Loading…</span>
      <div className="mb-9 flex flex-col gap-3">
        <Skeleton className="h-9 w-56" />
        <Skeleton className="h-4 w-80 max-w-full" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="rounded-2xl border border-graphite/10 bg-white p-5">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="mt-4 h-8 w-20" />
            <Skeleton className="mt-3 h-3 w-36" />
          </div>
        ))}
      </div>
      <div className="mt-6 rounded-2xl border border-graphite/10 bg-white">
        <div className="border-b border-graphite/[0.08] px-5 py-4">
          <Skeleton className="h-5 w-40" />
        </div>
        <div className="flex flex-col gap-4 p-5">
          {Array.from({ length: 6 }, (_, i) => (
            <div key={i} className="flex items-center gap-4">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 flex-1" />
              <Skeleton className="hidden h-4 w-24 sm:block" />
              <Skeleton className="h-6 w-20 rounded-full" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
