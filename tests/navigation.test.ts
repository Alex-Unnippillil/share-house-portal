import { describe, expect, it } from "vitest"

import { docsConfig } from "@/config/docs"
import { siteConfig } from "@/config/site"

const expectedEntries = [
  { title: "Payments", href: "/payments" },
  { title: "Pricing", href: "/pricing" },
  { title: "Documents", href: "/documents" },
  { title: "Messaging", href: "/messaging" },
]

const removedRoutes = ["/playground", "/music", "/blog"]

describe("navigation configuration", () => {
  it("removes legacy marketing routes", () => {
    const siteNavHrefs = siteConfig.mainNav.map((item) => item.href)
    const docsNavHrefs = docsConfig.mainNav.map((item) => item.href)

    for (const route of removedRoutes) {
      expect(siteNavHrefs).not.toContain(route)
      expect(docsNavHrefs).not.toContain(route)
    }
  })

  it("surfaces key resident workflows", () => {
    for (const entry of expectedEntries) {
      expect(siteConfig.mainNav).toContainEqual(expect.objectContaining(entry))
      expect(docsConfig.mainNav).toContainEqual(expect.objectContaining(entry))
    }
  })
})
