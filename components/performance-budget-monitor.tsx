"use client"

import { useEffect, useRef } from "react"

import { usePathname } from "next/navigation"

import { DEFAULT_DEVICE } from "@/config/performance"
import { recordClientDuration } from "@/lib/performance/client"

const ROUTE_START_EVENT = "roomsily:performance-route-start"

const getLatestNavigationStart = (): number | undefined => {
  if (typeof performance === "undefined") {
    return undefined
  }

  const entries = performance.getEntriesByType("navigation")
  if (entries.length === 0) {
    return undefined
  }

  const latest = entries[entries.length - 1] as PerformanceNavigationTiming | undefined
  return latest?.startTime
}

const now = () => (typeof performance !== "undefined" ? performance.now() : 0)

const scheduleIdle = (callback: () => void) => {
  const idleCallback = (window as typeof window & { requestIdleCallback?: any })
    .requestIdleCallback as
    | ((handler: IdleRequestCallback, options?: IdleRequestOptions) => number)
    | undefined

  if (typeof idleCallback === "function") {
    const handle = idleCallback(callback, { timeout: 3000 })
    return () => {
      const cancelIdle = (window as typeof window & { cancelIdleCallback?: any })
        .cancelIdleCallback as ((handle: number) => void) | undefined
      if (typeof cancelIdle === "function") {
        cancelIdle(handle)
      }
    }
  }

  const timeout = window.setTimeout(callback, 3000)
  return () => window.clearTimeout(timeout)
}

export const PerformanceBudgetMonitor = () => {
  const pathname = usePathname()
  const navigationStartRef = useRef<number | undefined>(getLatestNavigationStart())
  const activeRunRef = useRef<string | null>(null)

  useEffect(() => {
    if (typeof window === "undefined") {
      return
    }

    const dispatchRouteStart = (target?: string | URL | null, force = false) => {
      if (typeof window === "undefined") return

      let resolvedHref: string | undefined

      if (target instanceof URL) {
        resolvedHref = target.href
      } else if (typeof target === "string" && target.length > 0) {
        try {
          resolvedHref = new URL(target, window.location.href).href
        } catch {
          resolvedHref = target
        }
      }

      if (!force && resolvedHref && resolvedHref === window.location.href) {
        return
      }

      const timestamp = now()
      window.dispatchEvent(
        new CustomEvent(ROUTE_START_EVENT, {
          detail: { timestamp },
        })
      )
    }

    const originalPushState = history.pushState
    const originalReplaceState = history.replaceState

    history.pushState = function pushState(...args) {
      dispatchRouteStart(args[2])
      return originalPushState.apply(this, args as Parameters<typeof originalPushState>)
    }

    history.replaceState = function replaceState(...args) {
      dispatchRouteStart(args[2])
      return originalReplaceState.apply(this, args as Parameters<typeof originalReplaceState>)
    }

    const handlePopState = () => dispatchRouteStart(window.location.href, true)
    window.addEventListener("popstate", handlePopState)

    return () => {
      history.pushState = originalPushState
      history.replaceState = originalReplaceState
      window.removeEventListener("popstate", handlePopState)
    }
  }, [])

  useEffect(() => {
    if (typeof window === "undefined") {
      return
    }

    const handleRouteStart = (event: Event) => {
      const custom = event as CustomEvent<{ timestamp?: number }>
      const timestamp = custom.detail?.timestamp
      navigationStartRef.current = typeof timestamp === "number" ? timestamp : now()
    }

    window.addEventListener(ROUTE_START_EVENT, handleRouteStart)

    if (navigationStartRef.current === undefined) {
      navigationStartRef.current = getLatestNavigationStart() ?? 0
    }

    return () => {
      window.removeEventListener(ROUTE_START_EVENT, handleRouteStart)
    }
  }, [])

  useEffect(() => {
    if (!pathname || typeof window === "undefined" || typeof performance === "undefined") {
      return
    }

    const navigationStart = navigationStartRef.current ?? getLatestNavigationStart() ?? 0
    const runKey = `${pathname}:${navigationStart}`
    activeRunRef.current = runKey
    let lastLongTaskEnd = navigationStart

    let observer: PerformanceObserver | null = null
    if (typeof PerformanceObserver !== "undefined") {
      try {
        observer = new PerformanceObserver((entryList) => {
          for (const entry of entryList.getEntries()) {
            const candidate = entry.startTime + entry.duration
            if (candidate > lastLongTaskEnd) {
              lastLongTaskEnd = candidate
            }
          }
        })
        observer.observe({ type: "longtask", buffered: true })
      } catch (error) {
        observer = null
      }
    }

    const finalize = () => {
      if (activeRunRef.current !== runKey) {
        return
      }

      const end = Math.max(lastLongTaskEnd, now())
      const duration = end - navigationStart
      recordClientDuration(pathname, "tti", duration, "time-to-interactive", DEFAULT_DEVICE)
      activeRunRef.current = null
    }

    const cancelIdle = scheduleIdle(finalize)

    return () => {
      activeRunRef.current = null
      if (observer) {
        observer.disconnect()
      }
      cancelIdle()
    }
  }, [pathname])

  return null
}
