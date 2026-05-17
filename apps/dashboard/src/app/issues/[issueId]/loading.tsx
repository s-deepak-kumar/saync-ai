import { Skeleton } from '@/components/Skeleton';

export default function IssueDetailLoading() {
  return (
    <div className="px-8 py-6 max-w-[1400px]">
      <Skeleton className="h-3 w-[320px] mb-4" />

      <div className="bg-card border-l-4 border border-border rounded p-5 mb-5">
        <div className="flex items-center gap-3 mb-3">
          <Skeleton className="h-5 w-[60px]" />
          <Skeleton className="h-5 w-[60px]" />
          <Skeleton className="h-3 w-[80px]" />
        </div>
        <Skeleton className="h-7 w-[60%] mb-2" />
        <Skeleton className="h-3 w-[80%]" />
      </div>

      <div className="grid grid-cols-[2fr_1.5fr] gap-5">
        <div className="space-y-4">
          <div className="bg-card border border-border rounded p-5">
            <Skeleton className="h-2.5 w-[60px] mb-3" />
            <Skeleton className="h-3 w-[90%] mb-1.5" />
            <Skeleton className="h-3 w-[70%]" />
          </div>
          <div className="bg-card border border-border rounded p-5">
            <Skeleton className="h-2.5 w-[120px] mb-3" />
            <Skeleton className="h-20 w-full" />
          </div>
        </div>
        <div className="space-y-4">
          <div className="bg-card border border-border rounded p-5">
            <Skeleton className="h-2.5 w-[60px] mb-3" />
            <Skeleton className="h-3 w-[80%]" />
          </div>
          <div className="bg-card border border-border rounded p-5 space-y-3">
            <Skeleton className="h-2.5 w-[100px]" />
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-8" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
