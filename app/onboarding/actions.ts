"use server"

import { revalidatePath } from "next/cache"
import { cookies } from "next/headers"
import { z } from "zod"

import {
  OnboardingActionResult,
  OnboardingStepKey,
  markStepComplete,
} from "@/lib/onboarding/steps"
import type { Database } from "@/lib/supabase"
import { createClient } from "@/utils/supa-server-actions"

type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"]

type MinimalProfile = Pick<
  ProfileRow,
  "metadata" | "onboarding_steps" | "rent_share" | "unit_id"
>

const unitAssignmentSchema = z.object({
  unitId: z
    .string()
    .trim()
    .min(1, "Please provide your assigned unit."),
})

const rentShareSchema = z.object({
  rentShare: z.coerce
    .number({ invalid_type_error: "Enter a valid rent share amount." })
    .min(0, "Rent share cannot be negative."),
})

const emergencyContactSchema = z.object({
  contactName: z
    .string()
    .trim()
    .min(1, "Contact name is required."),
  contactPhone: z
    .string()
    .trim()
    .min(5, "Contact phone is required."),
})

async function getAuthenticatedUserId(): Promise<{ userId?: string; error?: string }> {
  const cookieStore = cookies()
  const supabase = createClient(cookieStore)
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error || !user) {
    return { error: "Please sign in to continue." }
  }

  return { userId: user.id }
}

async function fetchProfile(
  supabase: ReturnType<typeof createClient>,
  userId: string,
): Promise<{ profile?: MinimalProfile; error?: string }> {
  const { data, error } = await supabase
    .from("profiles")
    .select("unit_id, rent_share, metadata, onboarding_steps")
    .eq("id", userId)
    .single()

  if (error) {
    return { error: "We couldn't load your profile. Please try again." }
  }

  return { profile: data as MinimalProfile }
}

function getSupabaseForUser() {
  const cookieStore = cookies()
  return createClient(cookieStore)
}

function normalizeMetadata(metadata: MinimalProfile["metadata"]) {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    return {}
  }

  return { ...(metadata as Record<string, unknown>) }
}

async function persistStepUpdate(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  payload: Partial<MinimalProfile>,
  step: OnboardingStepKey,
): Promise<OnboardingActionResult> {
  const { profile, error } = await fetchProfile(supabase, userId)
  if (error) {
    return { success: false, error }
  }

  const updatedSteps = markStepComplete(profile?.onboarding_steps, step)

  const { error: updateError } = await supabase
    .from("profiles")
    .update({
      ...payload,
      onboarding_steps: updatedSteps,
      updated_at: new Date().toISOString(),
    })
    .eq("id", userId)
    .select("id")
    .single()

  if (updateError) {
    return { success: false, error: "Unable to update your onboarding progress." }
  }

  revalidatePath("/onboarding")
  return { success: true }
}

export async function submitUnitAssignment(
  formData: FormData,
): Promise<OnboardingActionResult> {
  const parsed = unitAssignmentSchema.safeParse({
    unitId: formData.get("unitId"),
  })

  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Please provide your assigned unit.",
    }
  }

  const { userId, error } = await getAuthenticatedUserId()
  if (error || !userId) {
    return { success: false, error: error ?? "Please sign in to continue." }
  }

  const supabase = getSupabaseForUser()

  return persistStepUpdate(
    supabase,
    userId,
    { unit_id: parsed.data.unitId.trim() },
    "unitAssignment",
  )
}

export async function submitRentShare(
  formData: FormData,
): Promise<OnboardingActionResult> {
  const parsed = rentShareSchema.safeParse({
    rentShare: formData.get("rentShare"),
  })

  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Enter your monthly rent share.",
    }
  }

  const { userId, error } = await getAuthenticatedUserId()
  if (error || !userId) {
    return { success: false, error: error ?? "Please sign in to continue." }
  }

  const supabase = getSupabaseForUser()

  return persistStepUpdate(
    supabase,
    userId,
    { rent_share: parsed.data.rentShare },
    "rentShare",
  )
}

export async function submitEmergencyContact(
  formData: FormData,
): Promise<OnboardingActionResult> {
  const parsed = emergencyContactSchema.safeParse({
    contactName: formData.get("contactName"),
    contactPhone: formData.get("contactPhone"),
  })

  if (!parsed.success) {
    return {
      success: false,
      error:
        parsed.error.issues[0]?.message ??
        "Please provide your emergency contact's name and phone number.",
    }
  }

  const { userId, error } = await getAuthenticatedUserId()
  if (error || !userId) {
    return { success: false, error: error ?? "Please sign in to continue." }
  }

  const supabase = getSupabaseForUser()
  const { profile, error: profileError } = await fetchProfile(supabase, userId)
  if (profileError) {
    return { success: false, error: profileError }
  }

  const metadata = normalizeMetadata(profile?.metadata)
  metadata.emergencyContacts = [
    {
      name: parsed.data.contactName.trim(),
      phone: parsed.data.contactPhone.trim(),
    },
  ]

  const updatedSteps = markStepComplete(profile?.onboarding_steps, "emergencyContacts")

  const { error: updateError } = await supabase
    .from("profiles")
    .update({
      metadata,
      onboarding_steps: updatedSteps,
      updated_at: new Date().toISOString(),
    })
    .eq("id", userId)
    .select("id")
    .single()

  if (updateError) {
    return {
      success: false,
      error: "Unable to update your emergency contact right now.",
    }
  }

  revalidatePath("/onboarding")
  return { success: true }
}
