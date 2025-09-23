"use client"

import * as React from "react"
import { usePathname } from "next/navigation"

import {
  SMARTLINK_MEDIAN_BUDGET,
  SMARTLINK_MODE_EVENT,
  SMARTLINK_SAMPLE_SIZE,
  computeMedian,
  initializeSmartLinkMetrics,
  resetNavigationStart,
  type SmartLinkModeChangeDetail,
  type SmartLinkNavigationMetrics,
} from "@/components/navigation/smart-link-metrics"

const logNavigationSample = (metrics: SmartLinkNavigationMetrics) => {
  if (process.env.NODE_ENV !== "development") {
    return
  }

  const latest = metrics.durations.at(-1)
  if (latest === undefined) {
    return
  }

  // eslint-disable-next-line no-console -- surfaced only during development to aid tuning.
  console.debug(
    `[SmartLink] navigation ${latest.toFixed(1)}ms (median ${
      metrics.median?.toFixed(1) ?? "n/a"
    }ms across ${metrics.durations.length} samples)`
  )
}

export function RouteChangeMonitor() {
  const pathname = usePathname()
  const previousPathRef = React.useRef<string | null>(pathname)
  const durationsRef = React.useRef<number[]>([])

  React.useEffect(() => {
    initializeSmartLinkMetrics()
  }, [])

  React.useEffect(() => {
    if (previousPathRef.current === pathname) {
      return
    }

    previousPathRef.current = pathname

    if (typeof window === "undefined" || typeof performance === "undefined") {
      return
    }

    const navigationStart = window.__smartlinkNavigationStart
    resetNavigationStart()

    if (!navigationStart) {
      return
    }

    const duration = performance.now() - navigationStart.startedAt

    if (!Number.isFinite(duration) || duration < 0) {
      return
    }

    durationsRef.current = [...durationsRef.current, duration].slice(-SMARTLINK_SAMPLE_SIZE)

    const median = computeMedian(durationsRef.current)

    const metrics = initializeSmartLinkMetrics()
    const nextMode = median > SMARTLINK_MEDIAN_BUDGET ? "aggressive" : "default"
    const modeChanged = metrics.mode !== nextMode
    const medianChanged = metrics.median !== median

    window.__smartlinkNavigationMetrics = {
      ...metrics,
      durations: [...durationsRef.current],
      median,
      mode: nextMode,
    }

    if (modeChanged || medianChanged) {
      const detail: SmartLinkModeChangeDetail = {
        median,
        mode: nextMode,
        sampleSize: durationsRef.current.length,
      }

      window.dispatchEvent(new CustomEvent(SMARTLINK_MODE_EVENT, { detail }))
    }

    logNavigationSample(window.__smartlinkNavigationMetrics)
  }, [pathname])

  return null
}

export default RouteChangeMonitor
