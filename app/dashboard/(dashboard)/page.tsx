import { Suspense } from "react"

import { DashboardWelcome } from "./components/dashboard-welcome"
import { NextRentCard } from "./components/next-rent-card"
import { RecentDocumentsCard } from "./components/recent-documents-card"
import { RoommateBoardCard } from "./components/roommate-board-card"
import { DashboardMetrics } from "./components/dashboard-metrics"
import { DashboardQuickActions } from "./components/dashboard-quick-actions"
import { UpcomingBookingsCard } from "./components/upcoming-bookings-card"
import { MaintenanceOverviewCard } from "./components/maintenance-overview-card"
import {
  DashboardBoardSkeleton,
  DashboardCardSkeleton,
  DashboardHeaderSkeleton,
  DashboardStatsSkeleton,
} from "./components/skeletons"

import { evaluateFeatureFlags, type SystemStress } from "@/lib/feature-flags"

export default function DashboardPage() {
  const { flags, stress } = evaluateFeatureFlags()
  const brownoutActive = flags.brownoutMode
  const showMetrics = flags.dashboardMetrics
  const showQuickActions = flags.quickActions

  return (
    <div className="space-y-8">
      <Suspense fallback={<DashboardHeaderSkeleton />}>
        <DashboardWelcome />
      </Suspense>

      {brownoutActive ? <BrownoutBanner level={stress.level} /> : null}

      <div className="grid gap-4 xl:grid-cols-[2fr_1fr]">
        {showMetrics ? (
          <Suspense fallback={<DashboardStatsSkeleton />}>
            <DashboardMetrics />
          </Suspense>
        ) : (
          <BrownoutMetricsPlaceholder />
        )}
        {showQuickActions ? (
          <Suspense
            fallback={
              <div className="h-full">
                <DashboardCardSkeleton />
              </div>
            }
          >
            <DashboardQuickActions />
          </Suspense>
        ) : (
          <BrownoutQuickActionsPlaceholder />
        )}
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <div className="space-y-4 xl:col-span-2">
          <div className="grid gap-4 md:grid-cols-2">
            <Suspense fallback={<DashboardCardSkeleton />}>
              <NextRentCard />
            </Suspense>
            <Suspense fallback={<DashboardCardSkeleton />}>
              <RecentDocumentsCard />
            </Suspense>
          </div>

          <Suspense fallback={<DashboardBoardSkeleton />}>
            <RoommateBoardCard />
          </Suspense>
        </div>


        <div className="space-y-4">
          <Suspense fallback={<DashboardCardSkeleton />}>
            <UpcomingBookingsCard />
          </Suspense>
          <Suspense fallback={<DashboardCardSkeleton />}>
            <MaintenanceOverviewCard />
          </Suspense>
        </div>
      </div>
    </div>
  )
}

function BrownoutBanner({ level }: { level: SystemStress["level"] }) {
  const descriptor = level === "critical" ? "critical" : "elevated"

  return (
    <div className="rounded-lg border border-amber-500/50 bg-amber-500/10 px-4 py-3 text-sm text-amber-900 dark:border-amber-400/40 dark:bg-amber-400/10 dark:text-amber-100">
      <p className="font-semibold">Performance safeguards active</p>
      <p className="mt-1 text-amber-900/80 dark:text-amber-100/80">
        Non-essential dashboard widgets are temporarily hidden while we stabilise {descriptor} load.
      </p>
    </div>
  )
}

function BrownoutMetricsPlaceholder() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <div className="sm:col-span-2 xl:col-span-4 rounded-lg border border-dashed border-border/60 bg-muted/40 p-6 text-sm">
        <p className="font-medium text-foreground">Metrics paused during brownout</p>
        <p className="mt-2 text-muted-foreground">
          Snapshot analytics will return as soon as the platform returns to normal operating ranges. Core rent and maintenance
          workflows remain fully available.
        </p>
      </div>
    </div>
  )
}

function BrownoutQuickActionsPlaceholder() {
  return (
    <div className="h-full rounded-lg border border-dashed border-border/60 bg-muted/40 p-6 text-sm">
      <p className="font-medium text-foreground">Quick actions temporarily unavailable</p>
      <p className="mt-2 text-muted-foreground">
        We’ve paused shortcuts to protect stability. Use the navigation menu for any urgent updates in the meantime.
      </p>
    </div>
  )
}
