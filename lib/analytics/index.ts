import { useSyncExternalStore } from "react"
import type { Metric } from "web-vitals"

export type NavigationPrefetchTrigger = "hover" | "focus" | "viewport" | "immediate"

interface NavigationPrefetchStartEvent {
  id: string
  href: string
  trigger: NavigationPrefetchTrigger
  startedAt: number
}

export interface NavigationPrefetchRecord extends NavigationPrefetchStartEvent {
  finishedAt: number
  duration: number
  status: "success" | "error"
  errorMessage?: string
}

interface AnalyticsStore {
  pending: Map<string, NavigationPrefetchStartEvent>
  completed: NavigationPrefetchRecord[]
  listeners: Set<() => void>
  webVitals: Metric[]
}

interface AnalyticsGlobal {
  __ROOMSILY_ANALYTICS__?: AnalyticsStore
}

const ANALYTICS_KEY = "__ROOMSILY_ANALYTICS__"
const MAX_COMPLETED_RECORDS = 200
const MAX_WEB_VITALS = 200
const HOVER_MEDIAN_TARGET_MS = 100

const getAnalyticsStore = (): AnalyticsStore => {
  const globalTarget = globalThis as AnalyticsGlobal

  if (!globalTarget[ANALYTICS_KEY]) {
    globalTarget[ANALYTICS_KEY] = {
      pending: new Map(),
      completed: [],
      listeners: new Set(),
      webVitals: [],
    }
  }

  return globalTarget[ANALYTICS_KEY]!
}

const durationRating = (duration: number): Metric["rating"] => {
  if (duration < HOVER_MEDIAN_TARGET_MS) {
    return "good"
  }

  if (duration < 250) {
    return "needs-improvement"
  }

  return "poor"
}

const emitWebVital = (metric: Metric) => {
  const store = getAnalyticsStore()
  store.webVitals.push(metric)
  if (store.webVitals.length > MAX_WEB_VITALS) {
    store.webVitals.splice(0, store.webVitals.length - MAX_WEB_VITALS)
  }
}

const notifyNavigationListeners = () => {
  const store = getAnalyticsStore()
  for (const listener of store.listeners) {
    listener()
  }
}

const subscribeToNavigationStore = (listener: () => void) => {
  const store = getAnalyticsStore()
  store.listeners.add(listener)
  return () => {
    store.listeners.delete(listener)
  }
}

const subscribeToNavigationStoreSafe = (listener: () => void) => {
  if (typeof window === "undefined") {
    return () => {}
  }

  return subscribeToNavigationStore(listener)
}

export const logNavigationPrefetchStart = (event: NavigationPrefetchStartEvent) => {
  const store = getAnalyticsStore()
  store.pending.set(event.id, event)

  emitWebVital({
    name: "navigation-prefetch-start",
    id: event.id,
    value: event.startedAt,
    delta: 0,
    entries: [],
    rating: "good",
  })
}

export interface NavigationPrefetchCompleteEvent
  extends Omit<NavigationPrefetchRecord, "duration" | "finishedAt"> {
  finishedAt: number
}

export const logNavigationPrefetchComplete = (
  event: NavigationPrefetchCompleteEvent,
): NavigationPrefetchRecord => {
  const store = getAnalyticsStore()
  const pending = store.pending.get(event.id) ?? {
    id: event.id,
    href: event.href,
    trigger: event.trigger,
    startedAt: event.startedAt,
  }

  store.pending.delete(event.id)

  const finishedAt = event.finishedAt
  const startedAt = pending.startedAt
  const duration = Math.max(0, finishedAt - startedAt)

  const record: NavigationPrefetchRecord = {
    id: event.id,
    href: pending.href,
    trigger: pending.trigger,
    startedAt,
    finishedAt,
    duration,
    status: event.status,
    errorMessage: event.errorMessage,
  }

  store.completed.push(record)
  if (store.completed.length > MAX_COMPLETED_RECORDS) {
    store.completed.splice(0, store.completed.length - MAX_COMPLETED_RECORDS)
  }

  emitWebVital({
    name: "navigation-prefetch-complete",
    id: event.id,
    value: finishedAt,
    delta: duration,
    entries: [],
    rating: durationRating(duration),
  })

  notifyNavigationListeners()

  return record
}

const median = (values: number[]): number | null => {
  if (values.length === 0) {
    return null
  }

  const sorted = [...values].sort((a, b) => a - b)
  const middle = Math.floor(sorted.length / 2)

  if (sorted.length % 2 === 0) {
    return (sorted[middle - 1] + sorted[middle]) / 2
  }

  return sorted[middle]
}

const percentile = (values: number[], percentileRank: number): number | null => {
  if (values.length === 0) {
    return null
  }

  if (percentileRank <= 0) {
    return values[0]
  }

  if (percentileRank >= 1) {
    return values[values.length - 1]
  }

  const sorted = [...values].sort((a, b) => a - b)
  const index = (sorted.length - 1) * percentileRank
  const lower = Math.floor(index)
  const upper = Math.ceil(index)

  if (lower === upper) {
    return sorted[lower]
  }

  const weight = index - lower
  return sorted[lower] * (1 - weight) + sorted[upper] * weight
}

export interface NavigationPrefetchSummary {
  totalPrefetches: number
  successCount: number
  failureCount: number
  medianDuration: number | null
  averageDuration: number | null
  hoverMedianDuration: number | null
  hoverCount: number
  p95Duration: number | null
  withinTarget: boolean
  lastUpdatedAt: number | null
  recentEvents: NavigationPrefetchRecord[]
}

export const getNavigationPrefetchSummary = (): NavigationPrefetchSummary => {
  const store = getAnalyticsStore()
  const completed = store.completed
  const successes = completed.filter((record) => record.status === "success")
  const failures = completed.filter((record) => record.status === "error")

  const durations = successes.map((record) => record.duration)
  const hoverDurations = successes
    .filter((record) => record.trigger === "hover")
    .map((record) => record.duration)

  const medianDuration = median(durations)
  const hoverMedianDuration = median(hoverDurations)
  const withinTarget = hoverMedianDuration !== null && hoverMedianDuration < HOVER_MEDIAN_TARGET_MS
  const averageDuration =
    durations.length > 0 ? durations.reduce((sum, value) => sum + value, 0) / durations.length : null
  const p95Duration = percentile(durations, 0.95)
  const lastUpdatedAt = completed.length > 0 ? completed[completed.length - 1].finishedAt : null
  const recentEvents = completed.slice(-5).reverse()

  return {
    totalPrefetches: completed.length,
    successCount: successes.length,
    failureCount: failures.length,
    medianDuration,
    averageDuration,
    hoverMedianDuration,
    hoverCount: hoverDurations.length,
    p95Duration,
    withinTarget,
    lastUpdatedAt,
    recentEvents,
  }
}

export const useNavigationPrefetchSummary = (): NavigationPrefetchSummary =>
  useSyncExternalStore(
    subscribeToNavigationStoreSafe,
    getNavigationPrefetchSummary,
    getNavigationPrefetchSummary,
  )

export const resetNavigationPrefetchMetrics = () => {
  const store = getAnalyticsStore()
  store.pending.clear()
  store.completed = []
  store.webVitals = []
  notifyNavigationListeners()
}

export const getWebVitalMetrics = () => {
  const store = getAnalyticsStore()
  return [...store.webVitals]
}
