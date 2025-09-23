import { createElement } from "react"
import { describe, expect, it, vi } from "vitest"
import { renderToStaticMarkup } from "react-dom/server"

const usePathnameMock = vi.fn(() => "/")
const useSelectedLayoutSegmentsMock = vi.fn(() => [] as string[])

vi.mock("next/navigation", () => ({
  usePathname: () => usePathnameMock(),
  useSelectedLayoutSegments: () => useSelectedLayoutSegmentsMock(),
}))

vi.mock("next/link", () => ({
  __esModule: true,
  default: ({ href, children, ...props }: any) =>
    createElement(
      "a",
      { ...props, href: typeof href === "string" ? href : "" },
      children,
    ),
}))

import { Breadcrumbs } from "@/components/navigation/breadcrumbs"

describe("Breadcrumbs", () => {
  it("renders a breadcrumb trail for top-level routes", () => {
    usePathnameMock.mockReturnValue("/documents")
    useSelectedLayoutSegmentsMock.mockReturnValue(["documents"])

    const markup = renderToStaticMarkup(createElement(Breadcrumbs))

    expect(markup).toContain('aria-label="Breadcrumb"')
    expect(markup).toMatch(/<a[^>]+href="\/">Home<\/a>/)
    expect(markup).toMatch(/<span[^>]*>Documents<\/span>/)
    expect(markup).not.toMatch(/<a[^>]+href="\/documents"[^>]*>Documents<\/a>/)
  })

  it("links intermediate crumbs to their parent routes", () => {
    usePathnameMock.mockReturnValue("/documents/leases/lease-123")
    useSelectedLayoutSegmentsMock.mockReturnValue([
      "documents",
      "leases",
      "lease-123",
    ])

    const markup = renderToStaticMarkup(createElement(Breadcrumbs))

    expect(markup).toMatch(/<a[^>]+href="\/">Home<\/a>/)
    expect(markup).toMatch(/<a[^>]+href="\/documents"[^>]*>Documents<\/a>/)
    expect(markup).toMatch(/<a[^>]+href="\/documents\/leases"[^>]*>Leases<\/a>/)
    expect(markup).toMatch(/<span[^>]*>Lease 123<\/span>/)
  })
})
