"use client"

import { createBrowserClient } from "@supabase/ssr"
import type { NextWebVitalsMetric } from "next/app"

type MetricName = "LCP" | "TTFB" | "INP" | "CLS"

type MetricSnapshot = {
  id: string
  name: MetricName
  value: number
  rating: "good" | "needs-improvement" | "poor"
  delta: number
  navigationType?: NextWebVitalsMetric["navigationType"]
}

type ConnectionInformation = {
  effectiveType?: string
  downlink?: number
  rtt?: number
  saveData?: boolean
}

type ViewportInformation = {
  width: number
  height: number
}

const TRACKED_METRICS: ReadonlyArray<MetricName> = [
  "LCP",
  "TTFB",
  "INP",
  "CLS",
] as const

const INGEST_ENDPOINT =
  process.env.NEXT_PUBLIC_RUM_ENDPOINT || "/api/perf-metrics"
const AUTH_TOKEN = process.env.NEXT_PUBLIC_RUM_WRITE_TOKEN

const SESSION_STORAGE_KEY = "shp::rum-session-id"

let pendingMetrics: Partial<Record<MetricName, MetricSnapshot>> = {}
let flushTimer: ReturnType<typeof setTimeout> | undefined
let unloadListenersRegistered = false
let cachedUserId: string | null | undefined
let cachedSupabaseClient: ReturnType<typeof createBrowserClient<any>> | null = null

function isTrackedMetric(metric: NextWebVitalsMetric): metric is NextWebVitalsMetric & {
  name: MetricName
} {
  return (TRACKED_METRICS as readonly string[]).includes(metric.name)
}

function clearFlushTimer() {
  if (!flushTimer) {
    return
  }

  clearTimeout(flushTimer)
  flushTimer = undefined
}

function scheduleFlush() {
  if (flushTimer) {
    return
  }

  flushTimer = setTimeout(() => {
    flushTimer = undefined
    void flushMetrics()
  }, 5000)
}

function registerUnloadListeners() {
  if (typeof window === "undefined" || unloadListenersRegistered) {
    return
  }

  unloadListenersRegistered = true

  const flush = () => {
    clearFlushTimer()
    void flushMetrics()
  }

  window.addEventListener("pagehide", flush)
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") {
      flush()
    }
  })
}

function hasAllMetrics() {
  return (TRACKED_METRICS as readonly MetricName[]).every(
    (metricName) => pendingMetrics[metricName]
  )
}

function getSessionId(): string {
  if (typeof window === "undefined") {
    return "server"
  }

  try {
    const existing = window.sessionStorage.getItem(SESSION_STORAGE_KEY)
    if (existing) {
      return existing
    }

    const sessionId =
      typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(16).slice(2)}`

    window.sessionStorage.setItem(SESSION_STORAGE_KEY, sessionId)
    return sessionId
  } catch (error) {
    console.warn("Unable to persist RUM session identifier", error)
    return "unknown"
  }
}

function getViewport(): ViewportInformation | undefined {
  if (typeof window === "undefined") {
    return undefined
  }

  return {
    width: window.innerWidth,
    height: window.innerHeight,
  }
}

function getConnection(): ConnectionInformation | undefined {
  if (typeof navigator === "undefined") {
    return undefined
  }

  const connection = (navigator as any).connection
  if (!connection) {
    return undefined
  }

  const { effectiveType, downlink, rtt, saveData } = connection
  return {
    effectiveType,
    downlink,
    rtt,
    saveData,
  }
}

async function resolveUserId(): Promise<string | null> {
  if (cachedUserId !== undefined) {
    return cachedUserId
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !anonKey) {
    cachedUserId = null
    return cachedUserId
  }

  try {
    if (!cachedSupabaseClient) {
      cachedSupabaseClient = createBrowserClient<any>(supabaseUrl, anonKey)
    }

    const { data } = await cachedSupabaseClient.auth.getUser()
    cachedUserId = data.user?.id ?? null
  } catch (error) {
    console.warn("Failed to resolve Supabase user for RUM payload", error)
    cachedUserId = null
  }

  return cachedUserId
}

async function flushMetrics() {
  if (typeof window === "undefined") {
    return
  }

  clearFlushTimer()

  const metrics = Object.values(pendingMetrics) as MetricSnapshot[]
  if (metrics.length === 0) {
    return
  }

  pendingMetrics = {}

  const payload = {
    eventId:
      typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    sessionId: getSessionId(),
    metrics: metrics.map((metric) => ({
      id: metric.id,
      name: metric.name,
      value: metric.value,
      rating: metric.rating,
      delta: metric.delta,
    })),
    navigationType: metrics[0]?.navigationType,
    pathname: window.location.pathname,
    href: window.location.href,
    referrer: document.referrer || undefined,
    userAgent: navigator.userAgent,
    locale: navigator.language,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    viewport: getViewport(),
    connection: getConnection(),
    userId: await resolveUserId(),
  }

  try {
    const headers: HeadersInit = {
      "Content-Type": "application/json",
    }

    if (AUTH_TOKEN) {
      headers.Authorization = `Bearer ${AUTH_TOKEN}`
    }

    const response = await fetch(INGEST_ENDPOINT, {
      method: "POST",
      keepalive: true,
      headers,
      body: JSON.stringify(payload),
    })

    if (!response.ok) {
      console.warn("Failed to persist RUM web-vitals sample", await response.text())
    }
  } catch (error) {
    console.warn("Error reporting RUM web-vitals sample", error)
  }
}

export async function reportWebVitals(metric: NextWebVitalsMetric) {
  if (!isTrackedMetric(metric)) {
    return
  }

  registerUnloadListeners()

  pendingMetrics = {
    ...pendingMetrics,
    [metric.name]: {
      id: metric.id,
      name: metric.name,
      value: metric.value,
      rating: metric.rating,
      delta: metric.delta,
      navigationType: metric.navigationType,
    },
  }

  if (hasAllMetrics()) {
    clearFlushTimer()
    void flushMetrics()
    return
  }

  scheduleFlush()
}
