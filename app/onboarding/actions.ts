"use server"

import { revalidatePath } from "next/cache"

import {
  ONBOARDING_STEPS,
  STEP_COLUMN_MAP,
  ensureProgressShape,
  type OnboardingProgressRecord,
  type OnboardingStep,
} from "@/lib/onboarding"
import { createSupbaseServerClient } from "@/utils/supaone"
import type { TypedSupabaseClient } from "@/utils/typed-supabase-client"

export type OnboardingProgressActionResponse = {
  data: OnboardingProgressRecord | null
  error?: string
}

type SupabaseWithUser = {
  supabase: TypedSupabaseClient
  userId: string
}

type SupabaseWithOptionalError = SupabaseWithUser & { error?: string }

async function getSupabaseAndUser(
  userIdOverride?: string,
): Promise<SupabaseWithOptionalError> {
  const supabase = await createSupbaseServerClient()

  if (userIdOverride) {
    return { supabase, userId: userIdOverride }
  }

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error || !user) {
    return {
      supabase,
      userId: "",
      error: error?.message ?? "Not authenticated",
    }
  }

  return { supabase, userId: user.id }
}

async function ensureProgressRow(
  supabase: TypedSupabaseClient,
  userId: string,
): Promise<OnboardingProgressActionResponse> {
  const { data, error } = await supabase
    .from("onboarding_progress")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle()

  if (error) {
    return { data: null, error: error.message }
  }

  if (data) {
    return { data: ensureProgressShape(data) }
  }

  const { data: inserted, error: insertError } = await supabase
    .from("onboarding_progress")
    .insert({ user_id: userId })
    .select("*")
    .single()

  if (insertError) {
    return { data: null, error: insertError.message }
  }

  return { data: ensureProgressShape(inserted) }
}

async function updateStep(
  step: OnboardingStep,
  existing: OnboardingProgressRecord,
  supabase: TypedSupabaseClient,
  userId: string,
): Promise<OnboardingProgressActionResponse> {
  const { flag, timestamp } = STEP_COLUMN_MAP[step]

  if (existing[flag]) {
    if (!existing.completed_at) {
      const alreadyComplete = ONBOARDING_STEPS.every((currentStep) =>
        Boolean(existing[STEP_COLUMN_MAP[currentStep].flag]),
      )

      if (alreadyComplete) {
        const completionUpdate = new Date().toISOString()
        const { data: hydrated, error: hydrateError } = await supabase
          .from("onboarding_progress")
          .update({
            completed_at: completionUpdate,
            updated_at: completionUpdate,
          })
          .eq("user_id", userId)
          .select("*")
          .single()

        if (hydrateError) {
          return { data: null, error: hydrateError.message }
        }

        await revalidatePath("/onboarding")

        return { data: ensureProgressShape(hydrated) }
      }
    }

    return { data: existing }
  }

  const now = new Date().toISOString()
  const updates: Partial<OnboardingProgressRecord> = {
    [flag]: true,
    [timestamp]: now,
    updated_at: now,
  }

  const completedAfterUpdate = ONBOARDING_STEPS.every((currentStep) => {
    if (currentStep === step) {
      return true
    }

    return Boolean(existing[STEP_COLUMN_MAP[currentStep].flag])
  })

  if (completedAfterUpdate) {
    updates.completed_at = existing.completed_at ?? now
  }

  const { data, error } = await supabase
    .from("onboarding_progress")
    .update(updates)
    .eq("user_id", userId)
    .select("*")
    .single()

  if (error) {
    return { data: null, error: error.message }
  }

  await revalidatePath("/onboarding")

  return { data: ensureProgressShape(data) }
}

async function mutateStep(step: OnboardingStep) {
  const { supabase, userId, error } = await getSupabaseAndUser()

  if (error || !userId) {
    return { data: null, error: error ?? "Not authenticated" }
  }

  const progressResult = await ensureProgressRow(supabase, userId)

  if (!progressResult.data) {
    return progressResult
  }

  return updateStep(step, progressResult.data, supabase, userId)
}

export async function getOnboardingProgress(
  userIdOverride?: string,
): Promise<OnboardingProgressActionResponse> {
  const { supabase, userId, error } = await getSupabaseAndUser(userIdOverride)

  if (error || !userId) {
    return { data: null, error: error ?? "Not authenticated" }
  }

  return ensureProgressRow(supabase, userId)
}

export async function completeConfirmUnit() {
  return mutateStep("confirmUnit")
}

export async function completeAddPaymentMethod() {
  return mutateStep("addPaymentMethod")
}

export async function completeInviteRoommate() {
  return mutateStep("inviteRoommate")
}
