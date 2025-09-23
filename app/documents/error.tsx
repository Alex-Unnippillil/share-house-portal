"use client"

import { useEffect } from "react"

import { ErrorFallback } from "@/components/feedback/ErrorBoundary"

type ErrorProps = {
  error: Error
  reset: () => void
}

export default function DocumentsError({ error, reset }: ErrorProps) {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") {
      console.error(error)
    }
  }, [error])

  return <ErrorFallback error={error} onRetry={reset} />
}
