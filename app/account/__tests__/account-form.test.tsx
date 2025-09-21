import React from "react"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, beforeEach, vi } from "vitest"

vi.mock("../avatar", () => ({
  __esModule: true,
  default: ({ onUpload }: { onUpload: (path: string) => void }) => (
    <button onClick={() => onUpload("avatars/new-avatar.png")}>Mock Avatar Upload</button>
  ),
}))

vi.mock("../actions", () => ({
  updateTenantAccount: vi.fn().mockResolvedValue({ success: true }),
  uploadTenantDocument: vi.fn().mockResolvedValue({ success: true }),
  updateAvatar: vi.fn().mockResolvedValue({ success: true }),
}))

import AccountForm from "../supa-account-form"
import { updateTenantAccount, uploadTenantDocument, updateAvatar } from "../actions"

const mockedUpdate = updateTenantAccount as unknown as vi.Mock
const mockedUpload = uploadTenantDocument as unknown as vi.Mock
const mockedAvatar = updateAvatar as unknown as vi.Mock

describe("AccountForm", () => {
  beforeEach(() => {
    mockedUpdate.mockClear()
    mockedUpload.mockClear()
    mockedAvatar.mockClear()
  })

  const user = {
    id: "user-789",
    email: "roommate@example.com",
  } as any

  const buildings = [{ id: "b1", name: "Building One" }]
  const units = [{ id: "u1", unit_number: "2B", building_id: "b1" }]

  it("submits tenant metadata and uploads documents", async () => {
    const userEvents = userEvent.setup()

    render(
      <AccountForm
        user={user}
        profile={{ id: "user-789", full_name: "Taylor", username: "taylor", website: "", avatar_url: null, role: "tenant" }}
        tenantProfile={{ tenant_id: "user-789", building_id: "b1", unit_id: "u1", roommate_role: "tenant", rent_share: 950 }}
        emergencyContacts={[
          { id: 1, name: "Alex", relationship: "Sibling", phone: "+1 555 444 3333", email: "alex@example.com" },
        ]}
        vehicles={[]}
        policies={[{ policy_key: "house_rules", accepted: true }, { policy_key: "rent_payments", accepted: true }, { policy_key: "emergency_access", accepted: true }]}
        documents={[]}
        leases={[]}
        buildings={buildings}
        units={units}
      />
    )

    await userEvents.click(screen.getByRole("button", { name: /mock avatar upload/i }))
    expect(mockedAvatar).toHaveBeenCalledWith("avatars/new-avatar.png")

    await userEvents.clear(screen.getByLabelText(/full name/i))
    await userEvents.type(screen.getByLabelText(/full name/i), "Taylor Tenant")
    await userEvents.type(screen.getByLabelText(/website/i), "https://example.com")
    await userEvents.clear(screen.getByLabelText(/rent share/i))
    await userEvents.type(screen.getByLabelText(/rent share/i), "1050")

    await userEvents.click(screen.getByRole("button", { name: /save changes/i }))

    await waitFor(() => {
      expect(mockedUpdate).toHaveBeenCalled()
    })
    expect(mockedUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ fullName: "Taylor Tenant", rentShare: 1050 })
    )

    const file = new File(["lease"], "lease.pdf", { type: "application/pdf" })
    await userEvents.upload(screen.getByLabelText(/document file/i), file)
    await userEvents.type(screen.getByLabelText(/label/i), "Signed Lease")
    await userEvents.click(screen.getByRole("button", { name: /upload document/i }))

    await waitFor(() => {
      expect(mockedUpload).toHaveBeenCalled()
    })
  })
})
