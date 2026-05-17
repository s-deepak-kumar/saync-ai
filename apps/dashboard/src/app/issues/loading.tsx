import { Skeleton } from '@/components/Skeleton';

export default function IssuesLoading() {
  return (
    <div className="px-8 py-6 max-w-[1400px]">
      <header className="mb-5">
        <Skeleton className="h-2.5 w-[80px] mb-2" />
        <Skeleton className="h-7 w-[120px]" />
      </header>

      <div className="flex flex-wrap items-center gap-2 mb-4">
        {Array.from({ length: 9 }).map((_, i) => (
          <Skeleton key={i} className="h-6 w-[72px]" />
        ))}
      </div>

      <div className="bg-card border border-border rounded overflow-hidden">
        <div className="h-9 bg-zebra border-b border-border" />
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="grid grid-cols-[4px_minmax(0,1fr)_140px_120px_120px_80px_100px] gap-3 px-4 py-3 border-b border-border"
          >
            <Skeleton className="h-full -mx-4 w-1" />
            <div className="space-y-1.5">
              <Skeleton className="h-3 w-[60%]" />
              <Skeleton className="h-2.5 w-[80%]" />
            </div>
            <Skeleton className="h-3 self-center" />
            <Skeleton className="h-3 self-center" />
            <Skeleton className="h-3 self-center" />
            <Skeleton className="h-3 self-center" />
            <Skeleton className="h-5 self-center justify-self-end w-[60px]" />
          </div>
        ))}
      </div>
    </div>
  );
}
