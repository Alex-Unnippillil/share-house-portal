import type { NextWebVitalsMetric } from 'next/app'

type NetworkInformation = {
  effectiveType?: string
  downlink?: number
  rtt?: number
  saveData?: boolean
}

type NavigatorWithConnection = Navigator & {
  connection?: NetworkInformation
}

type WebVitalMetadata = {
  pathname: string
  segments: string[]
  searchParams: Record<string, string>
  referrer: string | null
  locale?: string
  userAgent?: string
  connection?: NetworkInformation
  timestamp: number
}

type WebVitalPayload = {
  id: string
  name: string
  value: number
  delta?: number
  rating: NextWebVitalsMetric['rating']
  label?: NextWebVitalsMetric['label']
  eventName?: string
  navigationType?: string
  url: string
  route: string
  metadata: WebVitalMetadata
  timestamp: number
}

function shouldSendMetrics() {
  if (process.env.NODE_ENV === 'production') {
    return true
  }

  return process.env.NEXT_PUBLIC_ENABLE_WEB_VITALS === 'true'
}

export function sendToAnalytics(metric: NextWebVitalsMetric) {
  if (typeof window === 'undefined' || !shouldSendMetrics()) {
    return
  }

  const { location, document, navigator } = window
  const segments = location.pathname.split('/').filter(Boolean)
  const searchParams = Object.fromEntries(
    new URLSearchParams(location.search).entries()
  )

  const navigatorWithConnection = navigator as NavigatorWithConnection
  const connection = navigatorWithConnection.connection
    ? {
        effectiveType: navigatorWithConnection.connection.effectiveType,
        downlink: navigatorWithConnection.connection.downlink,
        rtt: navigatorWithConnection.connection.rtt,
        saveData: navigatorWithConnection.connection.saveData,
      }
    : undefined

  const timestamp = Date.now()

  const payload: WebVitalPayload = {
    id: metric.id,
    name: metric.name,
    value: metric.value,
    delta: metric.delta,
    rating: metric.rating,
    label: metric.label,
    eventName: 'eventName' in metric ? metric.eventName : undefined,
    navigationType:
      'navigationType' in metric ? metric.navigationType : undefined,
    url: location.href,
    route: location.pathname,
    metadata: {
      pathname: location.pathname,
      segments,
      searchParams,
      referrer: document.referrer || null,
      locale: navigator.language,
      userAgent: navigator.userAgent,
      connection,
      timestamp,
    },
    timestamp,
  }

  const body = JSON.stringify(payload)

  if (typeof navigator.sendBeacon === 'function') {
    const queued = navigator.sendBeacon('/api/vitals', body)
    if (queued) {
      return
    }
  }

  void fetch('/api/vitals', {
    method: 'POST',
    body,
    keepalive: true,
    headers: {
      'Content-Type': 'application/json',
    },
  })
}
