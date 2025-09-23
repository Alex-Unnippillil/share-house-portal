"use client"

import { useEffect, useMemo, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { CheckCircle2, Circle } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  EmergencyContact,
  ONBOARDING_PROGRESS_EVENT,
  ONBOARDING_STEPS,
  OnboardingActionResult,
  OnboardingStepKey,
  OnboardingStepsState,
  extractEmergencyContacts,
  getNextIncompleteStepIndex,
} from "@/lib/onboarding/steps"
import type { Database } from "@/lib/supabase"
import { cn } from "@/lib/utils"

type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"]

type OnboardingFlowProps = {
  initialProfile: Pick<ProfileRow, "unit_id" | "rent_share" | "metadata" | "onboarding_steps"> | null
  initialSteps: OnboardingStepsState
  initialStepIndex: number
  submitUnitAssignment: (formData: FormData) => Promise<OnboardingActionResult>
  submitRentShare: (formData: FormData) => Promise<OnboardingActionResult>
  submitEmergencyContact: (formData: FormData) => Promise<OnboardingActionResult>
}

function clampStepIndex(index: number) {
  return Math.min(Math.max(index, 0), ONBOARDING_STEPS.length - 1)
}

export default function OnboardingFlow({
  initialProfile,
  initialSteps,
  initialStepIndex,
  submitUnitAssignment,
  submitRentShare,
  submitEmergencyContact,
}: OnboardingFlowProps) {
  const router = useRouter()
  const [stepsState, setStepsState] = useState<OnboardingStepsState>({
    ...initialSteps,
  })
  const [currentStep, setCurrentStep] = useState(() => {
    if (ONBOARDING_STEPS.length === 0) {
      return 0
    }
    const fallback =
      initialStepIndex === -1 ? ONBOARDING_STEPS.length - 1 : initialStepIndex
    return clampStepIndex(fallback)
  })
  const [unitId, setUnitId] = useState(initialProfile?.unit_id ?? "")
  const [rentShare, setRentShare] = useState(
    initialProfile?.rent_share !== null && initialProfile?.rent_share !== undefined
      ? initialProfile.rent_share.toString()
      : "",
  )
  const [contactName, setContactName] = useState("")
  const [contactPhone, setContactPhone] = useState("")
  const [formError, setFormError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const initialContacts = useMemo(() => {
    return extractEmergencyContacts(initialProfile?.metadata)
  }, [initialProfile?.metadata])

  useEffect(() => {
    const primaryContact: EmergencyContact | undefined = initialContacts[0]
    setContactName(primaryContact?.name ?? "")
    setContactPhone(primaryContact?.phone ?? "")
  }, [initialContacts])

  useEffect(() => {
    setStepsState({ ...initialSteps })
    if (ONBOARDING_STEPS.length > 0) {
      const fallback =
        initialStepIndex === -1 ? ONBOARDING_STEPS.length - 1 : initialStepIndex
      setCurrentStep(clampStepIndex(fallback))
    }
    setUnitId(initialProfile?.unit_id ?? "")
    setRentShare(
      initialProfile?.rent_share !== null && initialProfile?.rent_share !== undefined
        ? initialProfile.rent_share.toString()
        : "",
    )
    setFormError(null)
  }, [initialProfile, initialStepIndex, initialSteps])

  const allComplete = useMemo(
    () => ONBOARDING_STEPS.every((step) => stepsState[step.key]),
    [stepsState],
  )

  const nextIncomplete = useMemo(
    () => getNextIncompleteStepIndex(stepsState),
    [stepsState],
  )

  const activeStep = ONBOARDING_STEPS[currentStep]
  const isLastStep = currentStep === ONBOARDING_STEPS.length - 1

  const handleSelectStep = (index: number) => {
    if (index < 0 || index >= ONBOARDING_STEPS.length) {
      return
    }
    const isLocked =
      nextIncomplete !== -1 && index > nextIncomplete && !stepsState[ONBOARDING_STEPS[index].key]
    if (isLocked) {
      return
    }
    setCurrentStep(index)
    setFormError(null)
  }

  const moveToNextStep = (stepKey: OnboardingStepKey, updatedState: OnboardingStepsState) => {
    const nextIndex = getNextIncompleteStepIndex(updatedState)
    setCurrentStep((current) => {
      if (nextIndex === -1) {
        return ONBOARDING_STEPS.length - 1
      }
      if (ONBOARDING_STEPS[current]?.key === stepKey) {
        return nextIndex
      }
      return current
    })
  }

  const executeAction = (
    stepKey: OnboardingStepKey,
    formData: FormData,
    action: (formData: FormData) => Promise<OnboardingActionResult>,
    defaultError: string,
  ) => {
    setFormError(null)
    startTransition(() => {
      action(formData)
        .then((result) => {
          if (!result.success) {
            setFormError(result.error ?? defaultError)
            return
          }

          setStepsState((previous) => {
            const updated: OnboardingStepsState = { ...previous, [stepKey]: true }
            moveToNextStep(stepKey, updated)
            return updated
          })

          window.dispatchEvent(new CustomEvent(ONBOARDING_PROGRESS_EVENT))
          router.refresh()
        })
        .catch(() => {
          setFormError(defaultError)
        })
    })
  }

  const handleUnitSubmit = (formData: FormData) => {
    const value = (formData.get("unitId")?.toString() ?? "").trim()
    formData.set("unitId", value)
    setUnitId(value)
    executeAction(
      "unitAssignment",
      formData,
      submitUnitAssignment,
      "Unable to save your unit assignment.",
    )
  }

  const handleRentSubmit = (formData: FormData) => {
    const value = (formData.get("rentShare")?.toString() ?? "").trim()
    formData.set("rentShare", value)
    setRentShare(value)
    executeAction("rentShare", formData, submitRentShare, "Unable to save your rent share.")
  }

  const handleEmergencySubmit = (formData: FormData) => {
    const name = (formData.get("contactName")?.toString() ?? "").trim()
    const phone = (formData.get("contactPhone")?.toString() ?? "").trim()
    formData.set("contactName", name)
    formData.set("contactPhone", phone)
    setContactName(name)
    setContactPhone(phone)
    executeAction(
      "emergencyContacts",
      formData,
      submitEmergencyContact,
      "Unable to save your emergency contact.",
    )
  }

  const formAction = activeStep
    ? activeStep.key === "unitAssignment"
      ? handleUnitSubmit
      : activeStep.key === "rentShare"
        ? handleRentSubmit
        : handleEmergencySubmit
    : undefined

  const submitLabel = isLastStep
    ? allComplete
      ? "Save changes"
      : "Finish onboarding"
    : "Save and continue"

  return (
    <section className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold">Complete your onboarding</h1>
        <p className="text-sm text-muted-foreground">
          We use these details to make sure rent, roommates, and emergencies are covered from day one.
        </p>
      </div>

      {allComplete ? (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          All onboarding tasks are complete. You can update any step below if something changes.
        </div>
      ) : null}

      <ol className="grid gap-3 md:grid-cols-3">
        {ONBOARDING_STEPS.map((step, index) => {
          const isActive = index === currentStep
          const isComplete = stepsState[step.key]
          const isLocked =
            nextIncomplete !== -1 && index > nextIncomplete && !isComplete

          return (
            <li key={step.key}>
              <button
                type="button"
                onClick={() => handleSelectStep(index)}
                disabled={isLocked}
                className={cn(
                  "h-full w-full rounded-xl border p-4 text-left transition disabled:cursor-not-allowed disabled:opacity-50",
                  isActive ? "border-primary shadow-sm" : "border-border",
                  isComplete ? "bg-primary/5" : "bg-background",
                )}
              >
                <div className="flex items-center justify-between gap-3 text-sm font-medium">
                  <span>
                    {index + 1}. {step.title}
                  </span>
                  {isComplete ? (
                    <CheckCircle2 className="h-4 w-4 text-primary" aria-hidden="true" />
                  ) : (
                    <Circle className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                  )}
                </div>
                <p className="mt-2 text-xs text-muted-foreground">{step.description}</p>
              </button>
            </li>
          )
        })}
      </ol>

      <div className="rounded-2xl border bg-card p-6 shadow-sm">
        {activeStep ? (
          <form action={formAction} className="space-y-5">
            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground">
                Step {currentStep + 1} of {ONBOARDING_STEPS.length}
              </p>
              <h2 className="text-xl font-semibold">{activeStep.title}</h2>
              <p className="text-sm text-muted-foreground">{activeStep.description}</p>
            </div>

            {activeStep.key === "unitAssignment" ? (
              <div className="space-y-2">
                <Label htmlFor="unitId">Unit identifier</Label>
                <Input
                  id="unitId"
                  name="unitId"
                  placeholder="e.g. Unit 3B"
                  value={unitId}
                  onChange={(event) => setUnitId(event.target.value)}
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Property managers use this to map rent payments, roommates, and amenity access.
                </p>
              </div>
            ) : null}

            {activeStep.key === "rentShare" ? (
              <div className="space-y-2">
                <Label htmlFor="rentShare">Monthly rent share</Label>
                <Input
                  id="rentShare"
                  name="rentShare"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="800"
                  value={rentShare}
                  onChange={(event) => setRentShare(event.target.value)}
                  required
                />
                <p className="text-xs text-muted-foreground">
                  We use this to calculate autopay amounts and split rent fairly across roommates.
                </p>
              </div>
            ) : null}

            {activeStep.key === "emergencyContacts" ? (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="contactName">Contact name</Label>
                  <Input
                    id="contactName"
                    name="contactName"
                    placeholder="Alex Rivera"
                    value={contactName}
                    onChange={(event) => setContactName(event.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="contactPhone">Contact phone</Label>
                  <Input
                    id="contactPhone"
                    name="contactPhone"
                    placeholder="555-123-4567"
                    value={contactPhone}
                    onChange={(event) => setContactPhone(event.target.value)}
                    required
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  We'll only reach out if there's an emergency affecting your household.
                </p>
              </div>
            ) : null}

            {formError ? (
              <p className="text-sm text-destructive">{formError}</p>
            ) : null}

            <div className="flex items-center justify-end gap-3">
              <Button type="submit" disabled={isPending}>
                {isPending ? "Saving..." : submitLabel}
              </Button>
            </div>
          </form>
        ) : (
          <div className="space-y-2 text-center">
            <CheckCircle2 className="mx-auto h-10 w-10 text-primary" aria-hidden="true" />
            <h2 className="text-lg font-semibold">You're all set</h2>
            <p className="text-sm text-muted-foreground">
              All onboarding tasks are complete. We'll keep things updated as you make changes.
            </p>
          </div>
        )}
      </div>
    </section>
  )
}
