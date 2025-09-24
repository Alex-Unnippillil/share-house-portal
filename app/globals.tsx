"use client"

import { useEffect, useRef } from "react"
import { usePathname } from "next/navigation"
import { onCLS, onFCP, onINP, onLCP, onTTFB } from "web-vitals"

import {
  ensureSessionId,
  getDeviceType,
  trackCoreWebVital,
} from "@/lib/analytics"

export function GlobalRUMInstrumentation() {
  const pathname = usePathname()
  const latestRouteRef = useRef(pathname ?? "/")

  useEffect(() => {
    if (pathname) {
      latestRouteRef.current = pathname
    }
  }, [pathname])

  useEffect(() => {
    if (typeof window === "undefined") {
      return
    }

    const sessionId = ensureSessionId()
    const device = getDeviceType(navigator.userAgent)

    const report = (metric: Parameters<typeof trackCoreWebVital>[0]) => {
      trackCoreWebVital(metric, {
        route: latestRouteRef.current,
        device,
        sessionId,
      })
    }

    onCLS(report, { reportAllChanges: true, reportSoftNavs: true })
    onINP(report, { reportAllChanges: true })
    onLCP(report, { reportAllChanges: true, reportSoftNavs: true })
    onFCP(report)
    onTTFB(report)
  }, [])

  return null
}

export default GlobalRUMInstrumentation
