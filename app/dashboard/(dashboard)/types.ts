import type { AppRole } from "@/lib/roles"

export type WelcomeMessage = {
  title: string
  subtitle: string
  primaryAction: {
    href: string
    label: string
  }
  secondaryAction?: {
    href: string
    label: string
  }
}

export type RentSummary = {
  amount: number
  dueDate: string
  autopayEnabled: boolean
  balance: number
  lastPaymentDate: string
  status: "due_soon" | "overdue" | "paid"
}

export type DocumentSummary = {
  name: string
  href: string
  category: string
  status: "action_required" | "viewed" | "new"
  updatedAt: string
}

export type RoommateUpdate = {
  id: string
  author: string
  message: string
  timestamp: string
  topic: "maintenance" | "announcement" | "logistics"
}

export type DashboardMetric = {
  id: string
  label: string
  value: string
  helperText: string
  trend: {
    direction: "up" | "down" | "neutral"
    label: string
  }
  icon: "rent" | "calendar" | "roommates" | "maintenance"
}

export type QuickAction = {
  id: string
  label: string
  description: string
  href: string
}

export type UpcomingBooking = {
  id: string
  amenity: string
  date: string
  timeframe: string
  status: "confirmed" | "pending" | "waitlisted"
}

export type MaintenanceTicket = {
  id: string
  title: string
  status: "scheduled" | "in_progress" | "awaiting_vendor"
  priority: "low" | "medium" | "high"
  updatedAt: string
}

export type FloorplanRoommate = {
  id: string
  name: string
  role: AppRole
}

export type FloorplanAnnotation = {
  id: string
  markerType: "room" | "storage" | "chore"
  label: string
  note: string | null
  x: number
  y: number
  createdBy: string
  visibilityScope: "all_roommates" | "selected_roommates" | "private"
  visibleToUserIds: string[]
  version: number
  updatedAt: string
}

export type FloorplanAnnotationVersion = {
  id: string
  annotationId: string
  action: "created" | "updated" | "deleted" | "rollback"
  version: number
  changedBy: string
  changedAt: string
  snapshot: FloorplanAnnotation
}

export type FloorplanWorkspace = {
  floorplanId: string
  floorplanName: string
  propertyId: string
  unitId: string
  svgMarkup: string
  currentVersion: number
  currentUserId: string
  currentUserRole: AppRole
  roommates: FloorplanRoommate[]
  annotations: FloorplanAnnotation[]
  annotationHistory: FloorplanAnnotationVersion[]
}
