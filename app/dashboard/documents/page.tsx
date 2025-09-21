import { Metadata } from "next"

import { CalendarDateRangePicker } from "../components/date-range-picker"
import { DashboardHeader } from "../components/dashboard-header"
import { DocumentApprovalsCard } from "../components/document-approvals-card"
import { DocumentApprovalsTable } from "../components/document-approvals-table"
import { canViewWidget } from "../lib/access"
import {
  fetchDashboardData,
  filterDataByRole,
  getDashboardContext,
} from "../lib/data"
import { buildNavItems } from "../lib/navigation"
import { summarizeDocumentApprovals } from "../lib/transform"

export const metadata: Metadata = {
  title: "Document approvals",
  description: "Track lease packets and compliance envelopes awaiting sign-off.",
}

type DocumentsPageProps = {
  searchParams: { building?: string }
}

export default async function DocumentsPage({
  searchParams,
}: DocumentsPageProps) {
  const { supabase, buildings, activeBuilding } = await getDashboardContext({
    searchParams,
    currentPath: "/dashboard/documents",
  })

  const rawData = await fetchDashboardData(supabase, activeBuilding.id)
  const data = filterDataByRole(rawData, activeBuilding.role)
  const summary = summarizeDocumentApprovals(data.documents)
  const canReview = canViewWidget(activeBuilding.role, "documents")

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
              Document approvals
            </h1>
            <p className="text-sm text-muted-foreground">
              Ensure compliance packets and leases are finalized on time.
            </p>
          </div>
          <CalendarDateRangePicker />
        </div>
        <DocumentApprovalsCard summary={summary} canView={canReview} />
        <DocumentApprovalsTable
          documents={data.documents}
          canReview={canReview}
        />
      </div>
    </div>
  )
}

