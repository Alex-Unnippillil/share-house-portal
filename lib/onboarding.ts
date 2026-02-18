import { z } from "zod"

export const emergencyContactSchema = z.object({
  name: z.string().trim().min(2, "Emergency contact name is required."),
  phone: z.string().trim().min(7, "Phone number is required."),
  relationship: z.string().trim().min(2, "Relationship is required."),
})

export const vehicleSchema = z.object({
  make: z.string().trim().min(2, "Vehicle make is required."),
  model: z.string().trim().min(1, "Vehicle model is required."),
  color: z.string().trim().min(2, "Vehicle color is required."),
  licensePlate: z.string().trim().min(2, "License plate is required."),
})

export const unitSchema = z.object({
  unitId: z.string().trim().min(1, "Unit assignment is required."),
})

export const rentShareSchema = z.object({
  rentShare: z
    .number({ invalid_type_error: "Rent share must be a number." })
    .min(1, "Rent share must be at least 1%.")
    .max(100, "Rent share cannot exceed 100%."),
})

export type OnboardingStepKey =
  | "unit_assignment"
  | "rent_share"
  | "emergency_contact"
  | "vehicle_details"

export const ONBOARDING_STEPS: OnboardingStepKey[] = [
  "unit_assignment",
  "rent_share",
  "emergency_contact",
  "vehicle_details",
]

export type OnboardingCompletionState = {
  completedSteps: OnboardingStepKey[]
  completionPercent: number
  isComplete: boolean
}

export function computeOnboardingCompletion(completedSteps: string[] = []): OnboardingCompletionState {
  const validSteps = ONBOARDING_STEPS.filter((step) => completedSteps.includes(step))
  const completionPercent = Math.round((validSteps.length / ONBOARDING_STEPS.length) * 100)

  return {
    completedSteps: validSteps,
    completionPercent,
    isComplete: validSteps.length === ONBOARDING_STEPS.length,
  }
}
