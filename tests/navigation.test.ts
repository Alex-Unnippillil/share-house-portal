import { describe, expect, it } from "vitest"

import { docsConfig } from "@/config/docs"
import { siteConfig } from "@/config/site"

const removedRoutes = ["/playground", "/music", "/blog"] as const

const requiredRoutes = [
  { href: "/dashboard/payments", title: "Payments" },
  { href: "/dashboard/bookings", title: "Bookings" },
  { href: "/dashboard/documents", title: "Documents" },
  { href: "/dashboard/messages", title: "Messaging" },
  { href: "/dashboard/maintenance", title: "Maintenance" },
  { href: "/dashboard/visitors", title: "Visitors" },
]

const getMainNavHrefs = (items: { href?: string | undefined }[]) =>
  items.map((item) => item.href).filter((href): href is string => Boolean(href))

const getSidebarHrefs = (
  items: { items: { href?: string | undefined }[] }[]
) =>
  items
    .flatMap((section) => section.items)
    .map((item) => item.href)
    .filter((href): href is string => Boolean(href))

describe("navigation configuration", () => {
  it("removes deprecated experiences from the global navigation", () => {
    const mainNavHrefs = getMainNavHrefs(siteConfig.mainNav)

    removedRoutes.forEach((href) => {
      expect(mainNavHrefs).not.toContain(href)
    })
  })

  it("removes deprecated experiences from the docs navigation", () => {
    const docsMainHrefs = getMainNavHrefs(docsConfig.mainNav)

    removedRoutes.forEach((href) => {
      expect(docsMainHrefs).not.toContain(href)
    })
  })

  it("surfaces tenant workflows in the global navigation", () => {
    const mainNavHrefs = getMainNavHrefs(siteConfig.mainNav)

    requiredRoutes.forEach(({ href }) => {
      expect(mainNavHrefs).toContain(href)
    })
  })

  it("surfaces tenant workflows in the docs navigation", () => {
    const docsMainHrefs = getMainNavHrefs(docsConfig.mainNav)

    requiredRoutes.forEach(({ href }) => {
      expect(docsMainHrefs).toContain(href)
    })
  })

  it("lists tenant workflows in the mobile sidebar", () => {
    const sidebarHrefs = getSidebarHrefs(docsConfig.sidebarNav)

    requiredRoutes.forEach(({ href }) => {
      expect(sidebarHrefs).toContain(href)
    })

    removedRoutes.forEach((href) => {
      expect(sidebarHrefs).not.toContain(href)
    })
  })
})
