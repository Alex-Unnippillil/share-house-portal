"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Analytics } from "@vercel/analytics/react"
import { SpeedInsights } from "@vercel/speed-insights/next"

import { useIdleCallback } from "@/hooks/use-idle-callback"

export function IdleTaskManager() {
  const router = useRouter()
  const scheduleIdleTask = useIdleCallback()
  const [analyticsReady, setAnalyticsReady] = useState(false)

  useEffect(() => {
    const cancelAnalytics = scheduleIdleTask(() => {
      setAnalyticsReady(true)
    })

    const cancelNotificationRefresh = scheduleIdleTask(() => {
      window.dispatchEvent(new CustomEvent("notifications:refresh"))
    }, { timeout: 2000 })

    const cancelDashboardPrefetch = scheduleIdleTask(() => {
      if (typeof router.prefetch === "function") {
        router.prefetch("/dashboard")
      }
    }, { timeout: 4000 })

    return () => {
      cancelAnalytics()
      cancelNotificationRefresh()
      cancelDashboardPrefetch()
    }
  }, [router, scheduleIdleTask])

  if (!analyticsReady) {
    return null
  }

  return (
    <>
      <Analytics />
      <SpeedInsights />
    </>
  )
}
