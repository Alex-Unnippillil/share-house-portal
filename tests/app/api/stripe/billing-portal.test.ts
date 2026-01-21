import { beforeEach, describe, expect, it, vi } from "vitest"
import { NextRequest } from "next/server"

const mocks = vi.hoisted(() => {
  const createSessionMock = vi.fn(async () => ({
    url: "https://billing.example.com",
  }))

  return {
    createSessionMock,
    getStripeMock: vi.fn(() => ({
      billingPortal: {
        sessions: {
          create: createSessionMock,
        },
      },
    })),
    getAppBaseUrlMock: vi.fn(() => "https://app.example.com"),
    createClientMock: vi.fn(),
    cookiesMock: vi.fn(),
  }
})

vi.mock("@/lib/stripe", () => ({
  getStripe: mocks.getStripeMock,
  getAppBaseUrl: mocks.getAppBaseUrlMock,
}))

vi.mock("@/utils/supa-server-actions", () => ({
  createClient: mocks.createClientMock,
}))

vi.mock("next/headers", () => ({
  cookies: mocks.cookiesMock,
}))

const {
  createSessionMock,
  getStripeMock,
  getAppBaseUrlMock,
  createClientMock,
  cookiesMock,
} = mocks

import { POST } from "@/app/api/stripe/billing-portal/route"

type ProfileSummary = {
  id: string
  unit_id: string | null
  stripe_customer_id?: string | null
}

type QueryResponse<T> = Promise<{
  data: T
  error: null
}>

type QueryMaybeResponse<T> = Promise<{
  data: T | null
  error: null
}>

function createProfileQueryBuilder(profile: ProfileSummary): {
  select: ReturnType<typeof vi.fn>
  eq: ReturnType<typeof vi.fn>
  single: () => QueryResponse<ProfileSummary>
} {
  const builder: any = {}
  builder.select = vi.fn(() => builder)
  builder.eq = vi.fn(() => builder)
  builder.single = vi.fn(async () => ({ data: profile, error: null }))
  builder.maybeSingle = vi.fn(async () => ({ data: profile, error: null }))
  return builder
}

function createOwnerQueryBuilder<T>(data: T | null): {
  select: ReturnType<typeof vi.fn>
  eq: ReturnType<typeof vi.fn>
  maybeSingle: () => QueryMaybeResponse<T>
} {
  const builder: any = {}
  builder.select = vi.fn(() => builder)
  builder.eq = vi.fn(() => builder)
  builder.maybeSingle = vi.fn(async () => ({ data, error: null }))
  return builder
}

describe("POST /api/stripe/billing-portal", () => {
  beforeEach(() => {
    createClientMock.mockReset()
    cookiesMock.mockReset()
    getStripeMock.mockClear()
    getAppBaseUrlMock.mockClear()
    createSessionMock.mockClear()
  })

  it("blocks access when the customer belongs to a different unit", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {})

    cookiesMock.mockReturnValue({
      get: vi.fn(),
      set: vi.fn(),
      delete: vi.fn(),
    })

    const profileBuilder = createProfileQueryBuilder({
      id: "user-123",
      unit_id: "unit-abc",
      stripe_customer_id: "cus_self",
    })
    const ownerBuilder = createOwnerQueryBuilder({
      id: "user-456",
      unit_id: "unit-other",
    })

    const supabaseStub = {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: "user-123" } },
          error: null,
        }),
      },
      from: vi
        .fn()
        .mockReturnValueOnce(profileBuilder)
        .mockReturnValueOnce(ownerBuilder),
    }

    createClientMock.mockReturnValue(supabaseStub)

    const request = new NextRequest("http://localhost/api/stripe/billing-portal", {
      method: "POST",
      body: JSON.stringify({ customerId: "cus-other" }),
      headers: { "content-type": "application/json" },
    })

    const response = await POST(request)
    const payload = (await response.json()) as {
      error: { code: string; message: string }
    }

    expect(response.status).toBe(403)
    expect(payload.error.code).toBe("AUTH_FORBIDDEN")
    expect(createSessionMock).not.toHaveBeenCalled()
    expect(warnSpy).toHaveBeenCalledWith(
      "Stripe billing portal access forbidden",
      expect.objectContaining({
        reason: "customer_not_in_unit",
        userId: "user-123",
        attemptedCustomerId: "cus-other",
      })
    )

    warnSpy.mockRestore()
  })

  it("blocks access when the customer record cannot be found", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {})

    cookiesMock.mockReturnValue({
      get: vi.fn(),
      set: vi.fn(),
      delete: vi.fn(),
    })

    const profileBuilder = createProfileQueryBuilder({
      id: "user-789",
      unit_id: "unit-shared",
      stripe_customer_id: "cus-self",
    })
    const ownerBuilder = createOwnerQueryBuilder(null)

    const supabaseStub = {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: "user-789" } },
          error: null,
        }),
      },
      from: vi
        .fn()
        .mockReturnValueOnce(profileBuilder)
        .mockReturnValueOnce(ownerBuilder),
    }

    createClientMock.mockReturnValue(supabaseStub)

    const request = new NextRequest("http://localhost/api/stripe/billing-portal", {
      method: "POST",
      body: JSON.stringify({ customerId: "cus-missing" }),
      headers: { "content-type": "application/json" },
    })

    const response = await POST(request)
    const payload = (await response.json()) as {
      error: { code: string; message: string }
    }

    expect(response.status).toBe(403)
    expect(payload.error.code).toBe("AUTH_FORBIDDEN")
    expect(createSessionMock).not.toHaveBeenCalled()
    expect(warnSpy).toHaveBeenCalledWith(
      "Stripe billing portal access forbidden",
      expect.objectContaining({
        reason: "customer_not_found",
        userId: "user-789",
        attemptedCustomerId: "cus-missing",
      })
    )

    warnSpy.mockRestore()
  })
})
