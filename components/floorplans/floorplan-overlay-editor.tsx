"use client"

import { useEffect, useMemo, useRef, useState, useTransition } from "react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { toast } from "@/components/ui/use-toast"
import {
  fromNormalizedPoint,
  serializeNormalizedPolygon,
  toNormalizedPoint,
} from "@/lib/floorplan-geometry"
import type { NormalizedPoint } from "@/lib/schemas/overlay-shape"
import { cn } from "@/lib/utils"
import type { Floorplan, OverlayShape } from "@/types/floorplans"

const MIN_POINTS = 3

type TenantOption = {
  id: string
  label: string
}

type SaveOverlayHandler = (payload: {
  id?: string
  floorplanId: string
  label: string
  type: string
  polygon: NormalizedPoint[]
  tenantId: string | null
}) => Promise<void>

type DeleteOverlayHandler = (payload: {
  id: string
  floorplanId: string
}) => Promise<void>

type FloorplanOverlayEditorProps = {
  floorplan: Floorplan
  overlays: OverlayShape[]
  tenants: TenantOption[]
  onSave: SaveOverlayHandler
  onDelete: DeleteOverlayHandler
}

type Dimensions = {
  width: number
  height: number
}

export function FloorplanOverlayEditor({
  floorplan,
  overlays,
  tenants,
  onSave,
  onDelete,
}: FloorplanOverlayEditorProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const [dimensions, setDimensions] = useState<Dimensions>({ width: 0, height: 0 })
  const [draftPoints, setDraftPoints] = useState<NormalizedPoint[]>([])
  const [editingShapeId, setEditingShapeId] = useState<string | null>(null)
  const [label, setLabel] = useState("")
  const [type, setType] = useState("custom")
  const [tenantId, setTenantId] = useState<string | null>(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [dragIndex, setDragIndex] = useState<number | null>(null)
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    if (!containerRef.current) {
      return
    }

    const updateDimensions = () => {
      if (!containerRef.current) {
        return
      }

      const rect = containerRef.current.getBoundingClientRect()
      setDimensions({ width: rect.width, height: rect.height })
    }

    updateDimensions()

    if (typeof ResizeObserver !== "undefined") {
      const observer = new ResizeObserver(updateDimensions)
      observer.observe(containerRef.current)

      return () => observer.disconnect()
    }

    window.addEventListener("resize", updateDimensions)
    return () => window.removeEventListener("resize", updateDimensions)
  }, [])

  useEffect(() => {
    if (dragIndex === null) {
      return
    }

    const handlePointerMove = (event: PointerEvent) => {
      if (!containerRef.current) {
        return
      }

      const rect = containerRef.current.getBoundingClientRect()
      const x = event.clientX - rect.left
      const y = event.clientY - rect.top
      const normalized = toNormalizedPoint(x, y, rect.width, rect.height)

      setDraftPoints((current) => {
        const next = [...current]
        next[dragIndex] = normalized
        return next
      })
    }

    const handlePointerUp = () => setDragIndex(null)

    window.addEventListener("pointermove", handlePointerMove)
    window.addEventListener("pointerup", handlePointerUp)

    return () => {
      window.removeEventListener("pointermove", handlePointerMove)
      window.removeEventListener("pointerup", handlePointerUp)
    }
  }, [dragIndex])

  const resetState = () => {
    setIsDrawing(false)
    setDraftPoints([])
    setEditingShapeId(null)
    setLabel("")
    setType("custom")
    setTenantId(null)
  }

  const handleStartDrawing = () => {
    resetState()
    setIsDrawing(true)
  }

  const handleCanvasClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (!isDrawing || !containerRef.current) {
      return
    }

    const rect = containerRef.current.getBoundingClientRect()
    const x = event.clientX - rect.left
    const y = event.clientY - rect.top
    const normalized = toNormalizedPoint(x, y, rect.width, rect.height)

    setDraftPoints((points) => [...points, normalized])
  }

  const handleEditShape = (shape: OverlayShape) => {
    setIsDrawing(true)
    setEditingShapeId(shape.id)
    setDraftPoints(shape.polygon)
    setLabel(shape.label)
    setType(shape.type)
    setTenantId(shape.tenantId)
  }

  const handleDelete = (id: string) => {
    startTransition(async () => {
      try {
        await onDelete({ id, floorplanId: floorplan.id })
        toast({
          title: "Overlay removed",
          description: "The selected overlay has been deleted.",
        })
        resetState()
      } catch (error) {
        toast({
          title: "Unable to delete overlay",
          description:
            error instanceof Error
              ? error.message
              : "Something went wrong while deleting the overlay.",
          variant: "destructive",
        })
      }
    })
  }

  const handleSave = () => {
    if (draftPoints.length < MIN_POINTS) {
      toast({
        title: "Add more points",
        description: "Draw at least three points to define an area.",
        variant: "destructive",
      })
      return
    }

    if (!label.trim()) {
      toast({
        title: "Label is required",
        description: "Give the overlay a descriptive label before saving.",
        variant: "destructive",
      })
      return
    }

    const payload = {
      id: editingShapeId ?? undefined,
      floorplanId: floorplan.id,
      label: label.trim(),
      type: type.trim() || "custom",
      polygon: serializeNormalizedPolygon(draftPoints),
      tenantId,
    }

    startTransition(async () => {
      try {
        await onSave(payload)
        toast({
          title: editingShapeId ? "Overlay updated" : "Overlay saved",
          description: "Changes to the floorplan overlay have been saved.",
        })
        resetState()
      } catch (error) {
        toast({
          title: "Unable to save overlay",
          description:
            error instanceof Error
              ? error.message
              : "Something went wrong while saving the overlay.",
          variant: "destructive",
        })
      }
    })
  }

  const overlayPolygons = useMemo(() => {
    if (!dimensions.width || !dimensions.height) {
      return []
    }

    return overlays.map((shape) => ({
      shape,
      points: shape.polygon
        .map((point) => fromNormalizedPoint(point, dimensions.width, dimensions.height))
        .map((point) => `${point.x},${point.y}`)
        .join(" "),
    }))
  }, [dimensions.height, dimensions.width, overlays])

  const draftPolyline = useMemo(() => {
    if (!dimensions.width || !dimensions.height) {
      return ""
    }

    return draftPoints
      .map((point) => fromNormalizedPoint(point, dimensions.width, dimensions.height))
      .map((point) => `${point.x},${point.y}`)
      .join(" ")
  }, [dimensions.height, dimensions.width, draftPoints])

  return (
    <div className="space-y-6">
      <div className="rounded-lg border bg-card p-4 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row">
          <div className="md:w-2/3">
            <div className="mb-3 space-y-2">
              <h2 className="text-lg font-semibold">{floorplan.name}</h2>
              <p className="text-sm text-muted-foreground">
                Click to drop points and outline an area. Drag the handles to fine-tune
                the shape. All coordinates are stored as values between 0 and 1 so
                overlays stay aligned on responsive layouts.
              </p>
            </div>
            <div
              ref={containerRef}
              className={cn(
                "relative aspect-[4/3] w-full overflow-hidden rounded-md border",
                isDrawing ? "cursor-crosshair" : "cursor-pointer",
              )}
              onClick={handleCanvasClick}
              role="img"
              aria-label={`Floorplan ${floorplan.name}`}
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
                {overlayPolygons.map((shape) => (
                  <polygon
                    key={shape.shape.id}
                    points={shape.points}
                    className={cn(
                      "pointer-events-auto fill-primary/10 stroke-primary",
                      shape.shape.id === editingShapeId && "fill-primary/20 stroke-2",
                    )}
                    strokeWidth={shape.shape.id === editingShapeId ? 2.5 : 1.5}
                    onClick={(event) => {
                      event.stopPropagation()
                      if (!isDrawing) {
                        handleEditShape(shape.shape)
                      }
                    }}
                    aria-label={`${shape.shape.label} (${shape.shape.type})`}
                  />
                ))}
                {draftPoints.length > 0 ? (
                  <>
                    <polyline
                      points={draftPolyline}
                      className="fill-primary/20 stroke-primary"
                      strokeDasharray={editingShapeId ? undefined : "6 4"}
                      strokeWidth={2}
                    />
                    {draftPoints.map((point, index) => {
                      const absolute = fromNormalizedPoint(
                        point,
                        dimensions.width,
                        dimensions.height,
                      )

                      return (
                        <circle
                          key={`${point.x}-${point.y}-${index}`}
                          cx={absolute.x}
                          cy={absolute.y}
                          r={6}
                          className="pointer-events-auto fill-primary stroke-background"
                          onPointerDown={(event) => {
                            event.preventDefault()
                            event.stopPropagation()
                            setDragIndex(index)
                          }}
                          aria-label={`Point ${index + 1}`}
                        />
                      )
                    })}
                  </>
                ) : null}
              </svg>
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <Button type="button" onClick={handleStartDrawing} disabled={isPending}>
                {editingShapeId ? "Draw new overlay" : "Start drawing"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={resetState}
                disabled={!isDrawing && !editingShapeId}
              >
                Cancel editing
              </Button>
              <Button
                type="button"
                onClick={handleSave}
                disabled={isPending || draftPoints.length < MIN_POINTS}
              >
                {editingShapeId ? "Update overlay" : "Save overlay"}
              </Button>
              <span className="text-sm text-muted-foreground">
                {draftPoints.length >= MIN_POINTS
                  ? `${draftPoints.length} points`
                  : (() => {
                      const remaining = MIN_POINTS - draftPoints.length
                      return `Place ${remaining} more point${
                        remaining === 1 ? "" : "s"
                      } to complete the shape`
                    })()}
              </span>
            </div>
          </div>
          <div className="md:w-1/3 md:pl-6">
            <div className="space-y-4 rounded-md border bg-muted/20 p-4">
              <div className="space-y-2">
                <Label htmlFor="overlay-label">Overlay label</Label>
                <Input
                  id="overlay-label"
                  value={label}
                  onChange={(event) => setLabel(event.target.value)}
                  placeholder="e.g. Bedroom A"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="overlay-type">Overlay type</Label>
                <Input
                  id="overlay-type"
                  value={type}
                  onChange={(event) => setType(event.target.value)}
                  placeholder="e.g. bedroom"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="overlay-tenant">Assigned tenant (optional)</Label>
                <Select
                  value={tenantId ?? ""}
                  onValueChange={(value) => {
                    if (!value) {
                      setTenantId(null)
                      return
                    }
                    setTenantId(value)
                  }}
                >
                  <SelectTrigger id="overlay-tenant">
                    <SelectValue placeholder="Unassigned" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Unassigned</SelectItem>
                    {tenants.map((tenant) => (
                      <SelectItem key={tenant.id} value={tenant.id}>
                        {tenant.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="mt-6 space-y-3">
              <h3 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
                Existing overlays
              </h3>
              {overlays.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No overlays have been created for this floorplan yet.
                </p>
              ) : (
                <ul className="space-y-2">
                  {overlays.map((shape) => (
                    <li
                      key={shape.id}
                      className={cn(
                        "rounded-md border bg-background p-3",
                        editingShapeId === shape.id && "border-primary",
                      )}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-medium">{shape.label}</p>
                          <p className="text-xs text-muted-foreground">
                            {shape.type} · {shape.polygon.length} points
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {shape.tenantId
                              ? tenants.find((tenant) => tenant.id === shape.tenantId)?.label ??
                                "Assigned tenant"
                              : "Unassigned"}
                          </p>
                        </div>
                        <div className="flex flex-col gap-2">
                          <Button
                            type="button"
                            variant="secondary"
                            size="sm"
                            onClick={() => handleEditShape(shape)}
                          >
                            Edit
                          </Button>
                          <Button
                            type="button"
                            variant="destructive"
                            size="sm"
                            onClick={() => handleDelete(shape.id)}
                            disabled={isPending}
                          >
                            Delete
                          </Button>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
