function Skeleton({ className }: { className: string }) {
  return <div className={`animate-pulse rounded-md bg-muted ${className}`} />
}

export function DashboardHeaderSkeleton() {
  return <Skeleton className="h-10 w-full" />
}

export function DashboardCardSkeleton() {
  return <Skeleton className="h-40 w-full" />
}

export function DashboardBoardSkeleton() {
  return <Skeleton className="h-48 w-full" />
}

export function DashboardStatsSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <Skeleton className="h-32 w-full" />
      <Skeleton className="h-32 w-full" />
      <Skeleton className="h-32 w-full" />
      <Skeleton className="h-32 w-full" />
    </div>
  )
}
