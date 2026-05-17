import { Skeleton } from '@/components/Skeleton';

export default function RunDetailLoading() {
  return (
    <div className="px-8 py-6 max-w-[1400px]">
      <Skeleton className="h-3 w-[280px] mb-4" />

      <header className="flex items-baseline justify-between mb-6 pb-5 border-b border-border">
        <div className="space-y-2">
          <Skeleton className="h-7 w-[200px]" />
          <Skeleton className="h-3 w-[260px]" />
        </div>
        <Skeleton className="h-8 w-[160px]" />
      </header>

      <section className="grid grid-cols-4 gap-3 mb-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-card border border-border rounded px-4 py-3">
            <Skeleton className="h-2.5 w-[60%] mb-3" />
            <Skeleton className="h-7 w-[40%]" />
          </div>
        ))}
      </section>

      <div className="bg-card border border-border rounded overflow-hidden">
        <div className="h-9 bg-zebra border-b border-border" />
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="px-4 py-3 border-b border-border space-y-1.5">
            <Skeleton className="h-3 w-[40%]" />
            <Skeleton className="h-2.5 w-[70%]" />
          </div>
        ))}
      </div>
    </div>
  );
}
