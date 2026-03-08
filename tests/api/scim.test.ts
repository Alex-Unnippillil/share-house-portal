import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("@/lib/scim/client", () => ({
  getServiceRoleClient: vi.fn(() => ({})),
}))

vi.mock("@/lib/scim/repository", async () => {
  const actual = await vi.importActual<typeof import("@/lib/scim/repository")>(
    "@/lib/scim/repository"
  )
  return {
    ...actual,
    listProfiles: vi.fn(),
    createProfile: vi.fn(),
    getProfileById: vi.fn(),
    updateProfile: vi.fn(),
    deleteProfile: vi.fn(),
  }
})

const repository = await import("@/lib/scim/repository")
const usersRoutes = await import("@/app/api/scim/v2/Users/route")
const userRoute = await import("@/app/api/scim/v2/Users/[id]/route")

const listProfiles = vi.mocked(repository.listProfiles)
const createProfile = vi.mocked(repository.createProfile)
const getProfileById = vi.mocked(repository.getProfileById)
const updateProfile = vi.mocked(repository.updateProfile)
const deleteProfile = vi.mocked(repository.deleteProfile)

const exampleProfile: import("@/lib/scim/types").ProfileRow = {
  id: "user-1",
  created_at: "2024-01-01T00:00:00.000Z",
  updated_at: "2024-01-02T00:00:00.000Z",
  email: "tenant@example.com",
  username: null,
  full_name: "Casey Tenant",
  website: null,
  avatar_url: null,
  role: "tenant",
  unit_id: null,
  phone: null,
  language: null,
  stripe_customer_id: null,
  rent_share: null,
  metadata: {
    scim: {
      active: true,
      externalId: "external-123",
    },
  },
}

const updatedProfile: import("@/lib/scim/types").ProfileRow = {
  ...exampleProfile,
  email: "manager@example.com",
  username: "manager@example.com",
  full_name: "Updated Name",
  role: "property_manager",
  metadata: {
    scim: {
      active: false,
      externalId: "ext-999",
    },
  },
}

describe("SCIM Users collection", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  const baseUrl = "http://localhost/api/scim/v2/Users"

  it("returns a SCIM list response with pagination headers", async () => {
    listProfiles.mockResolvedValue({
      rows: [exampleProfile],
      total: 2,
    })

    const response = await usersRoutes.GET(
      new Request(`${baseUrl}?startIndex=1&count=1`)
    )

    expect(response.status).toBe(200)
    expect(response.headers.get("content-range")).toBe("1-1/2")
    expect(response.headers.get("x-total-count")).toBe("2")
    expect(response.headers.get("link")).toContain("rel=\"next\"")

    const body = await response.json()
    expect(body.schemas).toContain(
      "urn:ietf:params:scim:api:messages:2.0:ListResponse"
    )
    expect(body.startIndex).toBe(1)
    expect(body.itemsPerPage).toBe(1)
    expect(body.totalResults).toBe(2)
    expect(body.Resources).toHaveLength(1)
    expect(body.Resources[0].schemas).toContain(
      "urn:ietf:params:scim:schemas:extension:tenant:2.0:User"
    )
    expect(body.Resources[0].meta.location).toBe(
      "http://localhost/api/scim/v2/Users/user-1"
    )
  })

  it("validates filter expressions", async () => {
    const response = await usersRoutes.GET(
      new Request(`${baseUrl}?filter=userName co "x"`)
    )
    expect(response.status).toBe(400)
    const body = await response.json()
    expect(body.detail).toMatch(/unsupported filter/i)
  })

  it("creates a profile from SCIM payload", async () => {
    createProfile.mockResolvedValue(exampleProfile)

    const payload = {
      schemas: ["urn:ietf:params:scim:schemas:core:2.0:User"],
      userName: "tenant@example.com",
      name: { formatted: "Casey Tenant" },
      ["urn:ietf:params:scim:schemas:extension:tenant:2.0:User"]: {
        role: "tenant",
      },
    }

    const response = await usersRoutes.POST(
      new Request(baseUrl, {
        method: "POST",
        body: JSON.stringify(payload),
      })
    )

    expect(response.status).toBe(201)
    expect(createProfile).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        email: "tenant@example.com",
        role: "tenant",
        metadata: expect.objectContaining({ scim: expect.any(Object) }),
      })
    )

    const body = await response.json()
    expect(body.userName).toBe("tenant@example.com")
    expect(body.schemas).toContain(
      "urn:ietf:params:scim:schemas:extension:tenant:2.0:User"
    )
  })
})

describe("SCIM User detail", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  const baseUrl = "http://localhost/api/scim/v2/Users/user-1"

  it("returns 404 when a user is missing", async () => {
    getProfileById.mockResolvedValue(null)
    const response = await userRoute.GET(new Request(baseUrl), {
      params: { id: "user-1" },
    })
    expect(response.status).toBe(404)
  })

  it("reads an existing profile", async () => {
    getProfileById.mockResolvedValue(exampleProfile)
    const response = await userRoute.GET(new Request(baseUrl), {
      params: { id: "user-1" },
    })
    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body.id).toBe("user-1")
    expect(body.schemas).toContain(
      "urn:ietf:params:scim:schemas:extension:tenant:2.0:User"
    )
  })

  it("replaces a profile via PUT", async () => {
    getProfileById.mockResolvedValue(exampleProfile)
    updateProfile.mockResolvedValue(updatedProfile)

    const payload = {
      schemas: ["urn:ietf:params:scim:schemas:core:2.0:User"],
      userName: "manager@example.com",
      name: { formatted: "Updated Name" },
      active: false,
      ["urn:ietf:params:scim:schemas:extension:tenant:2.0:User"]: {
        role: "property_manager",
      },
    }

    const response = await userRoute.PUT(
      new Request(baseUrl, {
        method: "PUT",
        body: JSON.stringify(payload),
      }),
      { params: { id: "user-1" } }
    )

    expect(response.status).toBe(200)
    expect(updateProfile).toHaveBeenCalledWith(
      expect.anything(),
      "user-1",
      expect.objectContaining({ email: "manager@example.com" })
    )
    const body = await response.json()
    expect(body.userName).toBe("manager@example.com")
    expect(body.active).toBe(false)
  })

  it("applies PATCH operations", async () => {
    getProfileById.mockResolvedValue(exampleProfile)
    updateProfile.mockResolvedValue(updatedProfile)

    const payload = {
      schemas: ["urn:ietf:params:scim:api:messages:2.0:PatchOp"],
      Operations: [
        {
          op: "replace",
          path: "name.formatted",
          value: "Updated Name",
        },
        {
          op: "replace",
          path: "urn:ietf:params:scim:schemas:extension:tenant:2.0:User:role",
          value: "property_manager",
        },
        {
          op: "replace",
          path: "active",
          value: false,
        },
      ],
    }

    const response = await userRoute.PATCH(
      new Request(baseUrl, {
        method: "PATCH",
        body: JSON.stringify(payload),
      }),
      { params: { id: "user-1" } }
    )

    expect(response.status).toBe(200)
    expect(updateProfile).toHaveBeenCalledWith(
      expect.anything(),
      "user-1",
      expect.objectContaining({
        full_name: "Updated Name",
        role: "property_manager",
      })
    )
  })

  it("deletes a profile", async () => {
    getProfileById.mockResolvedValue(exampleProfile)
    deleteProfile.mockResolvedValue(undefined)

    const response = await userRoute.DELETE(new Request(baseUrl), {
      params: { id: "user-1" },
    })
    expect(response.status).toBe(204)
    expect(deleteProfile).toHaveBeenCalledWith(expect.anything(), "user-1")
  })
})
