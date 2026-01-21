import { beforeEach, describe, expect, it, vi } from "vitest"

import {
  type ActiveImpersonationSession,
  decodeImpersonationCookie,
  startImpersonationSession,
  stopImpersonationSession,
} from "@/lib/admin/impersonation"

const fetchMemberProfileMock = vi.hoisted(() => vi.fn())

vi.mock("@/lib/data/members", () => ({
  fetchMemberProfile: fetchMemberProfileMock,
}))

describe("admin impersonation helpers", () => {
  beforeEach(() => {
    fetchMemberProfileMock.mockReset()
  })

  it("creates impersonation session payloads and audit entry", async () => {
    fetchMemberProfileMock
      .mockResolvedValueOnce({
        id: "admin-1",
        email: "admin@example.com",
        full_name: "Admin User",
        role: "admin",
        unit_id: null,
      })
      .mockResolvedValueOnce({
        id: "tenant-1",
        email: "tenant@example.com",
        full_name: "Tenant One",
        role: "tenant",
        unit_id: "unit-7",
      })

    const result = await startImpersonationSession({
      client: {} as any,
      impersonatorId: "admin-1",
      targetUserId: "tenant-1",
      auditContext: { ipAddress: "203.0.113.8", userAgent: "vitest" },
    })

    expect(result.session.targetUserId).toBe("tenant-1")
    expect(result.metadataUpdate).toMatchObject({
      impersonation: {
        active: true,
        target_user_id: "tenant-1",
        target_email: "tenant@example.com",
        target_name: "Tenant One",
      },
    })

    expect(result.auditEntry).toMatchObject({
      action: "impersonation_started",
      actorUserId: "admin-1",
      targetUserId: "tenant-1",
      performedUnderImpersonation: true,
    })

    expect(result.auditEntry.metadata).toMatchObject({
      targetEmail: "tenant@example.com",
      targetName: "Tenant One",
      ipAddress: "203.0.113.8",
      userAgent: "vitest",
    })

    const decoded = decodeImpersonationCookie(result.cookieValue)
    expect(decoded?.impersonatorId).toBe("admin-1")
    expect(decoded?.targetEmail).toBe("tenant@example.com")
  })

  it("marks audit entries when stopping impersonation", async () => {
    fetchMemberProfileMock.mockResolvedValueOnce({
      id: "admin-1",
      email: "admin@example.com",
      full_name: "Admin User",
      role: "admin",
      unit_id: null,
    })

    const session: ActiveImpersonationSession = {
      impersonatorId: "admin-1",
      impersonatorRole: "admin",
      targetUserId: "tenant-1",
      targetEmail: "tenant@example.com",
      targetName: "Tenant One",
      startedAt: new Date("2024-06-01T12:00:00.000Z").toISOString(),
    }

    const result = await stopImpersonationSession({
      client: {} as any,
      impersonatorId: "admin-1",
      session,
      auditContext: { ipAddress: "198.51.100.4", userAgent: "vitest" },
    })

    expect(result.metadataUpdate).toEqual({ impersonation: null })
    expect(result.auditEntry).toMatchObject({
      action: "impersonation_stopped",
      actorUserId: "admin-1",
      targetUserId: "tenant-1",
      performedUnderImpersonation: true,
    })
    expect(result.auditEntry.metadata).toMatchObject({
      targetEmail: "tenant@example.com",
      startedAt: session.startedAt,
      ipAddress: "198.51.100.4",
    })
    expect(result.endedAt).toBeTypeOf("string")
  })

  it("rejects impersonation attempts from non-admin users", async () => {
    fetchMemberProfileMock.mockResolvedValueOnce({
      id: "tenant-2",
      email: "tenant@example.com",
      full_name: "Regular User",
      role: "tenant",
      unit_id: "unit-9",
    })

    await expect(
      startImpersonationSession({
        client: {} as any,
        impersonatorId: "tenant-2",
        targetUserId: "tenant-3",
      })
    ).rejects.toMatchObject({
      status: 403,
      message: "Only administrators can impersonate users.",
    })
  })
})
