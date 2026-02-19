import "server-only"

import type {
  DashboardMetric,
  DocumentSummary,
  FloorplanWorkspace,
  MaintenanceTicket,
  QuickAction,
  RentSummary,
  RoommateUpdate,
  UpcomingBooking,
  WelcomeMessage,
} from "./types"

function notImplementedError(operation: string) {
  return new Error(
    `Dashboard production data source is not implemented for ${operation}. Configure DASHBOARD_DATA_SOURCE=mock until live integrations are ready.`
  )
}

export async function fetchProductionWelcomeMessage(): Promise<WelcomeMessage> {
  throw notImplementedError("welcome message")
}

export async function fetchProductionRentSummary(): Promise<RentSummary> {
  throw notImplementedError("rent summary")
}

export async function fetchProductionRecentDocuments(): Promise<DocumentSummary[]> {
  throw notImplementedError("recent documents")
}

export async function fetchProductionRoommateUpdates(): Promise<RoommateUpdate[]> {
  throw notImplementedError("roommate updates")
}

export async function fetchProductionDashboardMetrics(): Promise<DashboardMetric[]> {
  throw notImplementedError("dashboard metrics")
}

export async function fetchProductionQuickActions(): Promise<QuickAction[]> {
  throw notImplementedError("quick actions")
}

export async function fetchProductionUpcomingBookings(): Promise<UpcomingBooking[]> {
  throw notImplementedError("upcoming bookings")
}

export async function fetchProductionMaintenanceTickets(): Promise<MaintenanceTicket[]> {
  throw notImplementedError("maintenance tickets")
}

export async function fetchProductionFloorplanWorkspace(): Promise<FloorplanWorkspace> {
  throw notImplementedError("floorplan workspace")
}
