import { render, act } from "@testing-library/react"
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest"
import React, { createRef, forwardRef, useImperativeHandle } from "react"
import { useDebouncedCallback } from "@/hooks/useDebouncedCallback"

interface TestHandle {
  call: (value: string) => void
}

interface TestComponentProps {
  callback: (value: string) => void
  delay?: number
}

const TestComponent = forwardRef<TestHandle, TestComponentProps>(({ callback, delay = 250 }, ref) => {
  const debounced = useDebouncedCallback(callback, delay)

  useImperativeHandle(
    ref,
    () => ({
      call: debounced,
    }),
    [debounced],
  )

  return null
})
TestComponent.displayName = "TestComponent"

describe("useDebouncedCallback", () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.runAllTimers()
    vi.useRealTimers()
  })

  it("delays invocation until the debounce window has passed", () => {
    const callback = vi.fn()
    const ref = createRef<TestHandle>()

    render(<TestComponent ref={ref} callback={callback} delay={200} />)

    act(() => {
      ref.current?.call("first")
      ref.current?.call("second")
    })

    expect(callback).not.toHaveBeenCalled()

    vi.advanceTimersByTime(199)
    expect(callback).not.toHaveBeenCalled()

    vi.advanceTimersByTime(1)
    expect(callback).toHaveBeenCalledTimes(1)
    expect(callback).toHaveBeenCalledWith("second")
  })

  it("cancels pending work when the component unmounts", () => {
    const callback = vi.fn()
    const ref = createRef<TestHandle>()

    const { unmount } = render(<TestComponent ref={ref} callback={callback} delay={200} />)

    act(() => {
      ref.current?.call("value")
    })

    unmount()
    vi.runAllTimers()

    expect(callback).not.toHaveBeenCalled()
  })

  it("always invokes the latest callback reference", () => {
    const firstCallback = vi.fn()
    const secondCallback = vi.fn()
    const ref = createRef<TestHandle>()

    const { rerender } = render(<TestComponent ref={ref} callback={firstCallback} delay={200} />)

    rerender(<TestComponent ref={ref} callback={secondCallback} delay={200} />)

    act(() => {
      ref.current?.call("value")
    })

    vi.advanceTimersByTime(200)

    expect(firstCallback).not.toHaveBeenCalled()
    expect(secondCallback).toHaveBeenCalledTimes(1)
    expect(secondCallback).toHaveBeenCalledWith("value")
  })
})
