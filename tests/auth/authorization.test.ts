import { describe, expect, it } from "vitest"

import {
  filterNavigationByRole,
  isRoleAuthorized,
  matchRouteRole,
  resolveActiveMembership,
} from "@/lib/auth/authorization"
import type { BuildingMembership } from "@/types/rbac"

describe("matchRouteRole", () => {
  it("matches building listings from the authorization matrix", () => {
    const rule = matchRouteRole("/api/buildings", "GET")
    expect(rule?.roles).toEqual(["property_manager", "admin"])
  })

  it("matches maintenance updates from the authorization matrix", () => {
    const rule = matchRouteRole(
      "/api/buildings/demo-building/maintenance/123",
      "PATCH"
    )

    expect(rule?.roles).toEqual([
      "roommate",
      "property_manager",
      "admin",
    ])
  })

  it("matches dashboard member management", () => {
    const rule = matchRouteRole("/dashboard/members", "GET")
    expect(rule?.roles).toEqual(["property_manager", "admin"])
  })
})

describe("isRoleAuthorized", () => {
  it("grants access when the role matches", () => {
    expect(
      isRoleAuthorized("property_manager", ["property_manager", "admin"])
    ).toBe(true)
  })

  it("denies access when the role is missing", () => {
    expect(isRoleAuthorized(null, ["tenant"]) ).toBe(false)
  })
})

describe("filterNavigationByRole", () => {
  const navItems = [
    { title: "Home", href: "/" },
    { title: "Dashboard", href: "/dashboard", roles: ["tenant", "admin"] },
    {
      title: "Members",
      href: "/dashboard/members",
      roles: ["property_manager", "admin"],
    },
  ]

  it("removes restricted links for tenants", () => {
    const filtered = filterNavigationByRole(navItems, "tenant")
    expect(filtered.map((item) => item.title)).toEqual(["Home", "Dashboard"])
  })

  it("preserves restricted links for admins", () => {
    const filtered = filterNavigationByRole(navItems, "admin")
    expect(filtered.map((item) => item.title)).toEqual([
      "Home",
      "Dashboard",
      "Members",
    ])
  })
})

describe("resolveActiveMembership", () => {
  const memberships: BuildingMembership[] = [
    {
      building_id: "building-a",
      building_slug: "building-a",
      building_name: "Building A",
      role: "tenant",
      created_at: "2024-01-01T00:00:00Z",
    },
    {
      building_id: "building-b",
      building_slug: "building-b",
      building_name: "Building B",
      role: "property_manager",
      created_at: "2024-01-02T00:00:00Z",
    },
  ]

  it("returns an explicit building match", () => {
    const membership = resolveActiveMembership({
      memberships,
      requestedBuildingId: "building-b",
    })

    expect(membership?.building_id).toBe("building-b")
  })

  it("falls back to the first membership when none is requested", () => {
    const membership = resolveActiveMembership({ memberships })
    expect(membership?.building_id).toBe("building-a")
  })

  it("prefers cookie fallback when provided", () => {
    const membership = resolveActiveMembership({
      memberships,
      fallbackBuildingId: "building-b",
    })

    expect(membership?.building_id).toBe("building-b")
  })
})
