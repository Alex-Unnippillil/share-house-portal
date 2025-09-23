"use client"

import { type ChangeEvent, useCallback, useId, useMemo, useRef, useState } from "react"
import Cropper from "react-easy-crop"
import type { Area, Point } from "react-easy-crop"

import { Button } from "@/components/ui/button"

export interface AvatarEditorResult {
  croppedAreaPixels: Area
  zoom: number
}

interface AvatarEditorProps {
  imageSrc: string
  onCancel: () => void
  onConfirm: (result: AvatarEditorResult) => void
  aspect?: number
  disabled?: boolean
}

const INITIAL_CROP: Point = { x: 0, y: 0 }
const INITIAL_ZOOM = 1
const MIN_ZOOM = 1
const MAX_ZOOM = 3
const ZOOM_STEP = 0.1

interface HistoryEntry {
  crop: Point
  zoom: number
}

function clonePoint(point: Point): Point {
  return { x: point.x, y: point.y }
}

export default function AvatarEditor({
  imageSrc,
  onCancel,
  onConfirm,
  aspect = 1,
  disabled = false,
}: AvatarEditorProps) {
  const zoomInputId = useId()
  const [crop, setCrop] = useState<Point>(clonePoint(INITIAL_CROP))
  const [zoom, setZoom] = useState(INITIAL_ZOOM)
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null)
  const [hasHistory, setHasHistory] = useState(false)

  const historyRef = useRef<HistoryEntry[]>([{ crop: clonePoint(INITIAL_CROP), zoom: INITIAL_ZOOM }])
  const historyIndexRef = useRef(0)

  const commitHistory = useCallback(
    (nextCrop: Point, nextZoom: number) => {
      const history = historyRef.current.slice(0, historyIndexRef.current + 1)
      const lastEntry = history.at(-1)
      if (lastEntry && lastEntry.zoom === nextZoom && lastEntry.crop.x === nextCrop.x && lastEntry.crop.y === nextCrop.y) {
        historyRef.current = history
        setHasHistory(history.length > 1)
        return
      }

      history.push({ crop: clonePoint(nextCrop), zoom: nextZoom })
      historyRef.current = history
      historyIndexRef.current = history.length - 1
      setHasHistory(history.length > 1)
    },
    [],
  )

  const handleUndo = useCallback(() => {
    if (historyIndexRef.current === 0) return

    historyIndexRef.current -= 1
    const target = historyRef.current[historyIndexRef.current]
    setCrop(clonePoint(target.crop))
    setZoom(target.zoom)
    setHasHistory(historyIndexRef.current > 0)
  }, [])

  const handleReset = useCallback(() => {
    historyRef.current = [{ crop: clonePoint(INITIAL_CROP), zoom: INITIAL_ZOOM }]
    historyIndexRef.current = 0
    setCrop(clonePoint(INITIAL_CROP))
    setZoom(INITIAL_ZOOM)
    setHasHistory(false)
  }, [])

  const handleZoomChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const newZoom = Number(event.currentTarget.value)
      setZoom(newZoom)
      commitHistory(crop, newZoom)
    },
    [commitHistory, crop],
  )

  const handleInteractionEnd = useCallback(() => {
    commitHistory(crop, zoom)
  }, [commitHistory, crop, zoom])

  const canConfirm = useMemo(() => Boolean(croppedAreaPixels) && !disabled, [croppedAreaPixels, disabled])

  const handleConfirm = useCallback(() => {
    if (!croppedAreaPixels) return
    onConfirm({ croppedAreaPixels, zoom })
  }, [croppedAreaPixels, onConfirm, zoom])

  return (
    <div className="space-y-4" aria-live="polite">
      <div
        aria-busy={disabled}
        className="relative h-80 w-full overflow-hidden rounded-xl border border-dashed border-border bg-muted"
      >
        {disabled && <div aria-hidden="true" className="absolute inset-0 z-10 cursor-wait bg-background/50" />}
        <Cropper
          image={imageSrc}
          crop={crop}
          zoom={zoom}
          aspect={aspect}
          onCropChange={(nextCrop) => setCrop(nextCrop)}
          onCropComplete={(_, areaPixels) => setCroppedAreaPixels(areaPixels)}
          onZoomChange={(value) => setZoom(value)}
          onInteractionEnd={handleInteractionEnd}
          restrictPosition
          objectFit="horizontal-cover"
          showGrid={false}
        />
      </div>

      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium" htmlFor={zoomInputId}>
            Zoom
          </label>
          <input
            aria-describedby={`${zoomInputId}-helper`}
            aria-label="Zoom avatar"
            className="h-2 w-full cursor-pointer appearance-none rounded-full bg-muted"
            disabled={disabled}
            id={zoomInputId}
            max={MAX_ZOOM}
            min={MIN_ZOOM}
            onChange={handleZoomChange}
            step={ZOOM_STEP}
            type="range"
            value={zoom}
          />
          <span className="text-xs text-muted-foreground" id={`${zoomInputId}-helper`}>
            Use the arrow keys for precise zoom control.
          </span>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleUndo} type="button" variant="outline" disabled={!hasHistory || disabled}>
            Undo
          </Button>
          <Button onClick={handleReset} type="button" variant="outline" disabled={disabled}>
            Reset
          </Button>
        </div>
      </div>

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button onClick={onCancel} type="button" variant="ghost" disabled={disabled}>
          Cancel
        </Button>
        <Button onClick={handleConfirm} type="button" disabled={!canConfirm}>
          Save crop
        </Button>
      </div>
    </div>
  )
}
