"use client"

import * as React from "react"
import { CheckCircle2, Loader2 } from "lucide-react"

import OnboardingProgress from "@/components/onboarding-progress"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  useOnboardingProgress,
  type OnboardingProgressRecord,
  type OnboardingStep,
} from "@/hooks/useOnboardingProgress"
import { STEP_COLUMN_MAP } from "@/lib/onboarding"

const STEP_DEFINITIONS: Array<{
  key: OnboardingStep
  title: string
  description: string
  actionLabel: string
}> = [
  {
    key: "confirmUnit",
    title: "Confirm your unit",
    description:
      "Verify your assigned unit and rent share so billing and notifications stay accurate.",
    actionLabel: "Confirm unit details",
  },
  {
    key: "addPaymentMethod",
    title: "Add a payment method",
    description:
      "Securely add a card or bank account so you can enable autopay and stay current on rent.",
    actionLabel: "Add payment method",
  },
  {
    key: "inviteRoommate",
    title: "Invite your roommate",
    description:
      "Send your roommate an invite so they can access the portal, manage chores, and track payments.",
    actionLabel: "Invite roommate",
  },
]

type OnboardingFlowProps = {
  initialProgress: OnboardingProgressRecord
}

export default function OnboardingFlow({ initialProgress }: OnboardingFlowProps) {
  const {
    progress,
    completion,
    completedSteps,
    totalSteps,
    completeStep,
    isPending,
    error,
  } = useOnboardingProgress(initialProgress)

  const stepStatus = React.useMemo(
    () =>
      STEP_DEFINITIONS.reduce<Record<OnboardingStep, boolean>>(
        (acc, { key }) => {
          acc[key] = Boolean(progress[STEP_COLUMN_MAP[key].flag])
          return acc
        },
        {
          confirmUnit: false,
          addPaymentMethod: false,
          inviteRoommate: false,
        },
      ),
    [progress],
  )

  const stepIndicator = Math.min(completedSteps + 1, totalSteps + 1)
  const allStepsComplete = completion === 100

  return (
    <div className="space-y-8">
      <OnboardingProgress step={stepIndicator} />

      <div className="space-y-3 rounded-lg border bg-card p-6 shadow-sm">
        <div>
          <p className="text-sm font-medium text-muted-foreground">
            Onboarding status
          </p>
          <p
            aria-live="polite"
            className="text-3xl font-semibold"
            data-testid="onboarding-percentage"
            role="status"
          >
            {completion}% complete
          </p>
        </div>
        {allStepsComplete ? (
          <p className="flex items-center gap-2 text-sm font-medium text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 aria-hidden="true" className="size-4" />
            All household tasks are complete—you&apos;re ready to move in.
          </p>
        ) : (
          <p className="text-sm text-muted-foreground">
            Complete each action below to unlock the full Share House Portal
            experience.
          </p>
        )}
        {error ? (
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        ) : null}
      </div>

      <div className="grid gap-4">
        {STEP_DEFINITIONS.map((step, index) => {
          const isComplete = stepStatus[step.key]
          const previousStep = STEP_DEFINITIONS[index - 1]?.key
          const isLocked = Boolean(previousStep && !stepStatus[previousStep])

          return (
            <Card key={step.key} data-testid={`onboarding-step-${index + 1}`}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {step.title}
                  {isComplete ? (
                    <CheckCircle2
                      aria-hidden="true"
                      className="size-4 text-emerald-600 dark:text-emerald-400"
                    />
                  ) : null}
                </CardTitle>
                <CardDescription>{step.description}</CardDescription>
              </CardHeader>
              {isLocked ? (
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Complete the previous step to unlock this action.
                  </p>
                </CardContent>
              ) : null}
              <CardFooter className="justify-end">
                <Button
                  disabled={isComplete || isLocked || isPending}
                  onClick={() => completeStep(step.key)}
                  variant={isComplete ? "outline" : "default"}
                >
                  {isPending && !isComplete ? (
                    <Loader2
                      aria-hidden="true"
                      className="mr-2 size-4 animate-spin"
                    />
                  ) : null}
                  {isComplete ? "Completed" : step.actionLabel}
                </Button>
              </CardFooter>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
