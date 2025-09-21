import { addDays } from "date-fns"

import { DocumentApprovalsCard } from "../../components/document-approvals-card"
import { MaintenanceBacklogCard } from "../../components/maintenance-backlog-card"
import { MessagingFeed } from "../../components/messaging-feed"
import { RecentPayments } from "../../components/recent-payments"
import { RentCollectionCard } from "../../components/rent-collection-card"
import { UpcomingBookingsCard } from "../../components/upcoming-bookings-card"
import { VisitorApprovalsCard } from "../../components/visitor-approvals-card"
import type {
  BookingRow,
  DocumentApprovalSummary,
  MaintenanceBacklogSummary,
  MessageRow,
  RentCollectionSummary,
  RentPaymentRow,
  VisitorApprovalSummary,
} from "../../lib/types"

const rentSummary: RentCollectionSummary = {
  totalDue: 12000,
  totalCollected: 9800,
  outstanding: 2200,
  overdueCount: 1,
  collectionRate: 0.82,
}

const maintenanceSummary: MaintenanceBacklogSummary = {
  totalOpen: 6,
  byPriority: { urgent: 2, high: 3, medium: 1 },
}

const visitorSummary: VisitorApprovalSummary = {
  pendingCount: 3,
  upcomingVisits: 2,
}

const documentSummary: DocumentApprovalSummary = {
  pendingCount: 4,
  overdueCount: 1,
}

const bookings: BookingRow[] = [
  {
    id: "1",
    building_id: "bldg-1",
    amenity_id: "conf-room",
    tenant_id: "tenant-1",
    starts_at: addDays(new Date(), 1).toISOString(),
    ends_at: addDays(new Date(), 1).toISOString(),
    status: "confirmed" as const,
    created_at: new Date().toISOString(),
    updated_at: null,
    title: "Conference room",
    notes: null,
    amenities: { name: "Conference room" },
  },
]

const payments: RentPaymentRow[] = [
  {
    id: "1",
    building_id: "bldg-1",
    amount_due: 2400,
    amount_paid: 2400,
    due_date: new Date().toISOString(),
    paid_at: new Date().toISOString(),
    status: "paid",
    lease_id: null,
    tenant_id: "tenant-1",
    unit_id: "2B",
    created_at: new Date().toISOString(),
    updated_at: null,
  },
]

const messages: MessageRow[] = [
  {
    id: "1",
    building_id: "bldg-1",
    thread_id: "general",
    author_id: "manager-1",
    body: "The elevator repair has been scheduled for Friday at 9am.",
    created_at: new Date().toISOString(),
    visibility: "public",
    threads: { title: "Announcements" },
  },
]

export default {
  title: "Dashboard/Widgets",
}

export const RentCollectionManagerView = () => (
  <RentCollectionCard
    summary={rentSummary}
    role="property_manager"
    canView
    buildingName="Maple Court"
  />
)

export const RentCollectionHidden = () => (
  <RentCollectionCard
    summary={rentSummary}
    role="resident"
    canView={false}
    buildingName="Maple Court"
  />
)

export const MaintenanceWidget = () => (
  <MaintenanceBacklogCard
    summary={maintenanceSummary}
    role="building_staff"
    canView
  />
)

export const VisitorsWidget = () => (
  <VisitorApprovalsCard summary={visitorSummary} canView />
)

export const DocumentsWidget = () => (
  <DocumentApprovalsCard summary={documentSummary} canView />
)

export const BookingsWidget = () => (
  <UpcomingBookingsCard bookings={bookings} canView />
)

export const PaymentsWidget = () => (
  <RecentPayments payments={payments} canView />
)

export const MessagingWidget = () => (
  <MessagingFeed messages={messages} canView />
)

