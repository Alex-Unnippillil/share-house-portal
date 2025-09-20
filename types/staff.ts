export type PackageStatus = "received" | "notified" | "picked_up"

export type PackageRecord = {
  id: string
  trackingNumber: string
  recipient: string
  carrier: string
  location: string
  status: PackageStatus
  receivedAt: string
  notes?: string
}

export type VisitorStatus = "expected" | "checked_in" | "checked_out"

export type VisitorRecord = {
  id: string
  name: string
  company: string
  host: string
  purpose: string
  badgeNumber: string
  status: VisitorStatus
  checkIn: string
  checkOut?: string
  contactNumber?: string
  notes?: string
}

export type WorkOrderStatus = "new" | "in_progress" | "completed"

export type WorkOrder = {
  id: string
  title: string
  requestedBy: string
  unit: string
  priority: "low" | "medium" | "high"
  category: "maintenance" | "cleaning" | "security" | "other"
  status: WorkOrderStatus
  updatedAt: string
  dueDate?: string
  details?: string
}

export type ShiftLogEntry = {
  id: string
  author: string
  role: string
  timestamp: string
  type: "handover" | "note" | "alert"
  summary: string
  followUp?: string
}

export type IncidentSeverity = "minor" | "major" | "critical"

export type IncidentReport = {
  id: string
  title: string
  occurredAt: string
  reportedBy: string
  location: string
  severity: IncidentSeverity
  description: string
  actionsTaken: string
  witnesses?: string
  attachments?: string[]
}

export type TimeBreak = {
  id: string
  startedAt: string
  endedAt?: string
}

export type TimeSession = {
  id: string
  staffName: string
  role: string
  startedAt: string
  endedAt?: string
  notes?: string
  breaks: TimeBreak[]
}

export type TimeTrackingState = {
  activeSessions: TimeSession[]
  history: TimeSession[]
}

export type ChecklistState = {
  packageIntake: boolean
  visitorSignIn: boolean
  workOrderUpdated: boolean
  shiftLogUpdated: boolean
  incidentLogged: boolean
  timeTracked: boolean
}

export type StaffOperationsState = {
  version: number
  packages: PackageRecord[]
  visitors: VisitorRecord[]
  workOrders: Record<WorkOrderStatus, WorkOrder[]>
  shiftLog: ShiftLogEntry[]
  incidents: IncidentReport[]
  timeTracking: TimeTrackingState
  checklist: ChecklistState
}
