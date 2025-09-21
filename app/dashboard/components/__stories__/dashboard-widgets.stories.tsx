import { BuildingAnalyticsChart } from "@/app/dashboard/components/building-analytics-chart"
import { DocumentApprovalsCard } from "@/app/dashboard/components/document-approvals-card"
import { MaintenanceBacklogCard } from "@/app/dashboard/components/maintenance-backlog-card"
import { MessageCenterCard } from "@/app/dashboard/components/message-center-card"
import { RentCollectionCard } from "@/app/dashboard/components/rent-collection-card"
import { UpcomingBookingsCard } from "@/app/dashboard/components/upcoming-bookings-card"
import { VisitorApprovalsCard } from "@/app/dashboard/components/visitor-approvals-card"
import type {
  AmenityBookingSummary,
  BuildingAnalytics,
  DocumentApproval,
  MaintenanceQueue,
  MessageAlert,
  RentCollectionSummary,
  VisitorApproval,
} from "@/app/dashboard/lib/data-sources"

const meta = {
  title: "Dashboard/Widgets",
}

export default meta

const rentSummary: RentCollectionSummary = {
  buildingId: "building-1",
  totalDue: 4200,
  totalCollected: 3000,
  delinquentCount: 1,
  autopayCount: 2,
  breakdown: {
    paid: 3000,
    pending: 900,
    overdue: 300,
  },
  upcoming: [
    {
      id: "pay-1",
      residentName: "Alex Johnson",
      amount: 900,
      dueDate: new Date().toISOString(),
      status: "pending",
    },
    {
      id: "pay-2",
      residentName: "Sky Patel",
      amount: 300,
      dueDate: new Date(Date.now() + 86400000).toISOString(),
      status: "overdue",
    },
  ],
}

const maintenanceQueue: MaintenanceQueue = {
  buildingId: "building-1",
  metrics: {
    totalOpen: 3,
    highPriority: 1,
    awaitingAssignment: 2,
  },
  requests: [
    {
      id: "m1",
      title: "HVAC outage",
      priority: "high",
      status: "open",
      submittedAt: new Date().toISOString(),
      assignedTo: null,
    },
    {
      id: "m2",
      title: "Door hinge repair",
      priority: "medium",
      status: "in_progress",
      submittedAt: new Date(Date.now() - 3600 * 1000).toISOString(),
      assignedTo: "Morgan",
    },
  ],
}

const bookings: AmenityBookingSummary[] = [
  {
    id: "b1",
    amenityName: "Rooftop",
    startTime: new Date(Date.now() + 7200 * 1000).toISOString(),
    endTime: new Date(Date.now() + 10800 * 1000).toISOString(),
    status: "scheduled",
    residentName: "Logan",
  },
]

const visitors: VisitorApproval[] = [
  {
    id: "v1",
    visitorName: "Jamie Rivera",
    hostName: "Alex Johnson",
    arrivalDate: new Date(Date.now() + 3 * 86400000).toISOString(),
    notes: "Family visit",
    approvalStatus: "pending",
  },
]

const documents: DocumentApproval[] = [
  {
    id: "d1",
    documentTitle: "Lease 2024",
    residentName: "Kendall",
    status: "pending",
    submittedAt: new Date(Date.now() - 2 * 86400000).toISOString(),
  },
]

const messages: MessageAlert[] = [
  {
    id: "thread-1",
    subject: "Noise complaint",
    lastActivityAt: new Date().toISOString(),
    unresolved: true,
    unreadCount: 3,
  },
  {
    id: "thread-2",
    subject: "Laundry schedule",
    lastActivityAt: new Date(Date.now() - 3600 * 1000).toISOString(),
    unresolved: false,
    unreadCount: 0,
  },
]

const analytics: BuildingAnalytics = {
  buildingId: "building-1",
  rentCollectionByMonth: [
    { month: "2024-01", collected: 3200, outstanding: 800 },
    { month: "2024-02", collected: 4100, outstanding: 200 },
  ],
  amenityBookingsByAmenity: [
    { amenity: "Gym", count: 12 },
    { amenity: "Rooftop", count: 6 },
  ],
  maintenanceByPriority: {
    high: 2,
    medium: 3,
    low: 1,
  },
}

export const RentCollection = () => <RentCollectionCard summary={rentSummary} />

export const MaintenanceBacklog = () => <MaintenanceBacklogCard queue={maintenanceQueue} />

export const UpcomingBookings = () => <UpcomingBookingsCard bookings={bookings} />

export const VisitorApprovals = () => <VisitorApprovalsCard approvals={visitors} />

export const DocumentApprovals = () => <DocumentApprovalsCard approvals={documents} />

export const MessageCenter = () => <MessageCenterCard threads={messages} />

export const BuildingAnalyticsWidget = () => <BuildingAnalyticsChart analytics={analytics} />
