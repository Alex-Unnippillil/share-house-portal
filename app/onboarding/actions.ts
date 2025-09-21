"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"

import { createActionClient } from "@/utils/supabase/actions"
import {
  buildingSelectionSchema,
  emergencyContactsSchema,
  onboardingSchema,
  policyAcknowledgementSchema,
  roommateRoleSchema,
  vehiclesSchema,
  type OnboardingStep,
} from "./schemas"

const unexpectedError = "Something went wrong. Please try again."

function formatZodError(error: unknown) {
  if (error instanceof z.ZodError) {
    const issues = error.flatten().formErrors
    if (issues.length > 0) {
      return issues[0]
    }
    const fieldIssue = Object.values(error.flatten().fieldErrors)[0]?.[0]
    if (fieldIssue) return fieldIssue
  }
  if (error instanceof Error) {
    return error.message
  }
  return unexpectedError
}

async function ensureUser() {
  const supabase = await createActionClient()
  const { data, error } = await supabase.auth.getUser()
  if (error || !data.user) {
    throw new Error("You must be signed in to continue")
  }
  return { supabase: supabase as any, user: data.user }
}

export async function saveOnboardingStep(step: OnboardingStep, payload: unknown) {
  try {
    const { supabase, user } = await ensureUser()

    switch (step) {
      case "building": {
        const data = buildingSelectionSchema.parse(payload)
        const { error } = await supabase
          .from("tenant_profiles")
          .upsert(
            {
              tenant_id: user.id,
              building_id: data.buildingId,
              unit_id: data.unitId,
              onboarding_status: "in_progress",
              updated_at: new Date().toISOString(),
            },
            { onConflict: "tenant_id" }
          )
        if (error) throw error
        await supabase
          .from("profiles")
          .update({ building_id: data.buildingId, unit_id: data.unitId })
          .eq("id", user.id)
        break
      }
      case "role": {
        const data = roommateRoleSchema.parse(payload)
        const { error } = await supabase
          .from("tenant_profiles")
          .upsert(
            {
              tenant_id: user.id,
              roommate_role: data.roommateRole,
              rent_share: data.rentShare,
              onboarding_status: "in_progress",
              updated_at: new Date().toISOString(),
            },
            { onConflict: "tenant_id" }
          )
        if (error) throw error
        const { error: roleError } = await supabase
          .from("profiles")
          .update({ role: data.roommateRole })
          .eq("id", user.id)
        if (roleError) throw roleError
        break
      }
      case "emergency": {
        const data = emergencyContactsSchema.parse(payload)
        const { error: deleteError } = await supabase
          .from("tenant_emergency_contacts")
          .delete()
          .eq("tenant_id", user.id)
        if (deleteError) throw deleteError
        const inserts = data.emergencyContacts.map((contact) => ({
          tenant_id: user.id,
          name: contact.name,
          relationship: contact.relationship,
          phone: contact.phone,
          email: contact.email ?? null,
        }))
        if (inserts.length > 0) {
          const { error } = await supabase
            .from("tenant_emergency_contacts")
            .insert(inserts)
          if (error) throw error
        }
        break
      }
      case "vehicles": {
        const data = vehiclesSchema.parse(payload)
        const { error: deleteError } = await supabase
          .from("tenant_vehicles")
          .delete()
          .eq("tenant_id", user.id)
        if (deleteError) throw deleteError
        if (data.vehicles.length > 0) {
          const { error } = await supabase
            .from("tenant_vehicles")
            .insert(
              data.vehicles.map((vehicle) => ({
                tenant_id: user.id,
                make: vehicle.make,
                model: vehicle.model,
                color: vehicle.color,
                license_plate: vehicle.licensePlate,
              }))
            )
          if (error) throw error
        }
        break
      }
      case "policy": {
        const data = policyAcknowledgementSchema.parse(payload)
        const entries = [
          { key: "house_rules", accepted: data.houseRules },
          { key: "rent_payments", accepted: data.rentPayments },
          { key: "emergency_access", accepted: data.emergencyAccess },
        ]
        const { error: deleteError } = await supabase
          .from("tenant_policy_acknowledgements")
          .delete()
          .eq("tenant_id", user.id)
        if (deleteError) throw deleteError
        const now = new Date().toISOString()
        const { error } = await supabase
          .from("tenant_policy_acknowledgements")
          .insert(
            entries.map((entry) => ({
              tenant_id: user.id,
              policy_key: entry.key,
              accepted: entry.accepted,
              acknowledged_at: now,
            }))
          )
        if (error) throw error
        break
      }
      default:
        throw new Error("Unsupported onboarding step")
    }

    revalidatePath("/account")
    return { success: true }
  } catch (error) {
    return { success: false, error: formatZodError(error) }
  }
}

export async function completeOnboarding(payload: unknown) {
  try {
    const { supabase, user } = await ensureUser()
    const data = onboardingSchema.parse(payload)

    const { error: profileError } = await supabase
      .from("tenant_profiles")
      .upsert(
        {
          tenant_id: user.id,
          building_id: data.buildingId,
          unit_id: data.unitId,
          roommate_role: data.roommateRole,
          rent_share: data.rentShare,
          onboarding_status: "completed",
          completed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        { onConflict: "tenant_id" }
      )
    if (profileError) throw profileError

    const { error: roleError } = await supabase
      .from("profiles")
      .update({
        role: data.roommateRole,
        building_id: data.buildingId,
        unit_id: data.unitId,
      })
      .eq("id", user.id)
    if (roleError) throw roleError

    await saveOnboardingStep("emergency", { emergencyContacts: data.emergencyContacts })
    await saveOnboardingStep("vehicles", { vehicles: data.vehicles })
    await saveOnboardingStep("policy", {
      houseRules: data.houseRules,
      rentPayments: data.rentPayments,
      emergencyAccess: data.emergencyAccess,
    })

    revalidatePath("/dashboard")
    revalidatePath("/account")
    return { success: true }
  } catch (error) {
    return { success: false, error: formatZodError(error) }
  }
}
