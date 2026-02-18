import { Suspense } from "react"

import { PageSection } from "@/components/ui/page-layout"

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
    <div className="space-y-section">
      <Suspense fallback={<DashboardHeaderSkeleton />}>
        <DashboardWelcome />
      </Suspense>

      <Suspense fallback={<DashboardCardSkeleton />}>
        <OnboardingPromptCard />
      </Suspense>

      <PageSection className="grid gap-card-gap xl:grid-cols-[2fr_1fr]">
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
      </PageSection>

      <PageSection className="grid gap-card-gap xl:grid-cols-3">
        <div className="space-y-card-gap xl:col-span-2">
          <div className="grid gap-card-gap md:grid-cols-2">
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

          <Suspense fallback={<DashboardCardSkeleton />}>
            <FloorplanViewerCard />
          </Suspense>
        </div>

        <div className="space-y-card-gap">
          <Suspense fallback={<DashboardCardSkeleton />}>
            <UpcomingBookingsCard />
          </Suspense>
          <Suspense fallback={<DashboardCardSkeleton />}>
            <MaintenanceOverviewCard />
          </Suspense>
        </div>
      </PageSection>
    </div>
  )
}
