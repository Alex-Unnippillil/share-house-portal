"use server"

import { revalidatePath } from "next/cache"

import { createServiceRoleSupabaseClient } from "@/utils/supabase-service-role"

export type AmenityEventTypeState = {
  status: "idle" | "success" | "error"
  message?: string
}

export async function updateAmenityEventType(
  _prevState: AmenityEventTypeState,
  formData: FormData,
): Promise<AmenityEventTypeState> {
  const idRaw = formData.get("id")
  const calcomEventTypeIdRaw = formData.get("calcom_event_type_id")
  const calcomEventTypeSlugRaw = formData.get("calcom_event_type_slug")

  if (typeof idRaw !== "string" || idRaw.length === 0) {
    return { status: "error", message: "Missing amenity identifier." }
  }

  const amenityId = Number(idRaw)
  if (!Number.isInteger(amenityId) || amenityId <= 0) {
    return { status: "error", message: "Amenity identifier is invalid." }
  }

  let calcomEventTypeId: number | null = null
  if (typeof calcomEventTypeIdRaw === "string" && calcomEventTypeIdRaw.trim().length > 0) {
    const parsed = Number(calcomEventTypeIdRaw)
    if (!Number.isInteger(parsed) || parsed <= 0) {
      return { status: "error", message: "Cal.com event type ID must be a positive integer." }
    }
    calcomEventTypeId = parsed
  }

  const calcomEventTypeSlug =
    typeof calcomEventTypeSlugRaw === "string" && calcomEventTypeSlugRaw.trim().length > 0
      ? calcomEventTypeSlugRaw.trim()
      : null

  const supabase = createServiceRoleSupabaseClient()

  const { error } = await supabase
    .from("amenities")
    .update({
      calcom_event_type_id: calcomEventTypeId,
      calcom_event_type_slug: calcomEventTypeSlug,
      updated_at: new Date().toISOString(),
    })
    .eq("id", amenityId)

  if (error) {
    return { status: "error", message: error.message }
  }

  revalidatePath("/dashboard/amenities")
  return { status: "success", message: "Amenity event type saved." }
}
