'use client'

import { useCallback, useMemo, useRef, useState } from 'react'
import Image from 'next/image'
import { formatDistanceToNow, parseISO } from 'date-fns'
import { ZoomIn, ZoomOut, RotateCcw } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card'
import { Slider } from '@/components/ui/slider'
import { cn } from '@/lib/utils'

import type { DiagramLabel } from '@/lib/shared-space-maps'

import type { TenantSharedSpaceDiagram } from '../actions'

const MIN_SCALE = 0.75
const MAX_SCALE = 3
const SCALE_STEP = 0.15

type PointerPosition = { x: number; y: number }

type DiagramViewerProps = {
  diagram: TenantSharedSpaceDiagram
}

export function SharedSpaceDiagramCard({ diagram }: DiagramViewerProps) {
  const [scale, setScale] = useState(1)
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const [isPanning, setIsPanning] = useState(false)
  const [aspectRatio, setAspectRatio] = useState(4 / 3)
  const pointerRef = useRef<PointerPosition | null>(null)

  const clampScale = useCallback((value: number) => {
    if (Number.isNaN(value)) {
      return 1
    }

    return Math.min(MAX_SCALE, Math.max(MIN_SCALE, value))
  }, [])

  const handleWheel = useCallback((event: React.WheelEvent<HTMLDivElement>) => {
    event.preventDefault()
    const direction = event.deltaY > 0 ? -SCALE_STEP : SCALE_STEP
    setScale((previous) => clampScale(previous + direction))
  }, [clampScale])

  const handlePointerDown = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId)
    pointerRef.current = { x: event.clientX, y: event.clientY }
    setIsPanning(true)
  }, [])

  const handlePointerMove = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    if (!isPanning || !pointerRef.current) {
      return
    }

    const dx = event.clientX - pointerRef.current.x
    const dy = event.clientY - pointerRef.current.y

    setOffset((previous) => ({ x: previous.x + dx, y: previous.y + dy }))
    pointerRef.current = { x: event.clientX, y: event.clientY }
  }, [isPanning])

  const endPan = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
    pointerRef.current = null
    setIsPanning(false)
  }, [])

  const resetView = useCallback(() => {
    setScale(1)
    setOffset({ x: 0, y: 0 })
  }, [])

  const handleSliderChange = useCallback((value: number[]) => {
    const nextValue = value?.[0]
    if (typeof nextValue !== 'number') {
      return
    }
    setScale(clampScale(nextValue / 100))
  }, [clampScale])

  const formattedUpdatedAt = useMemo(() => {
    try {
      return formatDistanceToNow(parseISO(diagram.updatedAt), { addSuffix: true })
    } catch (error) {
      return null
    }
  }, [diagram.updatedAt])

  const formattedUploadedAt = useMemo(() => {
    try {
      return formatDistanceToNow(parseISO(diagram.lastUploadedAt), { addSuffix: true })
    } catch (error) {
      return null
    }
  }, [diagram.lastUploadedAt])

  const handleLabelPointerDown = useCallback((event: React.PointerEvent<HTMLButtonElement>) => {
    event.stopPropagation()
    setIsPanning(false)
  }, [])

  return (
    <article className="space-y-4 rounded-xl border bg-card p-6 shadow-sm">
      <header className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-xl font-semibold">
            {diagram.title ?? `Lease ${diagram.leaseId}`}
          </h3>
          <p className="text-sm text-muted-foreground">
            Lease <span className="font-medium">{diagram.leaseId}</span>
            {diagram.unitId ? (
              <>
                {' · '}Unit <span className="font-medium">{diagram.unitId}</span>
              </>
            ) : null}
          </p>
        </div>
        <div className="flex flex-col text-right text-xs text-muted-foreground sm:text-sm">
          {formattedUpdatedAt ? <span>Updated {formattedUpdatedAt}</span> : null}
          {formattedUploadedAt ? <span>File refreshed {formattedUploadedAt}</span> : null}
        </div>
      </header>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={() => setScale((previous) => clampScale(previous - SCALE_STEP))}
            aria-label="Zoom out"
          >
            <ZoomOut className="size-4" />
          </Button>
          <Slider
            min={MIN_SCALE * 100}
            max={MAX_SCALE * 100}
            step={5}
            value={[scale * 100]}
            onValueChange={handleSliderChange}
            className="w-full sm:w-48"
            aria-label="Zoom level"
          />
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={() => setScale((previous) => clampScale(previous + SCALE_STEP))}
            aria-label="Zoom in"
          >
            <ZoomIn className="size-4" />
          </Button>
          <Button type="button" variant="ghost" size="icon" onClick={resetView} aria-label="Reset view">
            <RotateCcw className="size-4" />
          </Button>
        </div>
        {diagram.metadata.notes ? (
          <p className="text-sm text-muted-foreground sm:max-w-md sm:text-right">
            {diagram.metadata.notes}
          </p>
        ) : null}
      </div>

      <div
        className="relative w-full overflow-hidden rounded-lg border bg-muted"
        style={{ aspectRatio, minHeight: '320px' }}
        onWheel={handleWheel}
      >
        <div
          className={cn(
            'relative size-full select-none',
            isPanning ? 'cursor-grabbing' : 'cursor-grab'
          )}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={endPan}
          onPointerLeave={endPan}
          style={{ touchAction: 'none' }}
        >
          <div
            className="relative size-full"
            style={{
              transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`,
              transformOrigin: 'center',
            }}
          >
            <Image
              src={diagram.signedUrl}
              alt={diagram.title ?? 'Shared space diagram'}
              fill
              priority={false}
              sizes="(min-width: 1024px) 640px, 100vw"
              className="pointer-events-none select-none object-contain"
              onLoadingComplete={(image) => {
                if (image.naturalWidth && image.naturalHeight) {
                  setAspectRatio(image.naturalWidth / image.naturalHeight)
                }
              }}
            />

            {diagram.metadata.roomLabels?.map((label) => (
              <DiagramLabelMarker key={label.id} label={label} onPointerDown={handleLabelPointerDown} />
            ))}
          </div>
        </div>
      </div>

      {diagram.description ? (
        <p className="text-sm text-muted-foreground">{diagram.description}</p>
      ) : null}
    </article>
  )
}

type DiagramLabelMarkerProps = {
  label: DiagramLabel
  onPointerDown: (event: React.PointerEvent<HTMLButtonElement>) => void
}

function DiagramLabelMarker({ label, onPointerDown }: DiagramLabelMarkerProps) {
  return (
    <HoverCard openDelay={100} closeDelay={100}>
      <HoverCardTrigger asChild>
        <button
          type="button"
          onPointerDown={onPointerDown}
          className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full border border-background bg-primary/90 p-1 text-primary-foreground shadow focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
          style={{ left: `${label.x * 100}%`, top: `${label.y * 100}%` }}
        >
          <span className="sr-only">{label.label}</span>
          <span className="block size-2 rounded-full bg-background" />
        </button>
      </HoverCardTrigger>
      <HoverCardContent side="top" align="center">
        <div className="space-y-1">
          <p className="font-medium leading-none">{label.label}</p>
          {label.description ? (
            <p className="text-sm text-muted-foreground">{label.description}</p>
          ) : null}
        </div>
      </HoverCardContent>
    </HoverCard>
  )
}
