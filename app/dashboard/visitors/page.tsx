import { Metadata } from "next"

import { CalendarDateRangePicker } from "../components/date-range-picker"
import { DashboardHeader } from "../components/dashboard-header"
import { VisitorApprovalsCard } from "../components/visitor-approvals-card"
import { VisitorOversightTable } from "../components/visitor-oversight-table"
import { canViewWidget } from "../lib/access"
import {
  fetchDashboardData,
  filterDataByRole,
  getDashboardContext,
} from "../lib/data"
import { buildNavItems } from "../lib/navigation"
import { summarizeVisitorApprovals } from "../lib/transform"

export const metadata: Metadata = {
  title: "Visitor oversight",
  description: "Review and approve overnight visitor requests by building.",
}

type VisitorsPageProps = {
  searchParams: { building?: string }
}

export default async function VisitorsPage({ searchParams }: VisitorsPageProps) {
  const { supabase, buildings, activeBuilding } = await getDashboardContext({
    searchParams,
    currentPath: "/dashboard/visitors",
  })

  const rawData = await fetchDashboardData(supabase, activeBuilding.id)
  const data = filterDataByRole(rawData, activeBuilding.role)
  const summary = summarizeVisitorApprovals(data.visitors)
  const canReview = canViewWidget(activeBuilding.role, "visitors")

  return (
    <div className="xs:flex max-w-dvw w-full flex-col">
      <DashboardHeader
        buildings={buildings}
        activeBuildingId={activeBuilding.id}
        activeBuildingName={activeBuilding.name}
        navItems={buildNavItems(activeBuilding.id)}
      />
      <div className="flex-1 space-y-6 p-8 pt-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              Visitor oversight
            </h1>
            <p className="text-sm text-muted-foreground">
              Coordinate check-ins and approvals for upcoming guest stays.
            </p>
          </div>
          <CalendarDateRangePicker />
        </div>
        <VisitorApprovalsCard summary={summary} canView={canReview} />
        <VisitorOversightTable visitors={data.visitors} canReview={canReview} />
      </div>
    </div>
  )
}

