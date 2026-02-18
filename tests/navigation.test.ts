import { describe, expect, it } from "vitest"

import {
  getNavigationItems,
  navigationConfig,
  resolveNavTreeForRole,
} from "@/config/navigation"

const removedRoutes = ["/playground", "/music", "/blog"]

describe("shared navigation configuration", () => {
  it("removes legacy marketing routes from all role trees", () => {
    const allHrefs = Object.values(navigationConfig)
      .flat()
      .map((item) => item.href)

    for (const route of removedRoutes) {
      expect(allHrefs).not.toContain(route)
    }
  })

  it("enforces auth guards for public navigation", () => {
    const signedOut = getNavigationItems("public", {
      role: "public",
      includeDisabled: false,
    }).map((item) => item.href)

    const signedIn = getNavigationItems("public", {
      role: "tenant",
      includeDisabled: false,
    }).map((item) => item.href)

    expect(signedOut).toEqual(["/", "/contact"])
    expect(signedIn).toEqual(
      expect.arrayContaining([
        "/dashboard",
        "/payments",
        "/documents",
        "/messaging",
      ])
    )
  })

  it("enforces role-only route guards in config", () => {
    const managerWithTenantRole = getNavigationItems("property_manager", {
      role: "tenant",
      includeDisabled: false,
    }).map((item) => item.href)

    const managerWithManagerRole = getNavigationItems("property_manager", {
      role: "property_manager",
      includeDisabled: false,
    }).map((item) => item.href)

    expect(managerWithTenantRole).not.toContain("/dashboard/members")
    expect(managerWithManagerRole).toContain("/dashboard/members")
  })

  it("tracks disabled links at config level", () => {
    const tenantLinks = getNavigationItems("tenant", {
      role: "tenant",
      includeDisabled: true,
    })

    expect(
      tenantLinks.find((item) => item.href === "/supplies")
    ).toMatchObject({ disabled: true })
  })

  it("keeps equivalent destination labels aligned", () => {
    for (const [treeName, items] of Object.entries(navigationConfig)) {
      const messaging = items.find((item) => item.href === "/messaging")

      if (!messaging) {
        continue
      }

      expect(
        messaging.title,
        `Expected '${treeName}' messaging label to stay aligned`
      ).toBe("Message board")
    }
  })

  it("maps roles to a single nav tree source", () => {
    expect(resolveNavTreeForRole(null)).toBe("public")
    expect(resolveNavTreeForRole("roommate")).toBe("tenant")
    expect(resolveNavTreeForRole("property_manager")).toBe("property_manager")
    expect(resolveNavTreeForRole("admin")).toBe("admin")
  })
})
