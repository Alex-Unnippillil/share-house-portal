import { redirect } from "next/navigation"

import FloorplanExperience from "./components/floorplan-experience"
import type {
  FloorplanAnnotation,
  FloorplanRecord,
  RoommateProfile,
  UnitRoster,
} from "@/types/floorplans"
import { createSupbaseServerClient } from "@/utils/supaone"

const parseNumber = (value: unknown, fallback: number | null) => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value
  }
  if (typeof value === "string") {
    const parsed = Number(value)
    if (Number.isFinite(parsed)) {
      return parsed
    }
  }
  return fallback
}

const parseGeometry = (geometry: unknown) => {
  const source = (geometry && typeof geometry === "object") ? (geometry as Record<string, unknown>) : {}
  return {
    x: parseNumber(source.x, 50) ?? 50,
    y: parseNumber(source.y, 50) ?? 50,
    width: parseNumber(source.width, null),
    height: parseNumber(source.height, null),
    rotation: parseNumber(source.rotation, null),
  }
}

const toAnnotation = (row: any): FloorplanAnnotation => ({
  id: row.id,
  floorplanId: row.floorplan_id,
  label: row.label,
  annotationType: row.annotation_type,
  geometry: parseGeometry(row.geometry),
  color: row.color ?? null,
  notes: row.notes ?? null,
  assignedProfileId: row.assigned_profile_id ?? null,
  createdBy: row.created_by ?? null,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
})

export default async function FloorplansPage() {
  const supabase = await createSupbaseServerClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session?.user) {
    redirect("/auth")
  }

  const { data: profileRow, error: profileError } = await supabase
    .from("profiles")
    .select("id, full_name, role")
    .eq("id", session.user.id)
    .single()

  if (profileError || !profileRow) {
    throw new Error(profileError?.message ?? "Unable to load profile")
  }

  const { data: floorplanRows, error: floorplanError } = await supabase
    .from("floorplans")
    .select(
      "id, name, asset_path, building_id, unit_id, content_type, width, height, metadata, uploaded_by, created_at, updated_at, floorplan_annotations(id, label, annotation_type, color, notes, geometry, assigned_profile_id, created_by, created_at, updated_at)"
    )
    .order("created_at", { ascending: false })

  if (floorplanError) {
    throw new Error(floorplanError.message)
  }

  const floorplans: FloorplanRecord[] = (floorplanRows ?? []).map(row => ({
    id: row.id,
    name: row.name,
    assetPath: row.asset_path,
    buildingId: row.building_id,
    unitId: row.unit_id,
    contentType: row.content_type,
    width: row.width,
    height: row.height,
    metadata: row.metadata ?? {},
    uploadedBy: row.uploaded_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    annotations: (row.floorplan_annotations ?? []).map(toAnnotation),
  }))

  const unitIds = Array.from(new Set(floorplans.map(floorplan => floorplan.unitId)))

  const [unitRowsResult, assignmentRowsResult, buildingRowsResult] = await Promise.all([
    unitIds.length
      ? supabase
          .from("units")
          .select("id, unit_code")
          .in("id", unitIds)
      : Promise.resolve({ data: [], error: null }),
    unitIds.length
      ? supabase
          .from("unit_assignments")
          .select("unit_id, tenant_id")
          .in("unit_id", unitIds)
      : Promise.resolve({ data: [], error: null }),
    supabase
      .from("buildings")
      .select("id, name, units(id, unit_code)")
      .order("name", { ascending: true }),
  ])

  if (unitRowsResult.error) {
    throw new Error(unitRowsResult.error.message)
  }

  if (assignmentRowsResult.error) {
    throw new Error(assignmentRowsResult.error.message)
  }

  if (buildingRowsResult.error) {
    throw new Error(buildingRowsResult.error.message)
  }

  const unitCodeById = new Map<string, string>(
    (unitRowsResult.data as any[]).map(row => [row.id, row.unit_code])
  )

  const tenantIds = Array.from(new Set((assignmentRowsResult.data as any[]).map(row => row.tenant_id)))

  const { data: tenantProfiles, error: tenantProfilesError } = tenantIds.length
    ? await supabase
        .from("profiles")
        .select("id, full_name, role")
        .in("id", tenantIds)
    : { data: [], error: null }

  if (tenantProfilesError) {
    throw new Error(tenantProfilesError.message)
  }

  const profileById = new Map<string, RoommateProfile>(
    (tenantProfiles ?? []).map(profile => [
      profile.id,
      {
        id: profile.id,
        fullName: profile.full_name,
        role: profile.role,
      },
    ])
  )

  const rosters: UnitRoster[] = unitIds.map(unitId => ({
    unitId,
    unitCode: unitCodeById.get(unitId) ?? unitId,
    tenants: (assignmentRowsResult.data as any[])
      .filter(row => row.unit_id === unitId)
      .map(row => profileById.get(row.tenant_id) ?? {
        id: row.tenant_id,
        fullName: null,
        role: null,
      }),
  }))

  const buildings = (buildingRowsResult.data ?? []).map((row: any) => ({
    id: row.id,
    name: row.name,
    units: (row.units ?? []).map((unit: any) => ({
      id: unit.id,
      unitCode: unit.unit_code,
    })),
  }))

  return (
    <FloorplanExperience
      floorplans={floorplans}
      rosters={rosters}
      buildings={buildings}
      viewer={{
        id: profileRow.id,
        name: profileRow.full_name ?? "",
        role: profileRow.role ?? "tenant",
      }}
    />
  )
}
