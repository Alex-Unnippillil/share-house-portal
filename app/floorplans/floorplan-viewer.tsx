"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import type { KonvaEventObject } from "konva/lib/Node"
import type { Stage as KonvaStage } from "konva/lib/Stage"
import type { Vector2d } from "konva/lib/types"
import { Layer, Rect, Stage } from "react-konva"
import { Image as KonvaImage } from "react-konva"

import type { FloorplanMetadata } from "@/types/floorplans"

type FloorplanViewerProps = {
  metadata: FloorplanMetadata
  tileBaseUrl: string
}

type StageState = {
  scale: number
  position: Vector2d
}

type VisibleTile = {
  key: string
  zoom: number
  x: number
  y: number
  left: number
  top: number
  width: number
  height: number
}

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max)

export function FloorplanViewer({ metadata, tileBaseUrl }: FloorplanViewerProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const stageRef = useRef<KonvaStage | null>(null)
  const animationFrame = useRef<number | null>(null)
  const pinchDistanceRef = useRef<number | null>(null)
  const tileCacheRef = useRef<Record<string, HTMLImageElement>>({})
  const [viewport, setViewport] = useState<StageState>({
    scale: 1,
    position: { x: 0, y: 0 },
  })
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 })
  const [scaleBounds, setScaleBounds] = useState({ min: 0.1, max: 1 })
  const [, forceRender] = useState(0)

  useEffect(() => {
    tileCacheRef.current = {}
    forceRender((value) => value + 1)
  }, [metadata.planId, tileBaseUrl])

  useEffect(() => {
    const element = containerRef.current
    if (!element) {
      return
    }

    const updateSize = () => {
      setContainerSize({ width: element.clientWidth, height: element.clientHeight })
    }

    updateSize()

    const observer = new ResizeObserver(updateSize)
    observer.observe(element)

    return () => {
      observer.disconnect()
    }
  }, [])

  useEffect(() => {
    const stage = stageRef.current
    if (!stage || containerSize.width === 0 || containerSize.height === 0) {
      return
    }

    const fitScale = Math.min(
      containerSize.width / metadata.width,
      containerSize.height / metadata.height,
      1
    )
    const smallestLevelScale = metadata.levels[0]?.scale ?? fitScale
    const maxLevelScale = metadata.levels[metadata.levels.length - 1]?.scale ?? 1
    const minScale = Math.min(fitScale, smallestLevelScale)
    const maxScale = Math.max(maxLevelScale, fitScale)

    setScaleBounds({ min: minScale, max: maxScale })

    const initialScale = clamp(fitScale, minScale, maxScale)
    stage.scale({ x: initialScale, y: initialScale })
    const offsetX = (containerSize.width - metadata.width * initialScale) / 2
    const offsetY = (containerSize.height - metadata.height * initialScale) / 2
    stage.position({ x: offsetX, y: offsetY })
    stage.batchDraw()

    setViewport({
      scale: initialScale,
      position: { x: offsetX, y: offsetY },
    })
  }, [containerSize.height, containerSize.width, metadata])

  useEffect(() => {
    return () => {
      if (animationFrame.current) {
        cancelAnimationFrame(animationFrame.current)
      }
    }
  }, [])

  const sortedLevels = useMemo(() => {
    return [...metadata.levels].sort((a, b) => a.scale - b.scale)
  }, [metadata.levels])

  const activeLevel = useMemo(() => {
    const fallback = sortedLevels[sortedLevels.length - 1]
    if (!fallback) {
      return null
    }

    return (
      sortedLevels.find((level) => viewport.scale <= level.scale + 1e-6) ?? fallback
    )
  }, [sortedLevels, viewport.scale])

  const scheduleViewportUpdate = () => {
    if (animationFrame.current) {
      return
    }

    animationFrame.current = requestAnimationFrame(() => {
      animationFrame.current = null
      const stage = stageRef.current
      if (!stage) {
        return
      }

      setViewport({
        scale: stage.scaleX(),
        position: stage.position(),
      })
    })
  }

  const handleWheel = (event: KonvaEventObject<WheelEvent>) => {
    event.evt.preventDefault()
    const stage = stageRef.current
    if (!stage) {
      return
    }

    const oldScale = stage.scaleX()
    const pointer = stage.getPointerPosition()
    if (!pointer) {
      return
    }

    const direction = event.evt.deltaY > 0 ? -1 : 1
    const scaleBy = 1.04
    const nextScale = clamp(
      direction > 0 ? oldScale * scaleBy : oldScale / scaleBy,
      scaleBounds.min,
      scaleBounds.max
    )

    const mousePointTo = {
      x: (pointer.x - stage.x()) / oldScale,
      y: (pointer.y - stage.y()) / oldScale,
    }

    stage.scale({ x: nextScale, y: nextScale })
    const position = {
      x: pointer.x - mousePointTo.x * nextScale,
      y: pointer.y - mousePointTo.y * nextScale,
    }
    stage.position(position)
    stage.batchDraw()

    scheduleViewportUpdate()
  }

  const updateFromStage = () => {
    const stage = stageRef.current
    if (!stage) {
      return
    }

    setViewport({
      scale: stage.scaleX(),
      position: stage.position(),
    })
  }

  const handleDragMove = () => {
    scheduleViewportUpdate()
  }

  const handleDragEnd = () => {
    updateFromStage()
  }

  const getTouchPoint = (stage: KonvaStage, touch: Touch): Vector2d => {
    const rect = stage.container().getBoundingClientRect()
    return {
      x: touch.clientX - rect.left,
      y: touch.clientY - rect.top,
    }
  }

  const handleTouchStart = (event: KonvaEventObject<TouchEvent>) => {
    const stage = stageRef.current
    if (stage) {
      stage.draggable((event.evt.touches?.length ?? 0) < 2)
    }
    pinchDistanceRef.current = null
  }

  const handleTouchMove = (event: KonvaEventObject<TouchEvent>) => {
    const stage = stageRef.current
    if (!stage) {
      return
    }

    const [touch1, touch2] = [event.evt.touches[0], event.evt.touches[1]]
    if (touch1 && touch2) {
      stage.draggable(false)
      const point1 = getTouchPoint(stage, touch1)
      const point2 = getTouchPoint(stage, touch2)

      const center = {
        x: (point1.x + point2.x) / 2,
        y: (point1.y + point2.y) / 2,
      }

      const distance = Math.hypot(point1.x - point2.x, point1.y - point2.y)
      if (!pinchDistanceRef.current) {
        pinchDistanceRef.current = distance
        return
      }

      const oldScale = stage.scaleX()
      const scaleFactor = distance / pinchDistanceRef.current
      const nextScale = clamp(oldScale * scaleFactor, scaleBounds.min, scaleBounds.max)

      const pointTo = {
        x: (center.x - stage.x()) / oldScale,
        y: (center.y - stage.y()) / oldScale,
      }

      stage.scale({ x: nextScale, y: nextScale })
      const position = {
        x: center.x - pointTo.x * nextScale,
        y: center.y - pointTo.y * nextScale,
      }
      stage.position(position)
      stage.batchDraw()

      pinchDistanceRef.current = distance
      scheduleViewportUpdate()
    } else {
      stage.draggable(true)
    }
  }

  const handleTouchEnd = () => {
    pinchDistanceRef.current = null
    const stage = stageRef.current
    if (stage) {
      stage.draggable(true)
    }
    scheduleViewportUpdate()
  }

  const visibleTiles: VisibleTile[] = useMemo(() => {
    if (!activeLevel || containerSize.width === 0 || containerSize.height === 0) {
      return []
    }

    const stageScale = viewport.scale
    const stagePosition = viewport.position

    const viewWidth = containerSize.width / stageScale
    const viewHeight = containerSize.height / stageScale
    const viewLeft = Math.max(0, -stagePosition.x / stageScale)
    const viewTop = Math.max(0, -stagePosition.y / stageScale)
    const viewRight = Math.min(metadata.width, viewLeft + viewWidth)
    const viewBottom = Math.min(metadata.height, viewTop + viewHeight)

    if (viewRight <= viewLeft || viewBottom <= viewTop) {
      return []
    }

    const levelScale = activeLevel.scale
    const levelLeft = viewLeft * levelScale
    const levelTop = viewTop * levelScale
    const levelRight = viewRight * levelScale
    const levelBottom = viewBottom * levelScale

    const minTileX = Math.max(0, Math.floor(levelLeft / metadata.tileSize))
    const maxTileX = Math.min(
      activeLevel.tilesX - 1,
      Math.ceil(levelRight / metadata.tileSize) - 1
    )
    const minTileY = Math.max(0, Math.floor(levelTop / metadata.tileSize))
    const maxTileY = Math.min(
      activeLevel.tilesY - 1,
      Math.ceil(levelBottom / metadata.tileSize) - 1
    )

    if (minTileX > maxTileX || minTileY > maxTileY) {
      return []
    }

    const tiles: VisibleTile[] = []
    for (let y = minTileY; y <= maxTileY; y += 1) {
      for (let x = minTileX; x <= maxTileX; x += 1) {
        const levelWidth = Math.min(
          metadata.tileSize,
          Math.max(0, activeLevel.width - x * metadata.tileSize)
        )
        const levelHeight = Math.min(
          metadata.tileSize,
          Math.max(0, activeLevel.height - y * metadata.tileSize)
        )

        if (levelWidth <= 0 || levelHeight <= 0) {
          continue
        }

        const width = levelWidth / levelScale
        const height = levelHeight / levelScale
        const left = (x * metadata.tileSize) / levelScale
        const top = (y * metadata.tileSize) / levelScale

        tiles.push({
          key: `${activeLevel.zoom}-${x}-${y}`,
          zoom: activeLevel.zoom,
          x,
          y,
          left,
          top,
          width,
          height,
        })
      }
    }

    return tiles
  }, [activeLevel, containerSize.height, containerSize.width, metadata, viewport.position, viewport.scale])

  useEffect(() => {
    if (!visibleTiles.length) {
      return
    }

    const pending: HTMLImageElement[] = []

    visibleTiles.forEach((tile) => {
      const cacheKey = tile.key
      if (tileCacheRef.current[cacheKey]) {
        return
      }

      const image = new window.Image()
      image.crossOrigin = "anonymous"
      image.src = `${tileBaseUrl}/${tile.zoom}/${tile.x}/${tile.y}.png`
      image.onload = () => {
        tileCacheRef.current[cacheKey] = image
        forceRender((value) => value + 1)
      }
      image.onerror = () => {
        const index = pending.indexOf(image)
        if (index >= 0) {
          pending.splice(index, 1)
        }
      }

      pending.push(image)
    })

    return () => {
      pending.forEach((image) => {
        image.onload = null
        image.onerror = null
      })
    }
  }, [tileBaseUrl, visibleTiles])

  const strokeWidth = 1 / viewport.scale
  const isReady = containerSize.width > 0 && containerSize.height > 0

  return (
    <div ref={containerRef} className="relative size-full overflow-hidden">
      {isReady ? (
        <Stage
          ref={stageRef}
          width={containerSize.width}
          height={containerSize.height}
          draggable
          onDragMove={handleDragMove}
          onDragEnd={handleDragEnd}
          onWheel={handleWheel}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          <Layer listening={false}>
            <Rect
              x={0}
              y={0}
              width={metadata.width}
              height={metadata.height}
              fill="#f8fafc"
            />
            {visibleTiles.map((tile) => {
              const image = tileCacheRef.current[tile.key]
              if (image) {
                return (
                  <KonvaImage
                    key={tile.key}
                    image={image}
                    x={tile.left}
                    y={tile.top}
                    width={tile.width}
                    height={tile.height}
                    listening={false}
                  />
                )
              }

              return (
                <Rect
                  key={tile.key}
                  x={tile.left}
                  y={tile.top}
                  width={tile.width}
                  height={tile.height}
                  fill="#e2e8f0"
                  stroke="#cbd5f5"
                  strokeWidth={strokeWidth}
                />
              )
            })}
          </Layer>
        </Stage>
      ) : (
        <div className="flex size-full items-center justify-center text-sm text-muted-foreground">
          Preparing floorplan…
        </div>
      )}
    </div>
  )
}

export default FloorplanViewer
