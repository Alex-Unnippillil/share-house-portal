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

  it("uses one source of truth across role map entries", () => {
    expect(roleNavigation.tenant.primaryNav).toBe(appWorkspaceNav)
    expect(roleNavigation.roommate.primaryNav).toBe(appWorkspaceNav)

    const managerNav = roleNavigation.property_manager.primaryNav
    const adminNav = roleNavigation.admin.primaryNav

    expect(managerNav).not.toBe(appWorkspaceNav)
    expect(adminNav).not.toBe(appWorkspaceNav)

    expect(managerNav.slice(0, appWorkspaceNav.length)).toEqual(appWorkspaceNav)
    expect(adminNav.slice(0, appWorkspaceNav.length)).toEqual(appWorkspaceNav)
    expect(managerNav.at(-1)?.href).toBe("/dashboard/members")
    expect(adminNav.at(-1)?.href).toBe("/dashboard/members")
  })
})
