'use client'

import { useEffect, useMemo, useState } from 'react'

import type { PerformanceBudgetValues, PerformanceMetric } from '@/config/performance'

const METRIC_LABELS: Record<PerformanceMetric, string> = {
  lcp: 'Largest Contentful Paint',
  tti: 'Time to Interactive',
}

const METRIC_ORDER: PerformanceMetric[] = ['lcp', 'tti']

type MetricState = Record<PerformanceMetric, number | null>

type ServerTimingEntry = {
  name: string
  description?: string
  duration?: number
}

const INITIAL_STATE: MetricState = {
  lcp: null,
  tti: null,
}

interface MetricsClientProps {
  budgets: PerformanceBudgetValues
  serverTiming?: string | null
}

export default function MetricsClient({ budgets, serverTiming }: MetricsClientProps) {
  const [metrics, setMetrics] = useState<MetricState>(INITIAL_STATE)

  useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }

    const navigationEntries = performance.getEntriesByType('navigation')
    const navigationTiming = navigationEntries[0] as PerformanceNavigationTiming | undefined

    if (navigationTiming) {
      setMetrics((current) => ({
        ...current,
        tti: navigationTiming.domInteractive,
      }))
    }

    if (!('PerformanceObserver' in window)) {
      return
    }

    let latestValue = 0
    const observer = new PerformanceObserver((entryList) => {
      for (const entry of entryList.getEntries()) {
        const value = entry.startTime

        if (value > latestValue) {
          latestValue = value
          setMetrics((current) => ({ ...current, lcp: value }))
        }
      }
    })

    try {
      observer.observe({ type: 'largest-contentful-paint', buffered: true })
    } catch (error) {
      // Ignore browsers that do not support the LCP observer.
      return () => {}
    }

    const finalize = () => {
      const entries = observer.takeRecords()
      if (entries.length > 0) {
        const lastEntry = entries[entries.length - 1]
        setMetrics((current) => ({ ...current, lcp: lastEntry.startTime }))
      }
      observer.disconnect()
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        finalize()
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('pagehide', finalize)

    return () => {
      finalize()
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('pagehide', finalize)
    }
  }, [])

  const serverTimingEntries = useMemo(() => parseServerTiming(serverTiming), [serverTiming])

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2">
        {METRIC_ORDER.map((metric) => {
          const actual = metrics[metric]
          const budget = budgets[metric]
          const delta = actual == null ? null : actual - budget
          const statusClass = actual == null
            ? 'text-muted-foreground'
            : actual <= budget
              ? 'text-emerald-600'
              : 'text-destructive'
          const statusLabel = actual == null ? 'Collecting…' : actual <= budget ? 'Within budget' : 'Over budget'

          return (
            <div key={metric} className="rounded-lg border border-border p-4">
              <p className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
                {METRIC_LABELS[metric]}
              </p>
              <p className={`mt-2 text-2xl font-semibold ${statusClass}`}>
                {formatOptionalMs(actual)}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                Budget: {formatMs(budget)}{' '}
                {delta == null ? null : (
                  <span className={delta > 0 ? 'text-destructive' : 'text-emerald-600'}>
                    ({delta > 0 ? '+' : ''}{Math.round(delta)} ms)
                  </span>
                )}
              </p>
              <p className="mt-1 text-xs uppercase tracking-wide text-muted-foreground">{statusLabel}</p>
            </div>
          )
        })}
      </div>

      {serverTimingEntries.length > 0 ? (
        <div>
          <p className="text-sm font-medium text-foreground">Server-Timing headers</p>
          <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
            {serverTimingEntries.map((entry) => (
              <li key={entry.name} className="flex flex-col sm:flex-row sm:items-center sm:gap-2">
                <span className="font-medium text-foreground">{entry.name.toUpperCase()}</span>
                <span>
                  {entry.duration != null ? `${Math.round(entry.duration)} ms` : 'n/a'}
                  {entry.description ? ` — ${entry.description}` : ''}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          Server-Timing headers were not present on this request. Confirm middleware execution when testing locally.
        </p>
      )}
    </div>
  )
}

function formatMs(value: number): string {
  return `${Math.round(value)} ms`
}

function formatOptionalMs(value: number | null): string {
  if (value == null) {
    return '—'
  }

  return formatMs(value)
}

function parseServerTiming(value?: string | null): ServerTimingEntry[] {
  if (!value) {
    return []
  }

  return value.split(',').map((entry) => {
    const [namePart, ...attributes] = entry.trim().split(';')
    const result: ServerTimingEntry = { name: namePart }

    for (const attribute of attributes) {
      const [key, raw] = attribute.split('=')
      if (key === 'dur') {
        const duration = Number(raw)
        if (!Number.isNaN(duration)) {
          result.duration = duration
        }
      }
      if (key === 'desc') {
        result.description = raw?.replace(/^"|"$/g, '')
      }
    }

    return result
  })
}
