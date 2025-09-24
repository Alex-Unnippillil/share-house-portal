import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("@/utils/supabase/server", () => ({
  createClient: vi.fn(),
}))

vi.mock("@/lib/supabase", async () => {
  const actual = await vi.importActual<typeof import("@/lib/supabase")>(
    "@/lib/supabase"
  )
  return {
    ...actual,
    issueClientCredentials: vi.fn(),
    rotateClientSecret: vi.fn(),
  }
})

import { createClient } from "@/utils/supabase/server"
import {
  issueClientCredentials,
  rotateClientSecret,
  OAuthClientError,
  OAuthClientNotFoundError,
} from "@/lib/supabase"
import { POST as createClientRoute } from "@/app/api/developer/clients/route"
import { POST as rotateRoute } from "@/app/api/developer/clients/[clientId]/rotate/route"

type SupabaseStubOptions = {
  userId?: string | null
  role?: string | null
  profileError?: { message: string } | null
}

function createSupabaseStub({
  userId = "admin-user",
  role = "admin",
  profileError = null,
}: SupabaseStubOptions = {}) {
  const maybeSingle = vi.fn().mockResolvedValue({
    data: role === null ? null : { role },
    error: profileError,
  })

  const eq = vi.fn().mockReturnValue({ maybeSingle })
  const select = vi.fn().mockReturnValue({ eq, maybeSingle })
  const from = vi.fn().mockImplementation((table: string) => {
    expect(table).toBe("profiles")
    return { select, eq, maybeSingle }
  })

  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: userId ? { id: userId } : null },
      }),
    },
    from,
  }
}

const createClientMock = vi.mocked(createClient)
const issueClientCredentialsMock = vi.mocked(issueClientCredentials)
const rotateClientSecretMock = vi.mocked(rotateClientSecret)

describe("developer credential APIs", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("creates OAuth clients for admins", async () => {
    const supabase = createSupabaseStub()
    createClientMock.mockReturnValue(supabase as any)
    issueClientCredentialsMock.mockResolvedValue({
      clientId: "client-123",
      clientSecret: "secret-value",
      keyId: "key-1",
      clientRowId: "row-1",
    })

    const infoSpy = vi.spyOn(console, "info").mockImplementation(() => {})

    const request = new Request("http://localhost/api/developer/clients", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Calendar integration",
        redirectUri: "https://example.com/callback",
      }),
    })

    const response = await createClientRoute(request)
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body).toEqual({
      clientId: "client-123",
      clientSecret: "secret-value",
      keyId: "key-1",
    })
    expect(issueClientCredentialsMock).toHaveBeenCalledWith({
      name: "Calendar integration",
      redirectUri: "https://example.com/callback",
      description: undefined,
      createdBy: "admin-user",
    })
    expect(infoSpy).toHaveBeenCalledWith(
      "[developer] issued OAuth client",
      expect.objectContaining({ clientId: "client-123", userId: "admin-user" })
    )

    infoSpy.mockRestore()
  })

  it("rejects non-admin users", async () => {
    const supabase = createSupabaseStub({ role: "tenant" })
    createClientMock.mockReturnValue(supabase as any)

    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {})

    const request = new Request("http://localhost/api/developer/clients", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Not allowed" }),
    })

    const response = await createClientRoute(request)
    const body = await response.json()

    expect(response.status).toBe(403)
    expect(body.error).toBe("Forbidden")
    expect(issueClientCredentialsMock).not.toHaveBeenCalled()
    expect(warnSpy).toHaveBeenCalled()

    warnSpy.mockRestore()
  })

  it("returns validation errors for malformed payloads", async () => {
    const supabase = createSupabaseStub()
    createClientMock.mockReturnValue(supabase as any)

    const request = new Request("http://localhost/api/developer/clients", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "ab" }),
    })

    const response = await createClientRoute(request)
    const body = await response.json()

    expect(response.status).toBe(400)
    expect(body.error).toBe("Validation failed")
    expect(issueClientCredentialsMock).not.toHaveBeenCalled()
  })

  it("propagates service errors when issuing credentials fails", async () => {
    const supabase = createSupabaseStub()
    createClientMock.mockReturnValue(supabase as any)

    issueClientCredentialsMock.mockRejectedValue(
      new OAuthClientError("insert failed", 503)
    )

    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {})

    const request = new Request("http://localhost/api/developer/clients", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Calendar" }),
    })

    const response = await createClientRoute(request)
    const body = await response.json()

    expect(response.status).toBe(503)
    expect(body.error).toBe("insert failed")
    expect(errorSpy).toHaveBeenCalled()

    errorSpy.mockRestore()
  })

  it("rotates client secrets for admins", async () => {
    const supabase = createSupabaseStub()
    createClientMock.mockReturnValue(supabase as any)

    rotateClientSecretMock.mockResolvedValue({
      clientId: "client-123",
      clientSecret: "rotated-secret",
      keyId: "key-2",
      previousKeyId: "key-1",
    })

    const infoSpy = vi.spyOn(console, "info").mockImplementation(() => {})

    const response = await rotateRoute(new Request("http://localhost", { method: "POST" }), {
      params: { clientId: "client-123" },
    })
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body).toEqual({
      clientId: "client-123",
      clientSecret: "rotated-secret",
      keyId: "key-2",
      previousKeyId: "key-1",
    })
    expect(rotateClientSecretMock).toHaveBeenCalledWith({
      clientId: "client-123",
      rotatedBy: "admin-user",
    })
    expect(infoSpy).toHaveBeenCalled()

    infoSpy.mockRestore()
  })

  it("returns 404 when rotating an unknown client", async () => {
    const supabase = createSupabaseStub()
    createClientMock.mockReturnValue(supabase as any)

    rotateClientSecretMock.mockRejectedValue(
      new OAuthClientNotFoundError("missing")
    )

    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {})

    const response = await rotateRoute(new Request("http://localhost", { method: "POST" }), {
      params: { clientId: "missing" },
    })
    const body = await response.json()

    expect(response.status).toBe(404)
    expect(body.error).toMatch(/missing/)
    expect(warnSpy).toHaveBeenCalled()

    warnSpy.mockRestore()
  })

  it("blocks rotation for non-admin users", async () => {
    const supabase = createSupabaseStub({ role: "tenant" })
    createClientMock.mockReturnValue(supabase as any)

    const response = await rotateRoute(new Request("http://localhost", { method: "POST" }), {
      params: { clientId: "client-123" },
    })
    const body = await response.json()

    expect(response.status).toBe(403)
    expect(body.error).toBe("Forbidden")
    expect(rotateClientSecretMock).not.toHaveBeenCalled()
  })
})
