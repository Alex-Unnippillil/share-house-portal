import React from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it, vi } from "vitest"

vi.mock("next/navigation", () => ({
  useSelectedLayoutSegments: () => [],
  useRouter: () => ({
    prefetch: () => Promise.resolve(),
    push: () => {},
    replace: () => {},
  }),
}))

import Breadcrumbs, {
  buildBreadcrumbItems,
} from "@/components/navigation/Breadcrumbs"

describe("Breadcrumbs", () => {
  it("renders navigable links for intermediate segments", () => {
    const html = renderToStaticMarkup(
      <Breadcrumbs segments={["dashboard", "members"]} />
    )

    expect(html).toContain('href="/"')
    expect(html).toContain('href="/dashboard"')
    expect(html).not.toContain('href="/dashboard/members"')
    expect(html).toContain(">Home<")
    expect(html).toContain(">Dashboard<")
    expect(html).toContain(">Members<")
  })

  it("applies segment label overrides for dynamic entities", () => {
    const html = renderToStaticMarkup(
      <Breadcrumbs
        segments={["documents", "abc123"]}
        segmentLabels={{ abc123: "Lease Agreement" }}
      />
    )

    expect(html).toContain('href="/documents"')
    expect(html).toContain("Lease Agreement")
  })

  it("formats unknown segments into readable labels", () => {
    const items = buildBreadcrumbItems(["maintenance-requests", "details"])
    expect(items[1]).toMatchObject({
      href: "/maintenance-requests",
      label: "Maintenance Requests",
    })
    expect(items[2]).toMatchObject({
      href: "/maintenance-requests/details",
      label: "Details",
    })
  })
})
