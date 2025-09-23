"use client"

import dynamic from "next/dynamic"
import { useEffect, useState } from "react"

const VercelAnalytics = dynamic(
  () => import("@vercel/analytics/react").then((mod) => mod.Analytics),
  { ssr: false }
)

const VercelSpeedInsights = dynamic(
  () => import("@vercel/speed-insights/next").then((mod) => mod.SpeedInsights),
  { ssr: false }
)

type ExtendedWindow = Window & {
  requestIdleCallback?: (callback: IdleRequestCallback) => number
  cancelIdleCallback?: (handle: number) => void
}

export function DeferredAnalytics() {
  const [shouldRender, setShouldRender] = useState(false)

  useEffect(() => {
    const extendedWindow = window as ExtendedWindow

    if (extendedWindow.requestIdleCallback) {
      const idleHandle = extendedWindow.requestIdleCallback(() => {
        setShouldRender(true)
      })

      return () => {
        extendedWindow.cancelIdleCallback?.(idleHandle)
      }
    }

    const timeout = window.setTimeout(() => {
      setShouldRender(true)
    }, 1)

    return () => {
      window.clearTimeout(timeout)
    }
  }, [])

  if (!shouldRender) {
    return null
  }

  return (
    <>
      <VercelAnalytics />
      <VercelSpeedInsights />
    </>
  )
}
