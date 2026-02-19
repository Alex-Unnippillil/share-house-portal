import "server-only"

import type {
  DashboardMetric,
  DocumentSummary,
  FloorplanAnnotation,
  FloorplanRoommate,
  FloorplanWorkspace,
  MaintenanceTicket,
  QuickAction,
  RentSummary,
  RoommateUpdate,
  UpcomingBooking,
  WelcomeMessage,
} from "./types"

async function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export async function fetchMockWelcomeMessage(): Promise<WelcomeMessage> {
  await wait(120)
  return {
    title: "Welcome back, Jordan",
    subtitle: "Here’s what’s happening with Unit 3B today.",
    primaryAction: {
      href: "/payments",
      label: "Settle rent",
    },
    secondaryAction: {
      href: "/schedule",
      label: "Book an amenity",
    },
  }
}

export async function fetchMockRentSummary(): Promise<RentSummary> {
  await wait(240)
  return {
    amount: 1260,
    dueDate: "2024-08-01",
    autopayEnabled: true,
    balance: 0,
    lastPaymentDate: "2024-07-01",
    status: "due_soon",
  }
}

export async function fetchMockRecentDocuments(): Promise<DocumentSummary[]> {
  await wait(180)
  return [
    {
      name: "Lease agreement v2.pdf",
      href: "/documents",
      category: "Lease",
      status: "viewed",
      updatedAt: "2024-06-15",
    },
    {
      name: "House rules.pdf",
      href: "/documents",
      category: "Policies",
      status: "new",
      updatedAt: "2024-07-10",
    },
    {
      name: "September chore rotation.pdf",
      href: "/documents",
      category: "Chores",
      status: "action_required",
      updatedAt: "2024-07-22",
    },
  ]
}

export async function fetchMockRoommateUpdates(): Promise<RoommateUpdate[]> {
  await wait(320)
  const now = new Date()
  return [
    {
      id: "1",
      author: "Jordan",
      message: "Wi-Fi was down earlier — rebooted the router and it’s stable again.",
      timestamp: new Date(now.getTime() - 1000 * 60 * 45).toISOString(),
      topic: "maintenance",
    },
    {
      id: "2",
      author: "Avery",
      message: "Can we swap parking spots this weekend while my guests visit?",
      timestamp: new Date(now.getTime() - 1000 * 60 * 60 * 5).toISOString(),
      topic: "logistics",
    },
    {
      id: "3",
      author: "Property manager",
      message: "Reminder: fire alarm inspection on Thursday at 10:00 AM.",
      timestamp: new Date(now.getTime() - 1000 * 60 * 60 * 24).toISOString(),
      topic: "announcement",
    },
  ]
}

export async function fetchMockDashboardMetrics(): Promise<DashboardMetric[]> {
  await wait(160)
  return [
    {
      id: "rent",
      label: "This month’s rent",
      value: "$1,260",
      helperText: "Due in 5 days",
      trend: { direction: "neutral", label: "Autopay scheduled" },
      icon: "rent",
    },
    {
      id: "calendar",
      label: "Upcoming bookings",
      value: "3",
      helperText: "Kitchen, TV room & parking",
      trend: { direction: "up", label: "+1 vs last week" },
      icon: "calendar",
    },
    {
      id: "roommates",
      label: "Roommate updates",
      value: "4",
      helperText: "New notes in the last 24h",
      trend: { direction: "up", label: "Active thread" },
      icon: "roommates",
    },
    {
      id: "maintenance",
      label: "Open maintenance",
      value: "2",
      helperText: "Both scheduled for this week",
      trend: { direction: "down", label: "No overdue items" },
      icon: "maintenance",
    },
  ]
}

export async function fetchMockQuickActions(): Promise<QuickAction[]> {
  await wait(140)
  return [
    {
      id: "payments",
      label: "Record a payment",
      description: "Log an off-platform rent payment",
      href: "/payments",
    },
    {
      id: "amenity",
      label: "Reserve an amenity",
      description: "Kitchen, TV room, parking & more",
      href: "/schedule",
    },
    {
      id: "visitor",
      label: "Register a visitor",
      description: "Stay compliant with overnight policy",
      href: "/visitors",
    },
  ]
}

export async function fetchMockUpcomingBookings(): Promise<UpcomingBooking[]> {
  await wait(200)
  return [
    {
      id: "booking-1",
      amenity: "Kitchen",
      date: "2024-07-26",
      timeframe: "5:00 – 7:00 PM",
      status: "confirmed",
    },
    {
      id: "booking-2",
      amenity: "Parking spot",
      date: "2024-07-27",
      timeframe: "All day",
      status: "pending",
    },
    {
      id: "booking-3",
      amenity: "PlayStation nook",
      date: "2024-07-28",
      timeframe: "8:00 – 10:00 PM",
      status: "confirmed",
    },
  ]
}

