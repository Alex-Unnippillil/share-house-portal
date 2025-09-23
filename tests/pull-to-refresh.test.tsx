import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import React from "react"
import { act } from "react-dom/test-utils"
import { createRoot } from "react-dom/client"

import { PullToRefresh } from "@/components/pull-to-refresh"

const originalMatchMedia = window.matchMedia
const originalPointerEvent = (window as any).PointerEvent
const originalVibrate = (navigator as any).vibrate

;(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true

describe("PullToRefresh", () => {
  let matchMediaMock: ReturnType<typeof vi.fn>

  beforeEach(() => {
    vi.useFakeTimers()

    matchMediaMock = vi.fn().mockImplementation(() => ({
      matches: true,
      media: "(hover: none) and (pointer: coarse)",
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }))

    window.matchMedia = matchMediaMock as unknown as typeof window.matchMedia

    class MockPointerEvent extends Event {
      clientY: number
      pointerId: number
      pointerType: string
      isPrimary: boolean

      constructor(type: string, init: PointerEventInit = {}) {
        super(type, init)
        this.clientY = init.clientY ?? 0
        this.pointerId = init.pointerId ?? 1
        this.pointerType = init.pointerType ?? "touch"
        this.isPrimary = init.isPrimary ?? true
      }

      get cancelable() {
        return true
      }

      preventDefault() {
        // no-op for tests
      }
    }

    ;(window as any).PointerEvent = MockPointerEvent
    ;(navigator as any).vibrate = vi.fn()
  })

  afterEach(() => {
    vi.runAllTimers()
    vi.useRealTimers()
    window.matchMedia = originalMatchMedia

    if (originalPointerEvent) {
      (window as any).PointerEvent = originalPointerEvent
    } else {
      delete (window as any).PointerEvent
    }

    if (originalVibrate) {
      (navigator as any).vibrate = originalVibrate
    } else {
      delete (navigator as any).vibrate
    }
  })

  it("calls onRefresh and vibrates after crossing the pull threshold", async () => {
    const onRefresh = vi.fn().mockResolvedValue(undefined)
    const container = document.createElement("div")
    document.body.appendChild(container)
    const root = createRoot(container)

    await act(async () => {
      root.render(
        <PullToRefresh threshold={40} onRefresh={onRefresh}>
          <div>Feed</div>
        </PullToRefresh>
      )
    })

    const region = container.querySelector(
      "[data-pull-to-refresh-root]"
    ) as HTMLElement
    expect(region).toBeTruthy()

    await act(async () => {
      region.dispatchEvent(
        new window.PointerEvent("pointerdown", {
          clientY: 0,
          pointerId: 1,
          bubbles: true,
        })
      )
    })

    await act(async () => {
      window.dispatchEvent(
        new window.PointerEvent("pointermove", {
          clientY: 120,
          pointerId: 1,
          bubbles: true,
        })
      )
    })

    await act(async () => {
      window.dispatchEvent(
        new window.PointerEvent("pointerup", {
          clientY: 120,
          pointerId: 1,
          bubbles: true,
        })
      )
    })

    await act(async () => {
      vi.runAllTimers()
    })

    expect(onRefresh).toHaveBeenCalledTimes(1)
    expect((navigator as any).vibrate).toHaveBeenCalled()

    act(() => {
      root.unmount()
    })
    document.body.removeChild(container)
  })

  it("does not trigger refresh when the media query is disabled", async () => {
    matchMediaMock.mockImplementation(() => ({
      matches: false,
      media: "(hover: none) and (pointer: coarse)",
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }))

    const onRefresh = vi.fn().mockResolvedValue(undefined)
    const container = document.createElement("div")
    document.body.appendChild(container)
    const root = createRoot(container)

    await act(async () => {
      root.render(
        <PullToRefresh threshold={30} onRefresh={onRefresh}>
          <div>Feed</div>
        </PullToRefresh>
      )
    })

    const region = container.querySelector(
      "[data-pull-to-refresh-root]"
    ) as HTMLElement
    expect(region).toBeTruthy()

    await act(async () => {
      region.dispatchEvent(
        new window.PointerEvent("pointerdown", {
          clientY: 0,
          pointerId: 1,
          bubbles: true,
        })
      )
    })

    await act(async () => {
      window.dispatchEvent(
        new window.PointerEvent("pointermove", {
          clientY: 80,
          pointerId: 1,
          bubbles: true,
        })
      )
    })

    await act(async () => {
      window.dispatchEvent(
        new window.PointerEvent("pointerup", {
          clientY: 80,
          pointerId: 1,
          bubbles: true,
        })
      )
    })

    await act(async () => {
      vi.runAllTimers()
    })

    expect(onRefresh).not.toHaveBeenCalled()

    act(() => {
      root.unmount()
    })
    document.body.removeChild(container)
  })
})
