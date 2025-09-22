"use client"

import { useEffect } from "react"

const TTI_THRESHOLD_MS = 200

type InviteRouteMetricsProps = {
  route: string
  serverTimestamp: number
}

const sendMetrics = (payload: Record<string, unknown>) => {
  try {
    if (typeof navigator !== "undefined" && "sendBeacon" in navigator) {
      const blob = new Blob([JSON.stringify(payload)], { type: "application/json" })
      navigator.sendBeacon("/api/metrics", blob)
      return
    }

    void fetch("/api/metrics", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify(payload),
      keepalive: true,
    })
  } catch (error) {
    console.warn("Failed to record invite metrics", error)
  }
}

const computeNavigationStart = (): number => {
  if (typeof performance === "undefined") {
    return Date.now()
  }

  if (performance.timeOrigin) {
    return performance.timeOrigin
  }

  const timing = (performance as Performance & { timing?: PerformanceTiming }).timing
  return timing?.navigationStart ?? Date.now()
}

export function InviteRouteMetrics({ route, serverTimestamp }: InviteRouteMetricsProps) {
  useEffect(() => {
    const navigationStart = computeNavigationStart()

    const recordMetric = () => {
      const tti = performance.now()
      const metricPayload = {
        route,
        metric: "tti",
        value: Math.round(tti),
        navigationStart,
        serverTimestamp,
        threshold: TTI_THRESHOLD_MS,
      }

      if (tti > TTI_THRESHOLD_MS) {
        console.warn(`Invite redemption TTI exceeded threshold: ${tti.toFixed(0)}ms`)
      } else {
        console.info(`Invite redemption TTI: ${tti.toFixed(0)}ms`)
      }

      sendMetrics(metricPayload)
    }

    if ("requestIdleCallback" in window) {
      ;(window as typeof window & { requestIdleCallback: (cb: IdleRequestCallback) => number }).requestIdleCallback(
        () => recordMetric()
      )
    } else {
      const timeout = window.setTimeout(recordMetric, 0)
      return () => window.clearTimeout(timeout)
    }

    return undefined
  }, [route, serverTimestamp])

  return null
}
