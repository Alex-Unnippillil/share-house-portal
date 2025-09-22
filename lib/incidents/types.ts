import type { Database } from "@/lib/supabase"

export const INCIDENT_SEVERITIES = ["low", "medium", "high", "critical"] as const
export type IncidentSeverity = (typeof INCIDENT_SEVERITIES)[number]

export const INCIDENT_STATUSES = ["open", "in_progress", "resolved", "closed"] as const
export type IncidentStatus = (typeof INCIDENT_STATUSES)[number]

export type Incident = Database["public"]["Tables"]["incidents"]["Row"]
export type IncidentUpdate = Database["public"]["Tables"]["incident_updates"]["Row"]

export function isCritical(severity: IncidentSeverity) {
  return severity === "critical"
}
