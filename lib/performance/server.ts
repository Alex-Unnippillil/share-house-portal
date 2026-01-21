import { performance } from "node:perf_hooks"

import type { DeviceProfile, PerformanceMetric } from "@/config/performance"

import {
  type BudgetReportOptions,
  type BudgetReportResult,
  reportBudgetResult,
} from "./reporting"

const SERVER_SOURCE = "server"

const maybeSendAlert = async (result: BudgetReportResult) => {
  if (!result.exceeded) {
    return
  }

  const webhookUrl = process.env.PERFORMANCE_ALERT_WEBHOOK_URL
  if (!webhookUrl || typeof fetch !== "function") {
    return
  }

  try {
    await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        route: result.normalizedRoute,
        metric: result.metric,
        durationMs: result.duration,
        thresholdMs: result.budget?.thresholdMs ?? null,
        percentile: result.budget?.percentile ?? null,
        differenceMs: result.differenceMs ?? null,
        device: result.device,
        detail: result.detail ?? null,
        timestamp: result.timestamp,
        source: SERVER_SOURCE,
      }),
      keepalive: true,
    })
  } catch (error) {
    console.error("[performance] Failed to send performance alert", error)
  }
}

export interface MeasureOptions {
  route: string
  detail?: string
  device?: DeviceProfile
  metric?: PerformanceMetric
  silent?: boolean
  alertOnExceed?: boolean
}

export const reportServerMetric = (
  options: Omit<BudgetReportOptions, "source">,
  config?: { alertOnExceed?: boolean }
): BudgetReportResult => {
  const result = reportBudgetResult({ ...options, source: SERVER_SOURCE })
  if (config?.alertOnExceed !== false) {
    void maybeSendAlert(result)
  }
  return result
}

export const measureDataFetch = async <T>(
  options: MeasureOptions,
  task: () => Promise<T>
): Promise<T> => {
  const metric = options.metric ?? "dataFetch"
  const start = performance.now()

  try {
    return await task()
  } finally {
    const duration = performance.now() - start
    reportServerMetric(
      {
        route: options.route,
        metric,
        duration,
        detail: options.detail,
        device: options.device,
        silent: options.silent,
      },
      { alertOnExceed: options.alertOnExceed }
    )
  }
}
