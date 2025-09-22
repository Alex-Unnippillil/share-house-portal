"use server"

import { revalidatePath } from "next/cache"

import { serializeNormalizedPolygon } from "@/lib/floorplan-geometry"
import { overlayShapeMutationSchema } from "@/lib/schemas/overlay-shape"
import { createSupbaseServerClient } from "@/utils/supaone"

async function assertAdminRole() {
  const supabase = await createSupbaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    throw new Error("You need to sign in to manage overlays.")
  }

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single()

  if (error) {
    throw new Error("Unable to verify permissions for the current user.")
  }

  if (profile?.role !== "admin") {
    throw new Error("Only administrators can modify floorplan overlays.")
  }

  return supabase
}

export async function saveOverlayShapeAction(rawInput: unknown) {
  const supabase = await assertAdminRole()

  const parsed = overlayShapeMutationSchema.parse({
    ...(rawInput as Record<string, unknown>),
    tenantId:
      (rawInput as { tenantId?: string | null | undefined })?.tenantId ?? null,
  })

  const normalizedPolygon = serializeNormalizedPolygon(parsed.polygon)

  if (parsed.id) {
    const { error } = await supabase
      .from("overlay_shapes")
      .update({
        label: parsed.label,
        type: parsed.type,
        polygon: normalizedPolygon,
        tenant_id: parsed.tenantId,
      })
      .eq("id", parsed.id)

    if (error) {
      throw new Error(error.message)
    }
  } else {
    const { error } = await supabase.from("overlay_shapes").insert({
      floorplan_id: parsed.floorplanId,
      label: parsed.label,
      type: parsed.type,
      polygon: normalizedPolygon,
      tenant_id: parsed.tenantId,
    })

    if (error) {
      throw new Error(error.message)
    }
  }

  revalidatePath(`/dashboard/floorplans/${parsed.floorplanId}`)
  revalidatePath("/dashboard/floorplans")
}

export async function deleteOverlayShapeAction(payload: {
  id: string
  floorplanId: string
}) {
  const supabase = await assertAdminRole()

  const { error } = await supabase
    .from("overlay_shapes")
    .delete()
    .eq("id", payload.id)

  if (error) {
    throw new Error(error.message)
  }

  revalidatePath(`/dashboard/floorplans/${payload.floorplanId}`)
  revalidatePath("/dashboard/floorplans")
}
