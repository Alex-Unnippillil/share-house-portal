import {
  EscalationInstructions,
  EscalationPolicy,
  GuardrailSeverity,
  MetricThreshold,
  ThresholdConfig,
} from "./types"

const MINUTE_IN_MS = 60_000
const GIB = 1024 ** 3

export const DEFAULT_THRESHOLD_CONFIG: ThresholdConfig = {
  runtimeMs: {
    warn: 2 * MINUTE_IN_MS,
    critical: 5 * MINUTE_IN_MS,
  },
  bytesScanned: {
    warn: 50 * GIB,
    critical: 200 * GIB,
  },
}

export const DEFAULT_ESCALATION_POLICY: EscalationPolicy = {
  warn: {
    notify: ["#analytics-notifications"],
    instructions:
      "Acknowledge in Slack and add a note in the warehouse ops log within 1 hour.",
  },
  critical: {
    notify: ["#analytics-incidents", "pagerduty:analytics-oncall"],
    instructions:
      "Page the analytics on-call immediately, open an incident in Incident.io, and escalate to the data engineering lead if unresolved after 15 minutes.",
  },
}

export type ThresholdOverrides = Partial<{
  runtimeMs: Partial<MetricThreshold>
  bytesScanned: Partial<MetricThreshold>
}>

export const severityRank: Record<GuardrailSeverity, number> = {
  warn: 1,
  critical: 2,
}

export const resolveThresholdConfig = (
  overrides?: ThresholdOverrides,
): ThresholdConfig => ({
  runtimeMs: {
    ...DEFAULT_THRESHOLD_CONFIG.runtimeMs,
    ...overrides?.runtimeMs,
  },
  bytesScanned: {
    ...DEFAULT_THRESHOLD_CONFIG.bytesScanned,
    ...overrides?.bytesScanned,
  },
})

export const resolveEscalation = (
  severity: keyof EscalationPolicy,
  policy: EscalationPolicy = DEFAULT_ESCALATION_POLICY,
): EscalationInstructions => policy[severity]
