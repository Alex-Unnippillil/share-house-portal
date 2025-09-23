export const SMARTLINK_MODE_EVENT = "smartlink:modechange" as const
export const SMARTLINK_MEDIAN_BUDGET = 100
export const SMARTLINK_SAMPLE_SIZE = 15

export type SmartLinkMode = "default" | "aggressive"

export interface SmartLinkNavigationStart {
  href?: string
  startedAt: number
}

export interface SmartLinkNavigationMetrics {
  durations: number[]
  median?: number
  mode: SmartLinkMode
}

export interface SmartLinkModeChangeDetail {
  median: number
  mode: SmartLinkMode
  sampleSize: number
}

declare global {
  interface Window {
    __smartlinkNavigationStart?: SmartLinkNavigationStart
    __smartlinkNavigationMetrics?: SmartLinkNavigationMetrics
  }
}

export const computeMedian = (values: readonly number[]): number => {
  if (!values.length) {
    return 0
  }

  const sorted = [...values].sort((a, b) => a - b)
  const midpoint = Math.floor(sorted.length / 2)

  if (sorted.length % 2 === 0) {
    return (sorted[midpoint - 1] + sorted[midpoint]) / 2
  }

  return sorted[midpoint]
}

export const initializeSmartLinkMetrics = (): SmartLinkNavigationMetrics => {
  if (typeof window === "undefined") {
    return { durations: [], mode: "default" }
  }

  if (!window.__smartlinkNavigationMetrics) {
    window.__smartlinkNavigationMetrics = { durations: [], mode: "default" }
  }

  return window.__smartlinkNavigationMetrics
}

export const resetNavigationStart = () => {
  if (typeof window === "undefined") {
    return
  }

  window.__smartlinkNavigationStart = undefined
}
