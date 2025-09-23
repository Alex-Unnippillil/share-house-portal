import { beforeEach, describe, expect, it, vi } from "vitest"

const {
  getUserMock,
  supabaseMock,
  createClientMock,
  fetchMemberRoleMock,
} = vi.hoisted(() => {
  const getUserMock = vi.fn()
  const supabaseMock = {
    auth: {
      getUser: getUserMock,
    },
  }

  const createClientMock = vi.fn(() => supabaseMock)
  const fetchMemberRoleMock = vi.fn()

  return { getUserMock, supabaseMock, createClientMock, fetchMemberRoleMock }
})

vi.mock("@/utils/supabase/server", () => ({
  createClient: createClientMock,
}))

vi.mock("@/lib/data/members", async () => {
  const actual = await vi.importActual<
    typeof import("@/lib/data/members")
  >("@/lib/data/members")
  return {
    ...actual,
    fetchMemberRole: fetchMemberRoleMock,
  }
})

import { authenticatePaymentRequest } from "@/lib/payments/permissions"

describe("authenticatePaymentRequest", () => {
  beforeEach(() => {
    getUserMock.mockReset()
    fetchMemberRoleMock.mockReset()
    createClientMock.mockClear()
  })

  it("returns 401 when no authenticated user is found", async () => {
    getUserMock.mockResolvedValue({ data: { user: null }, error: null })

    const result = await authenticatePaymentRequest()

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.response.status).toBe(401)
      expect(await result.response.json()).toEqual({ error: "Unauthorized" })
    }
    expect(fetchMemberRoleMock).not.toHaveBeenCalled()
  })

  it("returns 403 when the member role is not permitted", async () => {
    getUserMock.mockResolvedValue({
      data: { user: { id: "user-123" } },
      error: null,
    })
    fetchMemberRoleMock.mockResolvedValueOnce("user")

    const result = await authenticatePaymentRequest()

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.response.status).toBe(403)
      expect(await result.response.json()).toEqual({ error: "Forbidden" })
    }
  })

  it("returns 500 when role resolution fails", async () => {
    getUserMock.mockResolvedValue({
      data: { user: { id: "user-456" } },
      error: null,
    })
    const error = new Error("Database offline")
    fetchMemberRoleMock.mockRejectedValueOnce(error)
    const consoleErrorSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => {})

    const result = await authenticatePaymentRequest()

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.response.status).toBe(500)
      expect(await result.response.json()).toEqual({
        error: "Unable to verify permissions",
      })
    }
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      "Failed to resolve member role",
      error,
    )
    consoleErrorSpy.mockRestore()
  })

  it("returns the authenticated user and role when authorized", async () => {
    const user = { id: "user-789" }
    getUserMock.mockResolvedValue({
      data: { user },
      error: null,
    })
    fetchMemberRoleMock.mockResolvedValueOnce("tenant")

    const result = await authenticatePaymentRequest()

    expect(result).toEqual({
      success: true,
      user,
      role: "tenant",
    })
    expect(fetchMemberRoleMock).toHaveBeenCalledWith(supabaseMock, user.id)
  })
})
