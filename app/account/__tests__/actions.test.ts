import { describe, expect, it, beforeEach, vi } from "vitest"

import { updateTenantAccount, uploadTenantDocument, updateAvatar } from "../actions"

vi.mock("@/utils/supabase/actions", () => ({
  createActionClient: vi.fn(),
}))
vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}))

import { createActionClient } from "@/utils/supabase/actions"

const mockedCreateActionClient = createActionClient as unknown as vi.Mock

describe("account server actions", () => {
  const user = { id: "user-456" }

  const profilesUpdateEq = vi.fn().mockResolvedValue({ error: null })
  const profilesUpdate = vi.fn().mockReturnValue({ eq: profilesUpdateEq })
  const tenantProfileUpsert = vi.fn().mockResolvedValue({ error: null })
  const contactDeleteEq = vi.fn().mockResolvedValue({ error: null })
  const contactDelete = vi.fn().mockReturnValue({ eq: contactDeleteEq })
  const contactInsert = vi.fn().mockResolvedValue({ error: null })
  const vehicleDeleteEq = vi.fn().mockResolvedValue({ error: null })
  const vehicleDelete = vi.fn().mockReturnValue({ eq: vehicleDeleteEq })
  const vehicleInsert = vi.fn().mockResolvedValue({ error: null })
  const policyDeleteEq = vi.fn().mockResolvedValue({ error: null })
  const policyDelete = vi.fn().mockReturnValue({ eq: policyDeleteEq })
  const policyInsert = vi.fn().mockResolvedValue({ error: null })
  const documentsInsert = vi.fn().mockResolvedValue({ error: null })
  const storageUpload = vi.fn().mockResolvedValue({ error: null })

  const mockSupabase = {
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user }, error: null }),
    },
    from: vi.fn((table: string) => {
      switch (table) {
        case "profiles":
          return { update: profilesUpdate }
        case "tenant_profiles":
          return { upsert: tenantProfileUpsert }
        case "tenant_emergency_contacts":
          return { delete: contactDelete, insert: contactInsert }
        case "tenant_vehicles":
          return { delete: vehicleDelete, insert: vehicleInsert }
        case "tenant_policy_acknowledgements":
          return { delete: policyDelete, insert: policyInsert }
        case "tenant_documents":
          return { insert: documentsInsert }
        default:
          throw new Error(`Unexpected table ${table}`)
      }
    }),
    storage: {
      from: vi.fn(() => ({ upload: storageUpload })),
    },
  }

  beforeEach(() => {
    mockedCreateActionClient.mockResolvedValue(mockSupabase)
    profilesUpdate.mockClear()
    tenantProfileUpsert.mockClear()
    contactDeleteEq.mockClear()
    contactInsert.mockClear()
    vehicleDeleteEq.mockClear()
    vehicleInsert.mockClear()
    policyDeleteEq.mockClear()
    policyInsert.mockClear()
    documentsInsert.mockClear()
    storageUpload.mockClear()
    mockSupabase.auth.getUser.mockClear()
    mockSupabase.from.mockClear()
    mockSupabase.storage.from.mockClear()
  })

  it("updates tenant metadata", async () => {
    const result = await updateTenantAccount({
      fullName: "Jamie Tenant",
      username: "jamie",
      website: "https://example.com",
      roommateRole: "tenant",
      rentShare: 1000,
      buildingId: "b1",
      unitId: "u1",
      emergencyContacts: [
        { name: "Alex", relationship: "Sibling", phone: "+1 555 222 1111", email: "alex@example.com" },
      ],
      vehicles: [{ make: "Honda", model: "Civic", color: "Red", licensePlate: "XYZ123" }],
      houseRules: true,
      rentPayments: true,
      emergencyAccess: true,
    })

    expect(result.success).toBe(true)
    expect(profilesUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        full_name: "Jamie Tenant",
        role: "tenant",
      })
    )
    expect(tenantProfileUpsert).toHaveBeenCalledWith(
      expect.objectContaining({ tenant_id: user.id, rent_share: 1000 }),
      expect.any(Object)
    )
    expect(contactInsert).toHaveBeenCalledWith(
      expect.arrayContaining([expect.objectContaining({ name: "Alex" })])
    )
    expect(vehicleInsert).toHaveBeenCalledWith(
      expect.arrayContaining([expect.objectContaining({ make: "Honda" })])
    )
    expect(policyInsert).toHaveBeenCalled()
  })

  it("uploads tenant documents", async () => {
    const file = new File(["lease"], "lease.pdf", { type: "application/pdf" })
    const formData = new FormData()
    formData.append("file", file)
    formData.append("label", "Signed Lease")
    formData.append("category", "lease")

    const result = await uploadTenantDocument(formData)

    expect(result.success).toBe(true)
    expect(storageUpload).toHaveBeenCalled()
    expect(documentsInsert).toHaveBeenCalledWith(
      expect.objectContaining({ tenant_id: user.id, title: "Signed Lease" })
    )
  })

  it("updates avatar path", async () => {
    const result = await updateAvatar("avatars/user-avatar.png")
    expect(result.success).toBe(true)
    expect(profilesUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ avatar_url: "avatars/user-avatar.png" })
    )
  })
})
