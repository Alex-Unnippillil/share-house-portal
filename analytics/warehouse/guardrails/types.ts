export type GuardrailSeverity = "warn" | "critical"

export type GuardrailMetric = "runtimeMs" | "bytesScanned"

export interface MetricThreshold {
  warn: number
  critical: number
}

export interface ThresholdConfig {
  runtimeMs: MetricThreshold
  bytesScanned: MetricThreshold
}

export interface QueryExecutionEvent {
  queryId: string
  sql: string
  warehouse: string
  runtimeMs: number
  bytesScanned: number
  triggeredBy: string
  project?: string
  dataset?: string
  startedAt: Date
}

export interface GuardrailViolation {
  metric: GuardrailMetric
  severity: GuardrailSeverity
  limit: number
  actual: number
  description: string
}

export interface EscalationInstructions {
  notify: string[]
  instructions: string
}

export interface EscalationPolicy {
  warn: EscalationInstructions
  critical: EscalationInstructions
}

export interface GuardrailAlert {
  severity: GuardrailSeverity
  summary: string
  details: string
  query: QueryExecutionEvent
  violations: GuardrailViolation[]
  escalation: EscalationInstructions
}

export interface AlertDispatcher {
  deliver(alert: GuardrailAlert): Promise<void>
}

export interface MonitorResult {
  triggered: boolean
  alert?: GuardrailAlert
  violations: GuardrailViolation[]
}
