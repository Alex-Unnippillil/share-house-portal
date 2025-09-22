"use client"

import { useEffect, useMemo, useState } from "react"

import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"
import type { FloorplanOverlay } from "@/lib/floorplans"

type FloorplanViewModel = {
  id: number
  name: string
  description: string | null
  width: number
  height: number
  publicUrl: string | null
  overlaysParsed: FloorplanOverlay[]
  household_id: string | null
}

export function FloorplanClient({ floorplans }: { floorplans: FloorplanViewModel[] }) {
  const [activeId, setActiveId] = useState(() => (floorplans[0] ? String(floorplans[0].id) : ""))
  const [selectedOverlayId, setSelectedOverlayId] = useState<string | null>(null)
  const [hoveredOverlayId, setHoveredOverlayId] = useState<string | null>(null)

  useEffect(() => {
    if (!activeId && floorplans[0]) {
      setActiveId(String(floorplans[0].id))
    }
  }, [activeId, floorplans])

  const activeFloorplan = useMemo(() => {
    return floorplans.find((plan) => String(plan.id) === activeId) ?? null
  }, [floorplans, activeId])

  useEffect(() => {
    if (activeFloorplan) {
      setSelectedOverlayId(activeFloorplan.overlaysParsed[0]?.id ?? null)
    }
  }, [activeFloorplan])

  if (floorplans.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-muted-foreground/40 bg-muted/30 p-8 text-center">
        <p className="text-sm text-muted-foreground">
          Your household doesn&apos;t have any shared floorplans yet. Once an administrator uploads one it will appear here with
          roommate overlays.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Household floorplans</h1>
          <p className="text-sm text-muted-foreground">
            Explore shared spaces and roommate assignments. Overlays scale with your device for a crisp viewing experience.
          </p>
        </div>
        {floorplans.length > 1 && (
          <div className="w-full sm:w-64">
            <Select value={activeId || undefined} onValueChange={(value) => setActiveId(value)}>
              <SelectTrigger>
                <SelectValue placeholder="Select a floorplan" />
              </SelectTrigger>
              <SelectContent>
                {floorplans.map((plan) => (
                  <SelectItem key={plan.id} value={String(plan.id)}>
                    {plan.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      {activeFloorplan ? (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
          <div className="space-y-4">
            <div className="overflow-hidden rounded-lg border bg-card shadow-sm">
              {activeFloorplan.publicUrl ? (
                <svg
                  viewBox={`0 0 ${activeFloorplan.width} ${activeFloorplan.height}`}
                  className="h-auto w-full"
                  role="img"
                  aria-label={`Floorplan for ${activeFloorplan.name}`}
                  preserveAspectRatio="xMidYMid meet"
                >
                  <image
                    href={activeFloorplan.publicUrl}
                    width={activeFloorplan.width}
                    height={activeFloorplan.height}
                    preserveAspectRatio="xMidYMid meet"
                  />
                  {activeFloorplan.overlaysParsed.map((overlay) => {
                    const isActive = selectedOverlayId === overlay.id || hoveredOverlayId === overlay.id
                    const strokeColor = overlay.color ?? "#2563eb"

                    return (
                      <g key={overlay.id} className="cursor-pointer" onClick={() => setSelectedOverlayId(overlay.id)}>
                        <title>{overlay.label}</title>
                        <rect
                          x={overlay.x}
                          y={overlay.y}
                          width={overlay.width}
                          height={overlay.height}
                          fill={overlay.color ?? "#2563eb"}
                          fillOpacity={isActive ? 0.35 : 0.18}
                          stroke={strokeColor}
                          strokeWidth={isActive ? 3 : 2}
                          rx={8}
                          onMouseEnter={() => setHoveredOverlayId(overlay.id)}
                          onMouseLeave={() => setHoveredOverlayId(null)}
                          tabIndex={0}
                          onFocus={() => setHoveredOverlayId(overlay.id)}
                          onBlur={() => setHoveredOverlayId(null)}
                          onKeyDown={(event) => {
                            if (event.key === "Enter" || event.key === " ") {
                              event.preventDefault()
                              setSelectedOverlayId(overlay.id)
                            }
                          }}
                        />
                        <text
                          x={overlay.x + overlay.width / 2}
                          y={overlay.y + overlay.height / 2}
                          textAnchor="middle"
                          dominantBaseline="middle"
                          fontSize={Math.max(12, Math.min(18, overlay.width / 6))}
                          fontWeight={600}
                          fill="#ffffff"
                          style={{ paintOrder: "stroke" }}
                        >
                          {overlay.label}
                        </text>
                      </g>
                    )
                  })}
                </svg>
              ) : (
                <div className="flex h-80 items-center justify-center bg-muted text-sm text-muted-foreground">
                  Floorplan preview unavailable.
                </div>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
              <Badge variant="secondary" className="text-sm font-medium">
                {activeFloorplan.width}×{activeFloorplan.height}px
              </Badge>
              {activeFloorplan.household_id && (
                <span>
                  Household ID: <span className="font-medium text-foreground">{activeFloorplan.household_id}</span>
                </span>
              )}
              {activeFloorplan.description && <span>{activeFloorplan.description}</span>}
            </div>
          </div>

          <aside className="space-y-4 rounded-lg border bg-card p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold">Overlay regions</h2>
              <Badge variant="outline">
                {activeFloorplan.overlaysParsed.length === 1
                  ? "1 region"
                  : `${activeFloorplan.overlaysParsed.length} regions`}
              </Badge>
            </div>

            {activeFloorplan.overlaysParsed.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                This floorplan doesn&apos;t have any overlays yet. Ask your household admin to assign storage zones or roommate areas.
              </p>
            ) : (
              <ScrollArea className="max-h-[420px] pr-2">
                <div className="space-y-2">
                  {activeFloorplan.overlaysParsed.map((overlay) => {
                    const isSelected = selectedOverlayId === overlay.id

                    return (
                      <button
                        key={overlay.id}
                        type="button"
                        onClick={() => setSelectedOverlayId(overlay.id)}
                        onMouseEnter={() => setHoveredOverlayId(overlay.id)}
                        onMouseLeave={() => setHoveredOverlayId(null)}
                        className={cn(
                          "w-full rounded-md border px-3 py-2 text-left transition",
                          isSelected
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-border bg-background hover:border-primary/40 hover:bg-muted",
                        )}
                      >
                        <div className="flex items-center justify-between text-sm font-medium">
                          <span>{overlay.label}</span>
                          <Badge variant="outline" className="text-[10px]">
                            {Math.round(overlay.width)}×{Math.round(overlay.height)}
                          </Badge>
                        </div>
                        <div className="mt-1 space-y-1 text-xs text-muted-foreground">
                          <p>
                            Position: {Math.round(overlay.x)}, {Math.round(overlay.y)}
                          </p>
                          {overlay.occupant && (
                            <p>
                              Assigned to <span className="font-medium text-foreground">{overlay.occupant}</span>
                            </p>
                          )}
                          {overlay.description && <p>{overlay.description}</p>}
                        </div>
                      </button>
                    )
                  })}
                </div>
              </ScrollArea>
            )}
          </aside>
        </div>
      ) : (
        <div className="rounded-lg border border-dashed border-muted-foreground/40 bg-muted/30 p-6 text-center text-sm text-muted-foreground">
          Select a floorplan to view overlays and assignments.
        </div>
      )}
    </div>
  )
}
