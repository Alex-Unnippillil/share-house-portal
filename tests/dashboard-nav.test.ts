import { describe, expect, it } from "vitest"

import { getDashboardNavLinks, isLandlordRole } from "@/lib/data/dashboard-nav"

describe("dashboard navigation", () => {
  it("identifies landlord style roles", () => {
    expect(isLandlordRole("admin")).toBe(true)
    expect(isLandlordRole("property_manager")).toBe(true)
    expect(isLandlordRole("landlord")).toBe(true)
    expect(isLandlordRole("tenant")).toBe(false)
    expect(isLandlordRole(null)).toBe(false)
  })

  it("returns extended navigation for property managers", () => {
    const links = getDashboardNavLinks("property_manager")
    const hrefs = links.map((link) => link.href)
    expect(hrefs).toContain("/dashboard/members")
    expect(hrefs).toContain("/documents")
  })

  it("returns resident navigation for standard tenants", () => {
    const links = getDashboardNavLinks("tenant")
    const hrefs = links.map((link) => link.href)
    expect(hrefs).not.toContain("/dashboard/members")
    expect(hrefs).toContain("/documents")
    expect(links.find((link) => link.href === "/documents")?.text).toBe("My Lease")
  })
})
