"use server"

import { revalidatePath } from "next/cache"

import { createSupabaseServerClient } from "@/utils/supaone"
import type { Json } from "@/lib/supabase"
import {
  computeOnboardingCompletion,
  emergencyContactSchema,
  rentShareSchema,
  unitSchema,
  vehicleSchema,
  type OnboardingStepKey,
} from "@/lib/onboarding"

type ActionResponse = {
  ok: boolean
  message: string
}

type OnboardingMetadata = {
  emergency_contact?: {
    name: string
    phone: string
    relationship: string
  }
  vehicle_details?: {
    make: string
    model: string
    color: string
    licensePlate: string
  }
  onboarding?: {
    completed_steps?: string[]
    completion_percent?: number
    completed_at?: string | null
    audit_log?: Array<Record<string, unknown>>
  }
  personal_documents?: Array<{
    path: string
    name: string
    size: number
    mimeType: string
    uploadedAt: string
  }>
  [key: string]: unknown
}

async function loadSelfProfile() {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    throw new Error("You must be signed in to update onboarding.")
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id, role, metadata, unit_id, rent_share")
    .eq("id", user.id)
    .single()

  if (profileError || !profile) {
    throw new Error("Unable to load your profile for onboarding.")
  }

  const role = profile.role ?? "user"
  const allowedRoles = new Set(["tenant", "roommate", "property_manager", "admin", "user"])
  if (!allowedRoles.has(role)) {
    throw new Error("Your role is not allowed to update onboarding data.")
  }

  return { supabase, user, profile }
}

function buildUpdatedMetadata(
  currentMetadata: OnboardingMetadata,
  step: OnboardingStepKey,
  payload: Record<string, unknown>,
  actorId: string,
): OnboardingMetadata {
  const onboarding = currentMetadata.onboarding ?? {}
  const completedStepsSet = new Set(onboarding.completed_steps ?? [])
  completedStepsSet.add(step)

  const completion = computeOnboardingCompletion(Array.from(completedStepsSet))

  const existingAudit = onboarding.audit_log ?? []
  const auditEntry = {
    action: "onboarding_step_updated",
    step,
    actor_id: actorId,
    payload,
    at: new Date().toISOString(),
  }

  return {
    ...currentMetadata,
    onboarding: {
      ...onboarding,
      completed_steps: completion.completedSteps,
      completion_percent: completion.completionPercent,
      completed_at: completion.isComplete ? new Date().toISOString() : null,
      audit_log: [...existingAudit.slice(-24), auditEntry],
    },
  }
}

function appendAuditOnly(currentMetadata: OnboardingMetadata, payload: Record<string, unknown>, actorId: string): OnboardingMetadata {
  const onboarding = currentMetadata.onboarding ?? {}
  const existingAudit = onboarding.audit_log ?? []

  return {
    ...currentMetadata,
    onboarding: {
      ...onboarding,
      audit_log: [
        ...existingAudit.slice(-24),
        {
          action: "onboarding_asset_uploaded",
          actor_id: actorId,
          payload,
          at: new Date().toISOString(),
        },
      ],
    },
  }
}

export async function saveUnitAssignment(input: { unitId: string }): Promise<ActionResponse> {
  const parsed = unitSchema.safeParse(input)
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Invalid unit assignment." }
  }

  const { supabase, user, profile } = await loadSelfProfile()
  const currentMetadata = (profile.metadata ?? {}) as OnboardingMetadata
  const updatedMetadata = buildUpdatedMetadata(
    currentMetadata,
    "unit_assignment",
    { unit_id: parsed.data.unitId },
    user.id,
  )

  const { error } = await supabase
    .from("profiles")
    .update({
      unit_id: parsed.data.unitId,
      metadata: updatedMetadata as unknown as Json,
      updated_at: new Date().toISOString(),
    })
    .eq("id", user.id)

  if (error) {
    return { ok: false, message: error.message }
  }

  revalidatePath("/onboarding")
  revalidatePath("/dashboard")
  return { ok: true, message: "Unit assignment saved." }
}

export async function saveRentShare(input: { rentShare: number }): Promise<ActionResponse> {
  const parsed = rentShareSchema.safeParse(input)
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Invalid rent share." }
  }

  const { supabase, user, profile } = await loadSelfProfile()
  const currentMetadata = (profile.metadata ?? {}) as OnboardingMetadata
  const updatedMetadata = buildUpdatedMetadata(
    currentMetadata,
    "rent_share",
    { rent_share: parsed.data.rentShare },
    user.id,
  )

  const { error } = await supabase
    .from("profiles")
    .update({
      rent_share: parsed.data.rentShare,
      metadata: updatedMetadata as unknown as Json,
      updated_at: new Date().toISOString(),
    })
    .eq("id", user.id)

  if (error) {
    return { ok: false, message: error.message }
  }

  revalidatePath("/onboarding")
  revalidatePath("/dashboard")
  return { ok: true, message: "Rent share saved." }
}

