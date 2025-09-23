import { describe, expect, it, vi } from "vitest"

import { UndoQueue } from "@/lib/undo-queue"

describe("undo queue", () => {
  it("restores the record when undo is triggered before the timer expires", () => {
    vi.useFakeTimers()

    const queue = new UndoQueue<{ id: string; name: string }>(30_000)
    const initial = [
      { id: "member-1", name: "Alice" },
      { id: "member-2", name: "Bob" },
    ]

    let optimisticState = [...initial]
    const target = initial[0]

    optimisticState = optimisticState.filter((item) => item.id !== target.id)
    expect(optimisticState).not.toContainEqual(target)

    queue.enqueue(target)
    vi.advanceTimersByTime(15_000)

    const restored = queue.undo(target.id)
    expect(restored).toEqual(target)

    if (restored) {
      optimisticState = [restored, ...optimisticState]
    }

    expect(optimisticState).toContainEqual(target)

    queue.dispose()
    vi.useRealTimers()
  })
})
