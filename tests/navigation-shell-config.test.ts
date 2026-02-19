import { describe, expect, it } from "vitest"

import { appWorkspaceNav, getRoleNavigation, publicNav, roleNavigation, type PortalRole } from "@/config/navigation"

const expectedWorkflowRoutes = [
  "/dashboard",
  "/payments",
  "/bookings",
  "/documents",
  "/maintenance",
  "/messaging",
  "/visitors",
]

describe("portal role navigation", () => {
  it.each(["tenant", "roommate", "property_manager", "admin"] as PortalRole[])(
    "renders the canonical nav for %s",
    (role) => {
      const nav = getRoleNavigation(role)
      const hrefs = nav.primaryNav.map((item) => item.href)

      for (const route of expectedWorkflowRoutes) {
        expect(hrefs).toContain(route)
      }
    }
  )

  it("falls back to public navigation for guests", () => {
    const nav = getRoleNavigation(null)
    expect(nav.primaryNav).toEqual(publicNav)
  })

  it("uses shared nav for tenant personas and extended nav for manager personas", () => {
    expect(roleNavigation.tenant.primaryNav).toBe(appWorkspaceNav)
    expect(roleNavigation.roommate.primaryNav).toBe(appWorkspaceNav)
    expect(roleNavigation.property_manager.primaryNav).toEqual([
      ...appWorkspaceNav,
      {
        title: "Members",
        href: "/dashboard/members",
        roles: ["property_manager", "admin"],
        domain: "account",
        subtitle: "Roster & access",
        badge: "Admin",
      },
    ])
    expect(roleNavigation.admin.primaryNav).toEqual(roleNavigation.property_manager.primaryNav)
  })
})
