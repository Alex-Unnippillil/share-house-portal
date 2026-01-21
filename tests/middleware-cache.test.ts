import { beforeEach, describe, expect, it, vi } from "vitest"
import { NextRequest } from "next/server"

import { middleware } from "@/middleware"

const getUserMock = vi.fn()

vi.mock("@supabase/ssr", () => ({
  createServerClient: vi.fn(() => ({
    auth: {
      getUser: getUserMock,
    },
  })),
}))

const createRequest = (pathname: string, init?: RequestInit) =>
  new NextRequest(`https://example.com${pathname}`, init)

describe("middleware caching", () => {
  beforeEach(() => {
    getUserMock.mockReset()
  })

  it("applies edge caching to public marketing routes when anonymous", async () => {
    getUserMock.mockResolvedValue({ data: { user: null }, error: null })

    const response = await middleware(createRequest("/"))

    expect(response.headers.get("Cache-Control")).toBe(
      "public, s-maxage=300, stale-while-revalidate=600",
    )
    expect(response.headers.get("CDN-Cache-Control")).toBe(
      "public, s-maxage=300, stale-while-revalidate=600",
    )
    expect(response.headers.get("x-cache-strategy")).toBe("public-edge")
    expect(response.headers.get("x-tenant-cache-tags")).toBe("tenant:public")

    const vary = response.headers.get("Vary") || ""
    expect(vary.split(",").map(part => part.trim())).toEqual(
      expect.arrayContaining([
        "Authorization",
        "Cookie",
        "Next-Router-State-Tree",
        "Next-Router-Prefetch",
        "RSC",
      ]),
    )
  })

  it("avoids caching private dashboards for anonymous requests", async () => {
    getUserMock.mockResolvedValue({ data: { user: null }, error: null })

    const response = await middleware(createRequest("/dashboard"))

    expect(response.headers.get("Cache-Control")).toBe(
      "private, no-store, max-age=0, must-revalidate",
    )
    expect(response.headers.get("x-cache-strategy")).toBe("private-no-store")
    expect(response.headers.get("x-tenant-cache-tags")).toBe("tenant:unknown")
  })

  it("disables public caching when a tenant session is active", async () => {
    getUserMock.mockResolvedValue({
      data: {
        user: {
          id: "user-1",
          app_metadata: { tenant_id: "tenant-123" },
          user_metadata: {},
        },
      },
      error: null,
    })

    const response = await middleware(createRequest("/"))

    expect(response.headers.get("Cache-Control")).toBe(
      "private, no-store, max-age=0, must-revalidate",
    )
    expect(response.headers.get("CDN-Cache-Control")).toBe(
      "private, no-store, max-age=0, must-revalidate",
    )
    expect(response.headers.get("x-cache-strategy")).toBe("private-no-store")
    expect(response.headers.get("x-tenant-cache-tags")).toBe(
      "tenant:tenant-123",
    )
  })
})
