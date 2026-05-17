import { Skeleton } from '@/components/Skeleton';

export default function FlowDetailLoading() {
  return (
    <div className="px-8 py-6 max-w-[1400px]">
      <Skeleton className="h-3 w-[280px] mb-4" />

      <header className="flex items-baseline justify-between mb-6 pb-5 border-b border-border">
        <div className="space-y-2">
          <Skeleton className="h-7 w-[260px]" />
          <Skeleton className="h-3 w-[200px]" />
        </div>
        <Skeleton className="h-5 w-[70px]" />
      </header>

      <div className="bg-card border border-border rounded p-5">
        <Skeleton className="h-2.5 w-[80px] mb-4" />
        <div className="space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-start gap-3">
              <Skeleton className="h-6 w-6 rounded-full mt-0.5" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-3 w-[40%]" />
                <Skeleton className="h-2.5 w-[70%]" />
              </div>
              <Skeleton className="h-3 w-[60px]" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
