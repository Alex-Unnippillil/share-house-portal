import Link from "next/link"
import { redirect } from "next/navigation"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import FloorplanViewer from "@/components/floorplans/floorplan-viewer"
import type { ResidentFloorplanWithRelations } from "@/types/floorplans"
import { createSupbaseServerClient } from "@/utils/supaone"

const STAFF_ROLES = new Set(["admin", "property_manager", "staff"])

const getTodayIsoDate = () => {
  const today = new Date()
  const iso = today.toISOString()
  return iso.split("T")[0]
}

export default async function FloorplanPage() {
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
    .select("id, role, full_name")
    .eq("id", userId)
    .maybeSingle()

  const role = profile?.role ?? "tenant"
  const isStaff = STAFF_ROLES.has(role)
  const today = getTodayIsoDate()

  const { data: assignmentData, error: assignmentError } = await supabase
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
        floorplan:floorplans (
          id,
          name,
          description,
          unit_label,
          base_image_bucket,
          base_image_path,
          metadata,
          overlays:floorplan_overlays (
            id,
            name,
            overlay_type,
            geometry,
            metadata,
            is_interactive,
            display_order,
            occupant_profile_id,
            created_at,
            updated_at,
            occupant:profiles!floorplan_overlays_occupant_profile_id_fkey (
              id,
              full_name,
              email
            )
          )
        )
      `
    )
    .eq("resident_id", userId)
    .lte("effective_start", today)
    .or(`effective_end.is.null,effective_end.gte.${today}`)
    .order("is_primary", { ascending: false })
    .order("effective_start", { ascending: false })
    .limit(1)
    .maybeSingle<ResidentFloorplanWithRelations>()

  if (assignmentError) {
    console.error(assignmentError)
  }

  const assignment = assignmentData
  let imageUrl: string | null = null

  if (assignment?.floorplan?.base_image_path) {
    const { data: signed } = await supabase.storage
      .from(assignment.floorplan.base_image_bucket)
      .createSignedUrl(assignment.floorplan.base_image_path, 60 * 60)

    imageUrl = signed?.signedUrl ?? null
  }

  const sortedAssignment: ResidentFloorplanWithRelations | null = assignment
    ? {
        ...assignment,
        floorplan: assignment.floorplan
          ? {
              ...assignment.floorplan,
              overlays: assignment.floorplan.overlays
                ? [...assignment.floorplan.overlays].sort(
                    (a, b) => (a.display_order ?? 0) - (b.display_order ?? 0)
                  )
                : null,
            }
          : null,
      }
    : null

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-3xl font-semibold">My floorplan</h1>
          <p className="text-sm text-muted-foreground">
            View interactive overlays for your unit and stay aligned with roommate assignments.
          </p>
        </div>
        {isStaff ? (
          <Button asChild variant="outline">
            <Link href="/dashboard/floorplan/manage">Manage floorplans</Link>
          </Button>
        ) : null}
      </div>
      {sortedAssignment && sortedAssignment.floorplan ? (
        <FloorplanViewer
          assignment={sortedAssignment}
          imageUrl={imageUrl}
          isEditable={isStaff}
        />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>No floorplan assigned</CardTitle>
            <CardDescription>
              Your account does not have a floorplan assignment yet. Contact property staff for assistance.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isStaff ? (
              <p className="text-sm text-muted-foreground">
                As a staff member you can assign residents from the floorplan admin tools.
              </p>
            ) : (
              <p className="text-sm text-muted-foreground">
                Once a floorplan is assigned to your unit you will be able to explore overlays here.
              </p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
