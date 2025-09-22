"use client"

import { useEffect, useState } from "react"

type CalInitArgs =
  | ["init", { origin?: string }]
  | ["inline", { elementOrSelector: string; calLink: string; layout?: string }]
  | ["ui", Record<string, unknown>]

type CalEmbedApi = ((...args: CalInitArgs) => void) & {
  q?: CalInitArgs[]
}

declare global {
  interface Window {
    Cal?: CalEmbedApi
  }
}

type AmenityBookingEmbedProps = {
  eventTypeId: string
  origin: string
}

const FALLBACK_BRAND_COLOR = "#2563eb"

const AmenityBookingEmbed = ({ eventTypeId, origin }: AmenityBookingEmbedProps) => {
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading")
  const [containerId] = useState(
    () => `cal-amenity-${Math.random().toString(36).slice(2, 11)}`
  )

  useEffect(() => {
    let isActive = true
    setStatus("loading")

    const normalizedOrigin = origin.replace(/\/$/, "")
    const scriptUrl = `${normalizedOrigin}/embed/embed.js`
    let script = document.querySelector(
      `script[src="${scriptUrl}"]`
    ) as HTMLScriptElement | null

    const initializeWidget = () => {
      if (!isActive) {
        return
      }

      if (typeof window === "undefined" || typeof window.Cal !== "function") {
        setStatus("error")
        return
      }

      try {
        window.Cal("init", { origin: normalizedOrigin })
        window.Cal("inline", {
          elementOrSelector: `#${containerId}`,
          calLink: eventTypeId,
        })
        window.Cal("ui", {
          theme: "light",
          styles: {
            branding: {
              brandColor: FALLBACK_BRAND_COLOR,
            },
          },
          hideEventTypeDetails: false,
        })
        setStatus("ready")
      } catch (error) {
        console.error("Failed to initialise Cal embed", error)
        setStatus("error")
      }
    }

    const handleLoad = () => {
      if (!isActive) {
        return
      }

      if (script) {
        script.setAttribute("data-cal-loaded", "true")
      }

      initializeWidget()
    }

    const handleError = () => {
      if (!isActive) {
        return
      }
      setStatus("error")
    }

    if (script) {
      if (script.getAttribute("data-cal-loaded") === "true") {
        initializeWidget()
      } else {
        script.addEventListener("load", handleLoad)
        script.addEventListener("error", handleError)
      }
    } else {
      script = document.createElement("script")
      script.src = scriptUrl
      script.async = true
      script.setAttribute("data-cal-loaded", "false")
      script.addEventListener("load", handleLoad)
      script.addEventListener("error", handleError)
      document.body.appendChild(script)
    }

    return () => {
      isActive = false

      if (script) {
        script.removeEventListener("load", handleLoad)
        script.removeEventListener("error", handleError)
      }
    }
  }, [containerId, eventTypeId, origin])

  return (
    <div className="space-y-4">
      {status === "loading" && (
        <div className="flex min-h-[320px] w-full items-center justify-center rounded-lg border border-dashed text-sm text-muted-foreground">
          Connecting to the amenity calendar…
        </div>
      )}

      {status === "error" && (
        <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
          We couldn’t load the scheduling widget right now. Please try again soon.
        </div>
      )}

      <div
        id={containerId}
        data-testid="cal-embed-container"
        data-event-type-id={eventTypeId}
        aria-live="polite"
        className={`min-h-[640px] w-full rounded-lg bg-background ${status !== "ready" ? "opacity-0" : "opacity-100"}`}
      />
    </div>
  )
}

export default AmenityBookingEmbed
