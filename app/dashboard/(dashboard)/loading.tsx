import {
  DashboardBookingStatsSkeleton,
  DashboardDocumentsSkeleton,
  DashboardRentSkeleton,
  DashboardRoommateBoardSkeleton,
} from "@/components/ui/skeletons/dashboard"
import { cn } from "@/lib/utils"

function SkeletonPill({ className }: { className?: string }) {
  return <div className={cn("h-9 w-24 animate-pulse rounded-md bg-muted", className)} />
}

export default function Loading() {
  return (
    <div className="w-full space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="h-8 w-40 animate-pulse rounded-md bg-muted" />
        <SkeletonPill />
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <DashboardRentSkeleton />
        <DashboardBookingStatsSkeleton />
        <DashboardDocumentsSkeleton />
      </div>

      <DashboardRoommateBoardSkeleton />
    </div>
  )
}
