import { Skeleton } from '@/components/Skeleton';

export default function ViolationsLoading() {
  return (
    <div className="px-8 py-6 max-w-[1400px]">
      <header className="mb-5">
        <Skeleton className="h-2.5 w-[80px] mb-2" />
        <Skeleton className="h-7 w-[140px]" />
      </header>
      <div className="bg-card border border-border rounded px-6 py-10 text-center space-y-3">
        <Skeleton className="h-3 w-[260px] mx-auto" />
        <Skeleton className="h-3 w-[420px] mx-auto" />
        <Skeleton className="h-3 w-[380px] mx-auto" />
      </div>
    </div>
  );
}
