import { Skeleton } from '@/components/Skeleton';

export default function ProjectHomeLoading() {
  return (
    <div className="px-8 py-6 max-w-[1400px]">
      <header className="flex items-baseline justify-between mb-6 pb-5 border-b border-border">
        <div className="space-y-2">
          <Skeleton className="h-7 w-[220px]" />
          <Skeleton className="h-3 w-[180px]" />
        </div>
        <Skeleton className="h-8 w-[120px]" />
      </header>

      <section className="grid grid-cols-4 gap-3 mb-8">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-card border border-border rounded px-4 py-3">
            <Skeleton className="h-2.5 w-[60%] mb-3" />
            <Skeleton className="h-8 w-[40%]" />
          </div>
        ))}
      </section>

      <div className="grid grid-cols-[1.4fr_1fr] gap-6">
        <div className="bg-card border border-border rounded">
          <div className="px-4 py-2.5 border-b border-border">
            <Skeleton className="h-3 w-[120px]" />
          </div>
          <div className="px-4 py-3 space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-6" />
            ))}
          </div>
        </div>
        <div className="bg-card border border-border rounded">
          <div className="px-4 py-2.5 border-b border-border">
            <Skeleton className="h-3 w-[120px]" />
          </div>
          <div className="px-4 py-3 space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-8" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
