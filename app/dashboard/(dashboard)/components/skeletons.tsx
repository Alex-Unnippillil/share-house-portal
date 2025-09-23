import { Skeleton } from "@/components/ui/skeleton"

export function DashboardHeaderSkeleton() {
  return <Skeleton className="h-10 w-full rounded-lg" />
}

export function DashboardCardSkeleton() {
  return <Skeleton className="h-40 w-full rounded-xl" />
}

export function DashboardBoardSkeleton() {
  return <Skeleton className="h-48 w-full rounded-xl" />
}

export function DashboardStatsSkeleton() {
  return (
    <div className="grid gap-4 md:grid-cols-4">
      {Array.from({ length: 4 }).map((_, index) => (
        <Skeleton key={index} className="h-32 w-full rounded-xl" />
      ))}
    </div>
  )
}
