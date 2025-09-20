import { redirect } from "next/navigation"

import { createSupbaseServerClient } from "@/utils/supaone"
import MessageBoardClient from "./message-board-client"
import { listTenantMessages } from "./actions"
import type { Database } from "@/lib/supabase"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

const STAFF_ROLES = new Set(["admin", "staff", "manager"])

type Profile = Pick<Database["public"]["Tables"]["profiles"]["Row"], "id" | "full_name" | "avatar_url" | "role">
type MembershipWithRelations = Database["public"]["Tables"]["tenant_property_memberships"]["Row"] & {
  property: Pick<Database["public"]["Tables"]["properties"]["Row"], "id" | "name"> | null
  unit: Pick<Database["public"]["Tables"]["property_units"]["Row"], "id" | "label"> | null
}

type MessageBoardPageProps = {
  searchParams?: {
    thread?: string
  }
}

export default async function MessageBoardPage({ searchParams }: MessageBoardPageProps) {
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
      <div className="mx-auto flex max-w-3xl flex-col gap-6 py-12">
        <Card>
          <CardHeader>
            <CardTitle>No property access yet</CardTitle>
            <CardDescription>
              We couldn&apos;t find an active property or unit associated with your profile. Once your property manager
              connects your lease, the community message board will unlock automatically.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>If this seems incorrect, please reach out to your property manager so they can assign you to the correct unit.</p>
            <Button asChild variant="outline">
              <a href="/contact">Contact support</a>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const requestedThreadId = searchParams?.thread
  const defaultMembership =
    typedMemberships.find((membership) => membership.id === requestedThreadId) ?? typedMemberships[0]!

  const initialData = await listTenantMessages({
    propertyId: defaultMembership.property_id,
    unitId: defaultMembership.unit_id,
    includeRemoved: false,
  })

  const allowModeration = STAFF_ROLES.has(profile.role ?? "")

  return (
    <div className="mx-auto max-w-4xl space-y-6 py-10">
      <MessageBoardClient
        profile={profile as Profile}
        memberships={typedMemberships}
        initialThreadId={defaultMembership.id}
        initialData={initialData}
        allowModeration={allowModeration}
        initialIncludeRemoved={allowModeration}
      />
    </div>
  )
}
