"use client"

import { useCallback, useState, useTransition } from "react"

import {
  ONBOARDING_STEPS,
  calculateCompletion,
  countCompletedSteps,
  ensureProgressShape,
  type OnboardingProgressRecord,
  type OnboardingStep,
} from "@/lib/onboarding"

import {
  completeAddPaymentMethod,
  completeConfirmUnit,
  completeInviteRoommate,
  getOnboardingProgress,
  type OnboardingProgressActionResponse,
} from "@/app/onboarding/actions"

type StepAction = () => Promise<OnboardingProgressActionResponse>

const STEP_ACTIONS: Record<OnboardingStep, StepAction> = {
  confirmUnit: completeConfirmUnit,
  addPaymentMethod: completeAddPaymentMethod,
  inviteRoommate: completeInviteRoommate,
}

export type { OnboardingProgressRecord, OnboardingStep }

export function useOnboardingProgress(
  initialProgress?: OnboardingProgressRecord | null,
) {
  const [progress, setProgress] = useState<OnboardingProgressRecord>(() =>
    ensureProgressShape(initialProgress),
  )
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const completedSteps = countCompletedSteps(progress)
  const completion = calculateCompletion(progress)

  const applyResult = useCallback(
    (result: OnboardingProgressActionResponse | null | undefined) => {
      if (!result || result.error || !result.data) {
        setError(result?.error ?? "Unable to update onboarding progress.")
        return
      }

      setProgress(ensureProgressShape(result.data))
      setError(null)
    },
    [],
  )

  const completeStep = useCallback(
    (step: OnboardingStep) => {
      startTransition(async () => {
        const action = STEP_ACTIONS[step]
        const result = await action()
        applyResult(result)
      })
    },
    [applyResult, startTransition],
  )

  const refresh = useCallback(() => {
    startTransition(async () => {
      const result = await getOnboardingProgress()
      applyResult(result)
    })
  }, [applyResult, startTransition])

  return {
    progress,
    completion,
    completedSteps,
    totalSteps: ONBOARDING_STEPS.length,
    isPending,
    error,
    completeStep,
    refresh,
  }
}
