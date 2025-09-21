import type { Json } from "@/lib/supabase"

export type AnnotationGeometry = {
  x: number
  y: number
  width?: number | null
  height?: number | null
  rotation?: number | null
  [key: string]: Json
}

export interface FloorplanAnnotation {
  id: string
  floorplanId: string
  label: string
  annotationType: string
  geometry: AnnotationGeometry
  color: string | null
  notes: string | null
  assignedProfileId: string | null
  createdBy: string | null
  createdAt: string
  updatedAt: string
}

export interface FloorplanRecord {
  id: string
  name: string
  assetPath: string
  buildingId: string
  unitId: string
  contentType: string | null
  width: number | null
  height: number | null
  metadata: Json
  uploadedBy: string | null
  createdAt: string
  updatedAt: string
  annotations: FloorplanAnnotation[]
}

export interface RoommateProfile {
  id: string
  fullName: string | null
  role: string | null
}

export interface UnitRoster {
  unitId: string
  unitCode: string
  tenants: RoommateProfile[]
}
