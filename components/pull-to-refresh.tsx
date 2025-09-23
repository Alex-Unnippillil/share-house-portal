"use client"

import type { PointerEvent as ReactPointerEvent, ReactNode } from "react"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"

import { cn } from "@/lib/utils"

const DEFAULT_THRESHOLD = 72
const DEFAULT_MAX_PULL = 160
const MIN_VISIBLE_DURATION = 320
const VIBRATION_DURATION = 15

interface PullToRefreshProps {
  children: ReactNode
  onRefresh: () => void | Promise<void>
  className?: string
  threshold?: number
  maxPullDistance?: number
  isRefreshing?: boolean
}

const isNavigatorVibrationSupported = (): boolean => {
  if (typeof navigator === "undefined") return false
  return typeof (navigator as Navigator & { vibrate?: unknown }).vibrate === "function"
}

const vibrate = (duration: number) => {
  if (!isNavigatorVibrationSupported()) return
  try {
    ;(navigator as Navigator & { vibrate: (pattern: number | number[]) => boolean }).vibrate(
      duration
    )
  } catch (error) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("Failed to trigger vibration", error)
    }
  }
}

const getScrollTop = () => {
  if (typeof document === "undefined") return 0
  const scrollElement =
    document.scrollingElement ?? document.documentElement ?? document.body
  return scrollElement ? scrollElement.scrollTop : 0
}

