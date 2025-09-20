import { redirect } from "next/navigation"

import { createSupbaseServerClient } from "@/utils/supaone"
import ModerationBoard from "./moderation"
import { listTenantMessages } from "@/app/(tenant)/message-board/actions"
import type { Database } from "@/lib/supabase"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

const STAFF_ROLES = new Set(["admin", "staff", "manager"])

type Profile = Pick<Database["public"]["Tables"]["profiles"]["Row"], "id" | "full_name" | "avatar_url" | "role">
type MembershipWithRelations = Database["public"]["Tables"]["tenant_property_memberships"]["Row"] & {
  property: Pick<Database["public"]["Tables"]["properties"]["Row"], "id" | "name"> | null
  unit: Pick<Database["public"]["Tables"]["property_units"]["Row"], "id" | "label"> | null
}

export default async function DashboardMessageBoardPage() {
  const supabase = await createSupbaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth")
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id, full_name, avatar_url, role")
    .eq("id", user!.id)
    .single()

  if (profileError) {
    throw profileError
  }

  if (!STAFF_ROLES.has(profile.role ?? "")) {
    redirect("/dashboard")
  }

  const { data: memberships, error: membershipsError } = await supabase
    .from("tenant_property_memberships")
    .select(
      `
        id,
        created_at,
        property_id,
        unit_id,
        role,
        property:properties ( id, name ),
        unit:property_units ( id, label )
      `
    )
    .order("created_at", { ascending: true })

  if (membershipsError) {
    throw membershipsError
  }

  const typedMemberships = (memberships ?? []) as MembershipWithRelations[]

  if (!typedMemberships.length) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>No managed properties</CardTitle>
            <CardDescription>
              Add yourself to a property or unit before moderating community conversations. You&apos;ll be able to pin and remove
              tenant messages once a property is assigned.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Connect a property from the property management console to unlock moderation controls.
          </CardContent>
        </Card>
      </div>
    )
  }

  const defaultMembership = typedMemberships[0]!
  const initialData = await listTenantMessages({
    propertyId: defaultMembership.property_id,
    unitId: defaultMembership.unit_id,
    includeRemoved: true,
  })

  return (
    <ModerationBoard
      profile={profile as Profile}
      memberships={typedMemberships}
      initialThreadId={defaultMembership.id}
      initialData={initialData}
    />
  )
}
