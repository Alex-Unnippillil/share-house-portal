import { Suspense } from "react"

import FirstRunTour from "@/components/dashboard/FirstRunTour"
import DashboardHelpMenu from "@/components/dashboard/HelpMenu"

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

import InsightsPanel from "./components/insights-panel"

export default function DashboardPage() {
  return (
    <div className="space-y-8">
      <FirstRunTour />

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <Suspense
          fallback={
            <div className="flex-1">
              <DashboardHeaderSkeleton />
            </div>
          }
        >
          <div data-tour-id="dashboard-welcome" className="flex-1">
            <DashboardWelcome />
          </div>
        </Suspense>
        <div className="sm:self-start">
          <DashboardHelpMenu />
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[2fr_1fr]">
        <Suspense fallback={<DashboardStatsSkeleton />}>
          <div data-tour-id="dashboard-metrics">
            <DashboardMetrics />
          </div>
        </Suspense>
        <Suspense
          fallback={
            <div className="h-full">
              <DashboardCardSkeleton />
            </div>
          }
        >
          <div className="h-full" data-tour-id="dashboard-quick-actions">
            <DashboardQuickActions />
          </div>
        </Suspense>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <div className="space-y-4 xl:col-span-2">
          <div className="grid gap-4 md:grid-cols-2">
            <Suspense fallback={<DashboardCardSkeleton />}>
              <div data-tour-id="dashboard-next-rent">
                <NextRentCard />
              </div>
            </Suspense>
            <Suspense fallback={<DashboardCardSkeleton />}>
              <RecentDocumentsCard />
            </Suspense>
          </div>

          <Suspense fallback={<DashboardBoardSkeleton />}>
            <div data-tour-id="dashboard-roommate-board">
              <RoommateBoardCard />
            </div>
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
