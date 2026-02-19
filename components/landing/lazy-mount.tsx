"use client"

import { type ReactNode, useEffect, useRef, useState } from "react"

type LazyMountProps = {
  children: ReactNode
  fallback: ReactNode
  rootMargin?: string
  idleTimeoutMs?: number
  className?: string
}

const LOW_POWER_NETWORKS = new Set(["slow-2g", "2g"])

type PowerAwareNavigator = Navigator & {
  connection?: {
    saveData?: boolean
    effectiveType?: string
  }
  deviceMemory?: number
}

function shouldSkipHeavyVisuals() {
  if (typeof window === "undefined") {
    return false
  }

  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    return true
  }

  const powerAwareNavigator = navigator as PowerAwareNavigator
  const connection = powerAwareNavigator.connection
  if (
    connection?.saveData ||
    (connection?.effectiveType && LOW_POWER_NETWORKS.has(connection.effectiveType))
  ) {
    return true
  }

  if (typeof powerAwareNavigator.deviceMemory === "number" && powerAwareNavigator.deviceMemory <= 2) {
    return true
  }

  return false
}

export default function LazyMount({
  children,
  fallback,
  rootMargin = "240px 0px",
  idleTimeoutMs = 900,
  className,
}: LazyMountProps) {
  const [isNearViewport, setIsNearViewport] = useState(false)
  const [shouldMount, setShouldMount] = useState(false)
  const [skipHeavyVisuals, setSkipHeavyVisuals] = useState(false)
  const containerRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    setSkipHeavyVisuals(shouldSkipHeavyVisuals())
  }, [])

  useEffect(() => {
    if (skipHeavyVisuals || shouldMount || !containerRef.current) {
      return
    }

    if (typeof IntersectionObserver === "undefined") {
      setIsNearViewport(true)
      return
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setIsNearViewport(true)
          observer.disconnect()
        }
      },
      { rootMargin }
    )

    observer.observe(containerRef.current)
    return () => observer.disconnect()
  }, [rootMargin, shouldMount, skipHeavyVisuals])

  useEffect(() => {
    if (!isNearViewport || skipHeavyVisuals || shouldMount) {
      return
    }

    let timeoutId: ReturnType<typeof globalThis.setTimeout> | undefined
    let idleId: number | undefined

    const scheduleMount = () => setShouldMount(true)
    const requestIdleCallback = (globalThis as typeof globalThis & {
      requestIdleCallback?: (
        callback: IdleRequestCallback,
        options?: IdleRequestOptions
      ) => number
      cancelIdleCallback?: (id: number) => void
    }).requestIdleCallback

    if (typeof requestIdleCallback === "function") {
      idleId = requestIdleCallback(scheduleMount, { timeout: idleTimeoutMs })
    } else {
      timeoutId = globalThis.setTimeout(scheduleMount, idleTimeoutMs)
    }

    return () => {
      const cancelIdleCallback = (globalThis as typeof globalThis & {
        cancelIdleCallback?: (id: number) => void
      }).cancelIdleCallback

      if (typeof idleId === "number" && typeof cancelIdleCallback === "function") {
        cancelIdleCallback(idleId)
      }

      if (timeoutId !== undefined) {
        globalThis.clearTimeout(timeoutId)
      }
    }
  }, [idleTimeoutMs, isNearViewport, shouldMount, skipHeavyVisuals])

  return (
    <div ref={containerRef} className={className ?? "size-full"}>
      {shouldMount ? children : fallback}
    </div>
  )
}
