import React from "react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { renderToStaticMarkup } from "react-dom/server"

vi.mock("@vercel/analytics/react", () => ({
  track: vi.fn(),
}))

const pushMock = vi.fn()

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: pushMock,
    prefetch: vi.fn(),
    replace: vi.fn(),
    refresh: vi.fn(),
    back: vi.fn(),
  }),
}))

vi.mock("next/link", () => ({
  __esModule: true,
  default: React.forwardRef<
    HTMLAnchorElement,
    React.ComponentPropsWithoutRef<"a"> & { href: string | URL }
  >(({ href, children, ...props }, ref) => {
    const resolvedHref =
      typeof href === "string"
        ? href
        : href instanceof URL
          ? href.toString()
          : (href as { pathname?: string })?.pathname ?? ""

    return (
      <a ref={ref} href={resolvedHref} {...props}>
        {children}
      </a>
    )
  }),
}))

import GlobalError from "@/app/error"
import NotFound from "@/app/not-found"
import {
  filterRecoveryResources,
  recoveryResources,
} from "@/lib/recovery-resources"

describe("recovery experience", () => {
  beforeEach(() => {
    pushMock.mockReset()
  })

  it("renders actionable navigation on the global error page", () => {
    const markup = renderToStaticMarkup(
      <GlobalError error={new Error("Test failure")} reset={() => {}} />
    )

    expect(markup).toContain("We hit a snag loading that view")
    expect(markup).toContain('href="/dashboard"')
    expect(markup).toContain('href="/contact"')
    expect(markup).toContain("Try again")
    expect(markup).toContain('href="/payments"')
    expect(markup).toContain('href="/documents"')
  })

  it("renders the not-found page with support options", () => {
    const markup = renderToStaticMarkup(<NotFound />)

    expect(markup).toContain("We couldn’t find that page")
    expect(markup).toContain('href="/dashboard"')
    expect(markup).toContain('href="/contact"')
  })

  it("filters recovery resources by query", () => {
    const results = filterRecoveryResources("pay")

    expect(results.some((resource) => resource.href === "/payments")).toBe(true)
    expect(results.length).toBeLessThanOrEqual(recoveryResources.length)
  })

  it("returns all recovery resources when no query is provided", () => {
    expect(filterRecoveryResources("")).toEqual(recoveryResources)
  })
})
