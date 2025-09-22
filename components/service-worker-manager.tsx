"use client"

import { useEffect } from "react"

import { toast } from "@/components/ui/use-toast"

type WorkerPayload = {
  url?: string
  method?: string
  message?: string
}

type WorkerMessage = {
  type?: string
  payload?: WorkerPayload
}

export function ServiceWorkerManager() {
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
      return
    }

    let isUnmounted = false

    const register = async () => {
      try {
        await navigator.serviceWorker.register("/sw.js")
      } catch (error) {
        console.error("Service worker registration failed", error)
      }
    }

    register()

    const handleMessage = (event: MessageEvent<WorkerMessage>) => {
      const data = event.data
      if (!data || typeof data !== "object" || !data.type) {
        return
      }

      const description = formatDescription(data.type, data.payload)
      if (!description) {
        return
      }

      if (data.type === "MUTATION_ERROR") {
        toast({
          variant: "destructive",
          title: "Sync failed",
          description,
        })
        return
      }

      if (data.type === "MUTATION_SENT") {
        toast({
          title: "Request synced",
          description,
        })
        return
      }

      if (data.type === "MUTATION_QUEUED") {
        toast({
          title: "You are offline",
          description,
        })
      }
    }

    navigator.serviceWorker.addEventListener("message", handleMessage)

    const notifyOnline = () => {
      const message = { type: "ONLINE" }

      const postMessage = (registration?: ServiceWorkerRegistration | null) => {
        registration?.active?.postMessage(message)
      }

      if (navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage(message)
      } else {
        navigator.serviceWorker.ready
          .then((registration) => {
            if (!isUnmounted) {
              postMessage(registration)
            }
          })
          .catch(() => {
            // no-op: best effort
          })
      }
    }

    window.addEventListener("online", notifyOnline)

    navigator.serviceWorker.ready
      .then((registration) => {
        if (!isUnmounted) {
          registration.active?.postMessage({ type: "PROCESS_QUEUE" })
        }
      })
      .catch(() => {
        // no-op: ready rejection indicates SW support issues
      })

    if (navigator.onLine) {
      notifyOnline()
    }

    return () => {
      isUnmounted = true
      navigator.serviceWorker.removeEventListener("message", handleMessage)
      window.removeEventListener("online", notifyOnline)
    }
  }, [])

  return null
}

function formatDescription(type: string, payload?: WorkerPayload) {
  if (type === "MUTATION_QUEUED") {
    const endpoint = deriveEndpoint(payload?.url)
    return endpoint
      ? `We will retry ${payload?.method || "this request"} to ${endpoint} when you are back online.`
      : "Your latest change will sync when you are back online."
  }

  if (type === "MUTATION_SENT") {
    const endpoint = deriveEndpoint(payload?.url)
    return endpoint
      ? `${payload?.method || "Request"} to ${endpoint} synced successfully.`
      : "Queued changes have been synced successfully."
  }

  if (type === "MUTATION_ERROR") {
    const endpoint = deriveEndpoint(payload?.url)
    if (payload?.message) {
      return endpoint
        ? `We could not sync ${payload.method || "the request"} to ${endpoint}: ${payload.message}`
        : payload.message
    }

    return endpoint
      ? `We could not sync ${payload?.method || "the request"} to ${endpoint}. We'll retry soon.`
      : "We could not sync your latest change. We'll retry when you are online."
  }

  return null
}

function deriveEndpoint(url?: string) {
  if (!url || typeof window === "undefined") {
    return null
  }

  try {
    const absoluteUrl = new URL(url, window.location.origin)
    return `${absoluteUrl.pathname}${absoluteUrl.search}`
  } catch (error) {
    console.error("Failed to parse queued request URL", error)
    return null
  }
}
