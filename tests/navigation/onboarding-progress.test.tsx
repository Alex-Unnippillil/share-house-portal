import React from "react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import {
  ensureProgressShape,
  ONBOARDING_STEPS,
  STEP_COLUMN_MAP,
  type OnboardingProgressRecord,
  type OnboardingStep,
} from "@/lib/onboarding"

vi.mock("@/components/navigation/SmartLink", () => ({
  __esModule: true,
  default: React.forwardRef<HTMLAnchorElement, React.ComponentProps<"a">>(
    ({ children, ...props }, ref) => (
      <a ref={ref} {...props}>
        {children}
      </a>
    ),
  ),
}))

const BASE_PROGRESS = ensureProgressShape({ user_id: "test-user" })
let currentProgress: OnboardingProgressRecord = { ...BASE_PROGRESS }
let timestampCounter = 0

function completeStepMock(step: OnboardingStep) {
  const { flag, timestamp } = STEP_COLUMN_MAP[step]
  const now = new Date(Date.UTC(2025, 0, 1, 0, 0, timestampCounter++)).toISOString()

  currentProgress = {
    ...currentProgress,
    [flag]: true,
    [timestamp]: now,
    updated_at: now,
  } as OnboardingProgressRecord

  const finished = ONBOARDING_STEPS.every((key) =>
    currentProgress[STEP_COLUMN_MAP[key].flag],
  )

  if (finished && !currentProgress.completed_at) {
    currentProgress = {
      ...currentProgress,
      completed_at: now,
    }
  }

  return { data: { ...currentProgress } }
}

vi.mock("@/app/onboarding/actions", () => ({
  __esModule: true,
  getOnboardingProgress: vi.fn(async () => ({ data: { ...currentProgress } })),
  completeConfirmUnit: vi.fn(async () => completeStepMock("confirmUnit")),
  completeAddPaymentMethod: vi.fn(async () => completeStepMock("addPaymentMethod")),
  completeInviteRoommate: vi.fn(async () => completeStepMock("inviteRoommate")),
}))

import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"

import OnboardingFlow from "@/app/onboarding/_components/onboarding-flow"

describe("onboarding progress flow", () => {
  beforeEach(() => {
    currentProgress = { ...BASE_PROGRESS }
    timestampCounter = 0
  })

  it("updates completion percentage as each onboarding action is completed", async () => {
    const user = userEvent.setup()
    render(<OnboardingFlow initialProgress={BASE_PROGRESS} />)

    const confirmButton = screen.getByRole("button", {
      name: /confirm unit details/i,
    })
    expect(confirmButton).toBeEnabled()

    let lockedNotices = screen.getAllByText(
      /complete the previous step to unlock this action/i,
    )
    expect(lockedNotices).toHaveLength(2)

    let paymentButton = screen.getByRole("button", {
      name: /add payment method/i,
    })
    expect(paymentButton).toBeDisabled()

    let inviteButton = screen.getByRole("button", {
      name: /invite roommate/i,
    })
    expect(inviteButton).toBeDisabled()

    await user.click(confirmButton)
    await screen.findByText(/33% complete/i)

    paymentButton = screen.getByRole("button", {
      name: /add payment method/i,
    })
    expect(paymentButton).toBeEnabled()

    await waitFor(() => {
      lockedNotices = screen.getAllByText(
        /complete the previous step to unlock this action/i,
      )
      expect(lockedNotices).toHaveLength(1)
    })

    await user.click(paymentButton)
    await screen.findByText(/67% complete/i)

    inviteButton = screen.getByRole("button", {
      name: /invite roommate/i,
    })
    expect(inviteButton).toBeEnabled()

    await waitFor(() => {
      expect(
        screen.queryByText(/complete the previous step to unlock this action/i),
      ).not.toBeInTheDocument()
    })

    expect(screen.queryByText(/100% complete/i)).not.toBeInTheDocument()

    await user.click(inviteButton)
    await screen.findByText(/100% complete/i)

    expect(
      screen.getByText(/All household tasks are complete/i),
    ).toBeInTheDocument()
  })
})
