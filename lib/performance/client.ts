import type { DeviceProfile, PerformanceMetric } from "@/config/performance"

import {
  type BudgetReportOptions,
  type BudgetReportResult,
  reportBudgetResult,
} from "./reporting"

const CLIENT_SOURCE = "client"

const maybeSendBeacon = (result: BudgetReportResult) => {
  if (!result.exceeded || typeof navigator === "undefined") {
    return
  }

  const beaconUrl = process.env.NEXT_PUBLIC_PERFORMANCE_ALERT_URL
  if (!beaconUrl) {
    return
  }

  const payload = JSON.stringify({
    route: result.normalizedRoute,
    metric: result.metric,
    durationMs: result.duration,
    thresholdMs: result.budget?.thresholdMs ?? null,
    percentile: result.budget?.percentile ?? null,
    differenceMs: result.differenceMs ?? null,
    device: result.device,
    detail: result.detail ?? null,
    timestamp: result.timestamp,
    source: CLIENT_SOURCE,
  })

  if (typeof navigator.sendBeacon === "function") {
    navigator.sendBeacon(beaconUrl, payload)
    return
  }

  if (typeof fetch === "function") {
    fetch(beaconUrl, {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: payload,
      keepalive: true,
    }).catch(() => {})
  }
}

export interface ClientMetricOptions
  extends Omit<BudgetReportOptions, "source"> {
  device?: DeviceProfile
}

export const reportClientMetric = (
  options: ClientMetricOptions
): BudgetReportResult => {
  const result = reportBudgetResult({ ...options, source: CLIENT_SOURCE })
  maybeSendBeacon(result)
  return result
}

export const recordClientDuration = (
  route: string,
  metric: PerformanceMetric,
  duration: number,
  detail?: string,
  device?: DeviceProfile
) =>
  reportClientMetric({
    route,
    metric,
    duration,
    detail,
    device,
  })
