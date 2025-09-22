import type { NormalizedPoint } from "@/lib/schemas/overlay-shape"
export type { NormalizedPoint }

export type AbsolutePoint = {
  x: number
  y: number
}

const DEFAULT_PRECISION = 4

export function clampNormalized(value: number): number {
  if (!Number.isFinite(value)) {
    return 0
  }

  if (value < 0) {
    return 0
  }

  if (value > 1) {
    return 1
  }

  return value
}

export function toNormalizedPoint(
  x: number,
  y: number,
  width: number,
  height: number,
): NormalizedPoint {
  if (width <= 0 || height <= 0) {
    return { x: 0, y: 0 }
  }

  return {
    x: clampNormalized(x / width),
    y: clampNormalized(y / height),
  }
}

export function fromNormalizedPoint(
  point: NormalizedPoint,
  width: number,
  height: number,
): AbsolutePoint {
  return {
    x: clampNormalized(point.x) * Math.max(width, 0),
    y: clampNormalized(point.y) * Math.max(height, 0),
  }
}

export function roundNormalizedPoint(
  point: NormalizedPoint,
  precision = DEFAULT_PRECISION,
): NormalizedPoint {
  const factor = 10 ** precision
  return {
    x: Math.round(clampNormalized(point.x) * factor) / factor,
    y: Math.round(clampNormalized(point.y) * factor) / factor,
  }
}

export function serializeNormalizedPolygon(
  points: NormalizedPoint[],
  precision = DEFAULT_PRECISION,
): NormalizedPoint[] {
  if (!Array.isArray(points) || points.length < 3) {
    throw new Error("A polygon must contain at least three points")
  }

  return points.map((point) => roundNormalizedPoint(point, precision))
}

export function isNormalizedPoint(value: unknown): value is NormalizedPoint {
  if (!value || typeof value !== "object") {
    return false
  }

  const candidate = value as Record<string, unknown>
  const x = candidate.x
  const y = candidate.y

  return (
    typeof x === "number" &&
    typeof y === "number" &&
    Number.isFinite(x) &&
    Number.isFinite(y)
  )
}

export function parseNormalizedPolygon(value: unknown): NormalizedPoint[] {
  if (!Array.isArray(value)) {
    throw new Error("Polygon must be an array of points")
  }

  if (value.length < 3) {
    throw new Error("Polygon must contain at least three points")
  }

  const parsed = value.map((point) => {
    if (!isNormalizedPoint(point)) {
      throw new Error("Polygon contains invalid points")
    }

    return {
      x: clampNormalized((point as NormalizedPoint).x),
      y: clampNormalized((point as NormalizedPoint).y),
    }
  })

  return serializeNormalizedPolygon(parsed)
}
