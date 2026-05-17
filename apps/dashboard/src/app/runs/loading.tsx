import { Skeleton } from '@/components/Skeleton';

export default function RunsLoading() {
  return (
    <div className="px-8 py-6 max-w-[1400px]">
      <header className="mb-5">
        <Skeleton className="h-2.5 w-[60px] mb-2" />
        <Skeleton className="h-7 w-[100px]" />
      </header>

      <div className="bg-card border border-border rounded overflow-hidden">
        <div className="h-9 bg-zebra border-b border-border" />
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="grid grid-cols-[60px_minmax(0,1fr)_120px_140px_120px_100px_60px] gap-3 px-4 py-3 border-b border-border items-center"
          >
            <Skeleton className="h-4 w-[30px]" />
            <div className="space-y-1.5">
              <Skeleton className="h-3 w-[70%]" />
              <Skeleton className="h-2.5 w-[60%]" />
            </div>
            <Skeleton className="h-5 w-[70px]" />
            <Skeleton className="h-3 w-[80px]" />
            <Skeleton className="h-3 w-[60px]" />
            <Skeleton className="h-3 w-[50px] justify-self-end" />
            <Skeleton className="h-3 w-[40px] justify-self-end" />
          </div>
        ))}
      </div>
    </div>
  );
}
