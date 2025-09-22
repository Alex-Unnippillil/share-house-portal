"use client"

import { useEffect, useMemo, useRef, useState } from "react"

import {
  fromNormalizedPoint,
  parseNormalizedPolygon,
} from "@/lib/floorplan-geometry"
import type { Floorplan, OverlayShape } from "@/types/floorplans"

import { cn } from "@/lib/utils"

type FloorplanOverlayViewerProps = {
  floorplan: Floorplan
  overlays: OverlayShape[]
  tenantId: string | null
}

type Dimensions = {
  width: number
  height: number
}

export function FloorplanOverlayViewer({
  floorplan,
  overlays,
  tenantId,
}: FloorplanOverlayViewerProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const [dimensions, setDimensions] = useState<Dimensions>({ width: 0, height: 0 })

  useEffect(() => {
    if (!containerRef.current) {
      return
    }

    const update = () => {
      if (!containerRef.current) {
        return
      }

      const rect = containerRef.current.getBoundingClientRect()
      setDimensions({ width: rect.width, height: rect.height })
    }

    update()

    if (typeof ResizeObserver !== "undefined") {
      const observer = new ResizeObserver(update)
      observer.observe(containerRef.current)
      return () => observer.disconnect()
    }

    window.addEventListener("resize", update)
    return () => window.removeEventListener("resize", update)
  }, [])

  const polygons = useMemo(() => {
    if (!dimensions.width || !dimensions.height) {
      return []
    }

    return overlays.map((shape) => {
      const normalized = parseNormalizedPolygon(shape.polygon)
      const points = normalized
        .map((point) => fromNormalizedPoint(point, dimensions.width, dimensions.height))
        .map((point) => `${point.x},${point.y}`)
        .join(" ")

      return {
        shape,
        points,
        isTenant: tenantId != null && shape.tenantId === tenantId,
      }
    })
  }, [dimensions.height, dimensions.width, overlays, tenantId])

  const tenantShape = polygons.find((polygon) => polygon.isTenant)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold">{floorplan.name}</h2>
          <p className="text-sm text-muted-foreground">
            Areas assigned to you are outlined in bold blue with a contrasting pattern
            for improved visibility.
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <span className="flex h-4 w-4 items-center justify-center rounded-sm border-2 border-blue-600 bg-blue-500/30">
            <span className="h-2 w-2 rounded-[2px] bg-blue-900" />
          </span>
          <span>Your space</span>
        </div>
      </div>
      <div
        ref={containerRef}
        className="relative aspect-[4/3] w-full overflow-hidden rounded-lg border"
        role="img"
        aria-label={`Floorplan view for ${floorplan.name}`}
      >
        <img
          src={floorplan.imageUrl}
          alt={`Floorplan ${floorplan.name}`}
          className="size-full object-contain"
        />
        <svg
          className="absolute inset-0 size-full"
          viewBox={`0 0 ${Math.max(dimensions.width, 1)} ${Math.max(dimensions.height, 1)}`}
          preserveAspectRatio="none"
        >
          {polygons.map((polygon) => (
            <polygon
              key={polygon.shape.id}
              points={polygon.points}
              className={cn(
                "fill-primary/5 stroke-muted-foreground",
                polygon.isTenant &&
                  "fill-blue-500/25 stroke-blue-600 stroke-[3] [stroke-dasharray:8_4]",
              )}
              aria-label={`${polygon.shape.label} (${polygon.shape.type})`}
            />
          ))}
        </svg>
      </div>
      {tenantShape ? (
        <div className="rounded-md border bg-blue-50 p-4 text-sm text-blue-900 dark:bg-blue-500/10 dark:text-blue-100">
          <p className="font-medium">{tenantShape.shape.label}</p>
          <p className="mt-1">
            This area is assigned to you. The outline uses a thick dashed stroke with a
            high-contrast blue fill to support low-vision viewing.
          </p>
        </div>
      ) : (
        <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
          No area is currently assigned to your profile on this floorplan.
        </div>
      )}
    </div>
  )
}
