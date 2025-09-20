"use client"

import { useMemo, useRef, useState } from "react"
import Image from "next/image"
import { CalendarClock, RefreshCcw, ZoomIn, ZoomOut } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

import type { RoomLabel, SharedSpaceDiagram } from "@/lib/shared-space-maps"

const MIN_SCALE = 0.6
const MAX_SCALE = 3
const ZOOM_STEP = 0.2
const PAN_LIMIT = 800

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max)
}

function formatDate(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return "Unknown"
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date)
}

type DiagramCardProps = {
  diagram: SharedSpaceDiagram
}

export function DiagramCard({ diagram }: DiagramCardProps) {
  const [scale, setScale] = useState(1)
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const [isPanning, setIsPanning] = useState(false)
  const originRef = useRef<{ x: number; y: number } | null>(null)
  const canvasRef = useRef<HTMLDivElement | null>(null)

  const labelCount = diagram.roomLabels.length
  const metadataEntries = useMemo(() => {
    return Object.entries(diagram.metadata ?? {})
      .filter(([key]) => !["room_labels", "labels"].includes(key))
      .map(([key, value]) => {
        if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
          return [key, String(value)] as const
        }
        try {
          return [key, JSON.stringify(value, null, 0)] as const
        } catch (error) {
          console.warn("Unable to stringify metadata value", { key, error })
          return [key, ""] as const
        }
      })
      .filter(([, value]) => value.length > 0)
  }, [diagram.metadata])

  const handleZoomIn = () => {
    setScale((previous) => clamp(previous + ZOOM_STEP, MIN_SCALE, MAX_SCALE))
  }

  const handleZoomOut = () => {
    setScale((previous) => clamp(previous - ZOOM_STEP, MIN_SCALE, MAX_SCALE))
  }

  const handleReset = () => {
    setScale(1)
    setOffset({ x: 0, y: 0 })
  }

  const handleWheel: React.WheelEventHandler<HTMLDivElement> = (event) => {
    event.preventDefault()
    const delta = event.deltaY < 0 ? ZOOM_STEP : -ZOOM_STEP
    setScale((previous) => clamp(previous + delta, MIN_SCALE, MAX_SCALE))
  }

  const handlePointerDown: React.PointerEventHandler<HTMLDivElement> = (event) => {
    event.preventDefault()
    originRef.current = { x: event.clientX, y: event.clientY }
    setIsPanning(true)
    canvasRef.current?.setPointerCapture(event.pointerId)
  }

  const handlePointerMove: React.PointerEventHandler<HTMLDivElement> = (event) => {
    if (!isPanning || !originRef.current) {
      return
    }

    const deltaX = event.clientX - originRef.current.x
    const deltaY = event.clientY - originRef.current.y
    originRef.current = { x: event.clientX, y: event.clientY }

    setOffset((previous) => ({
      x: clamp(previous.x + deltaX, -PAN_LIMIT, PAN_LIMIT),
      y: clamp(previous.y + deltaY, -PAN_LIMIT, PAN_LIMIT),
    }))
  }

  const finishPan = (event: React.PointerEvent<HTMLDivElement>) => {
    originRef.current = null
    setIsPanning(false)
    try {
      canvasRef.current?.releasePointerCapture(event.pointerId)
    } catch (error) {
      // Safari may throw when pointer capture is not active
    }
  }

  const handlePointerUp: React.PointerEventHandler<HTMLDivElement> = (event) => {
    finishPan(event)
  }

  const handlePointerLeave: React.PointerEventHandler<HTMLDivElement> = (event) => {
    if (isPanning) {
      finishPan(event)
    }
  }

  return (
    <Card className="overflow-hidden">
      <CardHeader className="space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <CardTitle className="text-lg font-semibold">{diagram.title}</CardTitle>
            <CardDescription>
              Lease {diagram.leaseId}
              {diagram.unitId ? ` • Unit ${diagram.unitId}` : null}
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={handleZoomOut}
              aria-label="Zoom out"
            >
              <ZoomOut className="size-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={handleReset}
              aria-label="Reset view"
            >
              <RefreshCcw className="size-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={handleZoomIn}
              aria-label="Zoom in"
            >
              <ZoomIn className="size-4" />
            </Button>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <CalendarClock className="size-4" aria-hidden />
            Last updated {formatDate(diagram.diagramUpdatedAt)}
          </span>
          <Badge variant="outline">{labelCount} labels</Badge>
        </div>
        {diagram.description ? (
          <p className="text-sm text-muted-foreground">{diagram.description}</p>
        ) : null}
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="relative h-[420px] w-full overflow-hidden rounded-md border bg-muted">
          <div
            ref={canvasRef}
            className={cn(
              "absolute inset-0 cursor-grab select-none",
              isPanning && "cursor-grabbing"
            )}
            style={{
              transform: `translate3d(${offset.x}px, ${offset.y}px, 0) scale(${scale})`,
              transformOrigin: "center center",
            }}
            onWheel={handleWheel}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerLeave={handlePointerLeave}
          >
            {diagram.signedUrl ? (
              <Image
                src={diagram.signedUrl}
                alt={diagram.title}
                fill
                unoptimized
                sizes="(max-width: 768px) 100vw, 800px"
                priority={false}
                draggable={false}
                className="object-contain"
              />
            ) : (
              <div className="flex size-full items-center justify-center bg-background text-sm text-muted-foreground">
                Diagram not available
              </div>
            )}
            {diagram.roomLabels.map((label) => (
              <RoomLabelMarker key={label.id} label={label} />
            ))}
          </div>
        </div>
        {metadataEntries.length > 0 ? (
          <div className="space-y-2 text-sm">
            <h3 className="text-sm font-semibold">Diagram metadata</h3>
            <dl className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {metadataEntries.map(([key, value]) => (
                <div key={key} className="rounded-md border bg-background p-2">
                  <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    {key.replace(/_/g, " ")}
                  </dt>
                  <dd className="mt-1 break-words text-sm leading-snug">{value}</dd>
                </div>
              ))}
            </dl>
          </div>
        ) : null}
      </CardContent>
      <CardFooter className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
        <span>
          Storage object: <code>{diagram.bucketId}/{diagram.filePath}</code>
        </span>
        <span>Scale: {scale.toFixed(2)}×</span>
      </CardFooter>
    </Card>
  )
}

type RoomLabelMarkerProps = {
  label: RoomLabel
}

function RoomLabelMarker({ label }: RoomLabelMarkerProps) {
  return (
    <HoverCard openDelay={100} closeDelay={100}>
      <HoverCardTrigger asChild>
        <button
          type="button"
          className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full border border-background bg-primary px-2 py-1 text-xs font-medium text-primary-foreground shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          style={{
            left: `${label.x * 100}%`,
            top: `${label.y * 100}%`,
          }}
        >
          {label.title}
        </button>
      </HoverCardTrigger>
      <HoverCardContent className="text-sm">
        <p className="font-medium">{label.title}</p>
        {label.description ? <p className="mt-1 text-sm text-muted-foreground">{label.description}</p> : null}
        {label.data && Object.keys(label.data).length > 0 ? (
          <div className="mt-2 space-y-1 text-xs text-muted-foreground">
            {Object.entries(label.data).map(([key, value]) => (
              <div key={key} className="flex items-center justify-between gap-4">
                <span className="font-medium">{key}</span>
                <span>{String(value)}</span>
              </div>
            ))}
          </div>
        ) : null}
      </HoverCardContent>
    </HoverCard>
  )
}
