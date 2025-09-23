import { afterEach, describe, expect, it, vi } from "vitest"
import React from "react"
import { act } from "react-dom/test-utils"
import { createRoot } from "react-dom/client"

import { ThreadPostsRefresh } from "@/components/messaging/thread-posts-refresh"

const { routerRefresh } = vi.hoisted(() => ({
  routerRefresh: vi.fn(),
}))

;(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true

const { storeRefreshHandler, getRefreshHandler, resetRefreshHandler } = vi.hoisted(() => {
  let handler: (() => Promise<void> | void) | undefined
  return {
    storeRefreshHandler(fn?: () => Promise<void> | void) {
      handler = fn
    },
    getRefreshHandler: () => handler,
    resetRefreshHandler() {
      handler = undefined
    },
  }
})

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    refresh: routerRefresh,
  }),
}))

vi.mock("@/components/pull-to-refresh", () => ({
  PullToRefresh: ({ onRefresh, children }: any) => {
    storeRefreshHandler(onRefresh)
    return <div data-testid="thread-pull">{children}</div>
  },
}))

describe("ThreadPostsRefresh", () => {
  afterEach(() => {
    routerRefresh.mockReset()
    resetRefreshHandler()
  })

  it("calls router.refresh when triggered", async () => {
    const container = document.createElement("div")
    document.body.appendChild(container)
    const root = createRoot(container)

    await act(async () => {
      root.render(
        <ThreadPostsRefresh>
          <div>Message one</div>
        </ThreadPostsRefresh>
      )
    })

    const refreshHandler = getRefreshHandler()
    expect(refreshHandler).toBeTruthy()

    vi.useFakeTimers()

    await act(async () => {
      const result = refreshHandler?.()
      vi.runAllTimers()
      if (result instanceof Promise) {
        await result
      }
    })

    vi.useRealTimers()

    expect(routerRefresh).toHaveBeenCalledTimes(1)

    act(() => {
      root.unmount()
    })
    document.body.removeChild(container)
  })
})
