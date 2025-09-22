"use client"

import { useCallback, useEffect } from "react"
import { useRouter } from "next/navigation"

import { cn } from "@/lib/utils"
import {
  floorplanOverlays,
  navigateToOverlay,
  type FloorplanOverlayTarget,
} from "@/lib/floorplan-overlays"

const FloorPlanOverlayMap = () => {
  const router = useRouter()

  useEffect(() => {
    if (typeof router.prefetch !== "function") {
      return
    }

    for (const overlay of floorplanOverlays) {
      if (overlay.isExternal || !overlay.route.startsWith("/")) {
        continue
      }

      router
        .prefetch(overlay.route)
        .catch(() => {
          // Prefetch failures should not block rendering; ignore silently
        })
    }
  }, [router])

  const handleActivate = useCallback(
    (overlay: FloorplanOverlayTarget) => {
      navigateToOverlay(overlay, router, (href) => {
        window.open(href, "_blank", "noopener,noreferrer")
      })
    },
    [router],
  )

  return (
    <div className="relative w-full space-y-4">
      <div className="grid h-[360px] w-full grid-cols-6 grid-rows-4 gap-3 rounded-xl border border-border bg-muted/40 p-4">
        {floorplanOverlays.map((overlay) => {
          const tooltipId = `${overlay.id}-tooltip`

          return (
            <button
              key={overlay.id}
              type="button"
              data-overlay-id={overlay.id}
              aria-label={overlay.ariaLabel}
              aria-describedby={tooltipId}
              className={cn(
                "group relative flex h-full w-full items-center justify-center rounded-lg border border-primary/50 bg-primary/10 px-3 py-2 text-sm font-semibold text-primary shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background hover:bg-primary/20",
                overlay.className,
              )}
              onClick={() => handleActivate(overlay)}
            >
              <span>{overlay.shortLabel}</span>
              <span
                id={tooltipId}
                role="tooltip"
                className="pointer-events-none absolute -top-2 left-1/2 z-20 w-48 -translate-x-1/2 -translate-y-full rounded-md border border-border bg-background/95 p-2 text-left text-xs text-foreground opacity-0 shadow-lg transition duration-150 group-focus-visible:opacity-100 group-hover:opacity-100"
              >
                <span className="block text-sm font-semibold">{overlay.label}</span>
                <span className="mt-1 block text-[11px] text-muted-foreground">{overlay.tooltip}</span>
              </span>
            </button>
          )
        })}
      </div>
      <p className="text-xs text-muted-foreground">
        Use Tab to move between overlays, then press Enter to open the linked workflow.
      </p>
    </div>
  )
}

export default FloorPlanOverlayMap
