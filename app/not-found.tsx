"use client"

import { useEffect } from "react"
import { track } from "@vercel/analytics/react"

import { RecoveryPage } from "@/components/feedback/recovery-page"

export default function NotFound() {
  useEffect(() => {
    track("not_found_viewed", {
      context: "not_found",
      path: typeof window !== "undefined" ? window.location.pathname : "unavailable",
      timestamp: Date.now(),
    })
  }, [])

  return (
    <RecoveryPage
      context="not_found"
      title="We couldn’t find that page"
      subtitle="The link might be outdated or the page has moved. Use search or jump back into the portal."
    />
  )
}