export async function fetchMockMaintenanceTickets(): Promise<MaintenanceTicket[]> {
  await wait(220)
  return [
    {
      id: "maintenance-1",
      title: "Washer door latch replacement",
      status: "scheduled",
      priority: "medium",
      updatedAt: "2024-07-22T14:30:00.000Z",
    },
    {
      id: "maintenance-2",
      title: "HVAC seasonal tune-up",
      status: "in_progress",
      priority: "high",
      updatedAt: "2024-07-21T09:00:00.000Z",
    },
  ]
}

export async function fetchMockFloorplanWorkspace(): Promise<FloorplanWorkspace> {
  await wait(180)

  const roommates: FloorplanRoommate[] = [
    { id: "u-1", name: "Jordan", role: "tenant" },
    { id: "u-2", name: "Avery", role: "roommate" },
    { id: "u-3", name: "Kai", role: "roommate" },
    { id: "u-4", name: "Morgan", role: "property_manager" },
  ]

  const annotations: FloorplanAnnotation[] = [
    {
      id: "ann-1",
      markerType: "room",
      label: "Bedroom A",
      note: "Quiet hours after 10PM.",
      x: 22,
      y: 28,
      createdBy: "u-4",
      visibilityScope: "all_roommates",
      visibleToUserIds: [],
      version: 3,
      updatedAt: "2024-07-18T09:00:00.000Z",
    },
    {
      id: "ann-2",
      markerType: "storage",
      label: "Storage shelf 2",
      note: "Assigned to Avery until September",
      x: 68,
      y: 40,
      createdBy: "u-1",
      visibilityScope: "selected_roommates",
      visibleToUserIds: ["u-1", "u-2"],
      version: 2,
      updatedAt: "2024-07-20T16:10:00.000Z",
    },
    {
      id: "ann-3",
      markerType: "chore",
      label: "Vacuum living room",
      note: "Wednesday rotation",
      x: 46,
      y: 66,
      createdBy: "u-2",
      visibilityScope: "all_roommates",
      visibleToUserIds: [],
      version: 1,
      updatedAt: "2024-07-21T11:12:00.000Z",
    },
  ]

  return {
    floorplanId: "floorplan-unit-3b",
    floorplanName: "Unit 3B - Layout",
    propertyId: "property-maple-grove",
    unitId: "unit-3b",
    currentVersion: 7,
    currentUserId: "u-2",
    currentUserRole: "roommate",
    roommates,
    annotations,
    annotationHistory: [
      {
        id: "hist-1",
        annotationId: "ann-2",
        action: "created",
        version: 1,
        changedBy: "u-1",
        changedAt: "2024-07-18T14:10:00.000Z",
        snapshot: {
          ...annotations[1],
          note: "Assigned to Avery",
          version: 1,
        },
      },
      {
        id: "hist-2",
        annotationId: "ann-2",
        action: "updated",
        version: 2,
        changedBy: "u-1",
        changedAt: "2024-07-20T16:10:00.000Z",
        snapshot: annotations[1],
      },
      {
        id: "hist-3",
        annotationId: "ann-1",
        action: "updated",
        version: 3,
        changedBy: "u-4",
        changedAt: "2024-07-18T09:00:00.000Z",
        snapshot: annotations[0],
      },
    ],
    svgMarkup: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Unit 3B floorplan">
      <rect x="2" y="2" width="96" height="96" fill="#f8fafc" stroke="#cbd5e1" stroke-width="1.5" rx="2"/>
      <rect x="8" y="8" width="36" height="30" fill="#e2e8f0" stroke="#94a3b8"/>
      <text x="26" y="24" font-size="4" text-anchor="middle" fill="#334155">Bedroom A</text>
      <rect x="54" y="8" width="38" height="26" fill="#e2e8f0" stroke="#94a3b8"/>
      <text x="73" y="22" font-size="4" text-anchor="middle" fill="#334155">Bedroom B</text>
      <rect x="8" y="46" width="56" height="42" fill="#dbeafe" stroke="#93c5fd"/>
      <text x="36" y="67" font-size="4" text-anchor="middle" fill="#1e40af">Living + Kitchen</text>
      <rect x="68" y="46" width="24" height="18" fill="#ede9fe" stroke="#a78bfa"/>
      <text x="80" y="57" font-size="3.5" text-anchor="middle" fill="#5b21b6">Storage</text>
      <rect x="68" y="70" width="24" height="18" fill="#dcfce7" stroke="#86efac"/>
      <text x="80" y="81" font-size="3.5" text-anchor="middle" fill="#166534">Bath</text>
    </svg>`,
  }
}
