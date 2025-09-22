import type { IncidentSeverity } from "./types"

export const severityBadgeStyles: Record<IncidentSeverity, string> = {
  low: "bg-emerald-100 text-emerald-900 dark:bg-emerald-500/10 dark:text-emerald-300",
  medium: "bg-amber-100 text-amber-900 dark:bg-amber-500/10 dark:text-amber-300",
  high: "bg-orange-100 text-orange-900 dark:bg-orange-500/10 dark:text-orange-300",
  critical: "bg-red-100 text-red-900 dark:bg-red-500/10 dark:text-red-300",
}

export function humanizeLabel(value: string) {
  return value.replace(/_/g, " ")
}
