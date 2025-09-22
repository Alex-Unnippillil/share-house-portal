import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"

function SkeletonBlock({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-md bg-muted", className)} />
}

export function DashboardRentSkeleton() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Next rent due</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div>
          <SkeletonBlock className="h-4 w-20" />
        </div>
        <SkeletonBlock className="h-8 w-32" />
        <SkeletonBlock className="h-4 w-40" />
        <SkeletonBlock className="h-9 w-32" />
      </CardContent>
    </Card>
  )
}

export function DashboardBookingStatsSkeleton() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Booking utilization</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {[...Array(3)].map((_, index) => (
          <div key={index} className="space-y-2">
            <SkeletonBlock className="h-4 w-24" />
            <SkeletonBlock className="h-6 w-28" />
          </div>
        ))}
      </CardContent>
    </Card>
  )
}

export function DashboardDocumentsSkeleton() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Latest documents</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {[...Array(3)].map((_, index) => (
          <div key={index} className="space-y-1">
            <SkeletonBlock className="h-4 w-48" />
            <SkeletonBlock className="h-3 w-32" />
          </div>
        ))}
        <SkeletonBlock className="h-9 w-28" />
      </CardContent>
    </Card>
  )
}

export function DashboardRoommateBoardSkeleton() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Roommate board</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {[...Array(4)].map((_, index) => (
          <div key={index} className="space-y-2">
            <SkeletonBlock className="h-4 w-32" />
            <SkeletonBlock className="h-3 w-full" />
            <SkeletonBlock className="h-3 w-2/3" />
          </div>
        ))}
        <SkeletonBlock className="h-9 w-40" />
      </CardContent>
    </Card>
  )
}

export function StatGridSkeleton({
  count = 3,
  className,
}: {
  count?: number
  className?: string
}) {
  return (
    <div className={cn("grid gap-4 md:grid-cols-3", className)}>
      {[...Array(count)].map((_, index) => (
        <Card key={index}>
          <CardHeader className="pb-2">
            <SkeletonBlock className="h-4 w-3/4" />
          </CardHeader>
          <CardContent>
            <SkeletonBlock className="h-8 w-1/2" />
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

export function DocumentListSkeleton({ items = 5 }: { items?: number }) {
  return (
    <div className="space-y-4">
      {[...Array(items)].map((_, index) => (
        <Card key={index} className="animate-pulse">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <SkeletonBlock className="h-5 w-48" />
                <SkeletonBlock className="h-4 w-32" />
              </div>
              <SkeletonBlock className="h-6 w-20" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <SkeletonBlock className="h-4 w-24" />
              <div className="flex space-x-2">
                <SkeletonBlock className="h-8 w-16" />
                <SkeletonBlock className="h-8 w-16" />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
