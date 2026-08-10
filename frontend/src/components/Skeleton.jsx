export function Skeleton({ className = "" }) {
  return <div className={`animate-pulse rounded bg-surface-variant/60 ${className}`} />;
}

export function CardSkeleton({ lines = 3 }) {
  return (
    <div className="panel">
      <div className="panel-veil" />
      <div className="relative z-10 p-md">
        <Skeleton className="h-3 w-32" />
        <Skeleton className="mt-md h-8 w-24" />
        <div className="mt-md space-y-base">
          {Array.from({ length: lines }).map((_, i) => (
            <Skeleton key={i} className="h-2.5 w-full" />
          ))}
        </div>
      </div>
    </div>
  );
}
