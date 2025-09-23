"use client"

import * as React from "react"
import {
  usePathname,
  useRouter,
  useSearchParams,
} from "next/navigation"
import NProgress from "nprogress"

const MAX_PROGRESS = 0.95
const ANNOUNCE_DELAY = 50
const TRICKLE_INTERVAL = 250

const ACTION_LABELS: Record<string, string> = {
  back: "previous page",
  forward: "next page",
  refresh: "current page",
}

type RouterAction = "push" | "replace" | "back" | "forward" | "refresh"

type ProgressWithStatus = typeof NProgress & { status?: number | null }

const getStatus = (instance: ProgressWithStatus) => instance.status ?? 0

export function NavigationProgress() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const searchKey = searchParams?.toString() ?? ""

  const isInitialRenderRef = React.useRef(true)
  const isNavigatingRef = React.useRef(false)
  const pendingDestinationRef = React.useRef<string | null>(null)
  const announceTimeoutRef = React.useRef<number | null>(null)
  const trickleTimerRef = React.useRef<number | null>(null)
  const liveRegionRef = React.useRef<HTMLDivElement | null>(null)

  const clearAnnouncement = React.useCallback(() => {
    if (announceTimeoutRef.current) {
      window.clearTimeout(announceTimeoutRef.current)
      announceTimeoutRef.current = null
    }
  }, [])

  const announce = React.useCallback(
    (message: string) => {
      const region = liveRegionRef.current
      if (!region) {
        return
      }

      clearAnnouncement()
      region.textContent = ""

      if (typeof window === "undefined") {
        region.textContent = message
        return
      }

      announceTimeoutRef.current = window.setTimeout(() => {
        region.textContent = message
        announceTimeoutRef.current = null
      }, ANNOUNCE_DELAY)
    },
    [clearAnnouncement]
  )

  const clearTrickle = React.useCallback(() => {
    if (trickleTimerRef.current) {
      window.clearInterval(trickleTimerRef.current)
      trickleTimerRef.current = null
    }
  }, [])

  const scheduleTrickle = React.useCallback(() => {
    if (typeof window === "undefined") {
      return
    }

    clearTrickle()

    trickleTimerRef.current = window.setInterval(() => {
      const current = getStatus(NProgress as ProgressWithStatus)
      if (current >= MAX_PROGRESS) {
        clearTrickle()
        return
      }

      const remaining = MAX_PROGRESS - current
      const increment = Math.max(remaining * 0.1, 0.01)
      NProgress.inc(increment)
    }, TRICKLE_INTERVAL)
  }, [clearTrickle])

  const formatDestination = React.useCallback((href?: string | null) => {
    if (!href) {
      return null
    }

    if (href.startsWith("http")) {
      try {
        const url = new URL(href)
        return `${url.pathname}${url.search}`
      } catch (error) {
        return href
      }
    }

    return href
  }, [])

  const startNavigation = React.useCallback(
    (action: RouterAction, href?: string) => {
      const destinationLabel =
        action === "push" || action === "replace"
          ? formatDestination(href)
          : ACTION_LABELS[action]

      if (destinationLabel) {
        pendingDestinationRef.current = destinationLabel
      }

      if (!isNavigatingRef.current) {
        isNavigatingRef.current = true
        NProgress.start()
        NProgress.set(0.2)
        scheduleTrickle()
      }

      announce(
        pendingDestinationRef.current
          ? `Navigating to ${pendingDestinationRef.current}`
          : "Loading new page"
      )
    },
    [announce, formatDestination, scheduleTrickle]
  )

  const finishNavigation = React.useCallback(
    (status: "complete" | "error") => {
      if (!isNavigatingRef.current && status === "complete") {
        return
      }

      isNavigatingRef.current = false
      pendingDestinationRef.current = null
      clearTrickle()

      if (status === "complete") {
        NProgress.done()
        announce("Navigation complete")
      } else {
        NProgress.remove()
        announce("Navigation failed")
      }
    },
    [announce, clearTrickle]
  )

  React.useEffect(() => {
    NProgress.configure({
      showSpinner: false,
      trickle: false,
      minimum: 0.16,
    })

    return () => {
      clearAnnouncement()
      clearTrickle()
      NProgress.remove()
    }
  }, [clearAnnouncement, clearTrickle])

  React.useEffect(() => {
    const originalPush = router.push
    const originalReplace = router.replace
    const originalBack = router.back
    const originalForward = router.forward
    const originalRefresh = router.refresh

    router.push = ((href: string, options?: Parameters<typeof originalPush>[1]) => {
      startNavigation("push", href)
      try {
        return originalPush.call(router, href, options)
      } catch (error) {
        finishNavigation("error")
        throw error
      }
    }) as typeof router.push

    router.replace = ((href: string, options?: Parameters<typeof originalReplace>[1]) => {
      startNavigation("replace", href)
      try {
        return originalReplace.call(router, href, options)
      } catch (error) {
        finishNavigation("error")
        throw error
      }
    }) as typeof router.replace

    router.back = (() => {
      startNavigation("back")
      try {
        return originalBack.call(router)
      } catch (error) {
        finishNavigation("error")
        throw error
      }
    }) as typeof router.back

    router.forward = (() => {
      startNavigation("forward")
      try {
        return originalForward.call(router)
      } catch (error) {
        finishNavigation("error")
        throw error
      }
    }) as typeof router.forward

    router.refresh = (() => {
      startNavigation("refresh")
      try {
        return originalRefresh.call(router)
      } catch (error) {
        finishNavigation("error")
        throw error
      }
    }) as typeof router.refresh

    return () => {
      router.push = originalPush
      router.replace = originalReplace
      router.back = originalBack
      router.forward = originalForward
      router.refresh = originalRefresh
    }
  }, [finishNavigation, router, startNavigation])

  React.useEffect(() => {
    if (isInitialRenderRef.current) {
      isInitialRenderRef.current = false
      return
    }

    finishNavigation("complete")
  }, [finishNavigation, pathname, searchKey])

  return (
    <div
      aria-live="polite"
      aria-atomic="true"
      role="status"
      ref={liveRegionRef}
      className="sr-only"
    />
  )
}
