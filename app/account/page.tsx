import { cookies } from "next/headers"
import { redirect } from "next/navigation"

import { Separator } from "@/components/ui/separator"
import { createClient } from "@/utils/supa-server-actions"

import AccountForm from "./supa-account-form"

export default async function SettingsAccountPage() {
  const cookieStore = cookies()
  const supabase = createClient(cookieStore)
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth")
  }

  const supabaseClient = supabase as any

  const [profileResponse, tenantProfileResponse, contactsResponse, vehiclesResponse, policiesResponse, documentsResponse, leasesResponse, buildingsResponse, unitsResponse] =
    await Promise.all([
      supabaseClient
        .from("profiles")
        .select("id, full_name, username, website, avatar_url, role, building_id, unit_id")
        .eq("id", user.id)
        .maybeSingle(),
      supabaseClient
        .from("tenant_profiles")
        .select("tenant_id, building_id, unit_id, roommate_role, rent_share, onboarding_status")
        .eq("tenant_id", user.id)
        .maybeSingle(),
      supabaseClient
        .from("tenant_emergency_contacts")
        .select("id, name, relationship, phone, email")
        .eq("tenant_id", user.id),
      supabaseClient
        .from("tenant_vehicles")
        .select("id, make, model, color, license_plate")
        .eq("tenant_id", user.id),
      supabaseClient
        .from("tenant_policy_acknowledgements")
        .select("id, policy_key, accepted, acknowledged_at")
        .eq("tenant_id", user.id),
      supabaseClient
        .from("tenant_documents")
        .select("id, title, category, storage_path, created_at")
        .eq("tenant_id", user.id)
        .order("created_at", { ascending: false }),
      supabaseClient
        .from("lease_assignments")
        .select("id, role, rent_share, lease_id, leases(id, name, start_date, end_date, document_url, unit_id)")
        .eq("tenant_id", user.id),
      supabaseClient
        .from("buildings")
        .select("id, name")
        .order("name", { ascending: true }),
      supabaseClient
        .from("units")
        .select("id, unit_number, building_id")
        .order("unit_number", { ascending: true }),
    ])

  return (
    <div className="container py-10">
      <div className="space-y-6">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">Account profile</h1>
          <p className="text-muted-foreground">
            Keep your tenant details up to date, upload required documents, and review your lease assignments.
          </p>
        </div>
        <Separator />
        <AccountForm
          user={user}
          profile={profileResponse?.data ?? null}
          tenantProfile={tenantProfileResponse?.data ?? null}
          emergencyContacts={contactsResponse?.data ?? []}
          vehicles={vehiclesResponse?.data ?? []}
          policies={policiesResponse?.data ?? []}
          documents={documentsResponse?.data ?? []}
          leases={leasesResponse?.data ?? []}
          buildings={buildingsResponse?.data ?? []}
          units={unitsResponse?.data ?? []}
        />
      </div>
    </div>
  )
}
