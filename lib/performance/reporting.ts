import {
  DEFAULT_DEVICE,
  getPerformanceMetricBudget,
  normalizeRoute,
  type DeviceProfile,
  type PerformanceMetric,
  type ResolvedPerformanceBudget,
} from "@/config/performance"

export interface BudgetReportOptions {
  route: string
  metric: PerformanceMetric
  duration: number
  detail?: string
  device?: DeviceProfile
  source?: "client" | "server" | string
  silent?: boolean
}

export interface BudgetReportResult {
  route: string
  normalizedRoute: string
  metric: PerformanceMetric
  duration: number
  device: DeviceProfile
  detail?: string
  source?: string
  timestamp: number
  budget?: ResolvedPerformanceBudget
  exceeded: boolean
  differenceMs?: number
}

const clampDuration = (value: number) => {
  if (!Number.isFinite(value)) {
    return 0
  }

  return value < 0 ? 0 : value
}

const formatMetric = (metric: PerformanceMetric) => metric.toUpperCase()

export const reportBudgetResult = (
  options: BudgetReportOptions
): BudgetReportResult => {
  const normalizedRoute = normalizeRoute(options.route)
  const device = options.device ?? DEFAULT_DEVICE
  const duration = clampDuration(options.duration)
  const budget = getPerformanceMetricBudget(normalizedRoute, options.metric, device)
  const exceeded = budget ? duration > budget.thresholdMs : false
  const differenceMs = budget ? Number((duration - budget.thresholdMs).toFixed(2)) : undefined
  const timestamp = Date.now()

  const prefix = `[performance]${options.source ? ` [${options.source}]` : ""}`
  const detailSuffix = options.detail ? ` – ${options.detail}` : ""
  const budgetLabel = budget
    ? `budget ${budget.thresholdMs}ms (P${budget.percentile})`
    : "no budget"
  const message = `${prefix} ${formatMetric(options.metric)} ${duration.toFixed(
    1
  )}ms on ${normalizedRoute} (${device} ${budgetLabel})${detailSuffix}`

  if (!options.silent) {
    if (exceeded) {
      console.warn(message)
    } else {
      console.info(message)
    }
  }

  return {
    route: options.route,
    normalizedRoute,
    metric: options.metric,
    duration,
    device,
    detail: options.detail,
    source: options.source,
    timestamp,
    budget,
    exceeded,
    differenceMs,
  }
}
