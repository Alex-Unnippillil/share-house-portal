import { Metadata } from "next"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

import { DashboardHeader } from "../components/dashboard-header"
import { DocumentApprovalsCard } from "../components/document-approvals-card"
import { MaintenanceBacklogCard } from "../components/maintenance-backlog-card"
import { Overview } from "../components/overview"
import { RentCollectionCard } from "../components/rent-collection-card"
import { VisitorApprovalsCard } from "../components/visitor-approvals-card"
import { canViewWidget } from "../lib/access"
import {
  fetchDashboardData,
  filterDataByRole,
  getDashboardContext,
} from "../lib/data"
import { buildNavItems } from "../lib/navigation"
import {
  buildMonthlyCollectionSeries,
  calculateRentCollectionSummary,
  summarizeDocumentApprovals,
  summarizeMaintenanceRequests,
  summarizeVisitorApprovals,
} from "../lib/transform"

export const metadata: Metadata = {
  title: "Building analytics",
  description: "Cross-functional analytics segmented by building portfolio.",
}

type AnalyticsPageProps = {
  searchParams: { building?: string }
}

export default async function AnalyticsPage({
  searchParams,
}: AnalyticsPageProps) {
  const { supabase, buildings, activeBuilding } = await getDashboardContext({
    searchParams,
    currentPath: "/dashboard/analytics",
  })

  const rawData = await fetchDashboardData(supabase, activeBuilding.id)
  const data = filterDataByRole(rawData, activeBuilding.role)

  const rentSummary = calculateRentCollectionSummary(data.rentPayments)
  const maintenanceSummary = summarizeMaintenanceRequests(data.maintenance)
  const visitorSummary = summarizeVisitorApprovals(data.visitors)
  const documentSummary = summarizeDocumentApprovals(data.documents)
  const monthlySeries = buildMonthlyCollectionSeries(data.rentPayments, 12)

  const canViewRent = canViewWidget(activeBuilding.role, "rent")
  const canViewMaintenance = canViewWidget(activeBuilding.role, "maintenance")
  const canViewVisitors = canViewWidget(activeBuilding.role, "visitors")
  const canViewDocuments = canViewWidget(activeBuilding.role, "documents")

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
              Analytics — {activeBuilding.name}
            </h1>
            <p className="text-sm text-muted-foreground">
              Monitor rent collection velocity, maintenance backlog health, and
              compliance throughput for this building.
            </p>
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <RentCollectionCard
            summary={rentSummary}
            role={activeBuilding.role}
            canView={canViewRent}
            buildingName={activeBuilding.name}
          />
          <MaintenanceBacklogCard
            summary={maintenanceSummary}
            role={activeBuilding.role}
            canView={canViewMaintenance}
          />
          <VisitorApprovalsCard summary={visitorSummary} canView={canViewVisitors} />
          <DocumentApprovalsCard
            summary={documentSummary}
            canView={canViewDocuments}
          />
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Trailing 12 months rent collected</CardTitle>
          </CardHeader>
          <CardContent className="pl-2">
            <Overview data={monthlySeries} />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

