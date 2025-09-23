"use client"

import { MutableRefObject, useEffect, useRef } from "react"

type PullToRefreshOptions = {
  containerRef: MutableRefObject<HTMLElement | null>
  onRefresh: () => void | Promise<void>
  threshold?: number
  disabled?: boolean
}

const isTouchEnvironment = () => {
  if (typeof window === "undefined") {
    return false
  }

  const coarsePointer = window.matchMedia?.("(pointer: coarse)").matches

  return coarsePointer || "ontouchstart" in window
}

export function usePullToRefresh({
  containerRef,
  onRefresh,
  threshold = 60,
  disabled = false,
}: PullToRefreshOptions) {
  const startY = useRef<number | null>(null)
  const reachedThreshold = useRef(false)
  const isRefreshing = useRef(false)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    if (disabled) return
    if (!isTouchEnvironment()) return

    const handleTouchStart = (event: TouchEvent) => {
      if (container.scrollTop > 0) {
        startY.current = null
        return
      }

      const touch = event.touches[0]
      startY.current = touch?.clientY ?? null
      reachedThreshold.current = false
    }

    const handleTouchMove = (event: TouchEvent) => {
      if (startY.current === null) return
      if (container.scrollTop > 0) return

      const touch = event.touches[0]
      const delta = (touch?.clientY ?? 0) - startY.current

      if (delta <= 0) {
        reachedThreshold.current = false
        return
      }

      if (delta >= threshold && !reachedThreshold.current) {
        reachedThreshold.current = true
        if (typeof navigator !== "undefined" && "vibrate" in navigator) {
          try {
            navigator.vibrate?.(10)
          } catch {
            // noop - vibration unsupported or blocked
          }
        }
      }
    }

    const handleTouchEnd = async () => {
      if (!reachedThreshold.current || isRefreshing.current) {
        startY.current = null
        reachedThreshold.current = false
        return
      }

      isRefreshing.current = true
      try {
        await onRefresh()
      } finally {
        isRefreshing.current = false
      }

      startY.current = null
      reachedThreshold.current = false
    }

    container.addEventListener("touchstart", handleTouchStart, { passive: true })
    container.addEventListener("touchmove", handleTouchMove, { passive: true })
    container.addEventListener("touchend", handleTouchEnd)

    return () => {
      container.removeEventListener("touchstart", handleTouchStart)
      container.removeEventListener("touchmove", handleTouchMove)
      container.removeEventListener("touchend", handleTouchEnd)
    }
  }, [containerRef, disabled, onRefresh, threshold])
}
