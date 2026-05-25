export function Skeleton({ className = "" }) {
  return <div className={`animate-pulse rounded-lg bg-white/10 ${className}`} />;
}

export function CardSkeleton() {
  return (
    <div className="rounded-card bg-white p-6">
      <Skeleton className="mb-3 h-4 w-1/3" />
      <Skeleton className="h-10 w-2/3" />
    </div>
  );
}
