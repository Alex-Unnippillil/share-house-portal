import type { SharedSpaceMapRow } from '@/utils/typed-supabase-client'

export const SHARED_SPACE_BUCKET = 'shared-space-diagrams'
export const SIGNED_URL_TTL_SECONDS = 60 * 60 // 1 hour

export type DiagramLabel = {
  id: string
  label: string
  x: number
  y: number
  description?: string | null
}

export type SharedSpaceMetadata = {
  roomLabels: DiagramLabel[]
  notes?: string | null
  lastUpdatedAt?: string | null
  [key: string]: unknown
}

type RawMetadata = SharedSpaceMapRow['metadata'] extends infer M
  ? M extends Record<string, any>
    ? M
    : Record<string, unknown>
  : Record<string, unknown>

function normaliseCoordinate(value: number | null): number | null {
  if (value === null || Number.isNaN(value) || !Number.isFinite(value)) {
    return null
  }

  if (value > 1) {
    return Math.min(Math.max(value / 100, 0), 1)
  }

  if (value < 0) {
    return 0
  }

  return value
}

function parseRoomLabels(metadata: RawMetadata): DiagramLabel[] {
  const rawLabels = Array.isArray((metadata as any)?.roomLabels)
    ? ((metadata as any).roomLabels as Array<Record<string, any>>)
    : []

  return rawLabels
    .map((label, index) => {
      const labelText =
        typeof label?.label === 'string'
          ? label.label
          : typeof label?.name === 'string'
            ? label.name
            : typeof label?.title === 'string'
              ? label.title
              : null

      const rawX =
        typeof label?.x === 'number'
          ? label.x
          : typeof label?.x === 'string'
            ? Number.parseFloat(label.x)
            : Number(label?.position?.x)

      const rawY =
        typeof label?.y === 'number'
          ? label.y
          : typeof label?.y === 'string'
            ? Number.parseFloat(label.y)
            : Number(label?.position?.y)

      const x = normaliseCoordinate(Number.isNaN(rawX) ? null : rawX)
      const y = normaliseCoordinate(Number.isNaN(rawY) ? null : rawY)

      if (!labelText || x === null || y === null) {
        return null
      }

      return {
        id: typeof label?.id === 'string' ? label.id : `label-${index}`,
        label: labelText,
        x,
        y,
        description:
          typeof label?.description === 'string'
            ? label.description
            : typeof label?.tooltip === 'string'
              ? label.tooltip
              : undefined,
      }
    })
    .filter((value): value is DiagramLabel => Boolean(value))
}

export function normaliseSharedSpaceMetadata(row: SharedSpaceMapRow): SharedSpaceMetadata {
  const rawMetadata = (row.metadata ?? {}) as RawMetadata
  const roomLabels = parseRoomLabels(rawMetadata)

  const lastUpdatedAt =
    typeof (rawMetadata as any)?.lastUpdatedAt === 'string'
      ? ((rawMetadata as any).lastUpdatedAt as string)
      : row.updated_at

  const metadata: SharedSpaceMetadata = {
    ...rawMetadata,
    roomLabels,
    lastUpdatedAt,
  }

  if (typeof (rawMetadata as any)?.notes === 'string' || (rawMetadata as any)?.notes === null) {
    metadata.notes = (rawMetadata as any).notes as string | null
  }

  return metadata
}
