import { redirect } from "next/navigation"

import { normalizeGeometry } from "@/lib/floorplans/access"
import type { Database } from "@/lib/supabase"
import { createSupbaseServerClient } from "@/utils/supaone"

import ManagerSection from "./components/ManagerSection"
import TenantSection from "./components/TenantSection"
import type {
  AnnotationClientModel,
  BuildingOption,
  FloorplanClientModel,
  MembershipClientModel,
} from "./types"

const SIGNED_URL_TTL_SECONDS = 60 * 60

export default async function FloorplansPage() {
  const supabase = await createSupbaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return redirect("/auth")
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id, role, full_name")
    .eq("id", user.id)
    .maybeSingle()

  if (profileError || !profile) {
    return redirect("/auth")
  }

  const isManager = profile.role === "property_manager" || profile.role === "admin"
  const isTenant = profile.role === "tenant" || profile.role === "roommate"

  type SupabaseFloorplan = Database["public"]["Tables"]["floorplans"]["Row"] & {
    building: (Database["public"]["Tables"]["buildings"]["Row"] & {
      units: (Database["public"]["Tables"]["units"]["Row"] & {
        unit_memberships: (Database["public"]["Tables"]["unit_memberships"]["Row"] & {
          profile: Pick<Database["public"]["Tables"]["profiles"]["Row"], "id" | "full_name"> | null
        })[]
      })[]
    }) | null
    unit: (Database["public"]["Tables"]["units"]["Row"] & {
      unit_memberships: (Database["public"]["Tables"]["unit_memberships"]["Row"] & {
        profile: Pick<Database["public"]["Tables"]["profiles"]["Row"], "id" | "full_name"> | null
      })[]
    }) | null
    floorplan_annotations: (Database["public"]["Tables"]["floorplan_annotations"]["Row"] & {
      profile: Pick<Database["public"]["Tables"]["profiles"]["Row"], "id" | "full_name"> | null
    })[]
  }

  const { data: floorplansData } = await supabase
    .from("floorplans")
    .select(
      `
        id,
        name,
        description,
        storage_path,
        media_type,
        building_id,
        unit_id,
        created_at,
        updated_at,
        building:building_id (
          id,
          name,
          units (
            id,
            unit_number,
            unit_memberships (
              id,
              profile_id,
              membership_role,
              profile:profile_id ( id, full_name )
            )
          )
        ),
        unit:unit_id (
          id,
          unit_number,
          building_id,
          unit_memberships (
            id,
            profile_id,
            membership_role,
            profile:profile_id ( id, full_name )
          )
        ),
        floorplan_annotations (
          id,
          floorplan_id,
          label,
          annotation_type,
          profile_id,
          geometry,
          metadata,
          created_at,
          updated_at,
          profile:profile_id ( id, full_name )
        )
      `
    )
    .order("created_at", { ascending: false })

  const storageClient = supabase.storage.from("floorplans")

  const floorplans: FloorplanClientModel[] = []

  const rawFloorplans = (floorplansData as SupabaseFloorplan[] | null) ?? []

  for (const item of rawFloorplans) {
    const profileMap = new Map<string, { id: string; name: string | null }>()

    const appendProfile = (input: { profile_id: string | null; profile: { id: string; full_name: string | null } | null }) => {
      if (!input.profile_id) {
        return
      }

      const name = input.profile?.full_name ?? "Roommate"

      if (!profileMap.has(input.profile_id)) {
        profileMap.set(input.profile_id, { id: input.profile_id, name })
      }
    }

    if (item.unit?.unit_memberships) {
      for (const membership of item.unit.unit_memberships) {
        appendProfile(membership)
      }
    }

    if (!item.unit && item.building?.units) {
      for (const unit of item.building.units) {
        for (const membership of unit.unit_memberships ?? []) {
          appendProfile(membership)
        }
      }
    }

    const availableProfiles = Array.from(profileMap.values())

    const annotations: AnnotationClientModel[] = (item.floorplan_annotations ?? []).map((annotation) => ({
      id: annotation.id,
      floorplanId: annotation.floorplan_id,
      label: annotation.label,
      annotationType: annotation.annotation_type,
      profileId: annotation.profile_id,
      assigneeName: annotation.profile?.full_name ?? null,
      geometry: normalizeGeometry(annotation.geometry),
      metadata: (annotation.metadata && typeof annotation.metadata === "object") ? (annotation.metadata as Record<string, unknown>) : null,
      createdAt: annotation.created_at,
      updatedAt: annotation.updated_at,
    }))

    let signedUrl: string | null = null

    if (item.storage_path) {
      const { data: signed } = await storageClient.createSignedUrl(item.storage_path, SIGNED_URL_TTL_SECONDS)
      signedUrl = signed?.signedUrl ?? null
    }

    floorplans.push({
      id: item.id,
      name: item.name,
      description: item.description,
      storagePath: item.storage_path,
      mediaType: item.media_type,
      signedUrl,
      annotations,
      availableProfiles,
      building: {
        id: item.building?.id ?? item.building_id,
        name: item.building?.name ?? null,
      },
      unit: item.unit
        ? {
            id: item.unit.id,
            unitNumber: item.unit.unit_number,
            buildingId: item.unit.building_id,
          }
        : null,
      createdAt: item.created_at,
    })
  }

  let buildingOptions: BuildingOption[] = []

  if (profile.role === "admin") {
    const { data: buildingsData } = await supabase
      .from("buildings")
      .select(
        `
          id,
          name,
          units (
            id,
            unit_number
          )
        `
      )
      .order("name")

    buildingOptions = (buildingsData ?? []).map((building) => ({
      id: building.id,
      name: building.name,
      units: (building.units ?? []).map((unit) => ({
        id: unit.id,
        unitNumber: unit.unit_number,
      })),
    }))
  } else if (profile.role === "property_manager") {
    const { data: assignments } = await supabase
      .from("property_manager_buildings")
      .select(
        `
          building:building_id (
            id,
            name,
            units (
              id,
              unit_number
            )
          )
        `
      )
      .eq("manager_id", profile.id)

    buildingOptions = (assignments ?? [])
      .map((assignment) => assignment.building)
      .filter((building): building is NonNullable<typeof building> => Boolean(building))
      .map((building) => ({
        id: building.id,
        name: building.name,
        units: (building.units ?? []).map((unit) => ({
          id: unit.id,
          unitNumber: unit.unit_number,
        })),
      }))
  }

  let memberships: MembershipClientModel[] = []

  if (isTenant) {
    const { data: membershipsData } = await supabase
      .from("unit_memberships")
      .select(
        `
          id,
          unit_id,
          membership_role,
          profile:profile_id ( id, full_name ),
          unit:unit_id (
            id,
            unit_number,
            building_id,
            building:building_id ( id, name )
          )
        `
      )

    memberships = (membershipsData ?? []).map((membership) => ({
      id: membership.id,
      unitId: membership.unit_id,
      membershipRole: membership.membership_role,
      profile: membership.profile
        ? { id: membership.profile.id, fullName: membership.profile.full_name }
        : null,
      unit: membership.unit
        ? {
            id: membership.unit.id,
            unitNumber: membership.unit.unit_number,
            buildingId: membership.unit.building_id,
            building: membership.unit.building
              ? { id: membership.unit.building.id, name: membership.unit.building.name }
              : null,
          }
        : null,
    }))
  }

  const pageTitle = "Floorplans"

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">{pageTitle}</h1>
        <p className="text-muted-foreground">
          View and manage annotated layouts for your shared spaces.
        </p>
      </div>

      {isManager && (
        <ManagerSection floorplans={floorplans} buildingOptions={buildingOptions} />
      )}

      <TenantSection
        floorplans={floorplans}
        memberships={memberships}
        profileId={profile.id}
      />
    </div>
  )
}
