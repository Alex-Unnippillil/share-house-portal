import {
  DashboardAsyncBoundary,
  DashboardCardGrid,
  DashboardSectionStack,
} from "@/app/dashboard/components/layout-primitives"

import { DashboardMetrics } from "./components/dashboard-metrics"
import { DashboardQuickActions } from "./components/dashboard-quick-actions"
import { DashboardWelcome } from "./components/dashboard-welcome"
import { FloorplanViewerCard } from "./components/floorplan-viewer-card"
import { MaintenanceOverviewCard } from "./components/maintenance-overview-card"
import { NextRentCard } from "./components/next-rent-card"
import { OnboardingPromptCard } from "./components/onboarding-prompt-card"
import { RecentDocumentsCard } from "./components/recent-documents-card"
import { RoommateBoardCard } from "./components/roommate-board-card"
import {
  DashboardBoardSkeleton,
  DashboardCardSkeleton,
  DashboardHeaderSkeleton,
  DashboardStatsSkeleton,
} from "./components/skeletons"
import { UpcomingBookingsCard } from "./components/upcoming-bookings-card"

export default function DashboardPage() {
  return (
    <DashboardSectionStack>
      <DashboardAsyncBoundary fallback={<DashboardHeaderSkeleton />}>
        <DashboardWelcome />
      </DashboardAsyncBoundary>

      <DashboardAsyncBoundary fallback={<DashboardCardSkeleton />}>
        <OnboardingPromptCard />
      </DashboardAsyncBoundary>

      <div className="grid gap-card-gap xl:grid-cols-[2fr_1fr]">
        <DashboardAsyncBoundary fallback={<DashboardStatsSkeleton />}>
          <DashboardMetrics />
        </DashboardAsyncBoundary>
        <DashboardAsyncBoundary
          className="h-full"
          fallback={<DashboardCardSkeleton />}
        >
          <DashboardQuickActions />
        </DashboardAsyncBoundary>
      </div>

      <div className="grid gap-card-gap xl:grid-cols-3">
        <DashboardSectionStack className="gap-card-gap xl:col-span-2">
          <DashboardCardGrid>
            <DashboardAsyncBoundary fallback={<DashboardCardSkeleton />}>
              <NextRentCard />
            </DashboardAsyncBoundary>
            <DashboardAsyncBoundary fallback={<DashboardCardSkeleton />}>
              <RecentDocumentsCard />
            </DashboardAsyncBoundary>
          </DashboardCardGrid>

          <DashboardAsyncBoundary fallback={<DashboardBoardSkeleton />}>
            <RoommateBoardCard />
          </DashboardAsyncBoundary>

          <DashboardAsyncBoundary fallback={<DashboardCardSkeleton />}>
            <FloorplanViewerCard />
          </DashboardAsyncBoundary>
        </DashboardSectionStack>

        <DashboardSectionStack className="gap-card-gap">
          <DashboardAsyncBoundary fallback={<DashboardCardSkeleton />}>
            <UpcomingBookingsCard />
          </DashboardAsyncBoundary>
          <DashboardAsyncBoundary fallback={<DashboardCardSkeleton />}>
            <MaintenanceOverviewCard />
          </DashboardAsyncBoundary>
        </DashboardSectionStack>
      </div>
    </DashboardSectionStack>
  )
}
