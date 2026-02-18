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

import { OnboardingPromptCard } from "./components/onboarding-prompt-card"

export default function DashboardPage() {
  return (
    <div className="space-y-8">
      <Suspense fallback={<DashboardHeaderSkeleton />}>
        <DashboardWelcome />
      </Suspense>

      <Suspense fallback={<DashboardCardSkeleton />}>
        <OnboardingPromptCard />
      </Suspense>

      <div className="grid gap-4 xl:grid-cols-[2fr_1fr]">
        <Suspense fallback={<DashboardStatsSkeleton />}>
          <DashboardMetrics />
        </Suspense>
        <Suspense
          fallback={
            <div className="h-full">
              <DashboardCardSkeleton />
            </div>
          }
        >
          <DashboardQuickActions />
        </Suspense>
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
