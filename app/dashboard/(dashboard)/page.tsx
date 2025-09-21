import { Metadata } from "next"

import { Button } from "@/components/ui/button"

import { CalendarDateRangePicker } from "@/app/dashboard/components/date-range-picker"
import { MainNav } from "@/app/dashboard/components/main-nav"
import { Search } from "@/app/dashboard/components/search"
import TeamSwitcher from "@/app/dashboard/components/team-switcher"
import { UserNav } from "@/app/dashboard/components/user-nav"
import { DocumentApprovalsCard } from "@/app/dashboard/components/document-approvals-card"
import { MaintenanceBacklogCard } from "@/app/dashboard/components/maintenance-backlog-card"
import { MessageCenterCard } from "@/app/dashboard/components/message-center-card"
import { RentCollectionCard } from "@/app/dashboard/components/rent-collection-card"
import { UpcomingBookingsCard } from "@/app/dashboard/components/upcoming-bookings-card"
import { VisitorApprovalsCard } from "@/app/dashboard/components/visitor-approvals-card"
import {
  fetchDocumentApprovals,
  fetchMaintenanceQueue,
  fetchMessageAlerts,
  fetchRentCollectionSummary,
  fetchUpcomingBookings,
  fetchVisitorApprovals,
  resolveAccessContext,
} from "@/app/dashboard/lib/data-sources"
import { createSupbaseServerClientReadOnly } from "@/utils/supaone"

export const metadata: Metadata = {
  title: "Operations dashboard",
  description: "Portfolio overview across rent, maintenance, visitors, and documents.",
}

type DashboardPageProps = {
  searchParams?: {
    building?: string
  }
}

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const supabase = await createSupbaseServerClientReadOnly()
  const { context, activeBuilding } = await resolveAccessContext(
    supabase,
    searchParams?.building ?? null
  )

  const [rentSummary, bookings, maintenanceQueue, visitorApprovals, documentApprovals, messageAlerts] =
    await Promise.all([
      fetchRentCollectionSummary(context, activeBuilding.id),
      fetchUpcomingBookings(context, activeBuilding.id),
      fetchMaintenanceQueue(context, activeBuilding.id),
      fetchVisitorApprovals(context, activeBuilding.id),
      fetchDocumentApprovals(context, activeBuilding.id),
      fetchMessageAlerts(context, activeBuilding.id),
    ])

  return (
    <div className="xs:flex max-w-dvw w-full flex-col">
      <div className="border-b">
        <div className="flex h-16 items-center px-4">
          <TeamSwitcher
            buildings={context.buildings}
            selectedBuildingId={activeBuilding.id}
            role={context.profile.role}
          />
          <MainNav className="mx-6" buildingId={activeBuilding.id} role={context.profile.role} />
          <div className="ml-auto flex items-center space-x-4">
            <Search buildingName={activeBuilding.name} />
            <UserNav />
          </div>
        </div>
      </div>
      <div className="flex-1 space-y-6 p-8 pt-6">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">{activeBuilding.name}</h2>
            <p className="text-sm text-muted-foreground">
              Portfolio health for property managers and admins.
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <CalendarDateRangePicker />
            <Button variant="outline">Export CSV</Button>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-7">
          <div className="lg:col-span-4">
            <RentCollectionCard summary={rentSummary} />
          </div>
          <div className="lg:col-span-3">
            <MaintenanceBacklogCard queue={maintenanceQueue} />
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-7">
          <div className="lg:col-span-4">
            <UpcomingBookingsCard bookings={bookings} />
          </div>
          <div className="lg:col-span-3">
            <VisitorApprovalsCard approvals={visitorApprovals} />
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-7">
          <div className="lg:col-span-4">
            <DocumentApprovalsCard approvals={documentApprovals} />
          </div>
          <div className="lg:col-span-3">
            <MessageCenterCard threads={messageAlerts} />
          </div>
        </div>
      </div>
    </div>
  )
}
