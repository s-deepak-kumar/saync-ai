export function Skeleton({
  className = '',
  style,
}: {
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <div
      className={`bg-zebra animate-pulse rounded ${className}`}
      style={style}
    />
  );
}

export function SkeletonText({ width = '60%' }: { width?: string }) {
  return <Skeleton className="h-3" style={{ width }} />;
}

export function SkeletonRow({
  cols,
  height = 'h-10',
}: { cols: string; height?: string }) {
  return (
    <div
      className={`grid ${cols} gap-3 px-4 py-2.5 border-b border-border ${height}`}
    >
      {cols
        .replace('grid-cols-[', '')
        .replace(']', '')
        .split('_')
        .map((_, i) => (
          <Skeleton key={i} className="h-3 self-center" />
        ))}
    </div>
  );
}
