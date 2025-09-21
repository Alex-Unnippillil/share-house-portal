"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"

import { createActionClient } from "@/utils/supabase/actions"
import {
  emergencyContactsSchema,
  policyAcknowledgementSchema,
  vehiclesSchema,
} from "@/app/onboarding/schemas"

import { tenantDocumentSchema, tenantMetadataSchema } from "./schemas"

const unexpectedError = "Something went wrong. Please try again."

function formatError(error: unknown) {
  if (error instanceof z.ZodError) {
    const firstField = Object.values(error.flatten().fieldErrors)[0]?.[0]
    if (firstField) return firstField
    return error.errors[0]?.message ?? unexpectedError
  }
  if (error instanceof Error) return error.message
  return unexpectedError
}

async function ensureUser() {
  const supabase = await createActionClient()
  const { data, error } = await supabase.auth.getUser()
  if (error || !data.user) {
    throw new Error("You must be signed in to update your account")
  }
  return { supabase: supabase as any, user: data.user }
}

export async function updateTenantAccount(values: unknown) {
  try {
    const { supabase, user } = await ensureUser()
    const parsed = tenantMetadataSchema.parse(values)

    const { error: profileError } = await supabase
      .from("profiles")
      .update({
        full_name: parsed.fullName,
        username: parsed.username,
        website: parsed.website || null,
        role: parsed.roommateRole,
        building_id: parsed.buildingId,
        unit_id: parsed.unitId,
      })
      .eq("id", user.id)
    if (profileError) throw profileError

    const { error: tenantProfileError } = await supabase
      .from("tenant_profiles")
      .upsert(
        {
          tenant_id: user.id,
          building_id: parsed.buildingId,
          unit_id: parsed.unitId,
          roommate_role: parsed.roommateRole,
          rent_share: parsed.rentShare,
          onboarding_status: "completed",
          updated_at: new Date().toISOString(),
        },
        { onConflict: "tenant_id" }
      )
    if (tenantProfileError) throw tenantProfileError

    const { error: deleteContactsError } = await supabase
      .from("tenant_emergency_contacts")
      .delete()
      .eq("tenant_id", user.id)
    if (deleteContactsError) throw deleteContactsError
    const contacts = emergencyContactsSchema.parse({ emergencyContacts: parsed.emergencyContacts })
    if (contacts.emergencyContacts.length > 0) {
      const { error: insertContactsError } = await supabase
        .from("tenant_emergency_contacts")
        .insert(
          contacts.emergencyContacts.map((contact) => ({
            tenant_id: user.id,
            name: contact.name,
            relationship: contact.relationship,
            phone: contact.phone,
            email: contact.email ?? null,
          }))
        )
      if (insertContactsError) throw insertContactsError
    }

    const { error: deleteVehiclesError } = await supabase
      .from("tenant_vehicles")
      .delete()
      .eq("tenant_id", user.id)
    if (deleteVehiclesError) throw deleteVehiclesError
    const vehicles = vehiclesSchema.parse({ vehicles: parsed.vehicles })
    if (vehicles.vehicles.length > 0) {
      const { error: insertVehiclesError } = await supabase
        .from("tenant_vehicles")
        .insert(
          vehicles.vehicles.map((vehicle) => ({
            tenant_id: user.id,
            make: vehicle.make,
            model: vehicle.model,
            color: vehicle.color,
            license_plate: vehicle.licensePlate,
          }))
        )
      if (insertVehiclesError) throw insertVehiclesError
    }

    const policyPayload = policyAcknowledgementSchema.parse({
      houseRules: parsed.houseRules,
      rentPayments: parsed.rentPayments,
      emergencyAccess: parsed.emergencyAccess,
    })
    const { error: deletePoliciesError } = await supabase
      .from("tenant_policy_acknowledgements")
      .delete()
      .eq("tenant_id", user.id)
    if (deletePoliciesError) throw deletePoliciesError
    const now = new Date().toISOString()
    const { error: insertPoliciesError } = await supabase
      .from("tenant_policy_acknowledgements")
      .insert([
        { tenant_id: user.id, policy_key: "house_rules", accepted: policyPayload.houseRules, acknowledged_at: now },
        { tenant_id: user.id, policy_key: "rent_payments", accepted: policyPayload.rentPayments, acknowledged_at: now },
        { tenant_id: user.id, policy_key: "emergency_access", accepted: policyPayload.emergencyAccess, acknowledged_at: now },
      ])
    if (insertPoliciesError) throw insertPoliciesError

    revalidatePath("/account")
    return { success: true }
  } catch (error) {
    return { success: false, error: formatError(error) }
  }
}

export async function uploadTenantDocument(formData: FormData) {
  try {
    const { supabase, user } = await ensureUser()
    const payload = tenantDocumentSchema.parse({
      file: formData.get("file"),
      label: formData.get("label"),
      category: formData.get("category"),
    })

    const fileExt = payload.file.name.split(".").pop()
    const safeLabel = payload.label.replace(/[^a-zA-Z0-9-_]/g, "_")
    const path = `${user.id}/${Date.now()}-${safeLabel}.${fileExt}`

    const { error: uploadError } = await supabase.storage
      .from("tenant-documents")
      .upload(path, payload.file, { upsert: true })
    if (uploadError) throw uploadError

    const { error: insertError } = await supabase.from("tenant_documents").insert({
      tenant_id: user.id,
      title: payload.label,
      category: payload.category,
      storage_path: path,
    })
    if (insertError) throw insertError

    revalidatePath("/account")
    return { success: true, path }
  } catch (error) {
    return { success: false, error: formatError(error) }
  }
}

export async function updateAvatar(path: string) {
  try {
    const { supabase, user } = await ensureUser()
    if (!path) {
      throw new Error("Avatar path is required")
    }
    const { error } = await supabase
      .from("profiles")
      .update({ avatar_url: path })
      .eq("id", user.id)
    if (error) throw error
    revalidatePath("/account")
    return { success: true }
  } catch (error) {
    return { success: false, error: formatError(error) }
  }
}
