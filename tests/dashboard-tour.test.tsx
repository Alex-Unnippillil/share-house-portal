import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { act, cleanup, render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import React from "react"

import FirstRunTour, { DASHBOARD_TOUR_STORAGE_KEY } from "@/components/dashboard/FirstRunTour"
import DashboardHelpMenu from "@/components/dashboard/HelpMenu"

const joyrideMock = vi.fn()

const JOYRIDE_STATUS = {
  FINISHED: "finished",
  SKIPPED: "skipped",
} as const

const JOYRIDE_EVENTS = {
  STEP_AFTER: "step:after",
  TARGET_NOT_FOUND: "error:target_not_found",
  TOUR_END: "tour:end",
} as const

vi.mock("react-joyride", () => ({
  __esModule: true,
  default: (props: Record<string, unknown>) => {
    joyrideMock(props)
    return null
  },
  STATUS: JOYRIDE_STATUS,
  EVENTS: JOYRIDE_EVENTS,
}))

const upsertMock = vi.fn(async () => ({ error: null }))
const fromMock = vi.fn(() => ({ upsert: upsertMock }))

vi.mock("@/utils/supabase-browser", () => ({
  __esModule: true,
  default: () => ({
    from: fromMock,
  }),
}))

vi.mock("@/hooks/use-auth", () => ({
  useAuth: () => ({
    user: { id: "user-123" },
    loading: false,
  }),
}))

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
  localStorage.clear()
})

function latestJoyrideProps<T = Record<string, unknown>>() {
  const calls = joyrideMock.mock.calls as Array<[T]>
  if (!calls.length) {
    throw new Error("Joyride was not rendered")
  }

  return calls[calls.length - 1][0]
}

describe("dashboard first run tour", () => {
  beforeEach(() => {
    localStorage.removeItem(DASHBOARD_TOUR_STORAGE_KEY)
  })

  it("starts automatically when the tour has not been completed", async () => {
    render(<FirstRunTour />)

    await waitFor(() => {
      expect(joyrideMock).toHaveBeenCalled()
      const hasRun = joyrideMock.mock.calls.some(([props]) => props.run === true)
      expect(hasRun).toBe(true)
    })
  })

  it("persists completion when skipped", async () => {
    render(<FirstRunTour />)

    await waitFor(() => {
      expect(joyrideMock.mock.calls.some(([props]) => props.run === true)).toBe(true)
    })

    const props = latestJoyrideProps<{
      callback: (args: Record<string, unknown>) => Promise<void>
      stepIndex: number
    }>()

    await act(async () => {
      await props.callback({
        status: JOYRIDE_STATUS.SKIPPED,
        type: JOYRIDE_EVENTS.TOUR_END,
        index: props.stepIndex,
      })
    })

    expect(localStorage.getItem(DASHBOARD_TOUR_STORAGE_KEY)).toBe("completed")
    expect(fromMock).toHaveBeenCalledWith("ui_tour_progress")
    await waitFor(() => {
      expect(upsertMock).toHaveBeenCalledTimes(1)
    })

    await waitFor(() => {
      const latest = latestJoyrideProps<{ run: boolean }>()
      expect(latest.run).toBe(false)
    })
  })

  it("advances steps when progressing through the tour", async () => {
    render(<FirstRunTour />)

    await waitFor(() => {
      expect(joyrideMock.mock.calls.some(([props]) => props.run === true)).toBe(true)
    })

    const props = latestJoyrideProps<{
      callback: (args: Record<string, unknown>) => Promise<void>
      stepIndex: number
    }>()

    await act(async () => {
      await props.callback({
        status: "running",
        type: JOYRIDE_EVENTS.STEP_AFTER,
        index: 0,
      })
    })

    await waitFor(() => {
      const latest = latestJoyrideProps<{ stepIndex: number }>()
      expect(latest.stepIndex).toBe(1)
    })
  })

  it("relaunches when triggered from the help menu", async () => {
    localStorage.setItem(DASHBOARD_TOUR_STORAGE_KEY, "completed")
    const user = userEvent.setup()

    render(
      <>
        <FirstRunTour />
        <div>
          <DashboardHelpMenu />
        </div>
      </>,
    )

    await waitFor(() => {
      expect(joyrideMock).toHaveBeenCalled()
    })

    expect(latestJoyrideProps<{ run: boolean }>().run).toBe(false)

    await user.click(screen.getByRole("button", { name: /help/i }))
    const reopen = await screen.findByText(/reopen tour/i)
    await user.click(reopen)

    await waitFor(() => {
      const latest = latestJoyrideProps<{ run: boolean; stepIndex: number }>()
      expect(latest.run).toBe(true)
      expect(latest.stepIndex).toBe(0)
    })
  })
})
