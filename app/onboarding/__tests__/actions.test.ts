import { describe, expect, it, beforeEach, vi } from "vitest"

import { completeOnboarding, saveOnboardingStep } from "../actions"

vi.mock("@/utils/supabase/actions", () => ({
  createActionClient: vi.fn(),
}))
vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}))

import { createActionClient } from "@/utils/supabase/actions"

const mockedCreateActionClient = createActionClient as unknown as vi.Mock

describe("onboarding server actions", () => {
  const user = { id: "user-123" }

  const tenantProfilesUpsert = vi.fn().mockResolvedValue({ error: null })
  const profilesUpdateEq = vi.fn().mockResolvedValue({ error: null })
  const profilesUpdate = vi.fn().mockReturnValue({ eq: profilesUpdateEq })
  const emergencyDeleteEq = vi.fn().mockResolvedValue({ error: null })
  const emergencyDelete = vi.fn().mockReturnValue({ eq: emergencyDeleteEq })
  const emergencyInsert = vi.fn().mockResolvedValue({ error: null })
  const vehicleDeleteEq = vi.fn().mockResolvedValue({ error: null })
  const vehicleDelete = vi.fn().mockReturnValue({ eq: vehicleDeleteEq })
  const vehicleInsert = vi.fn().mockResolvedValue({ error: null })
  const policyDeleteEq = vi.fn().mockResolvedValue({ error: null })
  const policyDelete = vi.fn().mockReturnValue({ eq: policyDeleteEq })
  const policyInsert = vi.fn().mockResolvedValue({ error: null })

  const mockSupabase = {
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user }, error: null }),
    },
    from: vi.fn((table: string) => {
      switch (table) {
        case "tenant_profiles":
          return { upsert: tenantProfilesUpsert }
        case "profiles":
          return { update: profilesUpdate }
        case "tenant_emergency_contacts":
          return { delete: emergencyDelete, insert: emergencyInsert }
        case "tenant_vehicles":
          return { delete: vehicleDelete, insert: vehicleInsert }
        case "tenant_policy_acknowledgements":
          return { delete: policyDelete, insert: policyInsert }
        default:
          throw new Error(`Unexpected table ${table}`)
      }
    }),
  }

  beforeEach(() => {
    tenantProfilesUpsert.mockClear()
    profilesUpdate.mockClear()
    emergencyDeleteEq.mockClear()
    emergencyInsert.mockClear()
    vehicleDeleteEq.mockClear()
    vehicleInsert.mockClear()
    policyDeleteEq.mockClear()
    policyInsert.mockClear()
    mockSupabase.auth.getUser.mockClear()
    mockSupabase.from.mockClear()
    mockedCreateActionClient.mockResolvedValue(mockSupabase)
  })

  it("persists building selection", async () => {
    const result = await saveOnboardingStep("building", { buildingId: "building-1", unitId: "unit-2" })
    expect(result.success).toBe(true)
    expect(mockSupabase.from).toHaveBeenCalledWith("tenant_profiles")
    expect(tenantProfilesUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        tenant_id: user.id,
        building_id: "building-1",
        unit_id: "unit-2",
        onboarding_status: "in_progress",
      }),
      expect.any(Object)
    )
    expect(profilesUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ building_id: "building-1", unit_id: "unit-2" })
    )
  })

  it("stores policy acknowledgements", async () => {
    const result = await saveOnboardingStep("policy", {
      houseRules: true,
      rentPayments: true,
      emergencyAccess: true,
    })
    expect(result.success).toBe(true)
    expect(policyDelete).toHaveBeenCalled()
    expect(policyInsert).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ policy_key: "house_rules", tenant_id: user.id }),
        expect.objectContaining({ policy_key: "rent_payments" }),
        expect.objectContaining({ policy_key: "emergency_access" }),
      ])
    )
  })

  it("completes onboarding with final data", async () => {
    const result = await completeOnboarding({
      buildingId: "building-1",
      unitId: "unit-2",
      roommateRole: "tenant",
      rentShare: 900,
      emergencyContacts: [
        { name: "Pat", relationship: "Friend", phone: "+1 555 111 2222", email: "pat@example.com" },
      ],
      vehicles: [
        { make: "Honda", model: "Civic", color: "Blue", licensePlate: "ABC123" },
      ],
      houseRules: true,
      rentPayments: true,
      emergencyAccess: true,
    })

    expect(result.success).toBe(true)
    expect(tenantProfilesUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        tenant_id: user.id,
        onboarding_status: "completed",
        rent_share: 900,
      }),
      expect.any(Object)
    )
    expect(profilesUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        role: "tenant",
        building_id: "building-1",
        unit_id: "unit-2",
      })
    )
    expect(emergencyInsert).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ name: "Pat", tenant_id: user.id }),
      ])
    )
    expect(vehicleInsert).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ make: "Honda", tenant_id: user.id }),
      ])
    )
  })
})
