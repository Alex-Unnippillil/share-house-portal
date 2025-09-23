"use client"

import { useMemo } from "react"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { useNavigationPrefetchSummary } from "@/lib/analytics"

const formatDuration = (value: number | null) => {
  if (value === null || Number.isNaN(value)) {
    return "—"
  }

  if (value < 1) {
    return `${value.toFixed(2)} ms`
  }

  if (value < 10) {
    return `${value.toFixed(1)} ms`
  }

  return `${Math.round(value)} ms`
}

const formatRelativeTime = (timestamp: number | null) => {
  if (!timestamp) {
    return "No samples yet"
  }

  const deltaMs = Date.now() - timestamp
  if (deltaMs < 0) {
    return "Just now"
  }

  const seconds = Math.floor(deltaMs / 1000)
  if (seconds < 60) {
    return seconds <= 1 ? "Just now" : `${seconds}s ago`
  }

  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) {
    return `${minutes}m ago`
  }

  const hours = Math.floor(minutes / 60)
  if (hours < 24) {
    return `${hours}h ago`
  }

  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

const PerfPage = () => {
  const summary = useNavigationPrefetchSummary()

  const hoverStatus = useMemo(() => {
    if (summary.hoverMedianDuration === null) {
      return {
        label: "Awaiting hover samples",
        tone: "text-muted-foreground",
      }
    }

    return summary.withinTarget
      ? { label: "On target (<100 ms)", tone: "text-emerald-500" }
      : { label: "Needs attention", tone: "text-amber-500" }
  }, [summary.hoverMedianDuration, summary.withinTarget])

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 p-6">
      <Card>
        <CardHeader>
          <CardTitle>Navigation prefetch health</CardTitle>
          <CardDescription>
            Hover-driven prefetches should resolve in under 100 ms to keep dense navigation clusters feeling instant.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Hover median</p>
              <p className="text-3xl font-semibold text-foreground">
                {formatDuration(summary.hoverMedianDuration)}
              </p>
              <p className={`mt-1 text-sm font-medium ${hoverStatus.tone}`}>{hoverStatus.label}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">All transitions (median)</p>
              <p className="text-3xl font-semibold text-foreground">
                {formatDuration(summary.medianDuration)}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                {summary.successCount} successful · {summary.failureCount} failed
              </p>
            </div>
          </div>

          <dl className="grid gap-4 text-sm text-muted-foreground sm:grid-cols-3">
            <div>
              <dt>Hover samples</dt>
              <dd className="text-base font-semibold text-foreground">{summary.hoverCount}</dd>
            </div>
            <div>
              <dt>P95 duration</dt>
              <dd className="text-base font-semibold text-foreground">{formatDuration(summary.p95Duration)}</dd>
            </div>
            <div>
              <dt>Last capture</dt>
              <dd className="text-base font-semibold text-foreground">
                {formatRelativeTime(summary.lastUpdatedAt)}
              </dd>
            </div>
          </dl>

          {summary.recentEvents.length > 0 ? (
            <div>
              <p className="text-sm font-medium text-muted-foreground">Recent captures</p>
              <ul className="mt-2 space-y-2">
                {summary.recentEvents.map((event) => (
                  <li
                    key={event.id}
                    className="flex items-center justify-between rounded-lg border border-border bg-muted/40 px-3 py-2 text-sm"
                  >
                    <span className="font-medium text-foreground">
                      {event.trigger} · {event.href}
                    </span>
                    <span className="text-muted-foreground">{formatDuration(event.duration)}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Interact with navigation links to populate live hover transition metrics.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default PerfPage
