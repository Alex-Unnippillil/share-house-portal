import { Metadata } from "next"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"

import { OnboardingForm, type BuildingOption, type OnboardingInitialValues, type UnitOption } from "./onboarding-form"
import { createClient } from "@/utils/supa-server-actions"

export const metadata: Metadata = {
  title: "Tenant onboarding",
  description: "Tell us about your household so we can personalise your Share House experience.",
}

export default async function OnboardingPage() {
  const cookieStore = cookies()
  const supabase = createClient(cookieStore)
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth")
  }

  const supabaseClient = supabase as any

  const [buildingsResponse, unitsResponse, profileResponse, contactsResponse, vehiclesResponse, policiesResponse] =
    await Promise.all([
      supabaseClient
        .from("buildings")
        .select("id, name, address_line1, city, state")
        .order("name", { ascending: true }),
      supabaseClient
        .from("units")
        .select("id, unit_number, building_id, bedrooms, bathrooms")
        .order("unit_number", { ascending: true }),
      supabaseClient
        .from("tenant_profiles")
        .select("building_id, unit_id, roommate_role, rent_share, onboarding_status")
        .eq("tenant_id", user.id)
        .maybeSingle(),
      supabaseClient
        .from("tenant_emergency_contacts")
        .select("name, relationship, phone, email")
        .eq("tenant_id", user.id),
      supabaseClient
        .from("tenant_vehicles")
        .select("make, model, color, license_plate")
        .eq("tenant_id", user.id),
      supabaseClient
        .from("tenant_policy_acknowledgements")
        .select("policy_key, accepted")
        .eq("tenant_id", user.id),
    ])

  const buildings: BuildingOption[] = buildingsResponse?.data ?? []
  const units: UnitOption[] = unitsResponse?.data ?? []

  const profile = profileResponse?.data ?? null
  const emergencyContacts = contactsResponse?.data ?? []
  const vehicles = vehiclesResponse?.data ?? []
  const policies = policiesResponse?.data ?? []

  const acknowledgements = policies.reduce<NonNullable<OnboardingInitialValues["acknowledgements"]>>(
    (acc, policy) => {
      if (!policy?.policy_key) return acc
      switch (policy.policy_key) {
        case "house_rules":
          acc.houseRules = policy.accepted ?? false
          break
        case "rent_payments":
          acc.rentPayments = policy.accepted ?? false
          break
        case "emergency_access":
          acc.emergencyAccess = policy.accepted ?? false
          break
        default:
          break
      }
      return acc
    },
    { houseRules: false, rentPayments: false, emergencyAccess: false }
  )

  const initialValues: OnboardingInitialValues = {
    buildingId: profile?.building_id ?? null,
    unitId: profile?.unit_id ?? null,
    roommateRole: profile?.roommate_role ?? null,
    rentShare: profile?.rent_share ?? null,
    onboardingStatus: profile?.onboarding_status ?? null,
    emergencyContacts,
    vehicles: vehicles.map((vehicle: any) => ({
      make: vehicle.make ?? "",
      model: vehicle.model ?? "",
      color: vehicle.color ?? "",
      licensePlate: vehicle.license_plate ?? "",
    })),
    acknowledgements,
  }

  return (
    <div className="container">
      <OnboardingForm buildings={buildings} units={units} initialValues={initialValues} />
    </div>
  )
}
