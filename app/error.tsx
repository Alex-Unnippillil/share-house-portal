"use client"

import { useEffect } from "react"
import { track } from "@vercel/analytics/react"

import { RecoveryPage } from "@/components/feedback/recovery-page"

type ErrorProps = {
  error: Error
  reset: () => void
}

export default function GlobalError({ error, reset }: ErrorProps) {
  useEffect(() => {
    console.error("Global application error", error)

    const context = {
      context: "global_error" as const,
      message: error?.message ?? "Unknown error",
      name: error?.name ?? "Error",
      hasStack: Boolean(error?.stack),
      stackSnippet: error?.stack?.slice(0, 500) ?? null,
      path:
        typeof window !== "undefined" ? window.location.pathname : "unavailable",
      timestamp: Date.now(),
    }

    track("global_error_viewed", context)
  }, [error])

  return (
    <RecoveryPage
      context="global_error"
      title="We hit a snag loading that view"
      subtitle="Our household systems had a hiccup. Try again or jump to another area while we investigate."
      error={error}
      onRetry={reset}
    />
  )
}
