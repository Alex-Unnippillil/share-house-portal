import type { Json } from "@/lib/supabase"

export type FloorplanOverlay = {
  id: string
  label: string
  x: number
  y: number
  width: number
  height: number
  description?: string
  color?: string
  occupant?: string
}

function coerceNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value
  }

  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = Number(value)
    if (!Number.isNaN(parsed) && Number.isFinite(parsed)) {
      return parsed
    }
  }

  return null
}

function asOverlayRecord(value: unknown): Record<string, unknown> | null {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>
  }

  return null
}

function normaliseOverlaySource(source: Json | null | undefined): Json[] {
  if (!source) {
    return []
  }

  if (Array.isArray(source)) {
    return source
  }

  if (typeof source === "string") {
    try {
      const parsed = JSON.parse(source) as unknown
      return Array.isArray(parsed) ? (parsed as Json[]) : []
    } catch (error) {
      console.error("Failed to parse overlay JSON string", error)
      return []
    }
  }

  return []
}

export function parseFloorplanOverlays(raw: Json | null | undefined): FloorplanOverlay[] {
  const overlays = normaliseOverlaySource(raw)

  return overlays
    .map((entry) => {
      const record = asOverlayRecord(entry)
      if (!record) {
        return null
      }

      const id = typeof record.id === "string" && record.id.trim().length > 0 ? record.id.trim() : null
      const label =
        typeof record.label === "string" && record.label.trim().length > 0 ? record.label.trim() : null

      const x = coerceNumber(record.x)
      const y = coerceNumber(record.y)
      const width = coerceNumber(record.width)
      const height = coerceNumber(record.height)

      if (!id || !label || x === null || y === null || width === null || height === null) {
        return null
      }

      if (width <= 0 || height <= 0) {
        return null
      }

      if (x < 0 || y < 0) {
        return null
      }

      return {
        id,
        label,
        x,
        y,
        width,
        height,
        description: typeof record.description === "string" ? record.description : undefined,
        color: typeof record.color === "string" ? record.color : undefined,
        occupant: typeof record.occupant === "string" ? record.occupant : undefined,
      }
    })
    .filter((overlay): overlay is FloorplanOverlay => overlay !== null)
}
