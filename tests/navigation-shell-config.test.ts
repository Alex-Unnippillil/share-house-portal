import { describe, expect, it } from "vitest"

import { getRoleNavigation, publicNav, roleNavigation, type PortalRole } from "@/config/navigation"

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
    expect(roleNavigation.tenant.primaryNav).toBe(roleNavigation.roommate.primaryNav)
  })
})
