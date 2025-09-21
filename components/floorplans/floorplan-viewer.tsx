"use client"

import {
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
  type KeyboardEvent,
} from "react"
import NextImage from "next/image"
import Link from "next/link"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { cn } from "@/lib/utils"
import {
  defaultOverlayColors,
  isPolygonGeometry,
  isRectGeometry,
  parseOverlayMetadata,
  type FloorplanOverlayWithOccupant,
  type ResidentFloorplanWithRelations,
} from "@/types/floorplans"

interface FloorplanViewerProps {
  assignment: ResidentFloorplanWithRelations
  imageUrl: string | null
  isEditable: boolean
}

const overlayOpacity = 0.35

const determineColor = (overlay: FloorplanOverlayWithOccupant): string => {
  const metadata = parseOverlayMetadata(overlay.metadata)
  if (metadata.fillColor) {
    return metadata.fillColor
  }

  return (
    defaultOverlayColors[overlay.overlay_type.toLowerCase()] ?? defaultOverlayColors.room
  )
}

const determineStrokeColor = (overlay: FloorplanOverlayWithOccupant): string => {
  const metadata = parseOverlayMetadata(overlay.metadata)
  if (metadata.strokeColor) {
    return metadata.strokeColor
  }

  const baseColor = determineColor(overlay)
  return baseColor
}

const getOverlayBoundingBox = (
  overlay: FloorplanOverlayWithOccupant
): { x: number; y: number; width: number; height: number } | null => {
  if (isRectGeometry(overlay.geometry)) {
    return {
      x: overlay.geometry.x,
      y: overlay.geometry.y,
      width: overlay.geometry.width,
      height: overlay.geometry.height,
    }
  }

  if (isPolygonGeometry(overlay.geometry) && overlay.geometry.points.length) {
    const xs = overlay.geometry.points.map((point) => point.x)
    const ys = overlay.geometry.points.map((point) => point.y)

    const minX = Math.min(...xs)
    const minY = Math.min(...ys)
    const maxX = Math.max(...xs)
    const maxY = Math.max(...ys)

    return {
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY,
    }
  }

  return null
}

