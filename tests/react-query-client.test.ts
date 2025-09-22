import { describe, expect, it, vi } from "vitest"
import { QueryObserver, focusManager } from "@tanstack/react-query"

import { createQueryClient } from "@/lib/react-query"

async function flushMicrotasks() {
  await Promise.resolve()
  await Promise.resolve()
}

describe("React Query client focus behaviour", () => {
  it("does not refetch when window focus occurs and data is fresh", async () => {
    const queryClient = createQueryClient()
    const fetchSpy = vi.fn().mockResolvedValue("test-value")

    const observer = new QueryObserver(queryClient, {
      queryKey: ["focus-test"],
      queryFn: fetchSpy,
    })

    const unsubscribe = observer.subscribe(() => {})
    await flushMicrotasks()

    expect(fetchSpy).toHaveBeenCalledTimes(1)

    fetchSpy.mockClear()
    focusManager.setFocused(true)
    await flushMicrotasks()

    expect(fetchSpy).not.toHaveBeenCalled()

    unsubscribe()
    queryClient.clear()
  })

  it("dedupes rapid visibility changes triggered in quick succession", async () => {
    const queryClient = createQueryClient()
    const fetchSpy = vi.fn().mockResolvedValue("visibility-value")

    const observer = new QueryObserver(queryClient, {
      queryKey: ["visibility-test"],
      queryFn: fetchSpy,
    })

    const unsubscribe = observer.subscribe(() => {})
    await flushMicrotasks()
    expect(fetchSpy).toHaveBeenCalledTimes(1)

    fetchSpy.mockClear()
    focusManager.setFocused(false)
    focusManager.setFocused(true)
    focusManager.setFocused(false)
    focusManager.setFocused(true)
    await flushMicrotasks()

    expect(fetchSpy).not.toHaveBeenCalled()

    unsubscribe()
    queryClient.clear()
  })
})
