import type { SharedSpaceMapRow } from "@/utils/typed-supabase-client"

export type RoomLabel = {
  id: string
  title: string
  description?: string
  x: number
  y: number
  data?: Record<string, unknown>
}

export type SharedSpaceDiagram = {
  id: string
  leaseId: string
  unitId: string | null
  tenantId: string
  title: string
  description: string | null
  bucketId: string
  filePath: string
  signedUrl: string | null
  updatedAt: string
  diagramUpdatedAt: string
  metadata: Record<string, unknown>
  roomLabels: RoomLabel[]
}

export type SharedSpaceDiagramGroup = {
  leaseId: string
  diagrams: SharedSpaceDiagram[]
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function clamp01(value: number): number {
  if (Number.isNaN(value)) return 0
  if (value < 0) return 0
  if (value > 1) return 1
  return value
}

export function parseRoomLabels(raw: SharedSpaceMapRow["room_labels"]): RoomLabel[] {
  if (!Array.isArray(raw)) {
    return []
  }

  return raw
    .map((entry, index) => {
      if (!isRecord(entry)) {
        return null
      }

      const idCandidate = [entry.id, entry.key, entry.slug, entry.identifier]
        .find((value): value is string => typeof value === "string" && value.trim().length > 0)
      const labelCandidate = [entry.title, entry.label, entry.name, entry.text]
        .find((value): value is string => typeof value === "string" && value.trim().length > 0)

      if (!labelCandidate) {
        return null
      }

      const baseId = idCandidate ?? `label-${index}`

      const { x: directX, y: directY } = {
        x: typeof entry.x === "number" ? entry.x : undefined,
        y: typeof entry.y === "number" ? entry.y : undefined,
      }

      let x = directX
      let y = directY

      if ((x === undefined || y === undefined) && isRecord(entry.position)) {
        const { position } = entry as { position?: Record<string, unknown> }
        if (isRecord(position)) {
          if (typeof position.x === "number") {
            x = position.x
          }
          if (typeof position.y === "number") {
            y = position.y
          }
        }
      }

      if (typeof x !== "number" || typeof y !== "number") {
        return null
      }

      const descriptionCandidate = [entry.description, entry.tooltip, entry.note]
        .find((value): value is string => typeof value === "string" && value.trim().length > 0)

      const labelData = isRecord(entry.data)
        ? entry.data
        : isRecord(entry.metadata)
          ? entry.metadata
          : undefined

      return {
        id: baseId,
        title: labelCandidate,
        description: descriptionCandidate,
        x: clamp01(x),
        y: clamp01(y),
        data: labelData,
      }
    })
    .filter((label): label is RoomLabel => Boolean(label))
}

export function parseMetadata(raw: SharedSpaceMapRow["metadata"]): Record<string, unknown> {
  if (isRecord(raw)) {
    return raw
  }

  return {}
}

export function mapRowToDiagram(row: SharedSpaceMapRow, signedUrl: string | null): SharedSpaceDiagram {
  return {
    id: row.id,
    leaseId: row.lease_id,
    unitId: row.unit_id,
    tenantId: row.tenant_id,
    title: row.title,
    description: row.description,
    bucketId: row.bucket_id,
    filePath: row.file_path,
    signedUrl,
    updatedAt: row.updated_at,
    diagramUpdatedAt: row.diagram_updated_at,
    metadata: parseMetadata(row.metadata),
    roomLabels: parseRoomLabels(row.room_labels),
  }
}

export function groupSharedSpaceMapsByLease(
  diagrams: SharedSpaceDiagram[]
): SharedSpaceDiagramGroup[] {
  const grouped = new Map<string, SharedSpaceDiagram[]>()

  diagrams.forEach((diagram) => {
    const existing = grouped.get(diagram.leaseId) ?? []
    existing.push(diagram)
    grouped.set(diagram.leaseId, existing)
  })

  return Array.from(grouped.entries()).map(([leaseId, leaseDiagrams]) => ({
    leaseId,
    diagrams: leaseDiagrams.sort((a, b) => b.diagramUpdatedAt.localeCompare(a.diagramUpdatedAt)),
  }))
}
