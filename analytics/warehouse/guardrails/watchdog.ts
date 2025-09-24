import { fanOutAlerts } from "./alerting"
import {
  DEFAULT_ESCALATION_POLICY,
  resolveEscalation,
  resolveThresholdConfig,
  severityRank,
  ThresholdOverrides,
} from "./config"
import { formatBytes, formatDuration } from "./formatters"
import {
  AlertDispatcher,
  EscalationPolicy,
  GuardrailAlert,
  GuardrailSeverity,
  GuardrailViolation,
  MonitorResult,
  QueryExecutionEvent,
  ThresholdConfig,
} from "./types"

const metricLabels = {
  runtimeMs: "Runtime",
  bytesScanned: "Bytes scanned",
} as const

export class QueryWatchdog {
  private readonly thresholds: ThresholdConfig
  private readonly escalationPolicy: EscalationPolicy

  constructor(options?: {
    thresholds?: ThresholdOverrides
    escalationPolicy?: EscalationPolicy
  }) {
    this.thresholds = resolveThresholdConfig(options?.thresholds)
    this.escalationPolicy = options?.escalationPolicy ?? DEFAULT_ESCALATION_POLICY
  }

  evaluate(event: QueryExecutionEvent): GuardrailViolation[] {
    const violations: GuardrailViolation[] = []

    const runtimeThreshold = this.thresholds.runtimeMs
    const runtimeSeverity = this.determineSeverity(
      event.runtimeMs,
      runtimeThreshold,
    )

    if (runtimeSeverity) {
      const limit = runtimeThreshold[runtimeSeverity]
      violations.push({
        metric: "runtimeMs",
        severity: runtimeSeverity,
        limit,
        actual: event.runtimeMs,
        description: `${metricLabels.runtimeMs} ${formatDuration(event.runtimeMs)} exceeded ${runtimeSeverity} limit of ${formatDuration(limit)}`,
      })
    }

    const bytesThreshold = this.thresholds.bytesScanned
    const bytesSeverity = this.determineSeverity(
      event.bytesScanned,
      bytesThreshold,
    )

    if (bytesSeverity) {
      const limit = bytesThreshold[bytesSeverity]
      violations.push({
        metric: "bytesScanned",
        severity: bytesSeverity,
        limit,
        actual: event.bytesScanned,
        description: `${metricLabels.bytesScanned} ${formatBytes(event.bytesScanned)} exceeded ${bytesSeverity} limit of ${formatBytes(limit)}`,
      })
    }

    return violations
  }

  async monitorQuery(
    event: QueryExecutionEvent,
    dispatchers: AlertDispatcher[],
  ): Promise<MonitorResult> {
    const violations = this.evaluate(event)

    if (!violations.length) {
      return { triggered: false, violations }
    }

    const alert = this.buildAlert(event, violations)

    if (dispatchers.length) {
      await fanOutAlerts(alert, dispatchers)
    }

    return { triggered: true, alert, violations }
  }

  private determineSeverity(
    value: number,
    threshold: { warn: number; critical: number },
  ): GuardrailSeverity | undefined {
    if (value >= threshold.critical) {
      return "critical"
    }

    if (value >= threshold.warn) {
      return "warn"
    }

    return undefined
  }

  private buildAlert(
    event: QueryExecutionEvent,
    violations: GuardrailViolation[],
  ): GuardrailAlert {
    const highestSeverity = violations.reduce<GuardrailSeverity>(
      (acc, violation) =>
        severityRank[violation.severity] > severityRank[acc]
          ? violation.severity
          : acc,
      violations[0]?.severity ?? "warn",
    )

    const escalation = resolveEscalation(highestSeverity, this.escalationPolicy)

    const summary = `${
      highestSeverity === "critical" ? "Critical" : "Warning"
    } warehouse guardrail triggered for query ${event.queryId}`

    const detailsLines = violations.map((violation) => `• ${violation.description}`)
    detailsLines.push(
      `SQL preview: ${event.sql.slice(0, 200)}${
        event.sql.length > 200 ? "…" : ""
      }`,
    )

    const details = detailsLines.join("\n")

    return {
      severity: highestSeverity,
      summary,
      details,
      query: event,
      violations,
      escalation,
    }
  }
}

export const runQueryWatchdog = async (
  event: QueryExecutionEvent,
  dispatchers: AlertDispatcher[],
  options?: {
    thresholds?: ThresholdOverrides
    escalationPolicy?: EscalationPolicy
  },
): Promise<MonitorResult> => {
  const watchdog = new QueryWatchdog(options)
  return watchdog.monitorQuery(event, dispatchers)
}
