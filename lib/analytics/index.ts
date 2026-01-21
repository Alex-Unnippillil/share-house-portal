import type { Metric } from "web-vitals"

type DeviceType = "desktop" | "mobile" | "tablet" | "bot" | "unknown"

type AnalyticsDestination = "supabase" | "datadog"

declare global {
  interface Navigator {
    connection?: {
      effectiveType?: string
      downlink?: number
      rtt?: number
    }
  }
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const SUPABASE_RUM_TABLE =
  process.env.NEXT_PUBLIC_SUPABASE_RUM_TABLE ?? "rum_core_web_vitals"

const DATADOG_API_KEY = process.env.NEXT_PUBLIC_DATADOG_API_KEY
const DATADOG_SITE = process.env.NEXT_PUBLIC_DATADOG_SITE ?? "datadoghq.com"
const DATADOG_SERVICE =
  process.env.NEXT_PUBLIC_DATADOG_SERVICE ?? "share-house-portal"
const DATADOG_RUM_ENDPOINT =
  process.env.NEXT_PUBLIC_DATADOG_RUM_ENDPOINT ??
  `https://http-intake.logs.${DATADOG_SITE}/api/v2/logs`

const APP_ENVIRONMENT = process.env.NEXT_PUBLIC_APP_ENV ?? process.env.NODE_ENV
const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME ?? "share-house-portal"

export interface CoreWebVitalContext {
  route: string
  device: DeviceType
  sessionId: string
}

export interface CoreWebVitalPayload {
  app: string
  environment?: string
  metric: Pick<Metric, "id" | "name" | "value" | "delta" | "rating" | "navigationType">
  route: string
  device: DeviceType
  sessionId: string
  url?: string
  userAgent?: string
  connection?: string
  timestamp: string
}

const destinationFailures = new Set<AnalyticsDestination>()

function getConnectionType(): string | undefined {
  if (typeof navigator === "undefined") {
    return undefined
  }

  const { connection } = navigator
  if (!connection) {
    return undefined
  }

  const parts = [
    connection.effectiveType,
    connection.downlink && `${connection.downlink}Mbps`,
    connection.rtt && `${connection.rtt}ms`,
  ]
    .filter(Boolean)
    .join("|")

  return parts || undefined
}

function sendWithBeacon(url: string, body: string, headers?: HeadersInit) {
  if (typeof navigator !== "undefined" && "sendBeacon" in navigator && !headers) {
    const blob = new Blob([body], { type: "application/json" })
    if (navigator.sendBeacon(url, blob)) {
      return
    }
  }

  if (typeof fetch !== "undefined") {
    fetch(url, {
      method: "POST",
      headers: headers ?? { "Content-Type": "application/json" },
      body,
      keepalive: true,
    }).catch(() => {
      /* swallow network errors */
    })
  }
}

function sendToSupabase(payload: CoreWebVitalPayload) {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY || destinationFailures.has("supabase")) {
    return
  }

  const url = `${SUPABASE_URL}/rest/v1/${SUPABASE_RUM_TABLE}`
  const body = JSON.stringify([
    {
      metric_name: payload.metric.name,
      metric_id: payload.metric.id,
      metric_value: payload.metric.value,
      metric_delta: payload.metric.delta,
      metric_rating: payload.metric.rating,
      navigation_type: payload.metric.navigationType,
      route: payload.route,
      url: payload.url,
      device: payload.device,
      session_id: payload.sessionId,
      environment: payload.environment,
      user_agent: payload.userAgent,
      connection: payload.connection,
      collected_at: payload.timestamp,
    },
  ])

  sendWithBeacon(url, body, {
    "Content-Type": "application/json",
    apikey: SUPABASE_ANON_KEY,
    Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
    Prefer: "return=minimal",
  })
}

function sendToDatadog(payload: CoreWebVitalPayload) {
  if (!DATADOG_API_KEY || destinationFailures.has("datadog")) {
    return
  }

  const tags = [
    `env:${payload.environment ?? "unknown"}`,
    `app:${APP_NAME}`,
    `metric:${payload.metric.name}`,
    `route:${payload.route}`,
    `device:${payload.device}`,
  ].join(",")

  const body = JSON.stringify([
    {
      ddsource: "browser",
      ddtags: tags,
      service: DATADOG_SERVICE,
      message: "core_web_vital",
      event: payload,
    },
  ])

  sendWithBeacon(DATADOG_RUM_ENDPOINT, body, {
    "Content-Type": "application/json",
    "DD-API-KEY": DATADOG_API_KEY,
  })
}

export function trackCoreWebVital(metric: Metric, context: CoreWebVitalContext) {
  const payload: CoreWebVitalPayload = {
    app: APP_NAME,
    environment: APP_ENVIRONMENT,
    metric: {
      id: metric.id,
      name: metric.name,
      value: Number(metric.value.toFixed(4)),
      delta: Number(metric.delta.toFixed(4)),
      rating: metric.rating,
      navigationType: metric.navigationType,
    },
    route: context.route,
    device: context.device,
    sessionId: context.sessionId,
    url: typeof window !== "undefined" ? window.location.href : undefined,
    userAgent: typeof navigator !== "undefined" ? navigator.userAgent : undefined,
    connection: getConnectionType(),
    timestamp: new Date().toISOString(),
  }

  try {
    sendToSupabase(payload)
  } catch (error) {
    destinationFailures.add("supabase")
  }

  try {
    sendToDatadog(payload)
  } catch (error) {
    destinationFailures.add("datadog")
  }
}

export function getDeviceType(userAgent: string): DeviceType {
  const ua = userAgent.toLowerCase()

  if (/bot|crawler|spider|crawling/.test(ua)) {
    return "bot"
  }
  if (/mobile|iphone|android/.test(ua) && !/ipad/.test(ua)) {
    return "mobile"
  }
  if (/ipad|tablet/.test(ua)) {
    return "tablet"
  }
  if (/mac|windows|linux/.test(ua)) {
    return "desktop"
  }
  return "unknown"
}

export function ensureSessionId(): string {
  if (typeof window === "undefined") {
    return "server"
  }

  const storageKey = "roomsily:rum-session-id"
  const existing = window.sessionStorage.getItem(storageKey)
  if (existing) {
    return existing
  }

  const id =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random()}`
  window.sessionStorage.setItem(storageKey, id)
  return id
}
