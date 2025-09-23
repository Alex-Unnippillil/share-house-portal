"use client"

import { useCallback, useEffect, useMemo, useState } from "react"

type OfflineFlow = "maintenance" | "visitors" | "messaging"

type SubmitOptions = {
  headers?: HeadersInit
  method?: string
}

type SubmitResult = {
  queued: boolean
  response: Response
}

const OFFLINE_EVENT = "OFFLINE_QUEUE_EVENT"

async function requestQueueStatus(flow: OfflineFlow) {
  if (!("serviceWorker" in navigator)) {
    return
  }

  const payload = { type: "OFFLINE_QUEUE_STATUS_REQUEST", flow }

  if (navigator.serviceWorker.controller) {
    navigator.serviceWorker.controller.postMessage(payload)
    return
  }

  try {
    const registration = await navigator.serviceWorker.ready
    registration.active?.postMessage(payload)
  } catch (error) {
    console.warn("Failed to query offline queue status", error)
  }
}

export function useOfflineQueue(
  flow: OfflineFlow,
  endpoint: string,
  options: SubmitOptions = {}
) {
  const [isOnline, setIsOnline] = useState(
    typeof navigator === "undefined" ? true : navigator.onLine
  )
  const [queuedCount, setQueuedCount] = useState(0)
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null)
  const [isSyncing, setIsSyncing] = useState(false)

  useEffect(() => {
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    window.addEventListener("online", handleOnline)
    window.addEventListener("offline", handleOffline)

    setIsOnline(typeof navigator === "undefined" ? true : navigator.onLine)

    return () => {
      window.removeEventListener("online", handleOnline)
      window.removeEventListener("offline", handleOffline)
    }
  }, [])

  useEffect(() => {
    if (!("serviceWorker" in navigator)) {
      return
    }

    const handleMessage = (event: MessageEvent) => {
      const data = event.data

      if (!data || data.type !== OFFLINE_EVENT || data.flow !== flow) {
        return
      }

      switch (data.event) {
        case "queued": {
          setQueuedCount((count) => count + 1)
          break
        }
        case "status": {
          if (typeof data.queuedCount === "number") {
            setQueuedCount(data.queuedCount)
          }
          if (typeof data.timestamp === "number" && data.queuedCount === 0) {
            setLastSyncedAt(new Date(data.timestamp))
          }
          break
        }
        case "sync-start": {
          setIsSyncing(true)
          break
        }
        case "replayed": {
          const successes = Number(data.successCount) || 0
          if (successes > 0) {
            setQueuedCount((count) => Math.max(count - successes, 0))
          }
          if (typeof data.timestamp === "number") {
            setLastSyncedAt(new Date(data.timestamp))
          }
          setIsSyncing(false)
          break
        }
        case "sync-complete": {
          setIsSyncing(false)
          if (typeof data.timestamp === "number") {
            setLastSyncedAt(new Date(data.timestamp))
          }
          break
        }
        case "sync-error": {
          setIsSyncing(false)
          break
        }
        default:
          break
      }
    }

    navigator.serviceWorker.addEventListener("message", handleMessage)
    requestQueueStatus(flow)

    return () => {
      navigator.serviceWorker.removeEventListener("message", handleMessage)
    }
  }, [flow])

  const submit = useCallback(
    async (
      payload: unknown,
      init?: RequestInit
    ): Promise<SubmitResult> => {
      const method = init?.method ?? options.method ?? "POST"
      const preparedHeaders = new Headers({
        "Content-Type": "application/json",
        ...options.headers,
        ...init?.headers,
      })

      const preparedBody =
        init?.body ??
        (payload instanceof FormData
          ? payload
          : JSON.stringify(payload ?? {}))

      if (preparedBody instanceof FormData) {
        preparedHeaders.delete("Content-Type")
      }

      const response = await fetch(endpoint, {
        ...init,
        method,
        headers: preparedHeaders,
        body: preparedBody,
      })

      const isQueued =
        response.status === 202 && response.headers.get("x-offline-queued") === "1"

      if (isQueued) {
        // Ensure local count reflects queued submission even if the SW message
        // arrives later (or not at all in testing scenarios).
        setQueuedCount((count) => count + 1)
        return { queued: true, response }
      }

      if (response.ok) {
        setLastSyncedAt(new Date())
      }

      return { queued: false, response }
    },
    [endpoint, options.headers, options.method]
  )

  const statusLabel = useMemo(() => {
    if (!isOnline) {
      return "Offline"
    }

    if (isSyncing) {
      return "Syncing"
    }

    if (queuedCount > 0) {
      return "Waiting to sync"
    }

    return "Online"
  }, [isOnline, isSyncing, queuedCount])

  return {
    isOnline,
    queuedCount,
    lastSyncedAt,
    isSyncing,
    statusLabel,
    submit,
  }
}
