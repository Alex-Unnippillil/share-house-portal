"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"

import { createResendLandlordNotifier } from "@/lib/incidents/notifications"
import { SupabaseIncidentRepository } from "@/lib/incidents/repository"
import { createIncident, updateIncident } from "@/lib/incidents/service"
import { INCIDENT_SEVERITIES, INCIDENT_STATUSES } from "@/lib/incidents/types"
import { createSupbaseServerClient } from "@/utils/supaone"

const createIncidentSchema = z.object({
  householdId: z.string().min(1, "Household is required"),
  title: z.string().min(1, "Title is required"),
  description: z.string().min(1, "Description is required"),
  severity: z.enum(INCIDENT_SEVERITIES),
  assignedMemberId: z
    .string()
    .optional()
    .transform((value) => (value ? value : null)),
})

const updateIncidentSchema = z.object({
  incidentId: z.string().min(1, "Incident is required"),
  status: z.enum(INCIDENT_STATUSES).optional(),
  severity: z.enum(INCIDENT_SEVERITIES).optional(),
  assignedMemberId: z
    .string()
    .optional()
    .transform((value) => (value ? value : null)),
  message: z.string().optional(),
})

export async function createIncidentAction(formData: FormData) {
  const parseResult = createIncidentSchema.safeParse({
    householdId: formData.get("householdId")?.toString() ?? "",
    title: formData.get("title")?.toString() ?? "",
    description: formData.get("description")?.toString() ?? "",
    severity: formData.get("severity")?.toString() ?? "",
    assignedMemberId: formData.get("assignedMemberId")?.toString() ?? undefined,
  })

  if (!parseResult.success) {
    return { error: parseResult.error.flatten().fieldErrors }
  }

  const supabase = await createSupbaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const repository = new SupabaseIncidentRepository(supabase)
  const landlordNotifier = createResendLandlordNotifier()

  try {
    const result = await createIncident(
      { repository, landlordNotifier },
      {
        householdId: parseResult.data.householdId,
        title: parseResult.data.title,
        description: parseResult.data.description,
        severity: parseResult.data.severity,
        assignedMemberId: parseResult.data.assignedMemberId,
        reporterId: user?.id ?? null,
        actorId: user?.id ?? null,
        message: parseResult.data.description,
      },
    )

    revalidatePath("/dashboard/incidents")
    revalidatePath("/messaging")

    return { success: true, incidentId: result.incident.id }
  } catch (error) {
    console.error("Failed to create incident", error)
    return { error: "Failed to create incident" }
  }
}

export async function updateIncidentAction(formData: FormData) {
  const parseResult = updateIncidentSchema.safeParse({
    incidentId: formData.get("incidentId")?.toString() ?? "",
    status: formData.get("status")?.toString() ?? undefined,
    severity: formData.get("severity")?.toString() ?? undefined,
    assignedMemberId: formData.get("assignedMemberId")?.toString() ?? undefined,
    message: formData.get("message")?.toString() ?? undefined,
  })

  if (!parseResult.success) {
    return { error: parseResult.error.flatten().fieldErrors }
  }

  const supabase = await createSupbaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const repository = new SupabaseIncidentRepository(supabase)
  const landlordNotifier = createResendLandlordNotifier()

  try {
    const result = await updateIncident(
      { repository, landlordNotifier },
      {
        id: parseResult.data.incidentId,
        status: parseResult.data.status,
        severity: parseResult.data.severity,
        assignedMemberId: parseResult.data.assignedMemberId,
        message: parseResult.data.message,
        actorId: user?.id ?? null,
      },
    )

    revalidatePath("/dashboard/incidents")
    revalidatePath("/messaging")

    return { success: true, incidentId: result.incident.id }
  } catch (error) {
    console.error("Failed to update incident", error)
    return { error: "Failed to update incident" }
  }
}
