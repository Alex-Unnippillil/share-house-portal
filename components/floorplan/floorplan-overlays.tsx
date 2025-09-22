"use client"

import { useMemo, useState } from "react"
import {
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronUpIcon,
} from "@radix-ui/react-icons"

import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import { cn } from "@/lib/utils"
import {
  PAN_RANGE,
  ZOOM_RANGE,
  useFloorplanPreferences,
} from "@/hooks/use-floorplan-preferences"

const overlayThemes = {
  storage: {
    active: "border-overlay-storage bg-overlay-storage/80 text-overlay-storage-foreground shadow-lg",
    inactive: "border-overlay-outline/60 bg-transparent text-overlay-surface-foreground/70",
    legend: "border-overlay-storage/60 bg-overlay-storage/15 text-overlay-storage-foreground",
    dot: "bg-overlay-storage",
  },
  chores: {
    active: "border-overlay-chores bg-overlay-chores/80 text-overlay-chores-foreground shadow-lg",
    inactive: "border-overlay-outline/60 bg-transparent text-overlay-surface-foreground/70",
    legend: "border-overlay-chores/60 bg-overlay-chores/15 text-overlay-chores-foreground",
    dot: "bg-overlay-chores",
  },
  maintenance: {
    active:
      "border-overlay-maintenance bg-overlay-maintenance/80 text-overlay-maintenance-foreground shadow-lg",
    inactive: "border-overlay-outline/60 bg-transparent text-overlay-surface-foreground/70",
    legend: "border-overlay-maintenance/60 bg-overlay-maintenance/15 text-overlay-maintenance-foreground",
    dot: "bg-overlay-maintenance",
  },
  visitors: {
    active: "border-overlay-visitors bg-overlay-visitors/80 text-overlay-visitors-foreground shadow-lg",
    inactive: "border-overlay-outline/60 bg-transparent text-overlay-surface-foreground/70",
    legend: "border-overlay-visitors/60 bg-overlay-visitors/15 text-overlay-visitors-foreground",
    dot: "bg-overlay-visitors",
  },
} as const

type OverlayThemeName = keyof typeof overlayThemes

interface OverlayDefinition {
  id: string
  name: string
  description: string
  theme: OverlayThemeName
  area: {
    top: string
    left: string
    width: string
    height: string
  }
}

const overlays: OverlayDefinition[] = [
  {
    id: "storage",
    name: "Storage lockers",
    description:
      "Assigned shelving for each roommate. Keep bulky gear secured without overcrowding shared closets.",
    theme: "storage",
    area: {
      top: "7%",
      left: "6%",
      width: "34%",
      height: "38%",
    },
  },
  {
    id: "chores",
    name: "Cleaning rotation",
    description:
      "Kitchen and living room duties rotate weekly. The active roommate receives reminders the night before.",
    theme: "chores",
    area: {
      top: "7%",
      left: "58%",
      width: "34%",
      height: "38%",
    },
  },
  {
    id: "maintenance",
    name: "Maintenance tasks",
    description:
      "Track filter swaps, appliance servicing, and shared supply restocks. Completed items sync back to management.",
    theme: "maintenance",
    area: {
      top: "54%",
      left: "6%",
      width: "34%",
      height: "36%",
    },
  },
  {
    id: "visitors",
    name: "Quiet hours & guests",
    description:
      "Overnight guest approvals and quiet hours live here. Everyone sees the schedule and policy reminders at a glance.",
    theme: "visitors",
    area: {
      top: "54%",
      left: "58%",
      width: "34%",
      height: "36%",
    },
  },
]

const PAN_STEP = 32

const formatPanLabel = (value: number) => `${Math.round(value)}px`

