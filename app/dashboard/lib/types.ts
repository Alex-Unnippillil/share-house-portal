import type { Database } from "@/lib/supabase"

export type BuildingRole =
  | "platform_admin"
  | "property_manager"
  | "building_staff"
  | "support_agent"
  | "resident"

export type BuildingAccess = {
  id: string
  name: string
  role: BuildingRole
}

export type RentPaymentRow = Database["public"]["Tables"]["rent_payments"]["Row"]
export type BookingRow = Database["public"]["Tables"]["bookings"]["Row"] & {
  amenities?: { name: string | null } | null
}
export type MaintenanceRequestRow =
  Database["public"]["Tables"]["maintenance_requests"]["Row"]
export type VisitorLogRow = Database["public"]["Tables"]["visitor_logs"]["Row"]
export type DocumentApprovalRow =
  Database["public"]["Tables"]["document_approvals"]["Row"]
export type MessageRow = Database["public"]["Tables"]["messages"]["Row"] & {
  threads?: { title: string | null } | null
}

export type RentCollectionSummary = {
  totalDue: number
  totalCollected: number
  outstanding: number
  overdueCount: number
  collectionRate: number
}

export type MonthlyCollectionPoint = {
  month: string
  collected: number
}

export type MaintenanceBacklogSummary = {
  totalOpen: number
  byPriority: Record<string, number>
}

export type VisitorApprovalSummary = {
  pendingCount: number
  upcomingVisits: number
}

export type DocumentApprovalSummary = {
  pendingCount: number
  overdueCount: number
}

export type DashboardWidget =
  | "rent"
  | "bookings"
  | "maintenance"
  | "visitors"
  | "documents"
  | "messages"
  | "analytics"

export type DashboardData = {
  rentPayments: RentPaymentRow[]
  bookings: BookingRow[]
  maintenance: MaintenanceRequestRow[]
  visitors: VisitorLogRow[]
  documents: DocumentApprovalRow[]
  messages: MessageRow[]
}

