import React from "react"
import { fireEvent, render, screen } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import SmartLink from "@/components/navigation/SmartLink"
import * as analytics from "@/lib/analytics"

const prefetchMock = vi.fn<(href: string) => Promise<void>>(() => Promise.resolve())

vi.mock("next/link", () => {
  return {
    __esModule: true,
    default: React.forwardRef<
      HTMLAnchorElement,
      React.ComponentProps<"a"> & { prefetch?: boolean }
    >(({ prefetch: _prefetch, ...rest }, ref) => <a ref={ref} {...rest} />),
  }
})

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    prefetch: prefetchMock,
  }),
}))

describe("SmartLink prefetch heuristics", () => {
  const startSpy = vi.spyOn(analytics, "logNavigationPrefetchStart")
  const completeSpy = vi.spyOn(analytics, "logNavigationPrefetchComplete")

  beforeEach(() => {
    prefetchMock.mockReset()
    prefetchMock.mockResolvedValue(undefined)
    startSpy.mockClear()
    completeSpy.mockClear()
    analytics.resetNavigationPrefetchMetrics()
  })

  it("prefetches on hover for navigation-heavy clusters", async () => {
    render(
      <SmartLink href="/payments" intent="navigation">
        Payments
      </SmartLink>,
    )

    const link = screen.getByRole("link", { name: "Payments" })
    fireEvent.pointerEnter(link)

    expect(prefetchMock).toHaveBeenCalledWith("/payments")
    expect(startSpy).toHaveBeenCalled()
    const startArgs = startSpy.mock.calls[0]?.[0]
    expect(startArgs?.trigger).toBe("hover")

    await Promise.resolve()

    expect(completeSpy).toHaveBeenCalled()
    const completeArgs = completeSpy.mock.calls[0]?.[0]
    expect(completeArgs?.trigger).toBe("hover")
  })

  it("prefetches on focus for keyboard intent", async () => {
    render(
      <SmartLink href="/documents" intent="passive">
        Documents
      </SmartLink>,
    )

    const link = screen.getByRole("link", { name: "Documents" })
    fireEvent.focus(link)

    expect(prefetchMock).toHaveBeenCalledWith("/documents")
    expect(startSpy).toHaveBeenCalled()
    const startArgs = startSpy.mock.calls[0]?.[0]
    expect(startArgs?.trigger).toBe("focus")

    await Promise.resolve()

    expect(completeSpy).toHaveBeenCalled()
    const completeArgs = completeSpy.mock.calls[0]?.[0]
    expect(completeArgs?.trigger).toBe("focus")
  })
})