export function FloorplanViewer({ assignment, imageUrl, isEditable }: FloorplanViewerProps) {
  const [enabledTypes, setEnabledTypes] = useState<string[]>([])
  const [activeOverlayId, setActiveOverlayId] = useState<string | null>(null)
  const [imageDimensions, setImageDimensions] = useState<{ width: number; height: number }>(
    { width: 1, height: 1 }
  )

  const overlays = useMemo(() => {
    if (!assignment.floorplan?.overlays) {
      return [] as FloorplanOverlayWithOccupant[]
    }

    return [...assignment.floorplan.overlays].sort(
      (a, b) => (a.display_order ?? 0) - (b.display_order ?? 0)
    )
  }, [assignment.floorplan?.overlays])

  const overlayTypes = useMemo(() => {
    return Array.from(new Set(overlays.map((overlay) => overlay.overlay_type))).sort()
  }, [overlays])

  useEffect(() => {
    setEnabledTypes((previous) => {
      if (previous.length === overlayTypes.length && previous.every((type) => overlayTypes.includes(type))) {
        return previous
      }

      return overlayTypes
    })
  }, [overlayTypes])

  useEffect(() => {
    if (!imageUrl) {
      return
    }

    const imageElement = new Image()
    imageElement.src = imageUrl
    imageElement.onload = () => {
      setImageDimensions({ width: imageElement.naturalWidth, height: imageElement.naturalHeight })
    }
  }, [imageUrl])

  const visibleOverlays = useMemo(
    () => overlays.filter((overlay) => enabledTypes.includes(overlay.overlay_type)),
    [enabledTypes, overlays]
  )

  const activeOverlay = visibleOverlays.find((overlay) => overlay.id === activeOverlayId)
  const activeOverlayMetadata = useMemo(
    () => (activeOverlay ? parseOverlayMetadata(activeOverlay.metadata) : null),
    [activeOverlay]
  )

  const handleOverlaySelection = (overlayId: string) => {
    setActiveOverlayId((current) => (current === overlayId ? null : overlayId))
  }

  const handleOverlayKeyDown = (event: KeyboardEvent<SVGElement>, overlayId: string) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault()
      handleOverlaySelection(overlayId)
    }
  }

  return (
    <Card className="overflow-hidden">
      <CardHeader className="space-y-2">
        <CardTitle>{assignment.floorplan?.name ?? "Assigned floorplan"}</CardTitle>
        <CardDescription>
          {assignment.floorplan?.unit_label
            ? `Unit ${assignment.floorplan.unit_label}`
            : "Interactive overlays highlight rooms and amenities."}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex flex-wrap gap-2">
          {overlayTypes.length ? (
            overlayTypes.map((type) => {
              const isActive = enabledTypes.includes(type)
              return (
                <Button
                  key={type}
                  variant={isActive ? "default" : "outline"}
                  size="sm"
                  onClick={() => {
                    setEnabledTypes((current) =>
                      current.includes(type)
                        ? current.filter((item) => item !== type)
                        : [...current, type]
                    )
                  }}
                >
                  {type.charAt(0).toUpperCase() + type.slice(1)}
                </Button>
              )
            })
          ) : (
            <p className="text-sm text-muted-foreground">No overlays have been defined yet.</p>
          )}
        </div>
        <div
          className="relative w-full overflow-hidden rounded-lg border bg-muted/40"
          style={{
            paddingBottom: `${(imageDimensions.height / imageDimensions.width) * 100}%`,
          }}
        >
          {imageUrl ? (
            <>
              <NextImage
                src={imageUrl}
                alt={assignment.floorplan?.name ?? "Floorplan base image"}
                fill
                sizes="100vw"
                className="object-contain"
                onLoadingComplete={(img) => {
                  setImageDimensions({ width: img.naturalWidth, height: img.naturalHeight })
                }}
                priority
              />
              <svg
                className="pointer-events-none absolute inset-0 size-full"
                viewBox={`0 0 ${imageDimensions.width} ${imageDimensions.height}`}
                role="presentation"
                aria-hidden="true"
              >
                {visibleOverlays.map((overlay) => {
                  const metadata = parseOverlayMetadata(overlay.metadata)
                  const fillColor = determineColor(overlay)
                  const strokeColor = determineStrokeColor(overlay)
                  const strokeWidth = metadata.strokeWidth ?? (overlay.id === activeOverlayId ? 3 : 2)
                  const groupProps = {
                    key: overlay.id,
                    className: cn("pointer-events-auto cursor-pointer transition-opacity", {
                      "opacity-100": overlay.id === activeOverlayId,
                      "opacity-80": overlay.id !== activeOverlayId,
                    }),
                    onClick: () => handleOverlaySelection(overlay.id),
                    onKeyDown: (event: KeyboardEvent<SVGElement>) => handleOverlayKeyDown(event, overlay.id),
                    role: "button" as const,
                    tabIndex: 0,
                    "aria-label": overlay.name,
                  }

                  const shapeProps = {
                    fill: fillColor,
                    fillOpacity: overlayOpacity,
                    stroke: strokeColor,
                    strokeWidth,
                  }

                  if (isRectGeometry(overlay.geometry)) {
                    return (
                      <g {...groupProps}>
                        <rect
                          {...shapeProps}
                          x={overlay.geometry.x}
                          y={overlay.geometry.y}
                          width={overlay.geometry.width}
                          height={overlay.geometry.height}
                        />
                      </g>
                    )
                  }

                  if (isPolygonGeometry(overlay.geometry)) {
                    const points = overlay.geometry.points
                      .map((point) => `${point.x},${point.y}`)
                      .join(" ")

                    return (
                      <g {...groupProps}>
                        <polygon {...shapeProps} points={points} />
                      </g>
                    )
                  }

                  return null
                })}
              </svg>
              <div className="pointer-events-none absolute inset-0">
                {visibleOverlays.map((overlay) => {
                  const box = getOverlayBoundingBox(overlay)

                  if (!box || imageDimensions.width === 0 || imageDimensions.height === 0) {
                    return null
                  }

                  const style = {
                    left: `${(box.x / imageDimensions.width) * 100}%`,
                    top: `${(box.y / imageDimensions.height) * 100}%`,
                    width: `${(box.width / imageDimensions.width) * 100}%`,
                    height: `${(box.height / imageDimensions.height) * 100}%`,
                  } as CSSProperties

                  return (
                    <button
                      key={`${overlay.id}-control`}
                      type="button"
                      className={cn(
                        "pointer-events-auto absolute border border-transparent bg-transparent p-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                        {
                          "ring-2 ring-ring": overlay.id === activeOverlayId,
                        }
                      )}
                      style={style}
                      aria-label={overlay.name}
                      onClick={() => handleOverlaySelection(overlay.id)}
                    >
                      <span className="sr-only">{overlay.name}</span>
                    </button>
                  )
                })}
              </div>
            </>
          ) : (
            <div className="flex min-h-64 w-full items-center justify-center p-10 text-center text-muted-foreground">
              No base floorplan image is available for this assignment yet.
            </div>
          )}
        </div>
        <div className="grid gap-4 md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
          <Card className="border-none shadow-none">
            <CardHeader className="px-0 pt-0">
              <CardTitle className="text-lg">Overlay details</CardTitle>
              <CardDescription>Select an overlay to view more information.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 px-0" data-testid="overlay-details">
              {activeOverlay ? (
                <div className="space-y-3 rounded-md border bg-background p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-base font-semibold">{activeOverlay.name}</h3>
                    <Badge variant="secondary">{activeOverlay.overlay_type}</Badge>
                  </div>
                  {activeOverlay.occupant?.full_name ? (
                    <p className="text-sm text-muted-foreground">
                      Assigned to {activeOverlay.occupant.full_name}
                    </p>
                  ) : null}
                  {activeOverlayMetadata?.amenities?.length ? (
                    <div className="space-y-1">
                      <p className="text-sm font-medium">Amenities</p>
                      <div className="flex flex-wrap gap-2">
                        {activeOverlayMetadata.amenities.map((amenity) => (
                          <Badge key={amenity} variant="outline">
                            {amenity}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  ) : null}
                  {activeOverlayMetadata?.notes ? (
                    <p className="text-sm text-muted-foreground">{activeOverlayMetadata.notes}</p>
                  ) : null}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Hover or focus an overlay to highlight it, then click to see the details here.
                </p>
              )}
            </CardContent>
          </Card>
          <Card className="border-none shadow-none">
            <CardHeader className="px-0 pt-0">
              <CardTitle className="text-lg">Legend</CardTitle>
              <CardDescription>Quick reference for visible overlays.</CardDescription>
            </CardHeader>
            <CardContent className="px-0">
              {visibleOverlays.length ? (
                <ul className="space-y-3 text-sm">
                  {visibleOverlays.map((overlay) => {
                    const fillColor = determineColor(overlay)
                    const metadata = parseOverlayMetadata(overlay.metadata)
                    return (
                      <li key={overlay.id} className="flex items-start gap-3">
                        <span
                          className="mt-1 size-3 rounded-full"
                          style={{ backgroundColor: fillColor }}
                          aria-hidden
                        />
                        <div className="space-y-1">
                          <p className="font-medium leading-none">{overlay.name}</p>
                          <p className="text-muted-foreground">
                            {metadata.notes ?? overlay.overlay_type}
                          </p>
                        </div>
                      </li>
                    )
                  })}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Enable at least one overlay type to view the legend.
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </CardContent>
      {isEditable ? (
        <CardFooter className="flex items-center justify-between gap-4">
          <p className="text-sm text-muted-foreground">
            Staff can manage overlays and floorplan assets from the admin tools.
          </p>
          <Button asChild variant="outline">
            <Link href="/dashboard/floorplan/manage">Open admin tools</Link>
          </Button>
        </CardFooter>
      ) : null}
    </Card>
  )
}

export default FloorplanViewer