export async function saveEmergencyContact(input: {
  name: string
  phone: string
  relationship: string
}): Promise<ActionResponse> {
  const parsed = emergencyContactSchema.safeParse(input)
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Invalid emergency contact." }
  }

  const { supabase, user, profile } = await loadSelfProfile()
  const currentMetadata = (profile.metadata ?? {}) as OnboardingMetadata

  const updatedMetadata = buildUpdatedMetadata(
    {
      ...currentMetadata,
      emergency_contact: parsed.data,
    },
    "emergency_contact",
    parsed.data,
    user.id,
  )

  const { error } = await supabase
    .from("profiles")
    .update({
      metadata: updatedMetadata as unknown as Json,
      updated_at: new Date().toISOString(),
    })
    .eq("id", user.id)

  if (error) {
    return { ok: false, message: error.message }
  }

  revalidatePath("/onboarding")
  revalidatePath("/dashboard")
  return { ok: true, message: "Emergency contact saved." }
}

export async function saveVehicleDetails(input: {
  make: string
  model: string
  color: string
  licensePlate: string
}): Promise<ActionResponse> {
  const parsed = vehicleSchema.safeParse(input)
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Invalid vehicle details." }
  }

  const { supabase, user, profile } = await loadSelfProfile()
  const currentMetadata = (profile.metadata ?? {}) as OnboardingMetadata

  const updatedMetadata = buildUpdatedMetadata(
    {
      ...currentMetadata,
      vehicle_details: parsed.data,
    },
    "vehicle_details",
    parsed.data,
    user.id,
  )

  const { error } = await supabase
    .from("profiles")
    .update({
      metadata: updatedMetadata as unknown as Json,
      updated_at: new Date().toISOString(),
    })
    .eq("id", user.id)

  if (error) {
    return { ok: false, message: error.message }
  }

  revalidatePath("/onboarding")
  revalidatePath("/dashboard")
  return { ok: true, message: "Vehicle details saved." }
}

export async function uploadOnboardingAsset(formData: FormData): Promise<ActionResponse> {
  const kind = formData.get("kind")
  const file = formData.get("file")

  if ((kind !== "avatar" && kind !== "document") || !(file instanceof File)) {
    return { ok: false, message: "Invalid upload payload." }
  }

  const maxSize = kind === "avatar" ? 2 * 1024 * 1024 : 8 * 1024 * 1024
  if (file.size > maxSize) {
    return { ok: false, message: `File is too large. Max size is ${Math.round(maxSize / (1024 * 1024))}MB.` }
  }

  const { supabase, user, profile } = await loadSelfProfile()
  const currentMetadata = (profile.metadata ?? {}) as OnboardingMetadata

  const extension = file.name.split(".").pop()?.toLowerCase() ?? "bin"
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "-")
  const path = `${user.id}/${Date.now()}-${safeName}`

  const bucket = kind === "avatar" ? "avatars" : "personal-documents"

  const { error: uploadError } = await supabase.storage.from(bucket).upload(path, file, {
    upsert: kind === "avatar",
    contentType: file.type || undefined,
  })

  if (uploadError) {
    return { ok: false, message: uploadError.message }
  }

  const payload = {
    path,
    bucket,
    name: file.name,
    size: file.size,
    mimeType: file.type || `application/${extension}`,
    uploadedAt: new Date().toISOString(),
  }

  const metadataUpdate: OnboardingMetadata = { ...currentMetadata }

  if (kind === "avatar") {
    metadataUpdate.onboarding = currentMetadata.onboarding
  } else {
    const existingDocs = currentMetadata.personal_documents ?? []
    metadataUpdate.personal_documents = [...existingDocs, payload]
  }

  const updatedMetadata = appendAuditOnly(metadataUpdate, { upload: payload, type: kind }, user.id)

  const profileUpdate: Record<string, unknown> = {
    metadata: updatedMetadata as unknown as Json,
    updated_at: new Date().toISOString(),
  }

  if (kind === "avatar") {
    profileUpdate.avatar_url = path
  }

  const { error: profileError } = await supabase.from("profiles").update(profileUpdate).eq("id", user.id)

  if (profileError) {
    return { ok: false, message: profileError.message }
  }

  revalidatePath("/onboarding")
  revalidatePath("/dashboard")
  return { ok: true, message: kind === "avatar" ? "Avatar uploaded." : "Document uploaded." }
}
