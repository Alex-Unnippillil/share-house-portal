"use server"

import { revalidatePath } from "next/cache"
import { cookies } from "next/headers"
import { z } from "zod"

import { parseCurrencyInput } from "@/lib/payments/currency"
import { createClient } from "@/utils/supa-server-actions"
import {
  collectEmergencyContacts,
  mergeCompletedSteps,
  type EmergencyContact,
} from "@/app/onboarding/progress"

const ONBOARDING_PATH = "/onboarding"

const unitAssignmentSchema = z.object({
  unit_id: z
    .string({ required_error: "Unit is required" })
    .min(1, "Unit is required")
    .max(128, "Unit name is too long"),
})

const rentShareSchema = z.object({
  rent_share: z.preprocess(
    (value) => {
      if (typeof value === "string") {
        return parseCurrencyInput(value)
      }
      if (typeof value === "number" && Number.isFinite(value)) {
        return value
      }
      return Number.NaN
    },
    z
      .number({ invalid_type_error: "Enter a valid rent share" })
      .min(0, "Rent share cannot be negative"),
  ),
})

const emergencyContactSchema = z.object({
  contact_name: z
    .string({ required_error: "Name is required" })
    .min(1, "Name is required")
    .max(160, "Name is too long"),
  contact_phone: z
    .string({ required_error: "Phone is required" })
    .min(1, "Phone is required")
    .max(64, "Phone number looks too long"),
  contact_relationship: z
    .string()
    .min(1)
    .max(160)
    .optional()
    .or(z.literal(""))
    .transform((value) => value?.trim() ?? ""),
  contact_notes: z
    .string()
    .min(1)
    .max(300)
    .optional()
    .or(z.literal(""))
    .transform((value) => value?.trim() ?? ""),
})

type ActionResult = {
  success: boolean
  message?: string
}

function getSupabaseClient() {
  const cookieStore = cookies()
  return createClient(cookieStore)
}

async function requireUser(client: ReturnType<typeof getSupabaseClient>) {
  const { data, error } = await client.auth.getUser()
  if (error) {
    throw error
  }

  if (!data.user) {
    return null
  }

  return data.user
}

function normalizeContact(values: z.infer<typeof emergencyContactSchema>): EmergencyContact {
  return {
    name: values.contact_name.trim(),
    phone: values.contact_phone.trim(),
    relationship: values.contact_relationship ? values.contact_relationship : undefined,
    notes: values.contact_notes ? values.contact_notes : undefined,
  }
}

function ensureMetadataObject(value: unknown): Record<string, unknown> {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return { ...(value as Record<string, unknown>) }
  }
  return {}
}

export async function completeUnitAssignment(formData: FormData): Promise<ActionResult> {
  const parsed = unitAssignmentSchema.safeParse({
    unit_id: formData.get("unit_id"),
  })

  if (!parsed.success) {
    return {
      success: false,
      message: parsed.error.issues[0]?.message ?? "Enter your unit information.",
    }
  }

  const supabase = getSupabaseClient()

  try {
    const user = await requireUser(supabase)

    if (!user) {
      return { success: false, message: "Sign in to continue." }
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("onboarding_steps")
      .eq("id", user.id)
      .single()

    if (profileError) {
      throw profileError
    }

    const onboardingSteps = mergeCompletedSteps(profile?.onboarding_steps ?? null, "unit_assignment")

    const { error: updateError } = await supabase
      .from("profiles")
      .update({
        unit_id: parsed.data.unit_id.trim(),
        onboarding_steps,
      })
      .eq("id", user.id)

    if (updateError) {
      throw updateError
    }

    revalidatePath(ONBOARDING_PATH)

    return { success: true }
  } catch (error) {
    console.error("Failed to update unit assignment", error)
    return { success: false, message: "Unable to save your unit right now." }
  }
}

export async function updateRentShare(formData: FormData): Promise<ActionResult> {
  const parsed = rentShareSchema.safeParse({
    rent_share: formData.get("rent_share"),
  })

  if (!parsed.success) {
    return {
      success: false,
      message: parsed.error.issues[0]?.message ?? "Enter how much rent you cover.",
    }
  }

  const supabase = getSupabaseClient()

  try {
    const user = await requireUser(supabase)

    if (!user) {
      return { success: false, message: "Sign in to continue." }
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("onboarding_steps")
      .eq("id", user.id)
      .single()

    if (profileError) {
      throw profileError
    }

    const onboardingSteps = mergeCompletedSteps(profile?.onboarding_steps ?? null, "rent_share")

    const { error: updateError } = await supabase
      .from("profiles")
      .update({
        rent_share: parsed.data.rent_share,
        onboarding_steps,
      })
      .eq("id", user.id)

    if (updateError) {
      throw updateError
    }

    revalidatePath(ONBOARDING_PATH)

    return { success: true }
  } catch (error) {
    console.error("Failed to update rent share", error)
    return { success: false, message: "Unable to save your rent share right now." }
  }
}

export async function saveEmergencyContact(formData: FormData): Promise<ActionResult> {
  const parsed = emergencyContactSchema.safeParse({
    contact_name: formData.get("contact_name"),
    contact_phone: formData.get("contact_phone"),
    contact_relationship: formData.get("contact_relationship"),
    contact_notes: formData.get("contact_notes"),
  })

  if (!parsed.success) {
    return {
      success: false,
      message: parsed.error.issues[0]?.message ?? "Add a contact so we know who to reach.",
    }
  }

  const supabase = getSupabaseClient()

  try {
    const user = await requireUser(supabase)

    if (!user) {
      return { success: false, message: "Sign in to continue." }
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("onboarding_steps, emergency_contacts, metadata")
      .eq("id", user.id)
      .single()

    if (profileError) {
      throw profileError
    }

    const normalized = normalizeContact(parsed.data)
    const existingContacts = collectEmergencyContacts(profile)

    const mergedContacts: EmergencyContact[] = []
    const seen = new Set<string>()

    const pushContact = (contact: EmergencyContact) => {
      const identifier = `${contact.name.toLowerCase()}::${contact.phone}`
      if (seen.has(identifier)) {
        return
      }
      seen.add(identifier)
      mergedContacts.push(contact)
    }

    pushContact(normalized)
    for (const contact of existingContacts) {
      pushContact(contact)
    }

    const onboardingSteps = mergeCompletedSteps(
      profile?.onboarding_steps ?? null,
      "emergency_contacts",
    )

    const metadata = ensureMetadataObject(profile?.metadata)
    metadata.emergency_contacts = mergedContacts

    const { error: updateError } = await supabase
      .from("profiles")
      .update({
        emergency_contacts: mergedContacts,
        onboarding_steps,
        metadata,
      })
      .eq("id", user.id)

    if (updateError) {
      throw updateError
    }

    revalidatePath(ONBOARDING_PATH)

    return { success: true }
  } catch (error) {
    console.error("Failed to save emergency contact", error)
    return { success: false, message: "Unable to save your emergency contact right now." }
  }
}