export function PullToRefresh({
  children,
  onRefresh,
  className,
  threshold = DEFAULT_THRESHOLD,
  maxPullDistance = DEFAULT_MAX_PULL,
  isRefreshing,
}: PullToRefreshProps) {
  const startYRef = useRef(0)
  const isDraggingRef = useRef(false)
  const [isDragging, setIsDragging] = useState(false)
  const [internalRefreshing, setInternalRefreshing] = useState(false)
  const [pullDistance, setPullDistance] = useState(0)
  const pullDistanceRef = useRef(0)
  const moveListenerRef = useRef<(event: PointerEvent) => void>()
  const upListenerRef = useRef<(event: PointerEvent) => void>()
  const cancelListenerRef = useRef<(event: PointerEvent) => void>()
  const refreshPromiseRef = useRef<Promise<void> | null>(null)
  const [isEnabled, setIsEnabled] = useState(false)

  const effectiveRefreshing = isRefreshing ?? internalRefreshing

  useEffect(() => {
    pullDistanceRef.current = pullDistance
  }, [pullDistance])

  const removeGlobalListeners = useCallback(() => {
    if (typeof window === "undefined") return

    if (moveListenerRef.current) {
      window.removeEventListener("pointermove", moveListenerRef.current)
      moveListenerRef.current = undefined
    }

    if (upListenerRef.current) {
      window.removeEventListener("pointerup", upListenerRef.current)
      upListenerRef.current = undefined
    }

    if (cancelListenerRef.current) {
      window.removeEventListener("pointercancel", cancelListenerRef.current)
      cancelListenerRef.current = undefined
    }
  }, [])

  useEffect(() => removeGlobalListeners, [removeGlobalListeners])

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
      return
    }

    const mediaQuery = window.matchMedia("(hover: none) and (pointer: coarse)")

    const handleChange = () => {
      setIsEnabled(mediaQuery.matches)
    }

    handleChange()

    if (typeof mediaQuery.addEventListener === "function") {
      mediaQuery.addEventListener("change", handleChange)
      return () => mediaQuery.removeEventListener("change", handleChange)
    }

    if (typeof mediaQuery.addListener === "function") {
      mediaQuery.addListener(handleChange)
      return () => mediaQuery.removeListener(handleChange)
    }

    return undefined
  }, [])

  useEffect(() => {
    if (!isEnabled && !effectiveRefreshing) {
      setPullDistance(0)
      pullDistanceRef.current = 0
    }
  }, [effectiveRefreshing, isEnabled])

  useEffect(() => {
    if (!effectiveRefreshing && !isDraggingRef.current) {
      setPullDistance(0)
      pullDistanceRef.current = 0
    }
  }, [effectiveRefreshing])

  const triggerRefresh = useCallback(async () => {
    if (refreshPromiseRef.current) {
      return refreshPromiseRef.current
    }

    if (isRefreshing === undefined) {
      setInternalRefreshing(true)
    }

    vibrate(VIBRATION_DURATION)

    const refreshPromise = (async () => {
      const start = typeof performance !== "undefined" ? performance.now() : Date.now()
      try {
        await onRefresh?.()
      } finally {
        const end = typeof performance !== "undefined" ? performance.now() : Date.now()
        const elapsed = end - start
        if (elapsed < MIN_VISIBLE_DURATION) {
          await new Promise((resolve) => setTimeout(resolve, MIN_VISIBLE_DURATION - elapsed))
        }
      }
    })()

    refreshPromiseRef.current = refreshPromise

    try {
      await refreshPromise
    } finally {
      refreshPromiseRef.current = null
      if (isRefreshing === undefined) {
        setInternalRefreshing(false)
      }
    }

    return refreshPromise
  }, [isRefreshing, onRefresh])

  const handlePointerMoveFactory = useCallback(() => {
    return (event: PointerEvent) => {
      if (!isDraggingRef.current) return

      const delta = event.clientY - startYRef.current
      if (delta <= 0) {
        setPullDistance(0)
        pullDistanceRef.current = 0
        return
      }

      if (event.cancelable) {
        event.preventDefault()
      }

      const dampened = Math.min(maxPullDistance, delta * 0.6)
      setPullDistance(dampened)
      pullDistanceRef.current = dampened
    }
  }, [maxPullDistance])

  const finishDrag = useCallback(
    async (shouldRefresh: boolean) => {
      if (!isDraggingRef.current) return

      isDraggingRef.current = false
      setIsDragging(false)

      if (shouldRefresh) {
        const settledDistance = Math.min(
          maxPullDistance,
          Math.max(threshold, pullDistanceRef.current)
        )
        setPullDistance(settledDistance)
        pullDistanceRef.current = settledDistance
        try {
          await triggerRefresh()
        } catch (error) {
          if (process.env.NODE_ENV !== "production") {
            console.error("PullToRefresh onRefresh error", error)
          }
        }
      } else {
        setPullDistance(0)
        pullDistanceRef.current = 0
      }
    },
    [maxPullDistance, threshold, triggerRefresh]
  )

  const handlePointerUpFactory = useCallback(
    () =>
      async () => {
        removeGlobalListeners()
        const shouldRefresh = pullDistanceRef.current >= threshold
        await finishDrag(shouldRefresh)
      },
    [finishDrag, removeGlobalListeners, threshold]
  )

  const handlePointerCancelFactory = useCallback(
    () =>
      () => {
        removeGlobalListeners()
        if (!isDraggingRef.current) return
        isDraggingRef.current = false
        setIsDragging(false)
        setPullDistance(0)
        pullDistanceRef.current = 0
      },
    [removeGlobalListeners]
  )

  const addGlobalListeners = useCallback(() => {
    if (typeof window === "undefined") return

    const moveHandler = handlePointerMoveFactory()
    const upHandler = handlePointerUpFactory()
    const cancelHandler = handlePointerCancelFactory()

    moveListenerRef.current = moveHandler
    upListenerRef.current = upHandler
    cancelListenerRef.current = cancelHandler

    window.addEventListener("pointermove", moveHandler, { passive: false })
    window.addEventListener("pointerup", upHandler)
    window.addEventListener("pointercancel", cancelHandler)
  }, [handlePointerCancelFactory, handlePointerMoveFactory, handlePointerUpFactory])

  const handlePointerDown = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (!isEnabled || effectiveRefreshing) return
      if (event.pointerType === "mouse") return
      if (event.isPrimary === false) return
      if (getScrollTop() > 0) return

      startYRef.current = event.clientY
      pullDistanceRef.current = 0
      setPullDistance(0)
      isDraggingRef.current = true
      setIsDragging(true)
      addGlobalListeners()
    },
    [addGlobalListeners, effectiveRefreshing, isEnabled]
  )

  const progress = useMemo(() => {
    if (threshold <= 0) return 0
    return Math.min(1, pullDistance / threshold)
  }, [pullDistance, threshold])

  const indicatorMessage = useMemo(() => {
    if (!isEnabled) return ""
    if (effectiveRefreshing) return "Refreshing…"
    return progress >= 1 ? "Release to refresh" : "Pull to refresh"
  }, [effectiveRefreshing, isEnabled, progress])

  const indicatorVisible = isEnabled && (isDragging || effectiveRefreshing || pullDistance > 0)

  return (
    <div
      data-pull-to-refresh-root=""
      className={cn("relative", className)}
      style={{ touchAction: isEnabled ? "pan-y" : undefined }}
      onPointerDown={isEnabled ? handlePointerDown : undefined}
    >
      <div
        role="status"
        aria-live="polite"
        className="pointer-events-none absolute left-1/2 top-2 z-10 -translate-x-1/2 rounded-full bg-background/95 px-3 py-1 text-xs font-medium text-muted-foreground shadow-sm ring-1 ring-border transition-opacity"
        style={{ opacity: indicatorVisible ? 1 : 0 }}
      >
        {indicatorMessage}
      </div>
      <div
        className="transition-transform duration-150 ease-out will-change-transform"
        style={{
          transform: `translateY(${pullDistance}px)`,
          transitionDuration: isDragging ? "0ms" : undefined,
        }}
      >
        {children}
      </div>
    </div>
  )
}
