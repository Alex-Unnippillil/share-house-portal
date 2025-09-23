import { act, render, screen } from "@testing-library/react"
import React from "react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { NavigationProgress } from "@/components/navigation-progress"

type RouterMock = {
  push: (href: string, options?: unknown) => void
  replace: (href: string, options?: unknown) => void
  back: () => void
  forward: () => void
  refresh: () => void
  prefetch: (href: string) => void
}

const createRouterMock = (): RouterMock => ({
  push: vi.fn(),
  replace: vi.fn(),
  back: vi.fn(),
  forward: vi.fn(),
  refresh: vi.fn(),
  prefetch: vi.fn(),
})

let routerMock: RouterMock = createRouterMock()
let currentPath = "/"
let currentSearch = ""

type NProgressMock = {
  status: number | null
  configure: ReturnType<typeof vi.fn>
  start: ReturnType<typeof vi.fn>
  set: ReturnType<typeof vi.fn>
  inc: ReturnType<typeof vi.fn>
  done: ReturnType<typeof vi.fn>
  remove: ReturnType<typeof vi.fn>
}

function createNProgressMock(): NProgressMock {
  const mock: NProgressMock = {
    status: null,
    configure: vi.fn(),
    start: vi.fn(),
    set: vi.fn(),
    inc: vi.fn(),
    done: vi.fn(),
    remove: vi.fn(),
  }

  mock.start.mockImplementation(() => {
    mock.status = 0
  })

  mock.set.mockImplementation((value: number) => {
    mock.status = value
  })

  mock.inc.mockImplementation((value?: number) => {
    const increment = value ?? 0.1
    const next = (mock.status ?? 0) + increment
    mock.status = Math.min(1, next)
  })

  mock.done.mockImplementation(() => {
    mock.status = null
  })

  mock.remove.mockImplementation(() => {
    mock.status = null
  })

  return mock
}

const nprogressMock = vi.hoisted(() => createNProgressMock()) as NProgressMock

vi.mock("nprogress", () => ({
  default: nprogressMock,
}))

vi.mock("next/navigation", () => ({
  useRouter: () => routerMock,
  usePathname: () => currentPath,
  useSearchParams: () => new URLSearchParams(currentSearch),
}))

const flushAnnouncements = () => {
  act(() => {
    vi.advanceTimersByTime(60)
  })
}

const latestStatusText = () => {
  const statuses = screen.getAllByRole("status")
  const last = statuses[statuses.length - 1]
  return last?.textContent ?? ""
}

describe("NavigationProgress", () => {
  beforeEach(() => {
    vi.useFakeTimers()
    routerMock = createRouterMock()
    currentPath = "/"
    currentSearch = ""
    nprogressMock.status = null
    nprogressMock.configure.mockClear()
    nprogressMock.start.mockClear()
    nprogressMock.set.mockClear()
    nprogressMock.inc.mockClear()
    nprogressMock.done.mockClear()
    nprogressMock.remove.mockClear()
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.runOnlyPendingTimers()
    vi.useRealTimers()
  })

  it("starts and completes the global progress bar during navigation", () => {
    const { rerender } = render(<NavigationProgress />)

    act(() => {
      routerMock.push("/dashboard")
    })

    expect(nprogressMock.start).toHaveBeenCalled()

    flushAnnouncements()
    expect(latestStatusText()).toContain("Navigating to /dashboard")

    act(() => {
      currentPath = "/dashboard"
      rerender(<NavigationProgress />)
    })

    expect(nprogressMock.done).toHaveBeenCalled()

    flushAnnouncements()
    expect(latestStatusText()).toContain("Navigation complete")
  })

  it("clears the progress bar when navigation errors", () => {
    routerMock.push = vi.fn(() => {
      throw new Error("boom")
    })

    render(<NavigationProgress />)

    expect(() => {
      act(() => {
        routerMock.push("/broken")
      })
    }).toThrowError("boom")

    expect(nprogressMock.start).toHaveBeenCalled()
    expect(nprogressMock.remove).toHaveBeenCalled()

    flushAnnouncements()
    expect(latestStatusText()).toContain("Navigation failed")
  })
})
