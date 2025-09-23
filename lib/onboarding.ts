import type { Database } from "@/lib/supabase"

export const ONBOARDING_STEPS = [
  "confirmUnit",
  "addPaymentMethod",
  "inviteRoommate",
] as const

export type OnboardingStep = (typeof ONBOARDING_STEPS)[number]

export type OnboardingProgressRecord =
  Database["public"]["Tables"]["onboarding_progress"]["Row"]

type FlagColumn = "confirmed_unit" | "added_payment_method" | "invited_roommate"
type TimestampColumn =
  | "confirmed_unit_at"
  | "added_payment_method_at"
  | "invited_roommate_at"

export const STEP_COLUMN_MAP: Record<OnboardingStep, {
  flag: FlagColumn
  timestamp: TimestampColumn
}> = {
  confirmUnit: { flag: "confirmed_unit", timestamp: "confirmed_unit_at" },
  addPaymentMethod: {
    flag: "added_payment_method",
    timestamp: "added_payment_method_at",
  },
  inviteRoommate: {
    flag: "invited_roommate",
    timestamp: "invited_roommate_at",
  },
}

export function ensureProgressShape(
  progress?: Partial<OnboardingProgressRecord> | null,
): OnboardingProgressRecord {
  return {
    user_id: progress?.user_id ?? "",
    confirmed_unit: progress?.confirmed_unit ?? false,
    confirmed_unit_at: progress?.confirmed_unit_at ?? null,
    added_payment_method: progress?.added_payment_method ?? false,
    added_payment_method_at: progress?.added_payment_method_at ?? null,
    invited_roommate: progress?.invited_roommate ?? false,
    invited_roommate_at: progress?.invited_roommate_at ?? null,
    completed_at: progress?.completed_at ?? null,
    created_at: progress?.created_at ?? null,
    updated_at: progress?.updated_at ?? null,
  }
}

export function countCompletedSteps(
  progress: OnboardingProgressRecord,
): number {
  return ONBOARDING_STEPS.reduce((count, step) => {
    const column = STEP_COLUMN_MAP[step].flag
    return count + (progress[column] ? 1 : 0)
  }, 0)
}

export function calculateCompletion(
  progress: OnboardingProgressRecord,
): number {
  if (ONBOARDING_STEPS.length === 0) {
    return 100
  }

  return Math.round(
    (countCompletedSteps(progress) / ONBOARDING_STEPS.length) * 100,
  )
}
