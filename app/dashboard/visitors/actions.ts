"use server"

import { revalidatePath } from "next/cache"
import { cookies } from "next/headers"
import { z } from "zod"

import { isDateWithinQuietHours } from "@/lib/quiet-hours"
import { ensureHouseholdQuietHours, ensureProfileHousehold } from "@/lib/server/quiet-hours"
import type { Tables } from "@/lib/supabase"
import { createClient } from "@/utils/supa-server-actions"
import type { TypedSupabaseClient } from "@/utils/typed-supabase-client"

const visitorRequestSchema = z
  .object({
    visitorName: z
      .string({ required_error: "Visitor name is required." })
      .trim()
      .min(1, { message: "Visitor name is required." })
      .max(120, { message: "Visitor name must be 120 characters or fewer." }),
    arrivalAt: z.coerce.date({
      invalid_type_error: "Arrival date and time are required.",
      required_error: "Arrival date and time are required.",
    }),
    departureAt: z.coerce.date({
      invalid_type_error: "Departure date and time are required.",
      required_error: "Departure date and time are required.",
    }),
    reason: z
      .string()
      .max(500, { message: "Reason must be 500 characters or fewer." })
      .optional(),
  })
  .refine((data) => data.departureAt > data.arrivalAt, {
    message: "Departure must be after arrival.",
    path: ["departureAt"],
  })

export type VisitorRequestState = {
  status: "idle" | "success" | "error"
  message: string | null
  policyMessage?: string | null
}

export const initialVisitorRequestState: VisitorRequestState = {
  status: "idle",
  message: null,
  policyMessage: null,
}

export async function submitVisitorRequest(
  _prevState: VisitorRequestState,
  formData: FormData
): Promise<VisitorRequestState> {
  const cookieStore = cookies()
  const supabase = createClient(cookieStore) as TypedSupabaseClient

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return {
      status: "error",
      message: "You must be signed in to register a visitor.",
      policyMessage: null,
    }
  }

  const rawInput = {
    visitorName: formData.get("visitorName"),
    arrivalAt: formData.get("arrivalAt"),
    departureAt: formData.get("departureAt"),
    reason: formData.get("reason") ?? undefined,
  }

  const parsedInput = visitorRequestSchema.safeParse(rawInput)

  if (!parsedInput.success) {
    const issues = parsedInput.error.flatten()
    const message = [...Object.values(issues.fieldErrors), issues.formErrors]
      .flat()
      .filter(Boolean)
      .join(" ")

    return {
      status: "error",
      message: message || "Please review the visitor request details and try again.",
      policyMessage: null,
    }
  }

  const { visitorName, arrivalAt, departureAt, reason } = parsedInput.data

  try {
    const { profile, householdId } = await ensureProfileHousehold(supabase, user.id)
    const settings = await ensureHouseholdQuietHours(supabase, householdId)

    if (
      isDateWithinQuietHours(arrivalAt, settings) ||
      isDateWithinQuietHours(departureAt, settings)
    ) {
      return {
        status: "error",
        message: "The requested arrival or departure falls within your quiet hours.",
        policyMessage: settings.policy_message,
      }
    }

    const trimmedReason = typeof reason === "string" ? reason.trim() : null
    const finalReason = trimmedReason && trimmedReason.length > 0 ? trimmedReason : null

    const { error: insertError } = await supabase.from("visitor_requests").insert({
      household_id: householdId,
      host_profile_id: profile.id,
      visitor_name: visitorName,
      arrival_at: arrivalAt.toISOString(),
      departure_at: departureAt.toISOString(),
      reason: finalReason,
      status: "pending",
    })

    if (insertError) {
      return {
        status: "error",
        message: "We could not save the visitor request. Please try again.",
        policyMessage: null,
      }
    }

    revalidatePath("/dashboard/visitors")

    return {
      status: "success",
      message: "Visitor request submitted for review.",
      policyMessage: settings.policy_message,
    }
  } catch (error) {
    console.error("Visitor request submission failed", error)
    return {
      status: "error",
      message: "We were unable to process the visitor request. Please try again later.",
      policyMessage: null,
    }
  }
}

export type VisitorRequest = Tables<"visitor_requests">
