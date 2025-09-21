import type { NormalizedGeometry } from "@/lib/floorplans/access"
import type { Database } from "@/lib/supabase"

export type AnnotationType = Database["public"]["Enums"]["floorplan_annotation_type"]

export type AnnotationClientModel = {
  id: string
  floorplanId: string
  label: string
  annotationType: AnnotationType
  profileId: string | null
  assigneeName: string | null
  geometry: NormalizedGeometry | null
  metadata: Record<string, unknown> | null
  createdAt: string | null
  updatedAt: string | null
}

export type FloorplanClientModel = {
  id: string
  name: string
  description: string | null
  building: {
    id: string
    name: string | null
  }
  unit: {
    id: string
    unitNumber: string | null
    buildingId: string
  } | null
  storagePath: string
  mediaType: string
  signedUrl: string | null
  annotations: AnnotationClientModel[]
  availableProfiles: { id: string; name: string | null }[]
  createdAt: string | null
}

export type BuildingOption = {
  id: string
  name: string | null
  units: { id: string; unitNumber: string | null }[]
}

export type MembershipClientModel = {
  id: string
  unitId: string
  membershipRole: Database["public"]["Enums"]["unit_membership_role"]
  profile: { id: string; fullName: string | null } | null
  unit: {
    id: string
    unitNumber: string | null
    buildingId: string
    building: { id: string; name: string | null } | null
  } | null
}
