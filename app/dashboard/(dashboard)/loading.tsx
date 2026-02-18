import {
  DashboardCardGrid,
  DashboardSectionStack,
} from "@/app/dashboard/components/layout-primitives"

import {
  DashboardBoardSkeleton,
  DashboardCardSkeleton,
  DashboardHeaderSkeleton,
} from "./components/skeletons"

export default function LoadingDashboardSegment() {
  return (
    <DashboardSectionStack>
      <DashboardHeaderSkeleton />
      <DashboardCardGrid className="lg:grid-cols-3">
        <DashboardCardSkeleton />
        <DashboardCardSkeleton />
      </DashboardCardGrid>
      <DashboardBoardSkeleton />
    </DashboardSectionStack>
  )
}
