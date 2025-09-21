import { redirect } from "next/navigation"

import FloorplanAdminPanel from "@/components/floorplans/floorplan-admin-panel"
import type {
  FloorplanAssignmentSummary,
  FloorplanSummary,
  ResidentSummary,
} from "@/types/floorplans"
import { createSupbaseServerClient } from "@/utils/supaone"

const STAFF_ROLES = new Set(["admin", "property_manager", "staff"])

export default async function FloorplanAdminPage() {
  const supabase = await createSupbaseServerClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session?.user) {
    redirect("/auth")
  }

  const userId = session.user.id
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, role")
    .eq("id", userId)
    .maybeSingle()

  const role = profile?.role ?? "tenant"

  if (!STAFF_ROLES.has(role)) {
    redirect("/dashboard/floorplan")
  }

  const { data: floorplansData } = await supabase
    .from("floorplans")
    .select(
      `
        id,
        name,
        description,
        unit_label,
        base_image_bucket,
        base_image_path,
        is_active,
        overlays:floorplan_overlays (id, name, overlay_type, display_order),
        assignments:resident_floorplans (id, resident_id, effective_start, effective_end)
      `
    )
    .order("name")

  const floorplans = (floorplansData ?? []) as FloorplanSummary[]

  const { data: residentsData } = await supabase
    .from("profiles")
    .select("id, full_name, email, role")
    .in("role", ["tenant", "roommate"])
    .order("full_name", { ascending: true })

  const residents = (residentsData ?? []) as ResidentSummary[]

  const { data: assignmentsData } = await supabase
    .from("resident_floorplans")
    .select(
      `
        id,
        floorplan_id,
        resident_id,
        effective_start,
        effective_end,
        is_primary,
        created_at,
        updated_at,
        resident:profiles!resident_floorplans_resident_id_fkey (id, full_name, email),
        floorplan:floorplans!resident_floorplans_floorplan_id_fkey (id, name, unit_label)
      `
    )
    .order("effective_start", { ascending: false })

  const assignments = (assignmentsData ?? []) as FloorplanAssignmentSummary[]

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-3xl font-semibold">Floorplan admin tools</h1>
        <p className="text-sm text-muted-foreground">
          Upload floorplans, maintain overlays, and control resident access windows.
        </p>
      </div>
      <FloorplanAdminPanel
        floorplans={floorplans}
        residents={residents}
        assignments={assignments}
      />
    </div>
  )
}
