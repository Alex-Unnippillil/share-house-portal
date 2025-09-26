"use client"

import { useCallback, useEffect, useState } from "react"

type PermissionState = NotificationPermission | "unsupported"

function getInitialPermission(): PermissionState {
  if (typeof window === "undefined" || typeof Notification === "undefined") {
    return "unsupported"
  }

  return Notification.permission
}

export function useNotificationPermission() {
  const [permission, setPermission] = useState<PermissionState>(getInitialPermission)

  useEffect(() => {
    if (typeof window === "undefined" || typeof Notification === "undefined") {
      setPermission("unsupported")
      return
    }

    setPermission(Notification.permission)

    if (typeof navigator === "undefined" || !("permissions" in navigator)) {
      return
    }

    let isActive = true
    let removeListener: (() => void) | undefined

    navigator.permissions
      .query({ name: "notifications" as PermissionName })
      .then((status) => {
        if (!isActive) {
          return
        }

        const syncPermission = () => {
          const nextState = status.state === "prompt" ? "default" : status.state
          setPermission(nextState)
        }

        status.addEventListener("change", syncPermission)
        removeListener = () => {
          status.removeEventListener("change", syncPermission)
        }

        syncPermission()
      })
      .catch(() => {
        // Some browsers (e.g. Safari) do not implement the Permissions API
      })

    return () => {
      isActive = false
      removeListener?.()
    }
  }, [])

  const requestPermission = useCallback(async () => {
    if (typeof window === "undefined" || typeof Notification === "undefined") {
      setPermission("unsupported")
      return "unsupported" as const
    }

    try {
      const result = await Notification.requestPermission()
      setPermission(result)
      return result
    } catch (error) {
      console.error("Notification permission request failed", error)
      const fallback = Notification.permission
      setPermission(fallback)
      return fallback
    }
  }, [])

  return {
    permission,
    isSupported: permission !== "unsupported",
    requestPermission,
  }
}
