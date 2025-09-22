import type { NormalizedPoint } from "@/lib/schemas/overlay-shape"

export type OverlayShape = {
  id: string
  floorplanId: string
  label: string
  type: string
  polygon: NormalizedPoint[]
  tenantId: string | null
  createdAt: string
}

export type Floorplan = {
  id: string
  name: string
  imageUrl: string
  description: string | null
  createdAt: string
}