export default function FloorplanOverlays() {
  const { preferences, setPreferences, reset, isHydrated } = useFloorplanPreferences()

  const [activeOverlays, setActiveOverlays] = useState<Set<string>>(
    () => new Set(overlays.map((overlay) => overlay.id))
  )

  const transformStyle = useMemo(() => {
    return {
      transform: `translate(${preferences.pan.x}px, ${preferences.pan.y}px) scale(${preferences.zoom})`,
      transformOrigin: "center",
    }
  }, [preferences.pan.x, preferences.pan.y, preferences.zoom])

  const toggleOverlay = (id: string) => {
    setActiveOverlays((previous) => {
      const next = new Set(previous)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const updateZoom = (value: number) => {
    const safeValue = Math.min(ZOOM_RANGE.max, Math.max(ZOOM_RANGE.min, Number(value.toFixed(2))))
    setPreferences((current) => ({
      ...current,
      zoom: safeValue,
    }))
  }

  const handleSliderChange = (values: number[]) => {
    if (!values?.length) return
    updateZoom(values[0])
  }

  const clampPan = (axis: "x" | "y", value: number) => {
    return Math.min(PAN_RANGE, Math.max(-PAN_RANGE, value))
  }

  const handleKeyboardPan = (axis: "x" | "y", delta: number) => {
    setPreferences((current) => ({
      ...current,
      pan: {
        ...current.pan,
        [axis]: clampPan(axis, current.pan[axis] + delta),
      },
    }))
  }

  const activeOverlayList = useMemo(() => Array.from(activeOverlays), [activeOverlays])
  const activeOverlayNames = useMemo(
    () =>
      activeOverlayList
        .map((id) => overlays.find((overlay) => overlay.id === id)?.name)
        .filter((name): name is string => Boolean(name)),
    [activeOverlayList]
  )

  return (
    <section aria-labelledby="floorplan-title" className="space-y-6">
      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex min-w-[240px] flex-1 flex-col gap-2">
            <div className="flex items-center justify-between text-sm font-medium text-overlay-surface-foreground/80">
              <span>Zoom</span>
              <span aria-live="polite">{preferences.zoom.toFixed(2)}×</span>
            </div>
            <Slider
              aria-label="Adjust floorplan zoom"
              value={[preferences.zoom]}
              min={ZOOM_RANGE.min}
              max={ZOOM_RANGE.max}
              step={0.05}
              onValueChange={handleSliderChange}
              className="w-full"
              disabled={!isHydrated}
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-overlay-surface-foreground/80">Pan</span>
            <div className="flex items-center gap-1" role="group" aria-label="Pan controls">
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => handleKeyboardPan("y", -PAN_STEP)}
                aria-label="Pan up"
                disabled={!isHydrated}
              >
                <ChevronUpIcon className="size-4" />
              </Button>
              <div className="flex flex-col gap-1">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => handleKeyboardPan("x", -PAN_STEP)}
                  aria-label="Pan left"
                  disabled={!isHydrated}
                >
                  <ChevronLeftIcon className="size-4" />
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => handleKeyboardPan("x", PAN_STEP)}
                  aria-label="Pan right"
                  disabled={!isHydrated}
                >
                  <ChevronRightIcon className="size-4" />
                </Button>
              </div>
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => handleKeyboardPan("y", PAN_STEP)}
                aria-label="Pan down"
                disabled={!isHydrated}
              >
                <ChevronDownIcon className="size-4" />
              </Button>
            </div>
            <div className="flex flex-col text-xs text-overlay-surface-foreground/70">
              <span>Horizontal: {formatPanLabel(preferences.pan.x)}</span>
              <span>Vertical: {formatPanLabel(preferences.pan.y)}</span>
            </div>
          </div>
          <Button type="button" variant="secondary" onClick={reset} disabled={!isHydrated}>
            Reset view
          </Button>
        </div>
        <p className="text-sm text-overlay-surface-foreground/70">
          Your zoom and pan preferences are stored locally and applied automatically the next time you return.
        </p>
      </div>

      <div className="space-y-3">
        <h2 className="text-base font-semibold text-overlay-surface-foreground" id="floorplan-title">
          Floorplan overlays
        </h2>
        <fieldset className="flex flex-wrap gap-3" aria-describedby="overlay-legend-help">
          <legend className="sr-only">Choose which overlays are visible</legend>
          {overlays.map((overlay) => {
            const theme = overlayThemes[overlay.theme]
            const isActive = activeOverlays.has(overlay.id)
            return (
              <label
                key={overlay.id}
                className={cn(
                  "group flex cursor-pointer items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium transition-all",
                  isActive ? theme.legend : "border-overlay-outline/60 text-overlay-surface-foreground/70"
                )}
              >
                <span
                  aria-hidden="true"
                  className={cn("size-2.5 rounded-full transition-transform", theme.dot, {
                    "scale-110": isActive,
                  })}
                />
                <input
                  type="checkbox"
                  className="sr-only"
                  checked={isActive}
                  onChange={() => toggleOverlay(overlay.id)}
                />
                <span>{overlay.name}</span>
              </label>
            )
          })}
        </fieldset>
        <p className="text-xs text-overlay-surface-foreground/60" id="overlay-legend-help">
          Toggle overlays to focus on specific assignments or policies. Tooltips offer additional context for each zone.
        </p>
      </div>

      <div className="relative aspect-[4/3] overflow-hidden rounded-2xl border border-overlay-outline bg-overlay-surface text-overlay-surface-foreground shadow-xl">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.25)_0,rgba(255,255,255,0)_70%)] opacity-80"
        />
        <div className="absolute inset-4 grid grid-cols-2 gap-4 text-sm font-medium uppercase tracking-wide text-overlay-surface-foreground/70">
          <div className="flex items-center justify-center rounded-xl border border-overlay-outline/60 bg-overlay-surface/80">
            Kitchen
          </div>
          <div className="flex items-center justify-center rounded-xl border border-overlay-outline/60 bg-overlay-surface/80">
            Living room
          </div>
          <div className="flex items-center justify-center rounded-xl border border-overlay-outline/60 bg-overlay-surface/80">
            Utility closet
          </div>
          <div className="flex items-center justify-center rounded-xl border border-overlay-outline/60 bg-overlay-surface/80">
            Bedrooms
          </div>
        </div>
        <div className="absolute inset-0" style={transformStyle}>
          {overlays.map((overlay) => {
            const theme = overlayThemes[overlay.theme]
            const isActive = activeOverlays.has(overlay.id)
            const tooltipId = `${overlay.id}-description`

            return (
              <div
                key={overlay.id}
                className="group absolute"
                style={{
                  top: overlay.area.top,
                  left: overlay.area.left,
                  width: overlay.area.width,
                  height: overlay.area.height,
                }}
              >
                <button
                  type="button"
                  aria-pressed={isActive}
                  aria-describedby={tooltipId}
                  onClick={() => toggleOverlay(overlay.id)}
                  className={cn(
                    "flex h-full w-full flex-col justify-between rounded-xl border-2 p-3 text-left transition-all focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-overlay-outline",
                    isActive ? theme.active : theme.inactive
                  )}
                >
                  <span className="text-sm font-semibold">{overlay.name}</span>
                  <span className="text-xs font-medium uppercase tracking-wide opacity-75">Tap to toggle</span>
                  <span id={tooltipId} className="sr-only">
                    {overlay.description}
                  </span>
                </button>
                <div
                  role="tooltip"
                  aria-hidden="true"
                  className="pointer-events-none absolute left-1/2 top-full z-20 mt-2 w-56 -translate-x-1/2 rounded-lg border border-overlay-outline bg-overlay-surface p-3 text-xs leading-relaxed text-overlay-surface-foreground opacity-0 shadow-lg transition-all duration-150 ease-out invisible group-hover:visible group-hover:translate-y-1 group-hover:opacity-100 group-focus-within:visible group-focus-within:translate-y-1 group-focus-within:opacity-100"
                >
                  {overlay.description}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <div className="rounded-xl border border-overlay-outline bg-overlay-surface p-4 text-sm text-overlay-surface-foreground shadow-inner">
        <h3 className="text-base font-semibold">Currently visible overlays</h3>
        <p className="mt-1 text-sm text-overlay-surface-foreground/70">
          {activeOverlayNames.length > 0
            ? activeOverlayNames.join(", ")
            : "All overlays are hidden. Enable one to see assignments on the floorplan."}
        </p>
      </div>
    </section>
  )
}
