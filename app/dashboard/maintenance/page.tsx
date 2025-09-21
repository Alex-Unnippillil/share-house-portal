import { Metadata } from "next"

import { CalendarDateRangePicker } from "../components/date-range-picker"
import { DashboardHeader } from "../components/dashboard-header"
import { MaintenanceBacklogCard } from "../components/maintenance-backlog-card"
import { MaintenanceTable } from "../components/maintenance-table"
import { buildNavItems } from "../lib/navigation"
import {
  fetchDashboardData,
  filterDataByRole,
  getDashboardContext,
} from "../lib/data"
import { canViewWidget } from "../lib/access"
import { summarizeMaintenanceRequests } from "../lib/transform"

export const metadata: Metadata = {
  title: "Maintenance triage",
  description: "Prioritize and assign maintenance tickets by building.",
}

type MaintenancePageProps = {
  searchParams: { building?: string }
}

export default async function MaintenancePage({
  searchParams,
}: MaintenancePageProps) {
  const { supabase, buildings, activeBuilding } = await getDashboardContext({
    searchParams,
    currentPath: "/dashboard/maintenance",
  })

  const rawData = await fetchDashboardData(supabase, activeBuilding.id)
  const data = filterDataByRole(rawData, activeBuilding.role)
  const summary = summarizeMaintenanceRequests(data.maintenance)
  const canManage = canViewWidget(activeBuilding.role, "maintenance")

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
              Maintenance triage
            </h1>
            <p className="text-sm text-muted-foreground">
              Review outstanding tickets and monitor SLA risk by priority level.
            </p>
          </div>
          <CalendarDateRangePicker />
        </div>
        <MaintenanceBacklogCard
          summary={summary}
          role={activeBuilding.role}
          canView={canManage}
        />
        <MaintenanceTable requests={data.maintenance} canManage={canManage} />
      </div>
    </div>
  )
}

