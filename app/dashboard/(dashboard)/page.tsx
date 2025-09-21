import { Metadata } from "next"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"

import { CalendarDateRangePicker } from "../components/date-range-picker"
import { DocumentApprovalsCard } from "../components/document-approvals-card"
import { MaintenanceBacklogCard } from "../components/maintenance-backlog-card"
import { MessagingFeed } from "../components/messaging-feed"
import { Overview } from "../components/overview"
import { RecentPayments } from "../components/recent-payments"
import { RentCollectionCard } from "../components/rent-collection-card"
import { UpcomingBookingsCard } from "../components/upcoming-bookings-card"
import { VisitorApprovalsCard } from "../components/visitor-approvals-card"
import { DashboardHeader } from "../components/dashboard-header"
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
  selectRecentMessages,
  selectRecentPayments,
  selectUpcomingBookings,
  summarizeDocumentApprovals,
  summarizeMaintenanceRequests,
  summarizeVisitorApprovals,
} from "../lib/transform"

export const metadata: Metadata = {
  title: "Building operations dashboard",
  description: "Portfolio-wide overview of rent, maintenance, and bookings.",
}

type DashboardPageProps = {
  searchParams: { building?: string }
}

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const { supabase, buildings, activeBuilding } = await getDashboardContext({
    searchParams,
    currentPath: "/dashboard",
  })

  const rawData = await fetchDashboardData(supabase, activeBuilding.id)
  const data = filterDataByRole(rawData, activeBuilding.role)

  const rentSummary = calculateRentCollectionSummary(data.rentPayments)
  const monthlySeries = buildMonthlyCollectionSeries(data.rentPayments)
  const maintenanceSummary = summarizeMaintenanceRequests(data.maintenance)
  const visitorSummary = summarizeVisitorApprovals(data.visitors)
  const documentSummary = summarizeDocumentApprovals(data.documents)
  const upcomingBookings = selectUpcomingBookings(data.bookings)
  const recentPayments = selectRecentPayments(data.rentPayments)
  const recentMessages = selectRecentMessages(data.messages)

  const canViewRent = canViewWidget(activeBuilding.role, "rent")
  const canViewMaintenance = canViewWidget(activeBuilding.role, "maintenance")
  const canViewVisitors = canViewWidget(activeBuilding.role, "visitors")
  const canViewDocuments = canViewWidget(activeBuilding.role, "documents")
  const canViewBookings = canViewWidget(activeBuilding.role, "bookings")
  const canViewMessages = canViewWidget(activeBuilding.role, "messages")

  const navItems = buildNavItems(activeBuilding.id)

  return (
    <div className="xs:flex max-w-dvw w-full flex-col">
      <DashboardHeader
        buildings={buildings}
        activeBuildingId={activeBuilding.id}
        activeBuildingName={activeBuilding.name}
        navItems={navItems}
      />
      <div className="flex-1 space-y-4 p-8 pt-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h2 className="text-3xl font-bold tracking-tight">
            {activeBuilding.name} overview
          </h2>
          <div className="flex items-center space-x-2">
            <CalendarDateRangePicker />
            <Button variant="outline">Export</Button>
          </div>
        </div>
        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
            <TabsTrigger value="reports" disabled>
              Reports
            </TabsTrigger>
          </TabsList>
          <TabsContent value="overview" className="space-y-4">
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
              <VisitorApprovalsCard
                summary={visitorSummary}
                canView={canViewVisitors}
              />
              <DocumentApprovalsCard
                summary={documentSummary}
                canView={canViewDocuments}
              />
            </div>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
              <Card className="col-span-4">
                <CardHeader>
                  <CardTitle>Monthly rent collected</CardTitle>
                </CardHeader>
                <CardContent className="pl-2">
                  <Overview data={monthlySeries} />
                </CardContent>
              </Card>
              <Card className="col-span-3">
                <CardHeader>
                  <CardTitle>Recent payments</CardTitle>
                </CardHeader>
                <CardContent>
                  <RecentPayments payments={recentPayments} canView={canViewRent} />
                </CardContent>
              </Card>
            </div>
            <div className="grid gap-4 lg:grid-cols-7">
              <UpcomingBookingsCard
                bookings={upcomingBookings}
                canView={canViewBookings}
              />
              <MessagingFeed messages={recentMessages} canView={canViewMessages} />
            </div>
          </TabsContent>
          <TabsContent value="analytics" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Building insights</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Dive deeper into performance by exploring the analytics section for
                  occupancy, revenue, and engagement trends per building.
                </p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}